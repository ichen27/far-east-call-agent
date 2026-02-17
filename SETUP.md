# Far East Call Agent v2 - Setup Guide

This guide covers all API keys, services, and configuration needed for the improved voice agent system.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ichen27/far-east-call-agent.git
cd far-east-call-agent

# 2. Copy environment template
cp backend/src/.env.example backend/src/.env

# 3. Fill in your API keys (see sections below)
nano backend/src/.env

# 4. Install dependencies
cd backend/src && npm install

# 5. Initialize database
node initDatabase.js

# 6. Start the server
npm run dev
```

---

## Required API Keys

### 1. OpenAI (Primary AI Provider)

**Purpose**: Realtime voice-to-voice conversations using GPT-4o Realtime.

**Get your key**:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key with these permissions:
   - Models: `gpt-4o-realtime-preview-*`
   - Organization access (if applicable)

**Cost estimate**: ~$0.30/minute (audio in + audio out)

**Environment variable**:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Verify access**:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[] | select(.id | contains("realtime"))'
```

---

### 2. Twilio (Telephony)

**Purpose**: Phone number, voice calls, SMS confirmations.

**Get your credentials**:
1. Create account at https://www.twilio.com/try-twilio
2. Go to Console Dashboard → Account Info
3. Copy Account SID and Auth Token
4. Buy a phone number with Voice + SMS capabilities

**Cost estimate**:
- Phone number: ~$1.15/month
- Voice calls: ~$0.0085/minute
- SMS: ~$0.0079/message

**Environment variables**:
```env
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phone number for outbound SMS
TWILIO_PHONE_NUMBER=+16075551234

# Optional: Staff phone for human transfer
STAFF_PHONE_NUMBER=+16075555678
```

**Configure Twilio webhook**:
1. Go to Phone Numbers → Manage → Active Numbers
2. Click your number
3. Under "Voice & Fax", set webhook:
   - **A Call Comes In**: Webhook, `https://your-domain.com/incoming-call`
   - **HTTP POST**

---

### 3. ElevenLabs (Fallback TTS - Recommended)

**Purpose**: Fallback voice synthesis with higher quality voices.

**Get your key**:
1. Create account at https://elevenlabs.io
2. Go to Profile Settings → API Keys
3. Create a new API key

**Cost estimate**: ~$0.30/1000 characters (Creator plan)

**Environment variable**:
```env
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Specific voice ID (default: "Rachel")
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Test your key**:
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from Far East Kitchen", "model_id": "eleven_monolingual_v1"}' \
  --output test.mp3
```

---

### 4. Deepgram (Alternative STT - Optional)

**Purpose**: Fast, accurate speech-to-text for transcription and backup.

**Get your key**:
1. Create account at https://console.deepgram.com
2. Go to Settings → API Keys
3. Create a new key with "Full Access"

**Cost estimate**: $0.0059/minute (Nova-3 model)

**Environment variable**:
```env
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Test your key**:
```bash
curl -X POST "https://api.deepgram.com/v1/listen?model=nova-3" \
  -H "Authorization: Token $DEEPGRAM_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @test.wav
```

---

## Optional Services

### Redis (Session Storage)

**Purpose**: Distributed session state for horizontal scaling.

**Local development**:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis
redis-server
```

**Production (Upstash)**:
1. Create account at https://upstash.com
2. Create a Redis database
3. Copy the connection URL

**Environment variable**:
```env
REDIS_URL=redis://default:xxxx@xxxxx.upstash.io:6379
```

---

### Prometheus + Grafana (Metrics)

**Purpose**: Latency monitoring and dashboards.

**Docker Compose setup**:
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'voice-agent'
    static_configs:
      - targets: ['host.docker.internal:3000']
```

---

### PagerDuty (Alerting)

**Purpose**: On-call alerting for production incidents.

**Setup**:
1. Create account at https://www.pagerduty.com
2. Create a service for "Far East Voice Agent"
3. Create an integration (Events API v2)
4. Copy the integration key

**Environment variable**:
```env
PAGERDUTY_INTEGRATION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Complete Environment File

```env
# ===========================================
# FAR EAST CALL AGENT - ENVIRONMENT CONFIG
# ===========================================

# ----- REQUIRED -----

# OpenAI - Primary AI for voice conversations
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio - Phone and SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+16075551234

# WebSocket URL for Twilio media stream
# Format: wss://your-domain.com/media-stream
TWILIO_MEDIA_STREAM_URL=wss://fe-local-call.fareastbackend.us/media-stream

# ----- RECOMMENDED -----

# ElevenLabs - Fallback TTS (higher quality voices)
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Staff phone for human transfer escalation
STAFF_PHONE_NUMBER=+16075555678

# SMS confirmations (uses TWILIO_PHONE_NUMBER)
SMS_ENABLED=true

# ----- OPTIONAL -----

# Deepgram - Alternative STT
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Redis - Session storage (required for horizontal scaling)
REDIS_URL=redis://localhost:6379

# Database path (default: ./fareast.db)
DB_PATH=./data/fareast.db

# ----- SERVER CONFIG -----

# Server ports
VOICE_PORT=3000
CHAT_PORT=3001
SOCKET_PORT=8080

# Voice agent timeouts
MAX_CALL_DURATION=600000       # 10 minutes in ms
CALL_TIMEOUT_WARNING=540000    # 9 minutes in ms
IDLE_TIMEOUT=120000            # 2 minutes in ms
HANGUP_DELAY=5000              # 5 seconds in ms

# ----- CHAT CONFIG -----

# Chat model (used for testing)
CHAT_MODEL=gpt-4o

# ----- OBSERVABILITY -----

# PagerDuty (production alerting)
PAGERDUTY_INTEGRATION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# ----- SECURITY -----

# CORS allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,https://your-frontend.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

---

## Voice Agent Tester Setup

The test harness requires additional configuration:

```bash
cd voice-agent-tester

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

**Tester environment variables**:
```env
# Same Twilio credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+16075551234

# Same OpenAI key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Target phone number (your voice agent)
TARGET_PHONE_NUMBER=+16072038989

# Webhook for test audio
WEBHOOK_HOST=your-subdomain.ngrok.io
WEBHOOK_PORT=8000

# Test configuration
CONCURRENT_CALLS=2
MAX_CALL_DURATION_SECONDS=180
TARGET_CALL_DURATION_SECONDS=120
```

---

## Deployment Checklist

### Development
- [x] OpenAI API key with Realtime access
- [x] Twilio account with phone number
- [x] ngrok for webhook testing
- [ ] Local SQLite database

### Staging
- [ ] ElevenLabs API key (fallback TTS)
- [ ] Redis instance (Upstash or local)
- [ ] Prometheus + Grafana for metrics
- [ ] SSL certificates for webhooks

### Production
- [ ] All staging requirements
- [ ] PostgreSQL database (if >100 orders/hour)
- [ ] PagerDuty for alerting
- [ ] Load balancer (nginx/Cloudflare)
- [ ] Rate limiting configured
- [ ] Backup strategy for database
- [ ] Log aggregation (e.g., Datadog, Logtail)

---

## Cost Estimation by Scale

### Low Volume (100 calls/month)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| OpenAI Realtime | 100 calls × 3 min | ~$90 |
| Twilio Voice | 100 calls × 3 min | ~$2.55 |
| Twilio SMS | 100 messages | ~$0.79 |
| Twilio Phone | 1 number | ~$1.15 |
| **Total** | | **~$95/month** |

### Medium Volume (500 calls/month)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| OpenAI Realtime | 500 calls × 3 min | ~$450 |
| ElevenLabs (5%) | 25 calls × 3 min | ~$26 |
| Twilio Voice | 500 calls × 3 min | ~$12.75 |
| Twilio SMS | 500 messages | ~$3.95 |
| Twilio Phone | 1 number | ~$1.15 |
| Redis (Upstash) | Hobby tier | ~$10 |
| **Total** | | **~$504/month** |

### High Volume (2000 calls/month)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| OpenAI Realtime | 2000 calls × 3 min | ~$1,800 |
| ElevenLabs (5%) | 100 calls × 3 min | ~$104 |
| Deepgram (analytics) | 2000 calls × 3 min | ~$35 |
| Twilio Voice | 2000 calls × 3 min | ~$51 |
| Twilio SMS | 2000 messages | ~$15.80 |
| Twilio Phone | 1 number | ~$1.15 |
| Redis (Upstash) | Pro tier | ~$25 |
| PostgreSQL (managed) | Basic | ~$15 |
| Monitoring | Basic | ~$10 |
| **Total** | | **~$2,057/month** |

---

## Troubleshooting

### "OpenAI Realtime API not available"
- Ensure your API key has access to `gpt-4o-realtime-preview-*` models
- Check you're not on a free tier (Realtime requires paid plan)
- Verify with: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### "Twilio webhook not receiving calls"
- Ensure webhook URL is publicly accessible (use ngrok for local dev)
- Check Twilio console for error logs
- Verify SSL certificate is valid (Twilio requires HTTPS)
- Test with: `curl -X POST https://your-domain.com/incoming-call`

### "WebSocket connection failing"
- Check that `TWILIO_MEDIA_STREAM_URL` uses `wss://` (not `ws://` in production)
- Verify firewall allows WebSocket connections
- Check for proxy/load balancer WebSocket support

### "No audio from agent"
- Verify OpenAI API key has Realtime access
- Check Twilio Media Stream is connected
- Review server logs for `[Voice]` entries
- Ensure audio codec matches (mulaw, 8000Hz)

### "SMS not sending"
- Verify `TWILIO_PHONE_NUMBER` is SMS-capable
- Check Twilio console for SMS logs
- Ensure phone number format is correct (+1XXXXXXXXXX)

---

## Support

- **OpenAI**: https://help.openai.com
- **Twilio**: https://support.twilio.com
- **ElevenLabs**: https://elevenlabs.io/contact
- **Deepgram**: https://developers.deepgram.com/support

For project-specific issues, check the GitHub repository issues or create a new one.
