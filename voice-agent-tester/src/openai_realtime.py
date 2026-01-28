"""
OpenAI Realtime API client for voice conversations.
"""

import json
import base64
import asyncio
import time
from typing import Callable, Optional
from dataclasses import dataclass
import websockets

import config


@dataclass
class RealtimeEvent:
    """Represents an event from the OpenAI Realtime API."""
    type: str
    data: dict


class OpenAIRealtimeClient:
    """
    Client for OpenAI's Realtime API.

    Handles bidirectional audio streaming for voice conversations.
    """

    def __init__(
        self,
        system_prompt: str,
        on_audio_response: Callable[[bytes], None],
        on_transcript: Callable[[str, str], None],  # (role, text)
        on_speech_started: Optional[Callable[[], None]] = None,
        on_speech_stopped: Optional[Callable[[], None]] = None,
        on_response_started: Optional[Callable[[], None]] = None,
        on_response_done: Optional[Callable[[], None]] = None,
        call_id: str = ""
    ):
        self.system_prompt = system_prompt
        self.on_audio_response = on_audio_response
        self.on_transcript = on_transcript
        self.on_speech_started = on_speech_started
        self.on_speech_stopped = on_speech_stopped
        self.on_response_started = on_response_started
        self.on_response_done = on_response_done
        self.call_id = call_id

        self.websocket = None
        self._connected = False
        self._session_created = False

        # Logging/metrics counters
        self._audio_chunks_sent = 0
        self._audio_chunks_received = 0
        self._last_audio_sent_time = 0
        self._last_audio_received_time = 0
        self._last_event_time = 0
        self._events_received = 0

    async def connect(self):
        """Connect to the OpenAI Realtime API."""
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }

        self.websocket = await websockets.connect(
            config.OPENAI_REALTIME_URL,
            extra_headers=headers,
            ping_interval=20,
            ping_timeout=10
        )
        self._connected = True
        print(f"[{self.call_id}] Connected to OpenAI Realtime API")

        # Configure the session
        await self._configure_session()

    async def _configure_session(self):
        """Configure the Realtime session with our settings."""
        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": self.system_prompt,
                "voice": "alloy",  # Natural voice
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.6,  # Slightly higher threshold to avoid false triggers
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 1500  # Wait 1.5 seconds of silence before responding
                },
                "temperature": 0.7,
                "max_response_output_tokens": 1024
            }
        }

        await self.websocket.send(json.dumps(session_config))
        self._session_created = True
        print(f"[{self.call_id}] Session configured")

    async def send_audio(self, audio_data: bytes):
        """
        Send audio input to the API.

        Args:
            audio_data: PCM16 audio data at 24kHz
        """
        if not self._connected or not self.websocket:
            return

        # Base64 encode the audio
        audio_b64 = base64.b64encode(audio_data).decode("utf-8")

        event = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64
        }

        await self.websocket.send(json.dumps(event))

        # Track audio sending
        self._audio_chunks_sent += 1
        self._last_audio_sent_time = time.time()

        # Log periodically (every 100 chunks ~= every few seconds of audio)
        if self._audio_chunks_sent % 100 == 0:
            print(f"[{self.call_id}] 📤 Audio sent: {self._audio_chunks_sent} chunks, last received: {self._audio_chunks_received} chunks")

    async def commit_audio(self):
        """Commit the audio buffer to trigger processing."""
        if not self._connected or not self.websocket:
            return

        event = {
            "type": "input_audio_buffer.commit"
        }
        await self.websocket.send(json.dumps(event))

    async def cancel_response(self):
        """Cancel the current response (for interruptions)."""
        if not self._connected or not self.websocket:
            return

        event = {
            "type": "response.cancel"
        }
        await self.websocket.send(json.dumps(event))

    async def create_response(self):
        """Explicitly request a response."""
        if not self._connected or not self.websocket:
            return

        event = {
            "type": "response.create"
        }
        await self.websocket.send(json.dumps(event))

    async def send_text_prompt(self, text: str):
        """
        Send a text prompt to guide the AI's next response.

        Uses response.create with instructions to guide what the AI should say,
        without adding a fake "user" message that would confuse the conversation.
        """
        if not self._connected or not self.websocket:
            return

        # Use response.create with specific instructions for this response
        # This doesn't add a message to the conversation history
        event = {
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"],
                "instructions": text
            }
        }
        await self.websocket.send(json.dumps(event))

    async def listen(self):
        """Listen for events from the API."""
        if not self.websocket:
            return

        try:
            async for message in self.websocket:
                await self._handle_event(json.loads(message))
        except websockets.exceptions.ConnectionClosed as e:
            # Log the close code and reason for debugging
            print(f"[{self.call_id}] OpenAI connection closed: code={e.code}, reason='{e.reason}'")
        except Exception as e:
            print(f"[{self.call_id}] OpenAI listen error: {type(e).__name__}: {e}")
        finally:
            self._connected = False

    async def _handle_event(self, event: dict):
        """Handle an event from the API."""
        event_type = event.get("type", "")
        self._events_received += 1
        self._last_event_time = time.time()

        # Log all event types for debugging (except high-frequency audio events)
        if event_type not in ["response.audio.delta", "input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped"]:
            print(f"[{self.call_id}] 📨 OpenAI event: {event_type}")

        if event_type == "session.created":
            print(f"[{self.call_id}] ✅ Session created successfully")

        elif event_type == "session.updated":
            print(f"[{self.call_id}] ✅ Session updated successfully")

        elif event_type == "input_audio_buffer.speech_started":
            # The user (restaurant agent) started speaking
            print(f"[{self.call_id}] 🎤 Agent started speaking (VAD detected)")
            if self.on_speech_started:
                self.on_speech_started()

        elif event_type == "input_audio_buffer.speech_stopped":
            # The user (restaurant agent) stopped speaking
            print(f"[{self.call_id}] 🎤 Agent stopped speaking (VAD detected)")
            if self.on_speech_stopped:
                self.on_speech_stopped()

        elif event_type == "conversation.item.input_audio_transcription.completed":
            # Transcription of input audio (what the restaurant agent said)
            transcript = event.get("transcript", "")
            if transcript and self.on_transcript:
                print(f"[{self.call_id}] 📝 Agent transcript received: {len(transcript)} chars")
                self.on_transcript("agent", transcript)

        elif event_type == "response.audio.delta":
            # Audio response from our test customer AI
            audio_b64 = event.get("delta", "")
            if audio_b64:
                audio_data = base64.b64decode(audio_b64)
                self._audio_chunks_received += 1
                self._last_audio_received_time = time.time()
                self.on_audio_response(audio_data)

        elif event_type == "response.audio_transcript.delta":
            # Real-time transcript of what our AI is saying
            pass  # We'll get the full transcript in .done

        elif event_type == "response.audio_transcript.done":
            # Full transcript of what our test AI said
            transcript = event.get("transcript", "")
            if transcript and self.on_transcript:
                print(f"[{self.call_id}] 📝 Customer transcript complete: {len(transcript)} chars")
                self.on_transcript("customer", transcript)

        elif event_type == "response.created":
            print(f"[{self.call_id}] 🤖 AI response started")
            if self.on_response_started:
                self.on_response_started()

        elif event_type == "response.done":
            # Response completed
            print(f"[{self.call_id}] 🤖 AI response completed (sent {self._audio_chunks_received} audio chunks)")
            if self.on_response_done:
                self.on_response_done()

        elif event_type == "error":
            error = event.get("error", {})
            print(f"[{self.call_id}] ❌ OpenAI error: {error}")

        elif event_type == "rate_limits.updated":
            # Rate limit info - log if we're getting close to limits
            rate_limits = event.get("rate_limits", [])
            for limit in rate_limits:
                if limit.get("remaining", 100) < 10:
                    print(f"[{self.call_id}] ⚠️ Rate limit warning: {limit}")

    async def disconnect(self):
        """Disconnect from the API."""
        if self.websocket:
            await self.websocket.close()
            self._connected = False
            print(f"[{self.call_id}] 🔌 Disconnected from OpenAI")
            print(f"[{self.call_id}] 📊 OpenAI stats: {self._audio_chunks_sent} chunks sent, {self._audio_chunks_received} chunks received, {self._events_received} events")

    @property
    def is_connected(self) -> bool:
        return self._connected
