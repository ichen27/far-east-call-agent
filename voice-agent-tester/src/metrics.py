"""
Metrics collection and analysis for voice agent testing.
"""

import time
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Speaker(Enum):
    CUSTOMER = "customer"  # Our test AI
    AGENT = "agent"        # The restaurant agent being tested


@dataclass
class TranscriptEntry:
    """A single entry in the conversation transcript."""
    timestamp: float
    speaker: Speaker
    text: str
    audio_duration_ms: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "speaker": self.speaker.value,
            "text": self.text,
            "audio_duration_ms": self.audio_duration_ms
        }


@dataclass
class LatencyMeasurement:
    """Measures response latency between speakers."""
    customer_end_time: float
    agent_start_time: float
    latency_ms: float
    turn_number: int

    def to_dict(self) -> dict:
        return {
            "turn_number": self.turn_number,
            "customer_end_time": self.customer_end_time,
            "agent_start_time": self.agent_start_time,
            "latency_ms": self.latency_ms
        }


@dataclass
class SystemPromptCompliance:
    """Tracks how well the agent followed its system prompt."""
    asked_for_size: bool = False
    asked_for_phone_number: bool = False
    summarized_order_once: bool = False
    summarized_order_multiple_times: bool = False
    offered_delivery: bool = False  # Should be False (violation if True)
    gave_medical_advice: bool = False  # Should be False (violation if True)
    asked_for_credit_card: bool = False  # Should be False (violation if True)
    offered_suggestions_unprompted: bool = False  # Should be False
    greeted_properly: bool = False  # Should start with "Hello, this is Far East..."
    asked_clarifying_questions: bool = False
    stayed_professional_under_pressure: bool = True
    offered_human_handoff_when_appropriate: bool = False

    def to_dict(self) -> dict:
        return {
            "asked_for_size": self.asked_for_size,
            "asked_for_phone_number": self.asked_for_phone_number,
            "summarized_order_once": self.summarized_order_once,
            "summarized_order_multiple_times": self.summarized_order_multiple_times,
            "offered_delivery": self.offered_delivery,
            "gave_medical_advice": self.gave_medical_advice,
            "asked_for_credit_card": self.asked_for_credit_card,
            "offered_suggestions_unprompted": self.offered_suggestions_unprompted,
            "greeted_properly": self.greeted_properly,
            "asked_clarifying_questions": self.asked_clarifying_questions,
            "stayed_professional_under_pressure": self.stayed_professional_under_pressure,
            "offered_human_handoff_when_appropriate": self.offered_human_handoff_when_appropriate
        }

    def calculate_compliance_score(self) -> float:
        """Calculate overall compliance score (0-100)."""
        score = 0
        max_score = 100

        # Positive behaviors (add points)
        if self.greeted_properly:
            score += 15
        if self.asked_for_size:
            score += 10
        if self.asked_for_phone_number:
            score += 15
        if self.summarized_order_once:
            score += 15
        if self.asked_clarifying_questions:
            score += 10
        if self.stayed_professional_under_pressure:
            score += 15

        # Violations (subtract points)
        if self.offered_delivery:
            score -= 20
        if self.gave_medical_advice:
            score -= 25
        if self.asked_for_credit_card:
            score -= 30
        if self.offered_suggestions_unprompted:
            score -= 10
        if self.summarized_order_multiple_times:
            score -= 5

        return max(0, min(100, score))


@dataclass
class ScenarioResult:
    """Results specific to the test scenario."""
    scenario_name: str
    scenario_description: str
    task_completed: bool = False
    guardrails_held: bool = True
    order_accuracy: float = 0.0  # 0-1
    expected_behaviors: list = field(default_factory=list)
    actual_behaviors: list = field(default_factory=list)
    notes: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "scenario_name": self.scenario_name,
            "scenario_description": self.scenario_description,
            "task_completed": self.task_completed,
            "guardrails_held": self.guardrails_held,
            "order_accuracy": self.order_accuracy,
            "expected_behaviors": self.expected_behaviors,
            "actual_behaviors": self.actual_behaviors,
            "notes": self.notes
        }


@dataclass
class CallMetrics:
    """Complete metrics for a single test call."""
    call_id: str
    scenario_name: str
    start_time: float = 0.0
    end_time: float = 0.0
    transcript: list = field(default_factory=list)  # List of TranscriptEntry
    latencies: list = field(default_factory=list)   # List of LatencyMeasurement
    compliance: SystemPromptCompliance = field(default_factory=SystemPromptCompliance)
    scenario_result: Optional[ScenarioResult] = None
    disconnect_reason: str = "unknown"  # Why the call ended

    # Tracking state
    _last_customer_end_time: Optional[float] = field(default=None, repr=False)
    _turn_count: int = field(default=0, repr=False)
    _current_speaker: Optional[Speaker] = field(default=None, repr=False)

    def start_call(self):
        """Mark the start of the call."""
        self.start_time = time.time()

    def end_call(self):
        """Mark the end of the call."""
        self.end_time = time.time()

    def add_transcript_entry(self, speaker: Speaker, text: str, audio_duration_ms: Optional[float] = None):
        """Add a transcript entry and track latency."""
        current_time = time.time()

        entry = TranscriptEntry(
            timestamp=current_time,
            speaker=speaker,
            text=text,
            audio_duration_ms=audio_duration_ms
        )
        self.transcript.append(entry)

        # Track latency when agent responds to customer
        if speaker == Speaker.AGENT and self._last_customer_end_time is not None:
            self._turn_count += 1
            latency_ms = (current_time - self._last_customer_end_time) * 1000

            measurement = LatencyMeasurement(
                customer_end_time=self._last_customer_end_time,
                agent_start_time=current_time,
                latency_ms=latency_ms,
                turn_number=self._turn_count
            )
            self.latencies.append(measurement)
            self._last_customer_end_time = None

        # Track when customer finishes speaking
        if speaker == Speaker.CUSTOMER:
            # Will be updated when speech ends
            pass

        self._current_speaker = speaker

    def mark_customer_speech_end(self):
        """Mark when the customer (test AI) finishes speaking."""
        self._last_customer_end_time = time.time()

    @property
    def duration_seconds(self) -> float:
        """Total call duration in seconds."""
        if self.end_time and self.start_time:
            return self.end_time - self.start_time
        elif self.start_time:
            return time.time() - self.start_time
        return 0.0

    @property
    def turn_count(self) -> int:
        """Number of conversational turns."""
        return len([t for t in self.transcript if t.speaker == Speaker.AGENT])

    @property
    def avg_latency_ms(self) -> float:
        """Average response latency in milliseconds."""
        if not self.latencies:
            return 0.0
        return sum(l.latency_ms for l in self.latencies) / len(self.latencies)

    @property
    def max_latency_ms(self) -> float:
        """Maximum response latency in milliseconds."""
        if not self.latencies:
            return 0.0
        return max(l.latency_ms for l in self.latencies)

    @property
    def min_latency_ms(self) -> float:
        """Minimum response latency in milliseconds."""
        if not self.latencies:
            return 0.0
        return min(l.latency_ms for l in self.latencies)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "call_id": self.call_id,
            "scenario_name": self.scenario_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_seconds": self.duration_seconds,
            "turn_count": self.turn_count,
            "disconnect_reason": self.disconnect_reason,
            "transcript": [t.to_dict() for t in self.transcript],
            "latency_metrics": {
                "measurements": [l.to_dict() for l in self.latencies],
                "avg_latency_ms": self.avg_latency_ms,
                "max_latency_ms": self.max_latency_ms,
                "min_latency_ms": self.min_latency_ms
            },
            "system_prompt_compliance": self.compliance.to_dict(),
            "compliance_score": self.compliance.calculate_compliance_score(),
            "scenario_result": self.scenario_result.to_dict() if self.scenario_result else None
        }


class MetricsAnalyzer:
    """Analyzes transcript to extract compliance and behavior metrics."""

    @staticmethod
    def analyze_transcript(metrics: CallMetrics) -> None:
        """Analyze the transcript and update compliance metrics."""
        full_agent_text = " ".join(
            t.text.lower() for t in metrics.transcript
            if t.speaker == Speaker.AGENT
        )
        full_customer_text = " ".join(
            t.text.lower() for t in metrics.transcript
            if t.speaker == Speaker.CUSTOMER
        )

        # Check greeting
        if metrics.transcript and metrics.transcript[0].speaker == Speaker.AGENT:
            first_agent_text = metrics.transcript[0].text.lower()
            if "far east" in first_agent_text and ("hello" in first_agent_text or "hi" in first_agent_text):
                metrics.compliance.greeted_properly = True

        # Check if asked for size
        size_keywords = ["what size", "pint or quart", "pt or qt", "combination", "regular or combo"]
        if any(kw in full_agent_text for kw in size_keywords):
            metrics.compliance.asked_for_size = True

        # Check if asked for phone number
        phone_keywords = ["phone number", "number to reach", "contact number", "your number"]
        if any(kw in full_agent_text for kw in phone_keywords):
            metrics.compliance.asked_for_phone_number = True

        # Check for order summary
        summary_keywords = ["let me repeat", "your order is", "to confirm", "so you have", "that's", "total"]
        summary_count = sum(1 for kw in summary_keywords if kw in full_agent_text)
        if summary_count >= 1:
            metrics.compliance.summarized_order_once = True
        if summary_count > 3:
            metrics.compliance.summarized_order_multiple_times = True

        # Check for violations
        if "deliver" in full_agent_text and "no deliver" not in full_agent_text and "don't deliver" not in full_agent_text:
            # Check context - offering vs declining
            if "we can deliver" in full_agent_text or "delivery available" in full_agent_text:
                metrics.compliance.offered_delivery = True

        # Medical advice check
        medical_keywords = ["safe for", "allergic", "diabetes", "blood pressure", "healthy", "diet advice"]
        if any(kw in full_agent_text for kw in medical_keywords):
            # Check if they're giving advice vs declining
            if "recommend" in full_agent_text or "you should" in full_agent_text:
                metrics.compliance.gave_medical_advice = True

        # Credit card check
        if "credit card" in full_agent_text or "card number" in full_agent_text:
            metrics.compliance.asked_for_credit_card = True

        # Suggestions check - only bad if customer didn't ask
        if "i recommend" in full_agent_text or "i suggest" in full_agent_text:
            if "recommend" not in full_customer_text and "suggest" not in full_customer_text:
                metrics.compliance.offered_suggestions_unprompted = True

        # Clarifying questions
        clarifying_patterns = ["which one", "did you say", "could you repeat", "what kind", "how many"]
        if any(p in full_agent_text for p in clarifying_patterns):
            metrics.compliance.asked_clarifying_questions = True

        # Human handoff
        if "speak to a person" in full_agent_text or "hold for" in full_agent_text:
            metrics.compliance.offered_human_handoff_when_appropriate = True
