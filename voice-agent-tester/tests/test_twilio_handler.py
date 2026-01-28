"""
Tests for the Twilio handler module.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock

from src.twilio_handler import TwilioCallManager, TwilioMediaStreamHandler


class TestTwilioCallManager:
    """Tests for TwilioCallManager."""

    @pytest.fixture
    def mock_twilio_client(self):
        with patch("src.twilio_handler.Client") as mock_client:
            yield mock_client

    def test_init_creates_client(self, mock_twilio_client):
        manager = TwilioCallManager()

        mock_twilio_client.assert_called_once()
        assert manager.active_calls == {}

    @pytest.mark.asyncio
    async def test_initiate_call(self, mock_twilio_client):
        mock_call = Mock()
        mock_call.sid = "CA123456789"
        mock_twilio_client.return_value.calls.create.return_value = mock_call

        manager = TwilioCallManager()
        sid = await manager.initiate_call(
            "test_call_1",
            "+15551234567",
            "https://example.ngrok.io"
        )

        assert sid == "CA123456789"
        assert "test_call_1" in manager.active_calls
        assert manager.active_calls["test_call_1"]["sid"] == "CA123456789"
        assert manager.active_calls["test_call_1"]["status"] == "initiated"

    def test_generate_stream_twiml(self, mock_twilio_client):
        manager = TwilioCallManager()
        twiml = manager.generate_stream_twiml(
            "test_call_1",
            "wss://example.ngrok.io"
        )

        # Should be valid TwiML
        assert "<Response>" in twiml
        assert "<Connect>" in twiml
        assert "<Stream" in twiml
        assert "wss://example.ngrok.io/media/test_call_1" in twiml

    @pytest.mark.asyncio
    async def test_end_call_success(self, mock_twilio_client):
        manager = TwilioCallManager()
        manager.active_calls["test_call_1"] = {
            "sid": "CA123456789",
            "status": "in-progress"
        }

        result = await manager.end_call("test_call_1")

        assert result is True
        mock_twilio_client.return_value.calls.return_value.update.assert_called_once_with(
            status="completed"
        )

    @pytest.mark.asyncio
    async def test_end_call_not_found(self, mock_twilio_client):
        manager = TwilioCallManager()

        result = await manager.end_call("nonexistent_call")

        assert result is False

    @pytest.mark.asyncio
    async def test_end_call_error_handling(self, mock_twilio_client):
        mock_twilio_client.return_value.calls.return_value.update.side_effect = Exception(
            "API Error"
        )

        manager = TwilioCallManager()
        manager.active_calls["test_call_1"] = {
            "sid": "CA123456789",
            "status": "in-progress"
        }

        result = await manager.end_call("test_call_1")

        assert result is False

    def test_update_call_status(self, mock_twilio_client):
        manager = TwilioCallManager()
        manager.active_calls["test_call_1"] = {
            "sid": "CA123456789",
            "status": "initiated"
        }

        manager.update_call_status("test_call_1", "in-progress")

        assert manager.active_calls["test_call_1"]["status"] == "in-progress"

    def test_update_call_status_nonexistent(self, mock_twilio_client):
        manager = TwilioCallManager()

        # Should not raise error
        manager.update_call_status("nonexistent", "completed")


class TestTwilioMediaStreamHandler:
    """Tests for TwilioMediaStreamHandler."""

    @pytest.fixture
    def handler(self):
        on_audio = Mock()
        on_connected = Mock()
        on_disconnected = Mock()

        return TwilioMediaStreamHandler(
            call_id="test_call_1",
            on_audio_received=on_audio,
            on_stream_connected=on_connected,
            on_stream_disconnected=on_disconnected
        )

    def test_init(self, handler):
        assert handler.call_id == "test_call_1"
        assert handler.stream_sid is None
        assert handler.websocket is None

    @pytest.mark.asyncio
    async def test_handle_connected_message(self, handler):
        message = json.dumps({"event": "connected"})

        await handler.handle_message(message)

        # Should not raise error
        assert handler.stream_sid is None  # Not set on connected

    @pytest.mark.asyncio
    async def test_handle_start_message(self, handler):
        message = json.dumps({
            "event": "start",
            "streamSid": "MZ123456789"
        })

        await handler.handle_message(message)

        assert handler.stream_sid == "MZ123456789"
        handler.on_stream_connected.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_media_message(self, handler):
        import base64
        audio_data = b"test audio data"
        encoded = base64.b64encode(audio_data).decode("utf-8")

        message = json.dumps({
            "event": "media",
            "media": {
                "payload": encoded
            }
        })

        await handler.handle_message(message)

        handler.on_audio_received.assert_called_once_with(audio_data)

    @pytest.mark.asyncio
    async def test_handle_stop_message(self, handler):
        message = json.dumps({"event": "stop"})

        await handler.handle_message(message)

        handler.on_stream_disconnected.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_audio(self, handler):
        import base64

        handler.stream_sid = "MZ123456789"
        handler.websocket = AsyncMock()

        audio_data = b"test audio"
        await handler.send_audio(audio_data)

        handler.websocket.send_text.assert_called_once()
        call_arg = handler.websocket.send_text.call_args[0][0]
        message = json.loads(call_arg)

        assert message["event"] == "media"
        assert message["streamSid"] == "MZ123456789"
        assert base64.b64decode(message["media"]["payload"]) == audio_data

    @pytest.mark.asyncio
    async def test_send_audio_no_websocket(self, handler):
        # Should not raise error if websocket is None
        await handler.send_audio(b"test")

    @pytest.mark.asyncio
    async def test_send_audio_no_stream_sid(self, handler):
        handler.websocket = AsyncMock()
        # stream_sid is None

        await handler.send_audio(b"test")

        handler.websocket.send_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_mark(self, handler):
        handler.stream_sid = "MZ123456789"
        handler.websocket = AsyncMock()

        await handler.send_mark("mark_1")

        handler.websocket.send_text.assert_called_once()
        call_arg = handler.websocket.send_text.call_args[0][0]
        message = json.loads(call_arg)

        assert message["event"] == "mark"
        assert message["streamSid"] == "MZ123456789"
        assert message["mark"]["name"] == "mark_1"

    @pytest.mark.asyncio
    async def test_clear_audio(self, handler):
        handler.stream_sid = "MZ123456789"
        handler.websocket = AsyncMock()

        await handler.clear_audio()

        handler.websocket.send_text.assert_called_once()
        call_arg = handler.websocket.send_text.call_args[0][0]
        message = json.loads(call_arg)

        assert message["event"] == "clear"
        assert message["streamSid"] == "MZ123456789"
