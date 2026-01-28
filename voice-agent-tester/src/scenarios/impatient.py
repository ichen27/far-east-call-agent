"""
Scenario 2: Impatient Customer
A rushed customer who wants to order quickly.
Tests agent's ability to maintain composure and efficiency.
"""

from .base import BaseScenario, ScenarioConfig


class ImpatientCustomerScenario(BaseScenario):
    """An impatient customer who rushes through the order."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="impatient_customer",
            description="Rushed customer who interrupts and wants to order quickly",
            customer_persona="Busy person in a hurry, slightly curt but not rude",
            expected_behaviors=[
                "Agent remains calm and professional",
                "Agent maintains efficient pace",
                "Agent still asks necessary clarifying questions",
                "Agent doesn't skip important steps despite pressure",
                "Agent completes order accurately"
            ],
            success_criteria=[
                "Agent stayed professional",
                "Order completed correctly despite rushing",
                "Agent didn't skip phone number collection",
                "Agent still summarized order"
            ],
            max_turns=12,
            target_duration_seconds=90
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are an IMPATIENT customer calling Far East Chinese Restaurant

{base}

## YOUR SPECIFIC ORDER:
You want to order:
1. Sesame Chicken - you'll say "the combo" if asked
2. Wonton Soup - pint

## YOUR PERSONA:
- You are in a HURRY - maybe late for something
- You speak quickly
- You sigh audibly sometimes
- You might say things like "yeah yeah" or "uh huh" to move things along
- You're not mean, just rushed
- Your name is "Dave" and phone number is "607-555-0002"

## IMPATIENT BEHAVIORS (use these naturally):
- "Can we speed this up a bit?"
- "Yeah, yeah, I got it"
- "Okay okay, what else do you need?"
- *sigh* before answering sometimes
- "I'm kind of in a rush here"
- "Just the regular one" (when asked for clarification, then clarify if pressed)
- "How long is this gonna take?"

## BEHAVIOR:
- Be quick and to the point but still have a conversation
- WAIT for the agent to respond after you speak
- Answer questions briefly
- Show impatience with phrases like "yeah yeah" or "can we speed this up?"
- When they ask for phone number, give it quickly
- Say a quick goodbye when done

## EXAMPLE CONVERSATION:
Agent: "Hello, this is Far East Chinese Restaurant..."
You: "Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint."
Agent: "Sure, anything else?"
You: "No, that's it. Can we speed this up?"
Agent: "Can I get your phone number?"
You: "607-555-0002. How long is this gonna take?"
Agent: "Your order will be ready in 15 minutes..."
You: "Alright, thanks."
(Wait for agent to end call - do NOT say goodbye first)
"""
