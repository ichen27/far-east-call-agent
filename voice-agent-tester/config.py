import os
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# TWILIO CONFIGURATION
# =============================================================================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "YOUR_TWILIO_ACCOUNT_SID_HERE")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "YOUR_TWILIO_AUTH_TOKEN_HERE")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+1XXXXXXXXXX")

# =============================================================================
# OPENAI CONFIGURATION
# =============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

# =============================================================================
# TARGET CONFIGURATION
# =============================================================================
TARGET_PHONE_NUMBER = os.getenv("TARGET_PHONE_NUMBER", "+16072038989")

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
WEBHOOK_HOST = os.getenv("WEBHOOK_HOST", "localhost")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "8000"))

# =============================================================================
# TEST CONFIGURATION
# =============================================================================
# Hard limit - only used as emergency cutoff if something goes wrong
MAX_CALL_DURATION_SECONDS = int(os.getenv("MAX_CALL_DURATION_SECONDS", "180"))
# Target duration for the AI customer to aim for (used in system prompt)
TARGET_CALL_DURATION_SECONDS = int(os.getenv("TARGET_CALL_DURATION_SECONDS", "120"))
# OpenAI Realtime API has connection limits - keep this low to avoid disconnects
CONCURRENT_CALLS = int(os.getenv("CONCURRENT_CALLS", "2"))
# Grace period for final transcripts after call ends (seconds)
TRANSCRIPT_GRACE_PERIOD_SECONDS = int(os.getenv("TRANSCRIPT_GRACE_PERIOD_SECONDS", "10"))

# =============================================================================
# AUDIO CONFIGURATION (Twilio Media Streams format)
# =============================================================================
AUDIO_FORMAT = {
    "sample_rate": 8000,  # Twilio uses 8kHz
    "channels": 1,
    "encoding": "mulaw"   # Twilio uses mu-law encoding
}

# OpenAI Realtime expects 24kHz PCM16, so we need to resample
OPENAI_AUDIO_FORMAT = {
    "sample_rate": 24000,
    "channels": 1,
    "encoding": "pcm16"
}
