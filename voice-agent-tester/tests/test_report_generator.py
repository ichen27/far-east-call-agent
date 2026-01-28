"""
Tests for the report generator module.
"""

import pytest
import os
import json
from datetime import datetime
from unittest.mock import patch

from src.report_generator import ReportGenerator
from src.metrics import CallMetrics, SystemPromptCompliance, Speaker


class TestReportGeneratorStatus:
    """Tests for call status determination."""

    @pytest.fixture
    def generator(self):
        return ReportGenerator()

    def test_status_failed_no_transcript(self, generator):
        call = {"turn_count": 0, "disconnect_reason": "unknown"}

        status, reason = generator._determine_call_status(call)

        assert "FAILED" in status
        assert "No transcript" in reason

    def test_status_timeout_max_duration(self, generator):
        call = {
            "turn_count": 5,
            "disconnect_reason": "max_duration_reached",
            "system_prompt_compliance": {}
        }

        status, reason = generator._determine_call_status(call)

        assert "TIMEOUT" in status
        assert "max duration" in reason.lower()

    def test_status_passed_with_phone_and_goodbye(self, generator):
        call = {
            "turn_count": 10,
            "disconnect_reason": "customer_goodbye",
            "system_prompt_compliance": {
                "asked_for_phone_number": True,
                "summarized_order_once": True
            }
        }

        status, reason = generator._determine_call_status(call)

        assert "PASSED" in status

    def test_status_incomplete_no_phone_no_summary(self, generator):
        call = {
            "turn_count": 5,
            "disconnect_reason": "phone_disconnected",
            "system_prompt_compliance": {
                "asked_for_phone_number": False,
                "summarized_order_once": False
            }
        }

        status, reason = generator._determine_call_status(call)

        assert "INCOMPLETE" in status

    def test_status_failed_with_error(self, generator):
        call = {
            "turn_count": 3,
            "disconnect_reason": "connection_error",
            "system_prompt_compliance": {}
        }

        status, reason = generator._determine_call_status(call)

        assert "FAILED" in status


class TestReportGeneratorNextNumber:
    """Tests for report numbering."""

    @pytest.fixture
    def generator(self):
        return ReportGenerator()

    def test_next_number_empty_dir(self, generator, tmp_path):
        reports_dir = tmp_path / "reports"
        reports_dir.mkdir()

        number = generator._get_next_report_number(str(reports_dir))

        assert number == 1

    def test_next_number_with_existing_reports(self, generator, tmp_path):
        reports_dir = tmp_path / "reports"
        reports_dir.mkdir()

        # Create existing reports
        (reports_dir / "test_report_1.json").touch()
        (reports_dir / "test_report_2.json").touch()
        (reports_dir / "test_report_5.json").touch()

        number = generator._get_next_report_number(str(reports_dir))

        assert number == 6

    def test_next_number_nonexistent_dir(self, generator, tmp_path):
        nonexistent = tmp_path / "does_not_exist"

        number = generator._get_next_report_number(str(nonexistent))

        assert number == 1


class TestReportGeneratorBuildData:
    """Tests for building report data structure."""

    @pytest.fixture
    def generator(self):
        return ReportGenerator()

    @pytest.fixture
    def sample_metrics(self):
        from src.metrics import LatencyMeasurement

        metrics = CallMetrics(call_id="test_1", scenario_name="regular_order")
        metrics.start_time = 1000.0
        metrics.end_time = 1120.0
        metrics.disconnect_reason = "customer_goodbye"
        metrics.compliance = SystemPromptCompliance(
            greeted_properly=True,
            asked_for_size=True,
            asked_for_phone_number=True,
            summarized_order_once=True,
            stayed_professional_under_pressure=True
        )
        # Add latency measurements to avoid ValueError in min()
        metrics.latencies = [
            LatencyMeasurement(1000.0, 1000.3, 300, 1),
            LatencyMeasurement(1001.0, 1001.5, 500, 2),
        ]
        return metrics

    def test_build_report_data_structure(self, generator, sample_metrics):
        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [sample_metrics])

        assert "meta" in data
        assert "summary" in data
        assert "calls" in data

    def test_build_report_data_meta(self, generator, sample_metrics):
        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [sample_metrics])

        assert data["meta"]["run_id"] == "run_123"
        assert data["meta"]["total_calls"] == 1
        assert data["meta"]["total_duration_seconds"] == 300.0

    def test_build_report_data_summary_performance(self, generator, sample_metrics):
        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [sample_metrics])

        perf = data["summary"]["performance"]
        assert "avg_call_duration_seconds" in perf
        assert "avg_latency_ms" in perf
        assert "max_latency_ms" in perf
        assert "min_latency_ms" in perf

    def test_build_report_data_summary_compliance(self, generator, sample_metrics):
        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [sample_metrics])

        comp = data["summary"]["compliance"]
        assert comp["greeted_properly"] == "1/1"
        assert comp["asked_for_size"] == "1/1"
        assert comp["asked_for_phone"] == "1/1"
        assert comp["summarized_order"] == "1/1"

    def test_build_report_data_empty_metrics(self, generator):
        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [])

        assert data["meta"]["total_calls"] == 0
        assert data["summary"]["performance"]["avg_call_duration_seconds"] == 0
        assert data["summary"]["compliance"]["avg_score"] == 0

    def test_build_report_data_violations_counted(self, generator):
        from src.metrics import LatencyMeasurement

        metrics = CallMetrics(call_id="test_1", scenario_name="test")
        metrics.start_time = 1000.0
        metrics.end_time = 1060.0
        metrics.compliance = SystemPromptCompliance(
            offered_delivery=True,
            gave_medical_advice=True,
            asked_for_credit_card=True
        )
        # Add latency to avoid ValueError
        metrics.latencies = [
            LatencyMeasurement(1000.0, 1000.3, 300, 1),
        ]

        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        data = generator._build_report_data("run_123", start, end, [metrics])

        violations = data["summary"]["violations"]
        assert violations["offered_delivery"] == 1
        assert violations["gave_medical_advice"] == 1
        assert violations["asked_for_credit_card"] == 1


class TestReportGeneratorMarkdown:
    """Tests for markdown report generation."""

    @pytest.fixture
    def generator(self):
        return ReportGenerator()

    @pytest.fixture
    def sample_report_data(self):
        return {
            "meta": {
                "run_id": "test_run_123",
                "start_time": "2024-01-15T10:00:00",
                "end_time": "2024-01-15T10:05:00",
                "total_duration_seconds": 300,
                "total_calls": 2,
                "report_generated": "2024-01-15T10:05:00"
            },
            "summary": {
                "performance": {
                    "avg_call_duration_seconds": 60,
                    "avg_latency_ms": 250,
                    "max_latency_ms": 500,
                    "min_latency_ms": 100
                },
                "compliance": {
                    "avg_score": 75,
                    "greeted_properly": "2/2",
                    "asked_for_size": "1/2",
                    "asked_for_phone": "2/2",
                    "summarized_order": "2/2"
                },
                "violations": {
                    "offered_delivery": 0,
                    "gave_medical_advice": 0,
                    "asked_for_credit_card": 0
                },
                "issues": {
                    "calls_with_no_transcript": 0,
                    "calls_timed_out": 0,
                    "calls_with_errors": 0,
                    "total_issues": 0
                }
            },
            "calls": [
                {
                    "call_id": "call_1",
                    "scenario_name": "regular_order",
                    "duration_seconds": 60,
                    "turn_count": 10,
                    "disconnect_reason": "customer_goodbye",
                    "system_prompt_compliance": {
                        "asked_for_phone_number": True,
                        "summarized_order_once": True
                    },
                    "compliance_score": 80,
                    "latency_metrics": {
                        "avg_latency_ms": 250,
                        "measurements": [
                            {"turn_number": 1, "latency_ms": 200},
                            {"turn_number": 2, "latency_ms": 300}
                        ]
                    },
                    "transcript": [
                        {"speaker": "agent", "text": "Hello"},
                        {"speaker": "customer", "text": "Hi"}
                    ],
                    "scenario_result": None
                }
            ]
        }

    def test_generate_markdown_header(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "# Voice Agent Test Report" in md
        assert "test_run_123" in md
        assert "Total Calls:** 2" in md

    def test_generate_markdown_status_table(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "Quick Status Overview" in md
        assert "| Status | Count |" in md

    def test_generate_markdown_performance_metrics(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "Performance Metrics" in md
        assert "Average Call Duration" in md
        assert "Average Response Latency" in md

    def test_generate_markdown_compliance_section(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "System Prompt Compliance" in md
        assert "Compliance Score:**" in md
        assert "Greeted Properly" in md

    def test_generate_markdown_no_violations(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "No guardrail violations detected" in md

    def test_generate_markdown_with_violations(self, generator, sample_report_data):
        sample_report_data["summary"]["violations"]["offered_delivery"] = 2
        sample_report_data["summary"]["violations"]["gave_medical_advice"] = 1

        md = generator._generate_markdown(sample_report_data)

        assert "Offered Delivery" in md

    def test_generate_markdown_call_details(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "regular_order" in md
        assert "call_1" in md
        assert "View Full Transcript" in md

    def test_generate_markdown_transcript_details(self, generator, sample_report_data):
        md = generator._generate_markdown(sample_report_data)

        assert "[AGENT]: Hello" in md
        assert "[CUSTOMER]: Hi" in md


class TestReportGeneratorGenerate:
    """Tests for the full generate method."""

    @pytest.fixture
    def generator(self):
        return ReportGenerator()

    @pytest.fixture
    def metrics_with_latency(self):
        from src.metrics import LatencyMeasurement

        metrics = CallMetrics(call_id="test_1", scenario_name="test")
        metrics.start_time = 1000.0
        metrics.end_time = 1060.0
        metrics.compliance = SystemPromptCompliance()
        # Add latency measurements to avoid ValueError in min()
        metrics.latencies = [
            LatencyMeasurement(1000.0, 1000.3, 300, 1),
        ]
        return metrics

    def test_generate_creates_files(self, generator, tmp_path, metrics_with_latency):
        reports_dir = tmp_path / "reports"

        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        json_path, md_path = generator.generate(
            "run_123", start, end, [metrics_with_latency], str(reports_dir)
        )

        assert os.path.exists(json_path)
        assert os.path.exists(md_path)
        assert json_path.endswith(".json")
        assert md_path.endswith(".md")

    def test_generate_json_valid(self, generator, tmp_path, metrics_with_latency):
        reports_dir = tmp_path / "reports"

        start = datetime(2024, 1, 15, 10, 0, 0)
        end = datetime(2024, 1, 15, 10, 5, 0)

        json_path, _ = generator.generate(
            "run_123", start, end, [metrics_with_latency], str(reports_dir)
        )

        with open(json_path) as f:
            data = json.load(f)

        assert data["meta"]["run_id"] == "run_123"
        assert data["meta"]["total_calls"] == 1

    def test_generate_handles_none_times(self, generator, tmp_path, metrics_with_latency):
        reports_dir = tmp_path / "reports"

        # Should handle None start_time
        json_path, md_path = generator.generate(
            "run_123", None, datetime.now(), [metrics_with_latency], str(reports_dir)
        )

        assert os.path.exists(json_path)
        assert os.path.exists(md_path)
