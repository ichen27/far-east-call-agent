"""
Tests for the scenario module.
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.scenarios.base import BaseScenario, ScenarioConfig
from src.scenarios.regular_order import RegularOrderScenario
from src.scenarios.impatient import ImpatientCustomerScenario
from src.scenarios.rude import RudeCustomerScenario
from src.scenarios.off_menu import OffMenuRequestScenario
from src.scenarios.delivery_request import DeliveryRequestScenario
from src.scenarios.prompt_injection import PromptInjectionScenario
from src.scenarios.indecisive import IndecisiveCustomerScenario
from src.scenarios.complex_substitution import ComplexSubstitutionScenario
from src.scenarios.specialty_item import SpecialtyItemScenario
from src.scenarios.allergen_question import AllergenQuestionScenario


class TestScenarioConfig:
    """Tests for ScenarioConfig dataclass."""

    def test_create_scenario_config(self):
        config = ScenarioConfig(
            name="test_scenario",
            description="Test description",
            customer_persona="Test persona"
        )

        assert config.name == "test_scenario"
        assert config.description == "Test description"
        assert config.customer_persona == "Test persona"
        assert config.expected_behaviors == []
        assert config.success_criteria == []
        assert config.max_turns == 20
        assert config.target_duration_seconds == 180

    def test_scenario_config_with_custom_values(self):
        config = ScenarioConfig(
            name="custom",
            description="Custom scenario",
            customer_persona="Custom persona",
            expected_behaviors=["greet", "ask size"],
            success_criteria=["order placed"],
            max_turns=10,
            target_duration_seconds=120
        )

        assert config.max_turns == 10
        assert config.target_duration_seconds == 120
        assert len(config.expected_behaviors) == 2
        assert len(config.success_criteria) == 1


class TestBaseScenario:
    """Tests for BaseScenario abstract class behavior via concrete implementations."""

    def test_get_config_returns_scenario_config(self):
        scenario = RegularOrderScenario()
        config = scenario.get_config()

        assert isinstance(config, ScenarioConfig)
        assert config.name is not None
        assert config.description is not None

    def test_get_customer_system_prompt_not_empty(self):
        scenario = RegularOrderScenario()
        prompt = scenario.get_customer_system_prompt()

        assert prompt is not None
        assert len(prompt) > 0

    def test_get_initial_message_default_none(self):
        scenario = RegularOrderScenario()
        message = scenario.get_initial_message()

        assert message is None

    def test_get_base_customer_instructions_contains_rules(self):
        scenario = RegularOrderScenario()
        instructions = scenario.get_base_customer_instructions()

        assert "CRITICAL RULES" in instructions
        assert "TIMING GUIDANCE" in instructions
        assert "CONVERSATION FLOW" in instructions

    def test_evaluate_call_default_implementation(self):
        scenario = RegularOrderScenario()
        result = scenario.evaluate_call([], {})

        assert result["scenario_completed"] is True
        assert result["notes"] == []


class TestRegularOrderScenario:
    """Tests for the RegularOrderScenario."""

    @pytest.fixture
    def scenario(self):
        return RegularOrderScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "regular_order"
        assert "straightforward" in config.description.lower() or "simple" in config.description.lower()
        assert config.max_turns == 15
        assert config.target_duration_seconds == 120

    def test_expected_behaviors(self, scenario):
        config = scenario.config

        assert len(config.expected_behaviors) > 0
        behaviors_text = " ".join(config.expected_behaviors).lower()
        assert "greet" in behaviors_text
        assert "size" in behaviors_text
        assert "phone" in behaviors_text

    def test_system_prompt_contains_order(self, scenario):
        prompt = scenario.get_customer_system_prompt()

        assert "General Tso" in prompt
        assert "Pork Fried Rice" in prompt

    def test_system_prompt_contains_persona(self, scenario):
        prompt = scenario.get_customer_system_prompt()

        assert "friendly" in prompt.lower()
        assert "Mike" in prompt


class TestImpatientCustomerScenario:
    """Tests for the ImpatientCustomerScenario."""

    @pytest.fixture
    def scenario(self):
        return ImpatientCustomerScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "impatient_customer"
        assert "rush" in config.description.lower() or "hurry" in config.description.lower() or "quick" in config.description.lower()

    def test_system_prompt_contains_impatient_behavior(self, scenario):
        prompt = scenario.get_customer_system_prompt()

        assert "hurry" in prompt.lower() or "rush" in prompt.lower() or "quick" in prompt.lower()


class TestRudeCustomerScenario:
    """Tests for the RudeCustomerScenario."""

    @pytest.fixture
    def scenario(self):
        return RudeCustomerScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "rude_customer"

    def test_expected_behaviors_include_professional(self, scenario):
        config = scenario.config
        behaviors_text = " ".join(config.expected_behaviors).lower()

        assert "professional" in behaviors_text or "calm" in behaviors_text


class TestDeliveryRequestScenario:
    """Tests for the DeliveryRequestScenario."""

    @pytest.fixture
    def scenario(self):
        return DeliveryRequestScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "delivery_request"
        assert "delivery" in config.description.lower()

    def test_expected_behaviors(self, scenario):
        config = scenario.config
        behaviors_text = " ".join(config.expected_behaviors).lower()

        # Should expect agent to decline delivery
        assert "decline" in behaviors_text or "takeout" in behaviors_text or "pickup" in behaviors_text


class TestPromptInjectionScenario:
    """Tests for the PromptInjectionScenario."""

    @pytest.fixture
    def scenario(self):
        return PromptInjectionScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "prompt_injection"
        assert "injection" in config.description.lower() or "jailbreak" in config.description.lower() or "manipulation" in config.description.lower()

    def test_expected_behaviors_include_resistance(self, scenario):
        config = scenario.config
        behaviors_text = " ".join(config.expected_behaviors).lower()

        assert "ignore" in behaviors_text or "resist" in behaviors_text or "character" in behaviors_text

    def test_success_criteria_include_safety(self, scenario):
        config = scenario.config
        criteria_text = " ".join(config.success_criteria).lower()

        assert "never" in criteria_text or "not" in criteria_text
        assert "system prompt" in criteria_text or "character" in criteria_text


class TestOffMenuRequestScenario:
    """Tests for the OffMenuRequestScenario."""

    @pytest.fixture
    def scenario(self):
        return OffMenuRequestScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "off_menu_request"

    def test_system_prompt_contains_unavailable_items(self, scenario):
        prompt = scenario.get_customer_system_prompt()

        # Should ask for something not on menu
        assert len(prompt) > 100  # Has substantial content


class TestIndecisiveCustomerScenario:
    """Tests for the IndecisiveCustomerScenario."""

    @pytest.fixture
    def scenario(self):
        return IndecisiveCustomerScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "indecisive_customer"
        assert "indecisive" in config.description.lower() or "change" in config.description.lower()


class TestComplexSubstitutionScenario:
    """Tests for the ComplexSubstitutionScenario."""

    @pytest.fixture
    def scenario(self):
        return ComplexSubstitutionScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "complex_substitution"
        assert "substitution" in config.description.lower() or "modification" in config.description.lower()


class TestSpecialtyItemScenario:
    """Tests for the SpecialtyItemScenario."""

    @pytest.fixture
    def scenario(self):
        return SpecialtyItemScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "specialty_item"


class TestAllergenQuestionScenario:
    """Tests for the AllergenQuestionScenario."""

    @pytest.fixture
    def scenario(self):
        return AllergenQuestionScenario()

    def test_config_values(self, scenario):
        config = scenario.config

        assert config.name == "allergen_question"
        assert "allergen" in config.description.lower() or "medical" in config.description.lower() or "health" in config.description.lower()

    def test_expected_behaviors_include_no_medical_advice(self, scenario):
        config = scenario.config
        behaviors_text = " ".join(config.expected_behaviors).lower()

        assert "medical" in behaviors_text or "advice" in behaviors_text or "health" in behaviors_text


class TestAllScenariosValid:
    """Tests that all scenarios have valid configuration."""

    @pytest.fixture
    def all_scenarios(self):
        return [
            RegularOrderScenario(),
            ImpatientCustomerScenario(),
            RudeCustomerScenario(),
            OffMenuRequestScenario(),
            DeliveryRequestScenario(),
            PromptInjectionScenario(),
            IndecisiveCustomerScenario(),
            ComplexSubstitutionScenario(),
            SpecialtyItemScenario(),
            AllergenQuestionScenario(),
        ]

    def test_all_have_unique_names(self, all_scenarios):
        names = [s.config.name for s in all_scenarios]
        assert len(names) == len(set(names)), "Scenario names must be unique"

    def test_all_have_descriptions(self, all_scenarios):
        for scenario in all_scenarios:
            assert len(scenario.config.description) > 10

    def test_all_have_persona(self, all_scenarios):
        for scenario in all_scenarios:
            assert len(scenario.config.customer_persona) > 5

    def test_all_have_expected_behaviors(self, all_scenarios):
        for scenario in all_scenarios:
            assert len(scenario.config.expected_behaviors) > 0

    def test_all_have_system_prompts(self, all_scenarios):
        for scenario in all_scenarios:
            prompt = scenario.get_customer_system_prompt()
            assert len(prompt) > 100

    def test_all_have_reasonable_max_turns(self, all_scenarios):
        for scenario in all_scenarios:
            assert 5 <= scenario.config.max_turns <= 30

    def test_all_have_reasonable_duration(self, all_scenarios):
        for scenario in all_scenarios:
            assert 60 <= scenario.config.target_duration_seconds <= 300
