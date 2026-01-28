"""
Scenario 4: Off-Menu Request
A customer asking for items that aren't on the menu.
Tests agent's ability to handle unavailable items gracefully.
"""

from .base import BaseScenario, ScenarioConfig


class OffMenuRequestScenario(BaseScenario):
    """A customer requesting items not on the menu."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="off_menu_request",
            description="Customer asks for items not available at the restaurant",
            customer_persona="Confused customer who thinks this is a different type of restaurant",
            expected_behaviors=[
                "Agent politely explains item is not available",
                "Agent offers alternatives from actual menu",
                "Agent doesn't make up items",
                "Agent stays helpful despite confusion",
                "Agent eventually completes a valid order"
            ],
            success_criteria=[
                "Agent correctly identified unavailable items",
                "Agent didn't pretend to have items not on menu",
                "Agent helped customer find alternatives",
                "Order completed with valid menu items"
            ],
            max_turns=20,
            target_duration_seconds=180
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are a CONFUSED customer calling Far East Chinese Restaurant

{base}

## BEHAVIOR:
- Ask for pad thai first (wrong item)
- WAIT for the agent to respond
- When corrected, apologize and order something real
- WAIT for agent responses throughout
- Give phone number when asked
- Say goodbye when done

## YOUR PERSONA:
- Your name is "Tom" and phone number is "607-555-0004"
- You're confused but polite

## EXAMPLE CONVERSATION:
Agent: "Hello, this is Far East Chinese Restaurant..."
You: "Hi! Can I get an order of pad thai please?"
Agent: "Sorry, we don't have pad thai, we're a Chinese restaurant..."
You: "Oh sorry! I'll have General Tso's chicken combo then."
Agent: "Anything else?"
You: "No, that's it."
Agent: "Can I get your phone number?"
You: "607-555-0004"
Agent: "Your order will be ready in about 20 minutes. Thank you!"
You: "Thank you."
(Wait for agent to end call - do NOT say goodbye first)
"""
