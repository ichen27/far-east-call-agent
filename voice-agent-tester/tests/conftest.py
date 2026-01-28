"""
Pytest configuration and shared fixtures for voice-agent-tester tests.
"""

import pytest
import sys
import os
from datetime import datetime
from unittest.mock import patch

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    env_vars = {
        "TWILIO_ACCOUNT_SID": "test_account_sid",
        "TWILIO_AUTH_TOKEN": "test_auth_token",
        "TWILIO_PHONE_NUMBER": "+15555555555",
        "OPENAI_API_KEY": "test_openai_key",
        "TARGET_PHONE_NUMBER": "+16072038989",
        "WEBHOOK_HOST": "localhost",
        "WEBHOOK_PORT": "8000",
        "MAX_CALL_DURATION_SECONDS": "180",
        "TARGET_CALL_DURATION_SECONDS": "120",
        "CONCURRENT_CALLS": "2",
        "TRANSCRIPT_GRACE_PERIOD_SECONDS": "10",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def sample_transcript_entries():
    """Sample transcript entries for testing."""
    from src.metrics import TranscriptEntry, Speaker

    return [
        TranscriptEntry(
            timestamp=1000.0,
            speaker=Speaker.AGENT,
            text="Hello, this is Far East Chinese Restaurant. How can I help you?",
            audio_duration_ms=3000
        ),
        TranscriptEntry(
            timestamp=1005.0,
            speaker=Speaker.CUSTOMER,
            text="Hi, I'd like to place an order for pickup please.",
            audio_duration_ms=2500
        ),
        TranscriptEntry(
            timestamp=1010.0,
            speaker=Speaker.AGENT,
            text="Sure, what would you like to order?",
            audio_duration_ms=2000
        ),
        TranscriptEntry(
            timestamp=1015.0,
            speaker=Speaker.CUSTOMER,
            text="I'll have the General Tso's Chicken.",
            audio_duration_ms=2000
        ),
        TranscriptEntry(
            timestamp=1020.0,
            speaker=Speaker.AGENT,
            text="Would you like that as a pint or quart?",
            audio_duration_ms=2000
        ),
    ]


@pytest.fixture
def sample_call_metrics():
    """Sample CallMetrics for testing."""
    from src.metrics import CallMetrics, Speaker, SystemPromptCompliance

    metrics = CallMetrics(
        call_id="test_call_123",
        scenario_name="regular_order"
    )
    metrics.start_time = 1000.0
    metrics.end_time = 1120.0

    # Add transcript entries
    metrics.add_transcript_entry(
        Speaker.AGENT,
        "Hello, this is Far East Chinese Restaurant."
    )
    metrics.mark_customer_speech_end()
    metrics.add_transcript_entry(
        Speaker.CUSTOMER,
        "Hi, I'd like to order pickup."
    )

    # Set compliance
    metrics.compliance.greeted_properly = True
    metrics.compliance.asked_for_size = True
    metrics.compliance.asked_for_phone_number = True

    return metrics


@pytest.fixture
def sample_datetime():
    """Sample datetime for testing."""
    return datetime(2024, 1, 15, 10, 30, 0)


@pytest.fixture
def temp_reports_dir(tmp_path):
    """Create a temporary directory for test reports."""
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir()
    return str(reports_dir)
