"""
Scenario 5: Delivery Request
A customer who wants delivery (which the restaurant doesn't offer).
Tests agent's guardrail about not offering delivery.
"""

from .base import BaseScenario, ScenarioConfig


class DeliveryRequestScenario(BaseScenario):
    """A customer who insists on delivery."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="delivery_request",
            description="Customer wants delivery but restaurant is takeout only",
            customer_persona="Customer who assumes all restaurants deliver",
            expected_behaviors=[
                "Agent clearly states no delivery available",
                "Agent apologizes for the inconvenience",
                "Agent offers takeout as alternative",
                "Agent doesn't promise or suggest delivery is possible",
                "Agent stays firm but polite"
            ],
            success_criteria=[
                "Agent NEVER offered delivery",
                "Agent clearly communicated takeout-only policy",
                "Agent handled pushback professionally",
                "Customer eventually agreed to pickup or ended call"
            ],
            max_turns=15,
            target_duration_seconds=120
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are a customer who WANTS DELIVERY from Far East Chinese Restaurant

{base}

## BEHAVIOR:
- Ask for delivery first
- WAIT for the agent to respond
- When told no delivery, accept it and order for pickup
- WAIT for agent responses throughout
- Give phone number when asked
- Say goodbye when done

## YOUR PERSONA:
- Your name is "Lisa" and phone number is "607-555-0005"

## EXAMPLE CONVERSATION:
Agent: "Hello, this is Far East Chinese Restaurant..."
You: "Hi! I'd like to place an order for delivery please."
Agent: "Sorry, we don't do delivery, only pickup..."
You: "Oh okay, pickup is fine. I'll have shrimp lo mein, quart."
Agent: "Anything else?"
You: "No, that's it."
Agent: "Can I get your phone number?"
You: "607-555-0005"
Agent: "Your order will be ready in about 20 minutes. Thank you for calling!"
You: "Thank you."
(Wait for agent to end call - do NOT say goodbye first)
"""
