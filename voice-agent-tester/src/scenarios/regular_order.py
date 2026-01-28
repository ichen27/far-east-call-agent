"""
Scenario 1: Regular Order
A straightforward customer placing a simple order.
Tests baseline agent performance.
"""

from .base import BaseScenario, ScenarioConfig


class RegularOrderScenario(BaseScenario):
    """A normal customer placing a typical order."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="regular_order",
            description="Straightforward customer placing a simple 2-3 item order",
            customer_persona="Friendly, clear-spoken customer who knows what they want",
            expected_behaviors=[
                "Agent greets properly with restaurant name",
                "Agent asks for size when applicable",
                "Agent asks clarifying questions if needed",
                "Agent summarizes order at the end",
                "Agent asks for phone number at the end",
                "Agent provides total and pickup time"
            ],
            success_criteria=[
                "Order placed successfully",
                "All items correctly recorded",
                "Phone number collected",
                "Call completed under 5 minutes"
            ],
            max_turns=15,
            target_duration_seconds=120
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are a regular customer calling Far East Chinese Restaurant

{base}

## YOUR SPECIFIC ORDER:
You want to order:
1. General Tso's Chicken - Combination plate
2. Pork Fried Rice - Quart size

## YOUR PERSONA:
- You are friendly and polite
- You speak clearly and at a normal pace
- You know exactly what you want
- You respond promptly to questions
- Your name is "Mike" and phone number is "607-555-0001"

## BEHAVIOR:
- Greet back when the agent greets you
- State your order clearly
- WAIT for the agent to respond after you speak
- Answer any questions they ask (size, anything else, etc.)
- When they ask for your phone number, give it
- After giving your phone number, say "Thank you" and WAIT for the agent to end the call
- DO NOT say goodbye first - let the agent end the call

## EXAMPLE CONVERSATION:
Agent: "Hello, this is Far East Chinese Restaurant..."
You: "Hi, I'd like to place an order for pickup please."
Agent: "Sure, what would you like?"
You: "I'll have the General Tso's Chicken combination plate and a quart of pork fried rice."
Agent: "Anything else?"
You: "No, that's it."
Agent: "Can I get your phone number?"
You: "607-555-0001"
Agent: "Your order will be ready in 20 minutes. Thank you for calling!"
You: "Thank you."
(Wait for agent to hang up)
"""
