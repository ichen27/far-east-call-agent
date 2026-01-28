"""
Tests for the configuration module.
"""

import pytest
import os
from unittest.mock import patch


class TestConfigDefaults:
    """Tests for configuration default values.

    Note: These tests verify the config module has the expected keys.
    Default values may be overridden by a .env file in the project.
    """

    def test_twilio_config_keys_exist(self):
        import config as cfg

        # Config should have these keys defined
        assert hasattr(cfg, 'TWILIO_ACCOUNT_SID')
        assert hasattr(cfg, 'TWILIO_AUTH_TOKEN')
        assert hasattr(cfg, 'TWILIO_PHONE_NUMBER')

    def test_openai_config_keys_exist(self):
        import config as cfg

        assert hasattr(cfg, 'OPENAI_API_KEY')
        assert hasattr(cfg, 'OPENAI_REALTIME_URL')
        assert "realtime" in cfg.OPENAI_REALTIME_URL
        assert "gpt-4o" in cfg.OPENAI_REALTIME_URL

    def test_server_config_keys_exist(self):
        import config as cfg

        assert hasattr(cfg, 'WEBHOOK_HOST')
        assert hasattr(cfg, 'WEBHOOK_PORT')

    def test_test_config_keys_exist(self):
        import config as cfg

        assert hasattr(cfg, 'MAX_CALL_DURATION_SECONDS')
        assert hasattr(cfg, 'TARGET_CALL_DURATION_SECONDS')
        assert hasattr(cfg, 'CONCURRENT_CALLS')
        assert hasattr(cfg, 'TRANSCRIPT_GRACE_PERIOD_SECONDS')

    def test_default_audio_config(self):
        import config as cfg

        # Twilio audio format
        assert cfg.AUDIO_FORMAT["sample_rate"] == 8000
        assert cfg.AUDIO_FORMAT["channels"] == 1
        assert cfg.AUDIO_FORMAT["encoding"] == "mulaw"

        # OpenAI audio format
        assert cfg.OPENAI_AUDIO_FORMAT["sample_rate"] == 24000
        assert cfg.OPENAI_AUDIO_FORMAT["channels"] == 1
        assert cfg.OPENAI_AUDIO_FORMAT["encoding"] == "pcm16"


class TestConfigFromEnv:
    """Tests for loading config from environment variables."""

    def test_twilio_config_from_env(self):
        env_vars = {
            "TWILIO_ACCOUNT_SID": "test_sid_123",
            "TWILIO_AUTH_TOKEN": "test_token_456",
            "TWILIO_PHONE_NUMBER": "+15551234567"
        }

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert cfg.TWILIO_ACCOUNT_SID == "test_sid_123"
            assert cfg.TWILIO_AUTH_TOKEN == "test_token_456"
            assert cfg.TWILIO_PHONE_NUMBER == "+15551234567"

    def test_openai_config_from_env(self):
        env_vars = {
            "OPENAI_API_KEY": "sk-test-key-123"
        }

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert cfg.OPENAI_API_KEY == "sk-test-key-123"

    def test_server_config_from_env(self):
        env_vars = {
            "WEBHOOK_HOST": "https://example.ngrok.io",
            "WEBHOOK_PORT": "9000"
        }

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert cfg.WEBHOOK_HOST == "https://example.ngrok.io"
            assert cfg.WEBHOOK_PORT == 9000

    def test_test_config_from_env(self):
        env_vars = {
            "MAX_CALL_DURATION_SECONDS": "300",
            "TARGET_CALL_DURATION_SECONDS": "150",
            "CONCURRENT_CALLS": "5",
            "TRANSCRIPT_GRACE_PERIOD_SECONDS": "15"
        }

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert cfg.MAX_CALL_DURATION_SECONDS == 300
            assert cfg.TARGET_CALL_DURATION_SECONDS == 150
            assert cfg.CONCURRENT_CALLS == 5
            assert cfg.TRANSCRIPT_GRACE_PERIOD_SECONDS == 15

    def test_target_phone_from_env(self):
        env_vars = {
            "TARGET_PHONE_NUMBER": "+19998887777"
        }

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert cfg.TARGET_PHONE_NUMBER == "+19998887777"


class TestConfigTypes:
    """Tests for config value types."""

    def test_port_is_integer(self):
        env_vars = {"WEBHOOK_PORT": "8080"}

        with patch.dict(os.environ, env_vars, clear=False):
            import importlib
            import config as cfg
            importlib.reload(cfg)

            assert isinstance(cfg.WEBHOOK_PORT, int)

    def test_durations_are_integers(self):
        import importlib
        import config as cfg
        importlib.reload(cfg)

        assert isinstance(cfg.MAX_CALL_DURATION_SECONDS, int)
        assert isinstance(cfg.TARGET_CALL_DURATION_SECONDS, int)
        assert isinstance(cfg.TRANSCRIPT_GRACE_PERIOD_SECONDS, int)

    def test_concurrent_calls_is_integer(self):
        import importlib
        import config as cfg
        importlib.reload(cfg)

        assert isinstance(cfg.CONCURRENT_CALLS, int)

    def test_audio_format_is_dict(self):
        import importlib
        import config as cfg
        importlib.reload(cfg)

        assert isinstance(cfg.AUDIO_FORMAT, dict)
        assert isinstance(cfg.OPENAI_AUDIO_FORMAT, dict)
