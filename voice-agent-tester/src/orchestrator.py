"""
Orchestrator - Manages multiple concurrent test calls.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Type

from .twilio_handler import TwilioCallManager
from .test_caller import TestCaller
from .metrics import CallMetrics
from .scenarios.base import BaseScenario
from .scenarios import ALL_SCENARIOS
from .report_generator import ReportGenerator

import config


class TestOrchestrator:
    """
    Orchestrates multiple concurrent test calls.

    Manages:
    - Initiating calls to the target number
    - Assigning scenarios to each caller
    - Collecting metrics from all calls
    - Generating final report
    """

    def __init__(
        self,
        target_number: str = config.TARGET_PHONE_NUMBER,
        webhook_base_url: str = None,
        scenarios: List[Type[BaseScenario]] = None
    ):
        self.target_number = target_number
        self.webhook_base_url = webhook_base_url or f"https://{config.WEBHOOK_HOST}"

        # Use provided scenarios or all available
        self.scenario_classes = scenarios or ALL_SCENARIOS

        # Components
        self.twilio_manager = TwilioCallManager()
        self.report_generator = ReportGenerator()

        # Active test callers
        self.test_callers: Dict[str, TestCaller] = {}

        # Pre-assigned scenarios (before WebSocket connects)
        self._call_scenarios: Dict[str, BaseScenario] = {}

        # Results
        self.completed_metrics: List[CallMetrics] = []

        # Run info
        self.run_id: Optional[str] = None
        self.run_start_time: Optional[datetime] = None
        self.run_end_time: Optional[datetime] = None

        # Expected number of calls for this run
        self._expected_calls: int = 0
        self._auto_report: bool = True

    async def run_tests(self, num_concurrent: int = None, stagger_seconds: float = 5.0) -> str:
        """
        Run the test suite with concurrent calls.

        Args:
            num_concurrent: Number of concurrent calls to make (defaults to config.CONCURRENT_CALLS)
            stagger_seconds: Seconds to wait between initiating calls

        Returns:
            Path to the generated report
        """
        # Use config value if not specified
        if num_concurrent is None:
            num_concurrent = config.CONCURRENT_CALLS

        self.run_id = str(uuid.uuid4())[:8]
        self.run_start_time = datetime.now()
        self._expected_calls = num_concurrent
        self.completed_metrics = []  # Reset for new run

        print(f"\n{'='*60}")
        print(f"Starting Test Run: {self.run_id}")
        print(f"Target: {self.target_number}")
        print(f"Concurrent Calls: {num_concurrent}")
        print(f"{'='*60}\n")

        # Create scenarios for each call
        scenarios_to_run = []
        for i in range(num_concurrent):
            scenario_class = self.scenario_classes[i % len(self.scenario_classes)]
            scenarios_to_run.append(scenario_class())

        # Initiate all calls
        call_tasks = []
        for i, scenario in enumerate(scenarios_to_run):
            call_id = f"{self.run_id}-{i+1:02d}-{scenario.config.name[:10]}"

            # Store the scenario mapping (WebSocket will retrieve this)
            self._call_scenarios[call_id] = scenario

            # Create test caller
            test_caller = TestCaller(call_id, scenario)
            self.test_callers[call_id] = test_caller

            # Initiate the call
            print(f"[{call_id}] 📞 Initiating call for scenario: {scenario.config.name}")
            print(f"[{call_id}] 📞 Target: {self.target_number}, Webhook: {self.webhook_base_url}")
            try:
                call_sid = await self.twilio_manager.initiate_call(
                    call_id=call_id,
                    target_number=self.target_number,
                    webhook_url=self.webhook_base_url
                )
                print(f"[{call_id}] ✅ Call initiated, Twilio SID: {call_sid}")
            except Exception as e:
                print(f"[{call_id}] ❌ Failed to initiate call: {e}")
                import traceback
                traceback.print_exc()
                continue

            # Stagger calls to avoid overwhelming the system
            if i < len(scenarios_to_run) - 1:
                await asyncio.sleep(stagger_seconds)

        # Wait for all calls to complete (handled by webhook server)
        print("\nCalls initiated. Waiting for calls to complete...")
        print("(Calls will be processed via webhook server)\n")

        return self.run_id

    def register_test_caller(self, call_id: str, test_caller: TestCaller):
        """Register a test caller (called by webhook server)."""
        self.test_callers[call_id] = test_caller

    def get_test_caller(self, call_id: str) -> Optional[TestCaller]:
        """Get a test caller by ID."""
        return self.test_callers.get(call_id)

    def get_scenario_for_call(self, call_id: str) -> Optional[BaseScenario]:
        """Get the scenario assigned to a call."""
        # First check if we have a test caller already
        if call_id in self.test_callers:
            return self.test_callers[call_id].scenario

        # Check pre-assigned scenarios
        if call_id in self._call_scenarios:
            return self._call_scenarios[call_id]

        # Parse call_id to determine scenario
        # Format: {run_id}-{num:02d}-{scenario_name_prefix}
        # Example: abc12345-01-regular_or
        parts = call_id.split("-")
        if len(parts) >= 2:
            try:
                # The second part should be the call number (01, 02, etc.)
                call_num = int(parts[1]) - 1
                if 0 <= call_num < len(self.scenario_classes):
                    return self.scenario_classes[call_num]()
            except (ValueError, IndexError):
                pass

        # Default to first scenario
        return self.scenario_classes[0]() if self.scenario_classes else None

    def on_call_completed(self, call_id: str, metrics: CallMetrics):
        """Handle completion of a test call."""
        self.completed_metrics.append(metrics)
        print(f"\n[{call_id}] {'='*50}")
        print(f"[{call_id}] 📊 CALL METRICS COLLECTED")
        print(f"[{call_id}] {'='*50}")
        print(f"[{call_id}] Progress: {len(self.completed_metrics)}/{self._expected_calls} calls complete")
        print(f"[{call_id}] Duration: {metrics.duration_seconds:.1f}s")
        print(f"[{call_id}] Transcript entries: {len(metrics.transcript)}")
        print(f"[{call_id}] Disconnect reason: {metrics.disconnect_reason}")
        print(f"[{call_id}] Compliance score: {metrics.compliance.calculate_compliance_score()}/100")
        print(f"[{call_id}] {'='*50}\n")

        # Check if all calls are done
        if len(self.completed_metrics) >= self._expected_calls:
            self.run_end_time = datetime.now()
            print(f"\n{'='*60}")
            print(f"All {len(self.completed_metrics)} calls completed!")
            print(f"{'='*60}\n")

            # Auto-generate report
            if self._auto_report:
                try:
                    json_path, md_path = self.generate_report()
                    print(f"\nReports automatically generated:")
                    print(f"  JSON: {json_path}")
                    print(f"  Markdown: {md_path}")
                    self._print_summary()
                except Exception as e:
                    print(f"Error generating report: {e}")

    def _print_summary(self):
        """Print a summary of the test results."""
        summary = self.get_summary()
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Calls: {summary.get('total_calls', 0)}")
        print(f"Avg Duration: {summary.get('avg_duration_seconds', 0):.1f}s")
        print(f"Avg Latency: {summary.get('avg_latency_ms', 0):.0f}ms")
        print(f"Avg Compliance Score: {summary.get('avg_compliance_score', 0):.0f}/100")
        print(f"{'='*60}\n")

    def generate_report(self, output_dir: str = "reports") -> tuple:
        """
        Generate the final test report.

        Returns:
            Tuple of (json_path, markdown_path)
        """
        return self.report_generator.generate(
            run_id=self.run_id,
            start_time=self.run_start_time,
            end_time=self.run_end_time or datetime.now(),
            metrics=self.completed_metrics,
            output_dir=output_dir
        )

    def get_summary(self) -> dict:
        """Get a summary of the current test run."""
        if not self.completed_metrics:
            return {"status": "no_results"}

        total_calls = len(self.completed_metrics)
        avg_duration = sum(m.duration_seconds for m in self.completed_metrics) / total_calls
        avg_latency = sum(m.avg_latency_ms for m in self.completed_metrics) / total_calls

        compliance_scores = [m.compliance.calculate_compliance_score() for m in self.completed_metrics]
        avg_compliance = sum(compliance_scores) / total_calls

        return {
            "run_id": self.run_id,
            "total_calls": total_calls,
            "avg_duration_seconds": round(avg_duration, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "avg_compliance_score": round(avg_compliance, 2),
            "calls_by_scenario": {
                m.scenario_name: {
                    "duration": m.duration_seconds,
                    "latency": m.avg_latency_ms,
                    "compliance": m.compliance.calculate_compliance_score()
                }
                for m in self.completed_metrics
            }
        }
