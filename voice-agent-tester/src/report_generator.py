"""
Report Generator - Creates JSON and Markdown reports from test results.
"""

import json
import os
import re
from datetime import datetime
from typing import List
from pathlib import Path

from .metrics import CallMetrics


class ReportGenerator:
    """Generates comprehensive test reports in JSON and Markdown formats."""

    # Status indicators
    STATUS_PASSED = "✅ PASSED"
    STATUS_TIMEOUT = "⚠️ TIMEOUT"
    STATUS_FAILED = "❌ FAILED"
    STATUS_INCOMPLETE = "⚠️ INCOMPLETE"

    def _determine_call_status(self, call: dict) -> tuple:
        """
        Determine the status of a call based on various factors.

        Returns:
            Tuple of (status_string, status_reason)
        """
        disconnect_reason = call.get('disconnect_reason', 'unknown')
        turn_count = call.get('turn_count', 0)
        asked_for_phone = call.get('system_prompt_compliance', {}).get('asked_for_phone_number', False)
        summarized_order = call.get('system_prompt_compliance', {}).get('summarized_order_once', False)

        # No transcript at all - Failed
        if turn_count == 0:
            return self.STATUS_FAILED, "No transcript captured"

        # Hit max duration - Timeout
        if disconnect_reason == 'max_duration_reached':
            return self.STATUS_TIMEOUT, "Hit max duration limit"

        # Check for good disconnect reasons
        good_disconnects = ['phone_disconnected', 'customer_goodbye']
        if disconnect_reason in good_disconnects:
            # Call ended properly, but did it complete the order flow?
            if asked_for_phone or summarized_order:
                return self.STATUS_PASSED, "Call completed successfully"
            else:
                return self.STATUS_INCOMPLETE, "Call ended but order flow incomplete"

        # Other disconnect reasons
        if 'error' in disconnect_reason:
            return self.STATUS_FAILED, f"Error: {disconnect_reason}"

        # Default - incomplete
        return self.STATUS_INCOMPLETE, f"Ended: {disconnect_reason}"

    def generate(
        self,
        run_id: str,
        start_time: datetime,
        end_time: datetime,
        metrics: List[CallMetrics],
        output_dir: str = "reports"
    ) -> tuple:
        """
        Generate both JSON and Markdown reports.

        Args:
            run_id: Unique identifier for this test run
            start_time: When the test run started
            end_time: When the test run ended
            metrics: List of CallMetrics from each call
            output_dir: Directory to save reports

        Returns:
            Tuple of (json_path, markdown_path)
        """
        # Ensure output directory exists
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Handle None start_time (can happen if calls come in without run_tests being called)
        if start_time is None:
            start_time = end_time or datetime.now()
        if end_time is None:
            end_time = datetime.now()

        # Find the next report number by checking existing reports
        next_number = self._get_next_report_number(output_dir)
        base_filename = f"test_report_{next_number}"

        # Generate reports
        json_path = os.path.join(output_dir, f"{base_filename}.json")
        md_path = os.path.join(output_dir, f"{base_filename}.md")

        report_data = self._build_report_data(run_id, start_time, end_time, metrics)

        # Write JSON report
        with open(json_path, "w") as f:
            json.dump(report_data, f, indent=2, default=str)

        # Write Markdown report
        markdown = self._generate_markdown(report_data)
        with open(md_path, "w") as f:
            f.write(markdown)

        print(f"\nReports generated:")
        print(f"  JSON: {json_path}")
        print(f"  Markdown: {md_path}")

        return json_path, md_path

    def _get_next_report_number(self, output_dir: str) -> int:
        """Find the next available report number by scanning existing reports."""
        max_number = 0
        pattern = re.compile(r'^test_report_(\d+)\.json$')

        if os.path.exists(output_dir):
            for filename in os.listdir(output_dir):
                match = pattern.match(filename)
                if match:
                    number = int(match.group(1))
                    max_number = max(max_number, number)

        return max_number + 1

    def _build_report_data(
        self,
        run_id: str,
        start_time: datetime,
        end_time: datetime,
        metrics: List[CallMetrics]
    ) -> dict:
        """Build the complete report data structure."""
        total_duration = (end_time - start_time).total_seconds()

        # Calculate aggregates
        if metrics:
            avg_call_duration = sum(m.duration_seconds for m in metrics) / len(metrics)
            avg_latency = sum(m.avg_latency_ms for m in metrics) / len(metrics)
            max_latency = max(m.max_latency_ms for m in metrics) if metrics else 0
            min_latencies = [m.min_latency_ms for m in metrics if m.min_latency_ms > 0]
            min_latency = min(min_latencies) if min_latencies else 0

            compliance_scores = [m.compliance.calculate_compliance_score() for m in metrics]
            avg_compliance = sum(compliance_scores) / len(compliance_scores)

            # Count behaviors
            greeted_properly = sum(1 for m in metrics if m.compliance.greeted_properly)
            asked_size = sum(1 for m in metrics if m.compliance.asked_for_size)
            asked_phone = sum(1 for m in metrics if m.compliance.asked_for_phone_number)
            summarized = sum(1 for m in metrics if m.compliance.summarized_order_once)

            # Violations
            offered_delivery = sum(1 for m in metrics if m.compliance.offered_delivery)
            gave_medical = sum(1 for m in metrics if m.compliance.gave_medical_advice)
            asked_credit = sum(1 for m in metrics if m.compliance.asked_for_credit_card)

            # Issue counts
            calls_with_no_transcript = sum(1 for m in metrics if len(m.transcript) == 0)
            calls_timed_out = sum(1 for m in metrics if m.disconnect_reason == 'max_duration_reached')
            calls_with_errors = sum(1 for m in metrics if 'error' in (m.disconnect_reason or ''))
        else:
            avg_call_duration = 0
            avg_latency = 0
            max_latency = 0
            min_latency = 0
            avg_compliance = 0
            greeted_properly = 0
            asked_size = 0
            asked_phone = 0
            summarized = 0
            offered_delivery = 0
            gave_medical = 0
            asked_credit = 0
            calls_with_no_transcript = 0
            calls_timed_out = 0
            calls_with_errors = 0

        return {
            "meta": {
                "run_id": run_id,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "total_duration_seconds": total_duration,
                "total_calls": len(metrics),
                "report_generated": datetime.now().isoformat()
            },
            "summary": {
                "performance": {
                    "avg_call_duration_seconds": round(avg_call_duration, 2),
                    "avg_latency_ms": round(avg_latency, 2),
                    "max_latency_ms": round(max_latency, 2),
                    "min_latency_ms": round(min_latency, 2)
                },
                "compliance": {
                    "avg_score": round(avg_compliance, 2),
                    "greeted_properly": f"{greeted_properly}/{len(metrics)}",
                    "asked_for_size": f"{asked_size}/{len(metrics)}",
                    "asked_for_phone": f"{asked_phone}/{len(metrics)}",
                    "summarized_order": f"{summarized}/{len(metrics)}"
                },
                "violations": {
                    "offered_delivery": offered_delivery,
                    "gave_medical_advice": gave_medical,
                    "asked_for_credit_card": asked_credit
                },
                "issues": {
                    "calls_with_no_transcript": calls_with_no_transcript,
                    "calls_timed_out": calls_timed_out,
                    "calls_with_errors": calls_with_errors,
                    "total_issues": calls_with_no_transcript + calls_timed_out + calls_with_errors
                }
            },
            "calls": [m.to_dict() for m in metrics]
        }

    def _generate_markdown(self, data: dict) -> str:
        """Generate a Markdown report from the data."""
        lines = []

        # Header
        lines.append(f"# Voice Agent Test Report")
        lines.append(f"")
        lines.append(f"**Run ID:** {data['meta']['run_id']}")
        lines.append(f"**Date:** {data['meta']['start_time'][:10]}")
        lines.append(f"**Total Calls:** {data['meta']['total_calls']}")
        lines.append(f"**Total Duration:** {data['meta']['total_duration_seconds']:.1f} seconds")
        lines.append(f"")

        # Quick Status Overview
        lines.append(f"## Quick Status Overview")
        lines.append(f"")

        # Count statuses
        status_counts = {"passed": 0, "timeout": 0, "failed": 0, "incomplete": 0}
        for call in data['calls']:
            status, _ = self._determine_call_status(call)
            if "PASSED" in status:
                status_counts["passed"] += 1
            elif "TIMEOUT" in status:
                status_counts["timeout"] += 1
            elif "FAILED" in status:
                status_counts["failed"] += 1
            else:
                status_counts["incomplete"] += 1

        lines.append(f"| Status | Count |")
        lines.append(f"|--------|-------|")
        lines.append(f"| ✅ Passed | {status_counts['passed']}/{data['meta']['total_calls']} |")
        lines.append(f"| ⚠️ Timeout | {status_counts['timeout']}/{data['meta']['total_calls']} |")
        lines.append(f"| ⚠️ Incomplete | {status_counts['incomplete']}/{data['meta']['total_calls']} |")
        lines.append(f"| ❌ Failed | {status_counts['failed']}/{data['meta']['total_calls']} |")
        lines.append(f"")

        # Executive Summary
        lines.append(f"## Executive Summary")
        lines.append(f"")
        lines.append(f"### Performance Metrics")
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        perf = data['summary']['performance']
        lines.append(f"| Average Call Duration | {perf['avg_call_duration_seconds']}s |")
        lines.append(f"| Average Response Latency | {perf['avg_latency_ms']}ms |")
        lines.append(f"| Max Response Latency | {perf['max_latency_ms']}ms |")
        lines.append(f"| Min Response Latency | {perf['min_latency_ms']}ms |")
        lines.append(f"")

        # Compliance
        lines.append(f"### System Prompt Compliance")
        lines.append(f"**Overall Compliance Score:** {data['summary']['compliance']['avg_score']}/100")
        lines.append(f"")
        lines.append(f"| Behavior | Result |")
        lines.append(f"|----------|--------|")
        comp = data['summary']['compliance']
        lines.append(f"| Greeted Properly | {comp['greeted_properly']} |")
        lines.append(f"| Asked for Size | {comp['asked_for_size']} |")
        lines.append(f"| Asked for Phone | {comp['asked_for_phone']} |")
        lines.append(f"| Summarized Order | {comp['summarized_order']} |")
        lines.append(f"")

        # Issues Summary
        issues = data['summary'].get('issues', {})
        total_issues = issues.get('total_issues', 0)
        lines.append(f"### Call Issues")
        if total_issues > 0:
            lines.append(f"**⚠️ {total_issues} calls had issues:**")
            lines.append(f"")
            lines.append(f"| Issue Type | Count |")
            lines.append(f"|------------|-------|")
            if issues.get('calls_with_no_transcript', 0) > 0:
                lines.append(f"| ❌ No transcript captured | {issues['calls_with_no_transcript']} |")
            if issues.get('calls_timed_out', 0) > 0:
                lines.append(f"| ⚠️ Timed out (max duration) | {issues['calls_timed_out']} |")
            if issues.get('calls_with_errors', 0) > 0:
                lines.append(f"| ❌ Errors | {issues['calls_with_errors']} |")
        else:
            lines.append(f"✅ All calls completed without issues.")
        lines.append(f"")

        # Violations
        violations = data['summary']['violations']
        total_violations = sum(violations.values())
        lines.append(f"### Guardrail Violations ({total_violations} total)")
        if total_violations > 0:
            lines.append(f"")
            lines.append(f"| Violation Type | Count |")
            lines.append(f"|----------------|-------|")
            if violations['offered_delivery'] > 0:
                lines.append(f"| Offered Delivery | {violations['offered_delivery']} |")
            if violations['gave_medical_advice'] > 0:
                lines.append(f"| Gave Medical Advice | {violations['gave_medical_advice']} |")
            if violations['asked_for_credit_card'] > 0:
                lines.append(f"| Asked for Credit Card | {violations['asked_for_credit_card']} |")
        else:
            lines.append(f"✅ No guardrail violations detected.")
        lines.append(f"")

        # Detailed Results by Scenario
        lines.append(f"---")
        lines.append(f"")
        lines.append(f"## Detailed Results by Call")
        lines.append(f"")

        for call in data['calls']:
            # Determine call status
            status, status_reason = self._determine_call_status(call)

            lines.append(f"### {call['scenario_name']}")
            lines.append(f"**Call ID:** {call['call_id']}")
            lines.append(f"**Duration:** {call['duration_seconds']:.1f}s")
            lines.append(f"**Turns:** {call['turn_count']}")
            lines.append(f"**Disconnect Reason:** `{call.get('disconnect_reason', 'unknown')}`")
            lines.append(f"**Avg Latency:** {call['latency_metrics']['avg_latency_ms']:.0f}ms")
            lines.append(f"**Compliance Score:** {call['compliance_score']}/100")
            lines.append(f"")

            # Call status with reason
            lines.append(f"**Status:** {status}")
            lines.append(f"*{status_reason}*")
            lines.append(f"")

            # Scenario result notes if any
            if call.get('scenario_result') and call['scenario_result'].get('notes'):
                lines.append(f"**Notes:**")
                for note in call['scenario_result']['notes']:
                    lines.append(f"- {note}")
                lines.append(f"")

            # Transcript
            lines.append(f"<details>")
            lines.append(f"<summary>View Full Transcript</summary>")
            lines.append(f"")
            lines.append(f"```")
            for entry in call['transcript']:
                speaker = entry['speaker'].upper()
                text = entry['text']
                lines.append(f"[{speaker}]: {text}")
            lines.append(f"```")
            lines.append(f"</details>")
            lines.append(f"")

            # Latency details
            lines.append(f"<details>")
            lines.append(f"<summary>Latency Measurements</summary>")
            lines.append(f"")
            lines.append(f"| Turn | Latency (ms) |")
            lines.append(f"|------|-------------|")
            for lat in call['latency_metrics']['measurements']:
                lines.append(f"| {lat['turn_number']} | {lat['latency_ms']:.0f} |")
            lines.append(f"</details>")
            lines.append(f"")
            lines.append(f"---")
            lines.append(f"")

        # Footer
        lines.append(f"")
        lines.append(f"*Report generated on {data['meta']['report_generated']}*")

        return "\n".join(lines)
