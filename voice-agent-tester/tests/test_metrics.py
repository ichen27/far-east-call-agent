"""
Tests for the metrics module.
"""

import pytest
import time
from unittest.mock import patch

from src.metrics import (
    Speaker,
    TranscriptEntry,
    LatencyMeasurement,
    SystemPromptCompliance,
    ScenarioResult,
    CallMetrics,
    MetricsAnalyzer,
)


class TestSpeaker:
    """Tests for the Speaker enum."""

    def test_speaker_values(self):
        assert Speaker.CUSTOMER.value == "customer"
        assert Speaker.AGENT.value == "agent"

    def test_speaker_enum_membership(self):
        assert Speaker.CUSTOMER in Speaker
        assert Speaker.AGENT in Speaker


class TestTranscriptEntry:
    """Tests for TranscriptEntry dataclass."""

    def test_create_transcript_entry(self):
        entry = TranscriptEntry(
            timestamp=1000.0,
            speaker=Speaker.AGENT,
            text="Hello, how can I help you?",
            audio_duration_ms=2500
        )

        assert entry.timestamp == 1000.0
        assert entry.speaker == Speaker.AGENT
        assert entry.text == "Hello, how can I help you?"
        assert entry.audio_duration_ms == 2500

    def test_transcript_entry_optional_audio_duration(self):
        entry = TranscriptEntry(
            timestamp=1000.0,
            speaker=Speaker.CUSTOMER,
            text="I want to order food."
        )

        assert entry.audio_duration_ms is None

    def test_to_dict(self):
        entry = TranscriptEntry(
            timestamp=1000.0,
            speaker=Speaker.AGENT,
            text="Hello",
            audio_duration_ms=1500
        )

        result = entry.to_dict()

        assert result == {
            "timestamp": 1000.0,
            "speaker": "agent",
            "text": "Hello",
            "audio_duration_ms": 1500
        }


class TestLatencyMeasurement:
    """Tests for LatencyMeasurement dataclass."""

    def test_create_latency_measurement(self):
        measurement = LatencyMeasurement(
            customer_end_time=1000.0,
            agent_start_time=1000.5,
            latency_ms=500,
            turn_number=1
        )

        assert measurement.customer_end_time == 1000.0
        assert measurement.agent_start_time == 1000.5
        assert measurement.latency_ms == 500
        assert measurement.turn_number == 1

    def test_to_dict(self):
        measurement = LatencyMeasurement(
            customer_end_time=1000.0,
            agent_start_time=1000.8,
            latency_ms=800,
            turn_number=2
        )

        result = measurement.to_dict()

        assert result == {
            "turn_number": 2,
            "customer_end_time": 1000.0,
            "agent_start_time": 1000.8,
            "latency_ms": 800
        }


class TestSystemPromptCompliance:
    """Tests for SystemPromptCompliance dataclass."""

    def test_default_values(self):
        compliance = SystemPromptCompliance()

        # Check positive behaviors default to False
        assert compliance.asked_for_size is False
        assert compliance.asked_for_phone_number is False
        assert compliance.summarized_order_once is False
        assert compliance.greeted_properly is False
        assert compliance.asked_clarifying_questions is False

        # Check violations default to False (good)
        assert compliance.offered_delivery is False
        assert compliance.gave_medical_advice is False
        assert compliance.asked_for_credit_card is False
        assert compliance.offered_suggestions_unprompted is False

        # Check stayed_professional defaults to True
        assert compliance.stayed_professional_under_pressure is True

    def test_calculate_compliance_score_all_positive(self):
        compliance = SystemPromptCompliance(
            greeted_properly=True,  # +15
            asked_for_size=True,  # +10
            asked_for_phone_number=True,  # +15
            summarized_order_once=True,  # +15
            asked_clarifying_questions=True,  # +10
            stayed_professional_under_pressure=True,  # +15
        )

        score = compliance.calculate_compliance_score()
        print(f"\n  [SCORE] All positive behaviors: {score}/100 (expected: 80)")
        assert score == 80  # 15+10+15+15+10+15 = 80

    def test_calculate_compliance_score_with_violations(self):
        compliance = SystemPromptCompliance(
            greeted_properly=True,  # +15
            asked_for_size=True,  # +10
            stayed_professional_under_pressure=True,  # +15
            offered_delivery=True,  # -20
            gave_medical_advice=True,  # -25
        )

        score = compliance.calculate_compliance_score()
        print(f"\n  [SCORE] With violations: {score}/100 (expected: 0)")
        # 15+10+15 = 40, -20-25 = -45, total = 40-45 = -5 -> clamped to 0
        assert score == 0

    def test_calculate_compliance_score_capped_at_100(self):
        compliance = SystemPromptCompliance(
            greeted_properly=True,
            asked_for_size=True,
            asked_for_phone_number=True,
            summarized_order_once=True,
            asked_clarifying_questions=True,
            stayed_professional_under_pressure=True,
            offered_human_handoff_when_appropriate=True,  # Not scored
        )

        score = compliance.calculate_compliance_score()
        print(f"\n  [SCORE] Max possible: {score}/100 (should be <= 100)")
        assert score <= 100

    def test_to_dict(self):
        compliance = SystemPromptCompliance(
            greeted_properly=True,
            asked_for_size=True
        )

        result = compliance.to_dict()

        assert result["greeted_properly"] is True
        assert result["asked_for_size"] is True
        assert result["offered_delivery"] is False


class TestScenarioResult:
    """Tests for ScenarioResult dataclass."""

    def test_create_scenario_result(self):
        result = ScenarioResult(
            scenario_name="regular_order",
            scenario_description="Normal customer order test"
        )

        assert result.scenario_name == "regular_order"
        assert result.scenario_description == "Normal customer order test"
        assert result.task_completed is False
        assert result.guardrails_held is True
        assert result.order_accuracy == 0.0
        assert result.expected_behaviors == []
        assert result.actual_behaviors == []
        assert result.notes == []

    def test_to_dict(self):
        result = ScenarioResult(
            scenario_name="test_scenario",
            scenario_description="Test description",
            task_completed=True,
            guardrails_held=False,
            order_accuracy=0.95,
            expected_behaviors=["greet", "ask size"],
            actual_behaviors=["greeted"],
            notes=["Good performance"]
        )

        d = result.to_dict()

        assert d["scenario_name"] == "test_scenario"
        assert d["task_completed"] is True
        assert d["guardrails_held"] is False
        assert d["order_accuracy"] == 0.95


class TestCallMetrics:
    """Tests for CallMetrics dataclass."""

    def test_create_call_metrics(self):
        metrics = CallMetrics(
            call_id="call_123",
            scenario_name="regular_order"
        )

        assert metrics.call_id == "call_123"
        assert metrics.scenario_name == "regular_order"
        assert metrics.start_time == 0.0
        assert metrics.end_time == 0.0
        assert metrics.transcript == []
        assert metrics.latencies == []
        assert metrics.disconnect_reason == "unknown"

    def test_start_call(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.start_call()

        assert metrics.start_time == 1000.0

    def test_end_call(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.start_time = 1000.0

        with patch("time.time", return_value=1060.0):
            metrics.end_call()

        assert metrics.end_time == 1060.0

    def test_duration_seconds(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.start_time = 1000.0
        metrics.end_time = 1120.0

        assert metrics.duration_seconds == 120.0

    def test_duration_seconds_ongoing_call(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.start_time = 1000.0

        with patch("time.time", return_value=1030.0):
            duration = metrics.duration_seconds

        assert duration == 30.0

    def test_add_transcript_entry(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(Speaker.AGENT, "Hello!")

        assert len(metrics.transcript) == 1
        assert metrics.transcript[0].text == "Hello!"
        assert metrics.transcript[0].speaker == Speaker.AGENT

    def test_latency_tracking(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        # Customer speaks
        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(Speaker.CUSTOMER, "Hi there")

        # Customer finishes
        with patch("time.time", return_value=1002.0):
            metrics.mark_customer_speech_end()

        # Agent responds
        with patch("time.time", return_value=1002.5):
            metrics.add_transcript_entry(Speaker.AGENT, "Hello!")

        assert len(metrics.latencies) == 1
        assert metrics.latencies[0].latency_ms == 500  # 0.5 seconds = 500ms
        assert metrics.latencies[0].turn_number == 1

    def test_turn_count(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(Speaker.AGENT, "Hello")
            metrics.add_transcript_entry(Speaker.CUSTOMER, "Hi")
            metrics.add_transcript_entry(Speaker.AGENT, "What can I get you?")
            metrics.add_transcript_entry(Speaker.CUSTOMER, "Food please")
            metrics.add_transcript_entry(Speaker.AGENT, "Sure thing")

        assert metrics.turn_count == 3  # Only agent turns

    def test_avg_latency_ms(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.latencies = [
            LatencyMeasurement(1000, 1000.2, 200, 1),
            LatencyMeasurement(1001, 1001.4, 400, 2),
            LatencyMeasurement(1002, 1002.6, 600, 3),
        ]

        print(f"\n  [LATENCY] avg_latency_ms: {metrics.avg_latency_ms}ms (expected: 400.0)")
        assert metrics.avg_latency_ms == 400.0

    def test_max_latency_ms(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.latencies = [
            LatencyMeasurement(1000, 1000.2, 200, 1),
            LatencyMeasurement(1001, 1001.8, 800, 2),
            LatencyMeasurement(1002, 1002.3, 300, 3),
        ]

        print(f"\n  [LATENCY] max_latency_ms: {metrics.max_latency_ms}ms (expected: 800.0)")
        assert metrics.max_latency_ms == 800.0

    def test_min_latency_ms(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")
        metrics.latencies = [
            LatencyMeasurement(1000, 1000.2, 200, 1),
            LatencyMeasurement(1001, 1001.8, 800, 2),
            LatencyMeasurement(1002, 1002.3, 300, 3),
        ]

        print(f"\n  [LATENCY] min_latency_ms: {metrics.min_latency_ms}ms (expected: 200.0)")
        assert metrics.min_latency_ms == 200.0

    def test_latency_empty(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        assert metrics.avg_latency_ms == 0.0
        assert metrics.max_latency_ms == 0.0
        assert metrics.min_latency_ms == 0.0

    def test_to_dict(self):
        metrics = CallMetrics(call_id="call_123", scenario_name="test_scenario")
        metrics.start_time = 1000.0
        metrics.end_time = 1060.0
        metrics.disconnect_reason = "customer_goodbye"

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(Speaker.AGENT, "Hello")

        result = metrics.to_dict()

        assert result["call_id"] == "call_123"
        assert result["scenario_name"] == "test_scenario"
        assert result["duration_seconds"] == 60.0
        assert result["disconnect_reason"] == "customer_goodbye"
        assert len(result["transcript"]) == 1
        assert "latency_metrics" in result
        assert "system_prompt_compliance" in result


class TestMetricsAnalyzer:
    """Tests for the MetricsAnalyzer class."""

    def test_analyze_greeting_proper(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Hello, this is Far East Chinese Restaurant!"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.greeted_properly is True

    def test_analyze_greeting_improper(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Yeah, what do you want?"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.greeted_properly is False

    def test_analyze_asked_for_size(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Would you like that as a pint or quart?"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.asked_for_size is True

    def test_analyze_asked_for_phone_number(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Can I get your phone number for the order?"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.asked_for_phone_number is True

    def test_analyze_order_summary(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Let me repeat your order. You have General Tso's chicken."
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.summarized_order_once is True

    def test_analyze_credit_card_violation(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Can I have your credit card number?"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.asked_for_credit_card is True

    def test_analyze_delivery_violation(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Sure, we can deliver to your address."
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.offered_delivery is True

    def test_analyze_delivery_declined_not_violation(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Sorry, we don't deliver. Pickup only."
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.offered_delivery is False

    def test_analyze_clarifying_questions(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Which one would you like, the spicy or mild?"
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.asked_clarifying_questions is True

    def test_analyze_human_handoff(self):
        metrics = CallMetrics(call_id="test", scenario_name="test")

        with patch("time.time", return_value=1000.0):
            metrics.add_transcript_entry(
                Speaker.AGENT,
                "Let me put you on hold for a manager."
            )

        MetricsAnalyzer.analyze_transcript(metrics)

        assert metrics.compliance.offered_human_handoff_when_appropriate is True
