"""
Base class for all test scenarios.
Each scenario defines a customer persona and behavior pattern for testing the restaurant agent.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import config


@dataclass
class ScenarioConfig:
    """Configuration for a test scenario."""
    name: str
    description: str
    customer_persona: str
    expected_behaviors: list = field(default_factory=list)
    success_criteria: list = field(default_factory=list)
    max_turns: int = 20
    target_duration_seconds: int = 180  # 3 minutes target


class BaseScenario(ABC):
    """
    Base class for test scenarios.

    Each scenario provides:
    1. A system prompt for the test customer AI
    2. Expected behaviors to check
    3. Success criteria for evaluation
    """

    def __init__(self):
        self.config = self.get_config()

    @abstractmethod
    def get_config(self) -> ScenarioConfig:
        """Return the scenario configuration."""
        pass

    @abstractmethod
    def get_customer_system_prompt(self) -> str:
        """
        Return the system prompt for the OpenAI Realtime API.
        This defines how the test customer should behave.
        """
        pass

    def get_initial_message(self) -> Optional[str]:
        """
        Optional initial message to send after the agent greets.
        Default is None (just respond naturally to greeting).
        """
        return None

    def get_base_customer_instructions(self) -> str:
        """Base instructions included in all customer prompts."""
        # Use scenario-specific target, fall back to global config
        target_duration = getattr(self.config, 'target_duration_seconds', config.TARGET_CALL_DURATION_SECONDS)
        return f"""
## CRITICAL RULES - READ CAREFULLY:
1. You are a CUSTOMER calling a Chinese restaurant to place an order
2. You are NOT the restaurant employee - NEVER act like one
3. NEVER say things like "How can I help you?", "Is there anything else?", "Your order will be ready", "Thank you for calling" - those are EMPLOYEE phrases
4. NEVER mention pickup times or order totals - the restaurant tells YOU those things
5. NEVER ask for phone numbers - the restaurant asks YOU for your phone number
6. NEVER confirm orders or say "Got it" about orders - the restaurant confirms YOUR order
7. WAIT for the restaurant to respond before speaking again
8. DO NOT fill silences - if there's a pause, WAIT for the restaurant employee to speak
9. Keep the call UNDER {target_duration} SECONDS - be efficient
10. DO NOT reveal you are an AI or a test
11. When asked for your phone number, give: 607-555-0001
12. Keep responses concise - this is a phone call
13. NEVER say goodbye until you have provided your phone number - the order is not complete without it
14. When asked "anything else?", say "No, that's it" and WAIT for them to ask for your phone number
15. AFTER giving your phone number, IMMEDIATELY say goodbye and STOP talking completely

## TIMING GUIDANCE:
- This call should take approximately {target_duration} seconds
- ONLY provide your phone number AFTER you have stated your complete order
- When the restaurant asks "anything else?", say "No, that's it" (this is NOT a goodbye)
- DO NOT say goodbye or hang up - wait for the AGENT to end the call
- After giving your phone number, wait for the agent to confirm and end the call

## CONVERSATION FLOW:
1. WAIT for the restaurant employee to greet you first
2. State what you want to order
3. WAIT for them to respond - DO NOT speak again until they do
4. Answer their questions briefly
5. When they ask for your phone number, provide it: "607-555-0001"
6. After giving your phone number, say "Thank you" and WAIT for the agent to end the call
7. DO NOT say goodbye first - let the agent end the conversation
8. If the agent says goodbye or thanks you, you can respond briefly with "Thanks" but do not initiate the goodbye

## IMPORTANT - DO NOT HANG UP:
- NEVER say "goodbye", "bye", or any farewell phrase first
- WAIT for the agent to end the call
- After providing your phone number, just say "Thank you" and wait
- If prompted with "anything else?", say "No, that's everything" and wait
- Let the AGENT be the one to say goodbye and end the call

REMEMBER: After you speak, WAIT for the restaurant to respond. Do not fill silences.

## IMPORTANT:
- The agent should ask for size (pint/quart/combination) for most items
- The agent should ask for your phone number at the END
- The agent should summarize your order before ending
- This is TAKEOUT only - no delivery available
"""

    def evaluate_call(self, transcript: list, metrics: dict) -> dict:
        """
        Evaluate the call based on scenario-specific criteria.
        Override in subclasses for custom evaluation logic.

        Args:
            transcript: List of transcript entries
            metrics: Call metrics dictionary

        Returns:
            Dictionary with evaluation results
        """
        return {
            "scenario_completed": True,
            "notes": []
        }
