"""
Main entry point - FastAPI server for handling Twilio webhooks and running tests.
"""

import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, Request, Form, BackgroundTasks
from fastapi.responses import PlainTextResponse, JSONResponse
import uvicorn

from src.orchestrator import TestOrchestrator
from src.test_caller import TestCaller
from src.scenarios import ALL_SCENARIOS

import config

# Initialize FastAPI app
app = FastAPI(
    title="Voice Agent Tester",
    description="Test your voice agent with concurrent AI-powered callers"
)

# Global orchestrator instance
orchestrator = TestOrchestrator()


# =============================================================================
# Twilio Webhook Endpoints
# =============================================================================

@app.post("/twiml/{call_id}")
async def twiml_handler(call_id: str):
    """
    Handle Twilio's request for TwiML instructions.
    Tells Twilio to stream audio to our WebSocket.
    """
    websocket_url = f"wss://{config.WEBHOOK_HOST}"
    twiml = orchestrator.twilio_manager.generate_stream_twiml(call_id, websocket_url)
    return PlainTextResponse(content=twiml, media_type="application/xml")


@app.post("/status/{call_id}")
async def status_callback(
    call_id: str,
    CallStatus: str = Form(None),
    CallSid: str = Form(None),
    CallDuration: str = Form(None)
):
    """Handle call status updates from Twilio."""
    print(f"[{call_id}] Status update: {CallStatus}")

    orchestrator.twilio_manager.update_call_status(call_id, CallStatus)

    # Note: Metrics are collected in the WebSocket handler after cleanup
    # This callback just tracks Twilio's status

    return JSONResponse({"status": "ok"})


@app.websocket("/media/{call_id}")
async def media_stream_handler(websocket: WebSocket, call_id: str):
    """
    Handle Twilio Media Stream WebSocket connection.
    This is where the audio flows for each call.
    """
    await websocket.accept()
    print(f"[{call_id}] WebSocket connected")

    # Get or create test caller for this call
    test_caller = orchestrator.get_test_caller(call_id)
    if not test_caller:
        # Create new test caller with appropriate scenario
        scenario = orchestrator.get_scenario_for_call(call_id)
        if scenario:
            test_caller = TestCaller(call_id, scenario)
            orchestrator.register_test_caller(call_id, test_caller)
        else:
            print(f"[{call_id}] No scenario found, closing connection")
            await websocket.close()
            return

    try:
        # Run the test caller
        await test_caller.run(websocket)
    except Exception as e:
        print(f"[{call_id}] Error in media stream: {e}")
    finally:
        # Collect metrics after cleanup is complete (this is the right time!)
        if test_caller.is_cleanup_complete:
            orchestrator.on_call_completed(call_id, test_caller.get_metrics())

        try:
            await websocket.close()
        except Exception:
            pass  # WebSocket may already be closed
        print(f"[{call_id}] WebSocket closed")


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "running",
        "service": "Voice Agent Tester",
        "target": config.TARGET_PHONE_NUMBER
    }


@app.post("/start-test")
async def start_test(
    background_tasks: BackgroundTasks,
    num_calls: int = None,
    stagger_seconds: float = 5.0
):
    """
    Start a test run with concurrent calls.

    Args:
        num_calls: Number of concurrent calls to make (defaults to CONCURRENT_CALLS config)
        stagger_seconds: Seconds between initiating each call
    """
    # Use config value if not specified
    if num_calls is None:
        num_calls = config.CONCURRENT_CALLS
    num_calls = min(num_calls, len(ALL_SCENARIOS))

    # Run tests in background
    background_tasks.add_task(
        orchestrator.run_tests,
        num_concurrent=num_calls,
        stagger_seconds=stagger_seconds
    )

    return {
        "status": "started",
        "num_calls": num_calls,
        "message": f"Initiating {num_calls} test calls to {config.TARGET_PHONE_NUMBER}"
    }


@app.get("/status")
async def get_status():
    """Get current test run status."""
    return orchestrator.get_summary()


@app.post("/generate-report")
async def generate_report():
    """Generate reports from completed calls."""
    if not orchestrator.completed_metrics:
        return {"error": "No completed calls to report on"}

    json_path, md_path = orchestrator.generate_report()
    return {
        "status": "generated",
        "json_report": json_path,
        "markdown_report": md_path
    }


@app.get("/scenarios")
async def list_scenarios():
    """List available test scenarios."""
    return {
        "scenarios": [
            {
                "name": s().config.name,
                "description": s().config.description
            }
            for s in ALL_SCENARIOS
        ]
    }


# =============================================================================
# Standalone CLI Mode
# =============================================================================

async def run_cli_test(num_calls: int = None):
    """Run tests from command line (without web interface)."""
    # Use config value if not specified
    if num_calls is None:
        num_calls = config.CONCURRENT_CALLS

    print("\n" + "="*60)
    print("Voice Agent Tester - CLI Mode")
    print("="*60 + "\n")

    print(f"Configuration:")
    print(f"  Target Number: {config.TARGET_PHONE_NUMBER}")
    print(f"  Number of Calls: {num_calls}")
    print(f"  Target Call Duration: {config.TARGET_CALL_DURATION_SECONDS}s (soft limit)")
    print(f"  Max Duration: {config.MAX_CALL_DURATION_SECONDS}s per call (hard limit)")
    print(f"  Webhook URL: https://{config.WEBHOOK_HOST}")
    print()

    # Verify configuration
    if config.TWILIO_ACCOUNT_SID.startswith("YOUR_"):
        print("ERROR: Please set your Twilio credentials in .env file")
        return

    if config.OPENAI_API_KEY.startswith("YOUR_"):
        print("ERROR: Please set your OpenAI API key in .env file")
        return

    # Start the test
    run_id = await orchestrator.run_tests(num_concurrent=num_calls)
    print(f"\nTest run started: {run_id}")
    print("Waiting for calls to complete...")

    # Wait for all calls to complete (with timeout)
    timeout = config.MAX_CALL_DURATION_SECONDS + 60  # Extra buffer
    start_time = asyncio.get_event_loop().time()

    while len(orchestrator.completed_metrics) < num_calls:
        await asyncio.sleep(5)
        elapsed = asyncio.get_event_loop().time() - start_time
        print(f"  Completed: {len(orchestrator.completed_metrics)}/{num_calls} ({elapsed:.0f}s elapsed)")

        if elapsed > timeout:
            print("Timeout reached, generating report with available results...")
            break

    # Generate reports
    print("\nGenerating reports...")
    json_path, md_path = orchestrator.generate_report()

    print("\n" + "="*60)
    print("Test Complete!")
    print("="*60)
    print(f"\nReports saved to:")
    print(f"  JSON: {json_path}")
    print(f"  Markdown: {md_path}")

    # Print summary
    summary = orchestrator.get_summary()
    print(f"\nSummary:")
    print(f"  Total Calls: {summary.get('total_calls', 0)}")
    print(f"  Avg Duration: {summary.get('avg_duration_seconds', 0)}s")
    print(f"  Avg Latency: {summary.get('avg_latency_ms', 0)}ms")
    print(f"  Avg Compliance: {summary.get('avg_compliance_score', 0)}/100")


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Voice Agent Tester")
    parser.add_argument(
        "--mode",
        choices=["server", "test"],
        default="server",
        help="Run mode: 'server' for webhook server, 'test' to initiate tests"
    )
    parser.add_argument(
        "--calls",
        type=int,
        default=None,
        help=f"Number of concurrent test calls (default: {config.CONCURRENT_CALLS} from config)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=config.WEBHOOK_PORT,
        help=f"Port for webhook server (default: {config.WEBHOOK_PORT})"
    )

    args = parser.parse_args()

    if args.mode == "server":
        print(f"\nStarting webhook server on port {args.port}...")
        print(f"Make sure ngrok is running: ngrok http {args.port}")
        print(f"Update WEBHOOK_HOST in .env with your ngrok URL")
        print()
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    else:
        # Run tests
        asyncio.run(run_cli_test(args.calls))
