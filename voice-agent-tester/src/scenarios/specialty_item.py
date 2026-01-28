"""
Scenario 9: Specialty Item (A1-A8)
A customer ordering from the specialty menu items.
Tests agent's handling of the special pricing structure for A-items.
"""

from .base import BaseScenario, ScenarioConfig


class SpecialtyItemScenario(BaseScenario):
    """A customer ordering specialty items with complex options."""

    def get_config(self) -> ScenarioConfig:
        return ScenarioConfig(
            name="specialty_item",
            description="Customer ordering specialty items (A1-A8) that have plain/fries/rice options",
            customer_persona="Customer who knows the menu and orders specialty items",
            expected_behaviors=[
                "Agent asks if customer wants plain, with fries, or with fried rice",
                "Agent clarifies fried rice type if applicable",
                "Agent correctly processes A-item order",
                "Agent provides correct pricing for the option chosen",
                "Agent summarizes specialty items correctly"
            ],
            success_criteria=[
                "Agent asked about plain/fries/fried rice option",
                "Agent asked about fried rice type when applicable",
                "Correct pricing was given for the selection",
                "Order summary was accurate"
            ],
            max_turns=18,
            target_duration_seconds=150
        )

    def get_customer_system_prompt(self) -> str:
        base = self.get_base_customer_instructions()
        return f"""
# You are ordering SPECIALTY ITEMS (A1-A8) from Far East Chinese Restaurant

{base}

## MENU CONTEXT:
The specialty items (A1-A8) have special options:
- Plain
- With French Fries
- With Fried Rice (pork, chicken, vegetable, beef, or shrimp)

## YOUR ORDER:
1. Chicken Wings (A1) - wait for them to ask how you want it
   - When asked, say: "with pork fried rice"

2. Fried Baby Shrimp (A8) - order this plain
   - Say: "just plain"

3. Also add a pint of Hot & Sour Soup

## YOUR PERSONA:
- You're familiar with the menu
- You know these items have options
- You wait for clarifying questions
- Your name is "Jenny" and phone number is "607-555-0009"

## CONVERSATION FLOW:
1. Order the chicken wings (A1)
2. Wait for agent to ask how you want it
3. If they don't ask, prompt: "Do you need to know how I want that?"
4. Specify with pork fried rice
5. Order the fried baby shrimp plain
6. Add the soup
7. Confirm and give phone number

## THINGS TO LISTEN FOR:
- Agent should ask: "Would you like that plain, with french fries, or with fried rice?"
- If with fried rice, agent should ask: "What kind of fried rice?"
- Agent should confirm the selections

## EXAMPLE OPENING (after agent greets):
"Hi, I'd like to order the chicken wings, the A1"
(Then wait for them to ask about plain/fries/rice)
"""
