"""
Test Caller - Bridges Twilio and OpenAI for a single test call.
"""

import asyncio
import time
from typing import Optional

from starlette.websockets import WebSocketDisconnect

from .twilio_handler import TwilioMediaStreamHandler, AudioConverter
from .openai_realtime import OpenAIRealtimeClient
from .metrics import CallMetrics, Speaker, MetricsAnalyzer, ScenarioResult
from .scenarios.base import BaseScenario

# Phrases that indicate the customer is actually ending the call
# These must be definitive goodbye phrases, not "that's all" which is used when ordering
GOODBYE_PHRASES = [
    "goodbye", "bye", "bye bye", "bye-bye", "bye now", "okay bye", "alright bye",
    "thank you, bye", "thanks, bye", "thanks bye", "thank you bye",
    "thanks goodbye", "thank you goodbye",
    "have a good day", "have a good one", "have a great day",
    "talk to you later", "take care"
]


class TestCaller:
    """
    Manages a single test call.

    Bridges audio between Twilio (the phone call) and OpenAI (the test customer AI).
    Collects metrics throughout the call.
    """

    def __init__(
        self,
        call_id: str,
        scenario: BaseScenario,
    ):
        self.call_id = call_id
        self.scenario = scenario
        self.metrics = CallMetrics(
            call_id=call_id,
            scenario_name=scenario.config.name
        )

        # Components (initialized during call setup)
        self.twilio_handler: Optional[TwilioMediaStreamHandler] = None
        self.openai_client: Optional[OpenAIRealtimeClient] = None

        # State
        self._call_active = False
        self._audio_buffer = bytearray()
        self._response_audio_buffer = bytearray()

        # Timing
        self._call_start_time: Optional[float] = None
        self._last_agent_speech_end: Optional[float] = None

        # Async queues for thread-safe audio passing
        self._outgoing_audio_queue: asyncio.Queue = None
        self._incoming_audio_queue: asyncio.Queue = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

        # Cleanup tracking
        self._cleanup_complete = False
        self._disconnect_reason: str = "unknown"
        self._customer_said_goodbye = False

        # Monitoring stats
        self._last_twilio_audio_time: float = 0
        self._last_openai_audio_time: float = 0

        # Response triggering state
        self._ai_is_responding: bool = False
        self._last_response_request_time: float = 0
        self._response_cooldown_seconds: float = 2.0  # Minimum time between response requests
        self._last_vad_response_time: float = 0  # Track when VAD auto-triggered a response
        self._pending_response_trigger: bool = False  # Flag for delayed trigger

        # Silence detection - disabled for now as it causes role confusion
        # Only use as absolute last resort after very long silence
        self._last_agent_speech_time: float = 0
        self._silence_prompt_sent: bool = False
        self._silence_threshold_seconds: float = 45.0  # Very long - only for dead calls
        self._silence_prompt_count: int = 0
        self._max_silence_prompts: int = 1  # Just one prompt, then give up

        # Echo detection - ignore "agent speech" that happens right after customer speech
        # This prevents audio echo from triggering false responses
        self._last_customer_speech_end: float = 0
        self._echo_window_seconds: float = 5.0  # Ignore agent speech within 5s of customer speech

    async def setup(self, twilio_websocket):
        """
        Set up the test caller with WebSocket connections.

        Args:
            twilio_websocket: The WebSocket connection from Twilio
        """
        # Get event loop reference
        self._loop = asyncio.get_event_loop()

        # Initialize queues
        self._outgoing_audio_queue = asyncio.Queue()
        self._incoming_audio_queue = asyncio.Queue()

        # Create Twilio handler
        self.twilio_handler = TwilioMediaStreamHandler(
            call_id=self.call_id,
            on_audio_received=self._on_twilio_audio,
            on_stream_connected=self._on_twilio_connected,
            on_stream_disconnected=self._on_twilio_disconnected
        )
        self.twilio_handler.websocket = twilio_websocket

        # Create OpenAI client
        self.openai_client = OpenAIRealtimeClient(
            system_prompt=self.scenario.get_customer_system_prompt(),
            on_audio_response=self._on_openai_audio,
            on_transcript=self._on_transcript,
            on_speech_started=self._on_agent_speech_started,
            on_speech_stopped=self._on_agent_speech_stopped,
            on_response_started=self._on_response_started,
            on_response_done=self._on_response_done,
            call_id=self.call_id
        )

        # Connect to OpenAI
        print(f"[{self.call_id}] 🔌 Connecting to OpenAI Realtime API...")
        await self.openai_client.connect()

        self._call_active = True
        self.metrics.start_call()
        self._call_start_time = time.time()

        print(f"[{self.call_id}] ✅ Test caller setup complete - scenario: {self.scenario.config.name}")

    async def run(self, twilio_websocket):
        """
        Run the test call.

        Handles both Twilio and OpenAI communication concurrently.
        The call ends when:
        1. Twilio disconnects (phone hangs up) - this is the normal end
        2. OpenAI connection drops
        3. Max duration reached (emergency cutoff only)
        """
        try:
            await self.setup(twilio_websocket)
        except Exception as e:
            print(f"[{self.call_id}] Setup failed: {e}")
            self._disconnect_reason = "setup_failed"
            self.metrics.end_call()
            return

        # Create tasks so we can cancel them
        twilio_task = asyncio.create_task(self._handle_twilio_messages(twilio_websocket), name="twilio_messages")
        openai_task = asyncio.create_task(self.openai_client.listen(), name="openai_listen")
        monitor_task = asyncio.create_task(self._monitor_call_duration(), name="duration_monitor")
        outgoing_task = asyncio.create_task(self._process_outgoing_audio(), name="outgoing_audio")
        incoming_task = asyncio.create_task(self._process_incoming_audio(), name="incoming_audio")
        status_task = asyncio.create_task(self._log_status_periodically(), name="status_logger")
        silence_task = asyncio.create_task(self._monitor_silence(), name="silence_monitor")

        all_tasks = [twilio_task, openai_task, monitor_task, outgoing_task, incoming_task, status_task, silence_task]
        print(f"[{self.call_id}] 🚀 All tasks started, waiting for call to complete...")

        try:
            # Wait for the first task to complete (usually twilio disconnect)
            done, pending = await asyncio.wait(
                all_tasks,
                return_when=asyncio.FIRST_COMPLETED
            )

            # Determine disconnect reason based on which task finished
            for task in done:
                task_name = task.get_name()
                if task.exception():
                    print(f"[{self.call_id}] Task {task_name} failed: {task.exception()}")
                    self._disconnect_reason = f"{task_name}_error"
                else:
                    print(f"[{self.call_id}] Task {task_name} completed")
                    if task_name == "twilio_messages":
                        self._disconnect_reason = "phone_disconnected"
                    elif task_name == "openai_listen":
                        self._disconnect_reason = "openai_disconnected"
                    elif task_name == "duration_monitor":
                        self._disconnect_reason = "max_duration_reached"
                    else:
                        self._disconnect_reason = task_name

            # DON'T set _call_active = False yet - let audio/transcripts continue during grace period

            # Give OpenAI a grace period to send final transcripts
            import config
            grace_period = config.TRANSCRIPT_GRACE_PERIOD_SECONDS
            if openai_task in pending:
                print(f"[{self.call_id}] Waiting {grace_period}s for final transcripts...")
                try:
                    await asyncio.wait_for(openai_task, timeout=grace_period)
                except asyncio.TimeoutError:
                    print(f"[{self.call_id}] Transcript grace period ended")
                except Exception:
                    pass

            # NOW stop audio processing - after grace period
            self._call_active = False

            # Mark end time AFTER grace period to capture final transcripts
            self.metrics.end_call()

            # Cancel remaining tasks
            for task in pending:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

        except asyncio.CancelledError:
            print(f"[{self.call_id}] Call cancelled")
            self._disconnect_reason = "cancelled"
            self.metrics.end_call()
            for task in all_tasks:
                task.cancel()
        except Exception as e:
            print(f"[{self.call_id}] Error during call: {e}")
            self._disconnect_reason = f"error: {str(e)}"
            self.metrics.end_call()
        finally:
            await self.cleanup()

    async def _process_outgoing_audio(self):
        """Process audio going from Twilio to OpenAI."""
        while self._call_active:
            try:
                audio_data = await asyncio.wait_for(
                    self._outgoing_audio_queue.get(),
                    timeout=1.0
                )
                if self.openai_client and self.openai_client.is_connected:
                    await self.openai_client.send_audio(audio_data)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[{self.call_id}] Error processing outgoing audio: {e}")

    async def _process_incoming_audio(self):
        """Process audio going from OpenAI to Twilio."""
        while self._call_active:
            try:
                audio_data = await asyncio.wait_for(
                    self._incoming_audio_queue.get(),
                    timeout=1.0
                )
                if self.twilio_handler and self.twilio_handler.websocket:
                    await self.twilio_handler.send_audio(audio_data)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[{self.call_id}] Error processing incoming audio: {e}")

    async def _handle_twilio_messages(self, websocket):
        """Handle incoming Twilio WebSocket messages."""
        try:
            while self._call_active:
                message = await websocket.receive_text()
                await self.twilio_handler.handle_message(message)
        except WebSocketDisconnect:
            print(f"[{self.call_id}] Twilio WebSocket disconnected (phone hung up)")
            # This is the normal way for a call to end - phone disconnected
            # The task completing will signal the run() method to wrap up
            return
        except Exception as e:
            print(f"[{self.call_id}] Error receiving Twilio message: {e}")
            # Connection error - also end the call
            return

    async def _monitor_call_duration(self):
        """
        Monitor call duration as an emergency cutoff.

        The AI customer is instructed to keep calls short via system prompt.
        This monitor only triggers if something goes wrong and the call
        exceeds the hard maximum duration.
        """
        import config
        while self._call_active:
            await asyncio.sleep(5)  # Check less frequently - this is just a safety net
            if self._call_start_time:
                elapsed = time.time() - self._call_start_time
                if elapsed >= config.MAX_CALL_DURATION_SECONDS:
                    print(f"[{self.call_id}] ⏰ EMERGENCY: Max call duration ({config.MAX_CALL_DURATION_SECONDS}s) reached, forcing end")
                    # This returns to signal the task is done, which will trigger cleanup
                    return

    async def _log_status_periodically(self):
        """Log call status every 30 seconds for debugging."""
        while self._call_active:
            await asyncio.sleep(30)
            if self._call_start_time and self._call_active:
                elapsed = time.time() - self._call_start_time
                transcript_count = len(self.metrics.transcript)
                outgoing_qsize = self._outgoing_audio_queue.qsize() if self._outgoing_audio_queue else 0
                incoming_qsize = self._incoming_audio_queue.qsize() if self._incoming_audio_queue else 0

                # Check for audio stalls
                twilio_stall = ""
                openai_stall = ""
                now = time.time()
                if self._last_twilio_audio_time > 0 and (now - self._last_twilio_audio_time) > 10:
                    twilio_stall = f" ⚠️ No Twilio audio for {now - self._last_twilio_audio_time:.0f}s"
                if self._last_openai_audio_time > 0 and (now - self._last_openai_audio_time) > 10:
                    openai_stall = f" ⚠️ No OpenAI audio for {now - self._last_openai_audio_time:.0f}s"

                print(f"[{self.call_id}] 📊 STATUS: {elapsed:.0f}s elapsed, {transcript_count} transcript entries, queues: out={outgoing_qsize} in={incoming_qsize}{twilio_stall}{openai_stall}")

    async def _monitor_silence(self):
        """
        Monitor for extended silence and prompt the AI customer to say "hello?"

        This helps recover from situations where:
        1. The restaurant agent is slow to answer
        2. The conversation gets stuck with dead air
        3. The agent said something but VAD didn't detect it properly
        """
        # Wait a bit for initial connection to establish
        await asyncio.sleep(5)

        while self._call_active:
            await asyncio.sleep(2)  # Check every 2 seconds

            if not self._call_active or self._customer_said_goodbye:
                break

            # Don't prompt if AI is currently responding
            if self._ai_is_responding:
                continue

            # Check if we've hit the silence threshold
            now = time.time()
            time_since_agent_speech = now - self._last_agent_speech_time if self._last_agent_speech_time > 0 else now - self._call_start_time
            time_since_vad_response = now - self._last_vad_response_time if self._last_vad_response_time > 0 else float('inf')

            # Only prompt if:
            # 1. Silence threshold exceeded
            # 2. Haven't already sent a prompt for this silence period
            # 3. Haven't exceeded max prompts
            # 4. VAD hasn't triggered recently (within 5 seconds)
            if (time_since_agent_speech >= self._silence_threshold_seconds and
                not self._silence_prompt_sent and
                self._silence_prompt_count < self._max_silence_prompts and
                time_since_vad_response > 5.0):

                self._silence_prompt_sent = True
                self._silence_prompt_count += 1

                # Simple prompt - just say the line seems dead
                prompt = "The phone line has been silent for a very long time. Just say 'Hello? Is anyone there?' briefly, then wait for a response."
                if self._silence_prompt_count >= self._max_silence_prompts:
                    self._customer_said_goodbye = True  # Give up and end call

                print(f"[{self.call_id}] 🔇 Silence detected ({time_since_agent_speech:.0f}s), prompting AI (attempt {self._silence_prompt_count}/{self._max_silence_prompts})")

                try:
                    if self.openai_client and self.openai_client.is_connected:
                        await self.openai_client.send_text_prompt(prompt)
                except Exception as e:
                    print(f"[{self.call_id}] Error sending silence prompt: {e}")

    def _on_twilio_audio(self, audio_data: bytes):
        """
        Handle audio received from Twilio (the restaurant agent's voice).
        Convert and forward to OpenAI.
        """
        # Track last audio time for stall detection
        self._last_twilio_audio_time = time.time()

        # Convert from Twilio format (mulaw 8kHz) to OpenAI format (PCM16 24kHz)
        pcm_audio = AudioConverter.twilio_to_openai(audio_data)

        # Queue for async processing
        if self._outgoing_audio_queue and self._call_active:
            try:
                self._outgoing_audio_queue.put_nowait(pcm_audio)
            except asyncio.QueueFull:
                pass  # Drop frame if queue is full

    def _on_twilio_connected(self):
        """Handle Twilio stream connection."""
        print(f"[{self.call_id}] Twilio stream connected, call is live")

    def _on_twilio_disconnected(self):
        """Handle Twilio stream disconnection."""
        print(f"[{self.call_id}] Twilio stream disconnected")
        # Don't set _call_active = False here; let the task completion in run() handle it
        # This ensures we capture the disconnect reason properly

    def _on_openai_audio(self, audio_data: bytes):
        """
        Handle audio response from OpenAI (our test customer AI).
        Convert and forward to Twilio.
        """
        # Track last audio time for stall detection
        self._last_openai_audio_time = time.time()

        # Convert from OpenAI format (PCM16 24kHz) to Twilio format (mulaw 8kHz)
        mulaw_audio = AudioConverter.openai_to_twilio(audio_data)

        # Queue for async processing
        if self._incoming_audio_queue and self._call_active:
            try:
                self._incoming_audio_queue.put_nowait(mulaw_audio)
            except asyncio.QueueFull:
                pass  # Drop frame if queue is full

    def _on_transcript(self, role: str, text: str):
        """
        Handle transcript updates.

        Args:
            role: "agent" (restaurant) or "customer" (our test AI)
            text: The transcribed text
        """
        speaker = Speaker.AGENT if role == "agent" else Speaker.CUSTOMER
        self.metrics.add_transcript_entry(speaker, text)
        print(f"[{self.call_id}] {role.upper()}: {text}")

        # Detect if customer is ending the call
        # DISABLED: Now we wait for the agent to hang up instead
        # if role == "customer" and not self._customer_said_goodbye:
        #     text_lower = text.lower()
        #     if any(phrase in text_lower for phrase in GOODBYE_PHRASES):
        #         self._customer_said_goodbye = True
        #         print(f"[{self.call_id}] Detected customer goodbye, scheduling graceful call end")
        #         # Trigger graceful call end after a short delay for final audio
        #         asyncio.create_task(self._end_call_gracefully())

    async def _end_call_gracefully(self):
        """End call gracefully after customer says goodbye."""
        await asyncio.sleep(3)  # Allow time for final audio to play
        if self._call_active:
            print(f"[{self.call_id}] 👋 Customer said goodbye, ending call gracefully")
            self._disconnect_reason = "customer_goodbye"
            self._call_active = False

    def _on_agent_speech_started(self):
        """Handle when the restaurant agent starts speaking."""
        # Check for echo - if customer just spoke recently, this might be echo
        now = time.time()
        time_since_customer_speech = now - self._last_customer_speech_end if self._last_customer_speech_end > 0 else float('inf')

        if time_since_customer_speech < self._echo_window_seconds:
            print(f"[{self.call_id}] 🔊 Potential echo detected (speech started {time_since_customer_speech:.1f}s after customer)")
            # Don't reset silence timer for echo
            return

        # Track when agent started speaking - reset silence detection
        self._last_agent_speech_time = time.time()
        self._silence_prompt_sent = False  # Reset since agent is now speaking

    def _on_agent_speech_stopped(self):
        """
        Handle when the restaurant agent stops speaking.

        We use a delayed trigger approach: wait a short time to see if
        OpenAI's VAD auto-triggers a response. Only manually trigger
        if VAD doesn't respond within the delay window.
        """
        # Check for echo - if customer just spoke recently, this might be echo
        now = time.time()
        time_since_customer_speech = now - self._last_customer_speech_end if self._last_customer_speech_end > 0 else float('inf')

        if time_since_customer_speech < self._echo_window_seconds:
            print(f"[{self.call_id}] 🔊 Ignoring potential echo (agent speech {time_since_customer_speech:.1f}s after customer)")
            return

        # Mark for latency measurement
        self.metrics.mark_customer_speech_end()

        # Only consider triggering if conditions are right
        if (self._call_active and
            not self._ai_is_responding and
            not self._customer_said_goodbye):

            # Schedule a delayed response trigger
            # This gives VAD time to auto-trigger first
            asyncio.create_task(self._delayed_response_trigger())

    async def _delayed_response_trigger(self):
        """
        Wait briefly then trigger a response if VAD hasn't already.

        This avoids the race condition where both VAD and our code
        try to trigger responses simultaneously.
        """
        # Wait to see if VAD auto-triggers
        await asyncio.sleep(1.5)

        # Check conditions again after the delay
        now = time.time()
        time_since_vad = now - self._last_vad_response_time
        time_since_last_request = now - self._last_response_request_time

        # Only trigger if:
        # 1. Call still active
        # 2. AI not currently responding
        # 3. VAD hasn't triggered recently (within last 2 seconds)
        # 4. We haven't manually triggered recently
        # 5. Customer hasn't said goodbye
        if (self._call_active and
            not self._ai_is_responding and
            not self._customer_said_goodbye and
            time_since_vad > 2.0 and
            time_since_last_request > self._response_cooldown_seconds):

            self._last_response_request_time = now
            print(f"[{self.call_id}] 🎯 VAD didn't trigger, manually requesting AI response")
            await self._trigger_ai_response()

    async def _trigger_ai_response(self):
        """Explicitly request a response from OpenAI."""
        try:
            if self.openai_client and self.openai_client.is_connected and self._call_active:
                # Don't commit audio - VAD handles buffer management
                # Just request a response
                await self.openai_client.create_response()
        except Exception as e:
            print(f"[{self.call_id}] Error triggering AI response: {e}")

    def _on_response_started(self):
        """Handle when our test AI starts responding."""
        self._ai_is_responding = True
        self._last_vad_response_time = time.time()  # Track for delayed trigger logic

    def _on_response_done(self):
        """Handle when our test AI finishes responding."""
        self._ai_is_responding = False
        # Track when customer finished speaking for echo detection
        self._last_customer_speech_end = time.time()
        # Mark that customer finished speaking for latency tracking
        self.metrics.mark_customer_speech_end()

    async def cleanup(self):
        """Clean up resources after call ends."""
        if self._cleanup_complete:
            return  # Already cleaned up

        self._call_active = False

        # Ensure end_call is called if not already (handles edge cases)
        if self.metrics.end_time == 0.0:
            self.metrics.end_call()

        # Store disconnect reason in metrics
        self.metrics.disconnect_reason = self._disconnect_reason

        # Analyze the call BEFORE disconnecting OpenAI to ensure all transcript data is captured
        MetricsAnalyzer.analyze_transcript(self.metrics)

        # NOW disconnect from OpenAI (after metrics are finalized)
        if self.openai_client:
            await self.openai_client.disconnect()

        # Create scenario result
        self.metrics.scenario_result = ScenarioResult(
            scenario_name=self.scenario.config.name,
            scenario_description=self.scenario.config.description,
            expected_behaviors=self.scenario.config.expected_behaviors,
        )

        # Evaluate scenario-specific criteria
        evaluation = self.scenario.evaluate_call(
            [t.to_dict() for t in self.metrics.transcript],
            self.metrics.to_dict()
        )
        self.metrics.scenario_result.task_completed = evaluation.get("scenario_completed", False)
        self.metrics.scenario_result.notes = evaluation.get("notes", [])

        self._cleanup_complete = True
        print(f"[{self.call_id}] ✅ CALL COMPLETE")
        print(f"[{self.call_id}] 📊 Final stats: Duration={self.metrics.duration_seconds:.1f}s, Turns={len(self.metrics.transcript)}, Reason={self._disconnect_reason}")
        print(f"[{self.call_id}] 📊 Compliance: score={self.metrics.compliance.calculate_compliance_score()}, greeted={self.metrics.compliance.greeted_properly}, asked_phone={self.metrics.compliance.asked_for_phone_number}")

    def get_metrics(self) -> CallMetrics:
        """Return the collected metrics."""
        return self.metrics

    @property
    def is_cleanup_complete(self) -> bool:
        """Check if cleanup has completed."""
        return self._cleanup_complete
