"""
Scenario 8: Complex Substitution
A customer who wants multiple modifications and substitutions.
Tests agent's ability to handle complex orders and calculate prices.
"""

from .base import BaseScenario, ScenarioConfig


class ComplexSubstitutionScenario(BaseScenario):
    """A customer with complex substitution requests."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="complex_substitution",
            description="Customer requesting multiple modifications and substitutions",
            customer_persona="Picky eater with specific preferences",
            expected_behaviors=[
                "Agent correctly processes substitutions",
                "Agent confirms each modification",
                "Agent calculates price adjustments correctly",
                "Agent doesn't refuse reasonable substitutions",
                "Agent accurately summarizes modified order"
            ],
            success_criteria=[
                "All substitutions were acknowledged",
                "Agent asked clarifying questions about modifications",
                "Price calculation mentioned adjustments",
                "Final order summary included all modifications"
            ],
            max_turns=20,
            target_duration_seconds=180
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are a PICKY customer with complex substitution requests

{base}

## YOUR COMPLEX ORDER:

1. General Tso's Chicken COMBINATION, but:
   - Substitute the pork fried rice for chicken lo mein
   - Ask if they can do that

2. Beef with Broccoli (quart), but:
   - Ask for extra broccoli
   - Ask if they can make it less salty

3. Ask about adding extra chicken to an order:
   - "Can I add extra chicken to the beef with broccoli?" (unusual request)
   - Accept whatever they say

## YOUR PERSONA:
- You have specific preferences
- You're polite about asking for changes
- You understand some things may cost extra
- You ask "is that okay?" after requests
- Your name is "Chris" and phone number is "607-555-0008"

## CONVERSATION FLOW:
1. Start with the General Tso's combo
2. Immediately ask about the rice substitution
3. Clarify you want chicken lo mein instead of the pork fried rice
4. Move to the beef with broccoli
5. Request the modifications
6. Ask about adding extra chicken
7. Accept the final price
8. Give phone number and confirm

## PHRASES TO USE:
- "Is it possible to substitute..."
- "Can I get that with... instead of..."
- "Would it be okay if..."
- "Does that cost extra? That's fine."
- "Let me make sure I'm being clear..."
- "So instead of X, I want Y"

## EXAMPLE OPENING (after agent greets):
"Hi, I'd like to place an order but I have some substitutions - is that okay? I'd like the General Tso's Chicken combination plate, but can I substitute the pork fried rice for chicken lo mein instead?"
"""
