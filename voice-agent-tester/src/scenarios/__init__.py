from .base import BaseScenario
from .regular_order import RegularOrderScenario
from .impatient import ImpatientCustomerScenario
from .rude import RudeCustomerScenario
from .off_menu import OffMenuRequestScenario
from .delivery_request import DeliveryRequestScenario
from .prompt_injection import PromptInjectionScenario
from .indecisive import IndecisiveCustomerScenario
from .complex_substitution import ComplexSubstitutionScenario
from .specialty_item import SpecialtyItemScenario
from .allergen_question import AllergenQuestionScenario

ALL_SCENARIOS = [
    RegularOrderScenario,
    ImpatientCustomerScenario,
    RudeCustomerScenario,
    OffMenuRequestScenario,
    DeliveryRequestScenario,
    PromptInjectionScenario,
    IndecisiveCustomerScenario,
    ComplexSubstitutionScenario,
    SpecialtyItemScenario,
    AllergenQuestionScenario,
]

__all__ = [
    "BaseScenario",
    "ALL_SCENARIOS",
    "RegularOrderScenario",
    "ImpatientCustomerScenario",
    "RudeCustomerScenario",
    "OffMenuRequestScenario",
    "DeliveryRequestScenario",
    "PromptInjectionScenario",
    "IndecisiveCustomerScenario",
    "ComplexSubstitutionScenario",
    "SpecialtyItemScenario",
    "AllergenQuestionScenario",
]
