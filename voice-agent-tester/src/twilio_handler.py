"""
Twilio handler for initiating calls and handling media streams.
"""

import json
import base64
import asyncio
import time
from typing import Callable, Optional
import audioop

from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect

import config


class TwilioCallManager:
    """Manages Twilio calls and media streams."""

    def __init__(self):
        self.client = Client(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
        self.active_calls: dict = {}

    async def initiate_call(
        self,
        call_id: str,
        target_number: str,
        webhook_url: str
    ) -> str:
        """
        Initiate an outbound call.

        Args:
            call_id: Unique identifier for this test call
            target_number: Phone number to call
            webhook_url: URL for Twilio to connect for TwiML

        Returns:
            Twilio Call SID
        """
        call = self.client.calls.create(
            to=target_number,
            from_=config.TWILIO_PHONE_NUMBER,
            url=f"{webhook_url}/twiml/{call_id}",
            status_callback=f"{webhook_url}/status/{call_id}",
            status_callback_event=["initiated", "ringing", "answered", "completed"],
            status_callback_method="POST",
            timeout=60,
            machine_detection="Enable",
            async_amd=True
        )

        self.active_calls[call_id] = {
            "sid": call.sid,
            "status": "initiated"
        }

        return call.sid

    def generate_stream_twiml(self, call_id: str, websocket_url: str) -> str:
        """
        Generate TwiML for connecting to media stream.

        Args:
            call_id: Unique identifier for this test call
            websocket_url: WebSocket URL for media streaming

        Returns:
            TwiML string
        """
        response = VoiceResponse()

        # Connect to the WebSocket for bidirectional audio
        connect = Connect()
        stream = connect.stream(
            url=f"{websocket_url}/media/{call_id}",
        )
        # Enable bidirectional streaming
        stream.parameter(name="track", value="inbound_track")
        response.append(connect)

        return str(response)

    async def end_call(self, call_id: str) -> bool:
        """
        End an active call.

        Args:
            call_id: Unique identifier for the call

        Returns:
            True if successful
        """
        if call_id not in self.active_calls:
            return False

        call_info = self.active_calls[call_id]
        try:
            self.client.calls(call_info["sid"]).update(status="completed")
            return True
        except Exception as e:
            print(f"Error ending call {call_id}: {e}")
            return False

    def update_call_status(self, call_id: str, status: str):
        """Update the status of a call."""
        if call_id in self.active_calls:
            old_status = self.active_calls[call_id].get("status", "unknown")
            self.active_calls[call_id]["status"] = status
            print(f"[{call_id}] 📞 Twilio status: {old_status} → {status}")


class AudioConverter:
    """Converts audio between Twilio (mulaw 8kHz) and OpenAI (PCM16 24kHz) formats."""

    @staticmethod
    def mulaw_to_pcm16(mulaw_data: bytes) -> bytes:
        """Convert mu-law 8kHz to PCM16."""
        # Decode mu-law to linear PCM
        pcm_data = audioop.ulaw2lin(mulaw_data, 2)
        return pcm_data

    @staticmethod
    def pcm16_to_mulaw(pcm_data: bytes) -> bytes:
        """Convert PCM16 to mu-law."""
        # Encode linear PCM to mu-law
        mulaw_data = audioop.lin2ulaw(pcm_data, 2)
        return mulaw_data

    @staticmethod
    def resample(data: bytes, from_rate: int, to_rate: int, sample_width: int = 2) -> bytes:
        """Resample audio data from one sample rate to another."""
        if from_rate == to_rate:
            return data
        # Use audioop for resampling
        resampled, _ = audioop.ratecv(data, sample_width, 1, from_rate, to_rate, None)
        return resampled

    @staticmethod
    def twilio_to_openai(mulaw_8khz: bytes) -> bytes:
        """
        Convert Twilio audio format to OpenAI Realtime format.
        mu-law 8kHz -> PCM16 24kHz
        """
        # First convert mu-law to linear PCM
        pcm_8khz = AudioConverter.mulaw_to_pcm16(mulaw_8khz)
        # Then resample from 8kHz to 24kHz
        pcm_24khz = AudioConverter.resample(pcm_8khz, 8000, 24000)
        return pcm_24khz

    @staticmethod
    def openai_to_twilio(pcm16_24khz: bytes) -> bytes:
        """
        Convert OpenAI Realtime audio format to Twilio format.
        PCM16 24kHz -> mu-law 8kHz
        """
        # First resample from 24kHz to 8kHz
        pcm_8khz = AudioConverter.resample(pcm16_24khz, 24000, 8000)
        # Then convert to mu-law
        mulaw_8khz = AudioConverter.pcm16_to_mulaw(pcm_8khz)
        return mulaw_8khz


class TwilioMediaStreamHandler:
    """Handles a single Twilio media stream WebSocket connection."""

    def __init__(
        self,
        call_id: str,
        on_audio_received: Callable[[bytes], None],
        on_stream_connected: Optional[Callable[[], None]] = None,
        on_stream_disconnected: Optional[Callable[[], None]] = None
    ):
        self.call_id = call_id
        self.on_audio_received = on_audio_received
        self.on_stream_connected = on_stream_connected
        self.on_stream_disconnected = on_stream_disconnected

        self.stream_sid: Optional[str] = None
        self.websocket = None
        self._audio_queue: asyncio.Queue = asyncio.Queue()

        # Logging/metrics counters
        self._audio_packets_received = 0
        self._audio_packets_sent = 0
        self._last_audio_received_time = 0
        self._last_audio_sent_time = 0
        self._stream_start_time = 0

    async def handle_message(self, message: str):
        """Handle incoming WebSocket message from Twilio."""
        data = json.loads(message)
        event_type = data.get("event")

        if event_type == "connected":
            print(f"[{self.call_id}] 📞 Twilio WebSocket connected")

        elif event_type == "start":
            self.stream_sid = data.get("streamSid")
            self._stream_start_time = time.time()
            start_data = data.get("start", {})
            print(f"[{self.call_id}] 📞 Twilio stream started: {self.stream_sid}")
            print(f"[{self.call_id}] 📞 Stream info: tracks={start_data.get('tracks', [])}, mediaFormat={start_data.get('mediaFormat', {})}")
            if self.on_stream_connected:
                self.on_stream_connected()

        elif event_type == "media":
            # Decode the audio payload (base64 encoded mu-law)
            payload = data.get("media", {}).get("payload", "")
            if payload:
                audio_bytes = base64.b64decode(payload)
                self._audio_packets_received += 1
                self._last_audio_received_time = time.time()

                # Log periodically (every 500 packets ~= every 10 seconds at 50 packets/sec)
                if self._audio_packets_received % 500 == 0:
                    elapsed = time.time() - self._stream_start_time
                    print(f"[{self.call_id}] 📥 Twilio audio: {self._audio_packets_received} packets received, {self._audio_packets_sent} sent ({elapsed:.1f}s elapsed)")

                self.on_audio_received(audio_bytes)

        elif event_type == "stop":
            elapsed = time.time() - self._stream_start_time if self._stream_start_time else 0
            print(f"[{self.call_id}] 📞 Twilio stream stopped after {elapsed:.1f}s")
            print(f"[{self.call_id}] 📊 Twilio stats: {self._audio_packets_received} packets received, {self._audio_packets_sent} sent")
            if self.on_stream_disconnected:
                self.on_stream_disconnected()

        elif event_type == "mark":
            # Mark event received (audio playback position)
            mark_name = data.get("mark", {}).get("name", "")
            print(f"[{self.call_id}] 🏷️ Twilio mark: {mark_name}")

    async def send_audio(self, audio_data: bytes):
        """Send audio to Twilio (mu-law format, base64 encoded)."""
        if self.websocket and self.stream_sid:
            # Encode audio as base64
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            message = {
                "event": "media",
                "streamSid": self.stream_sid,
                "media": {
                    "payload": audio_b64
                }
            }

            await self.websocket.send_text(json.dumps(message))
            self._audio_packets_sent += 1
            self._last_audio_sent_time = time.time()

    async def send_mark(self, name: str):
        """Send a mark event to track audio playback position."""
        if self.websocket and self.stream_sid:
            message = {
                "event": "mark",
                "streamSid": self.stream_sid,
                "mark": {
                    "name": name
                }
            }
            await self.websocket.send_text(json.dumps(message))

    async def clear_audio(self):
        """Clear any queued audio on the Twilio side."""
        if self.websocket and self.stream_sid:
            message = {
                "event": "clear",
                "streamSid": self.stream_sid
            }
            await self.websocket.send_text(json.dumps(message))
