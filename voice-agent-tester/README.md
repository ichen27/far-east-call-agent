# Voice Agent Tester

A comprehensive testing system for voice-based AI agents. This tool initiates concurrent phone calls using AI-powered test customers to evaluate your voice agent's performance, response latency, and compliance with its system prompt.

## Features

- **Concurrent Test Calls**: Stress test your agent with simultaneous callers (default: 2, configurable up to 10)
- **10 Unique Test Scenarios**: Including regular orders, impatient customers, rude customers, off-menu requests, delivery requests, prompt injection attempts, and more
- **Comprehensive Metrics**:
  - Full conversation transcripts
  - Response latency measurements (customer speech end to agent speech start)
  - System prompt compliance scoring
  - Guardrail violation detection
- **Dual Report Formats**: JSON for programmatic analysis, Markdown for human review

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Test Orchestrator                               │
│   - Spawns concurrent AI "customers" (default: 2, max: 10)          │
│   - Assigns unique test scenarios to each                           │
│   - Aggregates metrics into final report                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Test Caller 1│     │  Test Caller 2│ ... │  Test Caller 10│
│  (Scenario A) │     │  (Scenario B) │     │  (Scenario J) │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Twilio                                       │
│   - Initiates outbound calls                                        │
│   - Streams audio bidirectionally via Media Streams                 │
└─────────────────────────────────────────────────────────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Your Voice Agent                                   │
│   (The system being tested)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Python 3.11+**
2. **Twilio Account** with:
   - Account SID
   - Auth Token
   - A phone number capable of making outbound calls
3. **OpenAI API Key** with Realtime API access
4. **ngrok** (for exposing local webhook server)

## Installation

1. Clone or download this project:
```bash
cd voice-agent-tester
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy the environment template and fill in your credentials:
```bash
cp .env.example .env
```

5. Edit `.env` with your actual values:
```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number

# OpenAI Credentials
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxx

# Target (your voice agent's phone number)
TARGET_PHONE_NUMBER=+16072038989

# Server Configuration
WEBHOOK_HOST=your-subdomain.ngrok.io  # Will be set after starting ngrok
WEBHOOK_PORT=8000

# Test Configuration (optional - these are the defaults)
CONCURRENT_CALLS=2                    # Number of simultaneous test calls
MAX_CALL_DURATION_SECONDS=180         # Hard limit per call (3 minutes)
TARGET_CALL_DURATION_SECONDS=120      # Soft target for AI customer
TRANSCRIPT_GRACE_PERIOD_SECONDS=10    # Wait time for final transcripts
```

## Quick Start

### Step 1: Start ngrok

In a separate terminal, start ngrok to expose your local server:

```bash
ngrok http 8000
```

Copy the forwarding URL (e.g., `abc123.ngrok.io`) and update `WEBHOOK_HOST` in your `.env` file.

### Step 2: Start the Webhook Server

```bash
python -m src.main --mode server
```

This starts the FastAPI server that handles Twilio webhooks.

### Step 3: Initiate Test Calls

In another terminal (or use the API):

```bash
# Using curl (uses defaults: 2 calls, 5 second stagger)
curl -X POST "http://localhost:8000/start-test"

# Or specify custom values
curl -X POST "http://localhost:8000/start-test?num_calls=5&stagger_seconds=3"

# Or run all-in-one CLI mode (starts server and tests)
python3 -m src.main --mode test --calls 5
```

### Step 4: Monitor and Generate Report

```bash
# Check status
curl http://localhost:8000/status

# Generate report after calls complete
curl -X POST http://localhost:8000/generate-report
```

## Test Scenarios

| # | Scenario | Description |
|---|----------|-------------|
| 1 | Regular Order | Baseline - friendly customer, simple 2-item order |
| 2 | Impatient Customer | Rushed customer who wants to order quickly |
| 3 | Rude Customer | Difficult customer, tests tone maintenance |
| 4 | Off-Menu Request | Asks for items not on the menu (pad thai, sushi) |
| 5 | Delivery Request | Requests delivery (restaurant is takeout only) |
| 6 | Prompt Injection | Attempts to manipulate the AI agent |
| 7 | Indecisive Customer | Changes order multiple times |
| 8 | Complex Substitution | Multiple modifications and substitutions |
| 9 | Specialty Item (A1-A8) | Tests the special options flow |
| 10 | Allergen/Medical | Health questions (tests medical advice guardrail) |

## Metrics Collected

### Per-Call Metrics

```json
{
  "call_id": "abc123-01-regular",
  "scenario_name": "regular_order",
  "duration_seconds": 127.5,
  "turn_count": 12,
  "transcript": [...],
  "latency_metrics": {
    "avg_latency_ms": 450,
    "max_latency_ms": 890,
    "min_latency_ms": 230,
    "measurements": [...]
  },
  "system_prompt_compliance": {
    "greeted_properly": true,
    "asked_for_size": true,
    "asked_for_phone_number": true,
    "summarized_order_once": true,
    "offered_delivery": false,
    "gave_medical_advice": false
  },
  "compliance_score": 85
}
```

### Aggregate Summary

- Average call duration
- Average/max/min response latency
- Compliance score distribution
- Guardrail violation counts
- Per-scenario breakdown

## Report Output

Reports are saved to the `reports/` directory in two formats:

1. **JSON** (`test_report_<run_id>_<timestamp>.json`): Complete structured data
2. **Markdown** (`test_report_<run_id>_<timestamp>.md`): Human-readable summary with:
   - Executive summary
   - Performance metrics table
   - Compliance scores
   - Guardrail violations
   - Per-call details with expandable transcripts

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/start-test` | POST | Initiate test calls |
| `/status` | GET | Get current test run status |
| `/generate-report` | POST | Generate reports from completed calls |
| `/scenarios` | GET | List available test scenarios |
| `/twiml/{call_id}` | POST | Twilio TwiML webhook |
| `/status/{call_id}` | POST | Twilio status callback |
| `/media/{call_id}` | WebSocket | Twilio Media Stream |

## Customizing Scenarios

To add or modify test scenarios, edit files in `src/scenarios/`:

```python
# src/scenarios/my_custom_scenario.py
from .base import BaseScenario, ScenarioConfig

class MyCustomScenario(BaseScenario):
    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="my_custom",
            description="Description of what this tests",
            customer_persona="Who is this customer?",
            expected_behaviors=["What the agent should do"],
            success_criteria=["How to evaluate success"]
        )

    def get_customer_system_prompt(self) -> str:
        return """
        # Customer persona and instructions
        ...
        """
```

Then add it to `src/scenarios/__init__.py`.

## Cost Considerations

### Twilio
- Outbound calls: ~$0.013/minute
- Default (2 calls × 3 min) = ~$0.08 per test run
- Full suite (10 calls × 3 min) = ~$0.40 per test run

### OpenAI Realtime API
- Audio input: $0.06/minute
- Audio output: $0.24/minute
- Default (2 calls × 3 min) = ~$1.80 per test run (estimate)
- Full suite (10 calls × 3 min) = ~$9 per test run (estimate)

**Tip**: The default `MAX_CALL_DURATION_SECONDS` is 180 (3 minutes). Adjust in `.env` if needed.

## Troubleshooting

### "No audio from test customer"
- Check OpenAI API key has Realtime API access
- Verify ngrok is running and URL is correct in `.env`

### "Calls not connecting"
- Verify Twilio credentials
- Check that your Twilio number can make outbound calls
- Ensure target number is correct

### "WebSocket connection failed"
- Make sure ngrok URL uses `wss://` for WebSocket
- Check firewall settings

## License

MIT License - See LICENSE file for details.
