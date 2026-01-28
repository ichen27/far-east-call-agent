/**
 * Agent Scenario Test
 * Tests the OpenAI agent through the system prompt using various scenarios
 * Scores for accuracy, staying on track, problem solving, order taking, efficiency
 * Outputs JSON and MD files with transcripts
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load test scenarios
const scenariosPath = path.join(__dirname, '../../restaurant_test_scenarios.json');
const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));

// Extract AGENT_INSTRUCTIONS from server.js to keep them in sync
function extractAgentInstructions() {
  const serverPath = path.join(__dirname, 'server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');

  // Find the AGENT_INSTRUCTIONS constant
  const startMarker = 'const AGENT_INSTRUCTIONS = `';
  const startIndex = serverContent.indexOf(startMarker);
  if (startIndex === -1) {
    console.error('Could not find AGENT_INSTRUCTIONS in server.js');
    process.exit(1);
  }

  // Find the end of the template literal (backtick followed by semicolon)
  let depth = 0;
  let endIndex = startIndex + startMarker.length;
  while (endIndex < serverContent.length) {
    if (serverContent[endIndex] === '`' && depth === 0) {
      break;
    }
    if (serverContent[endIndex] === '$' && serverContent[endIndex + 1] === '{') {
      depth++;
    }
    if (serverContent[endIndex] === '}' && depth > 0) {
      depth--;
    }
    endIndex++;
  }

  return serverContent.substring(startIndex + startMarker.length, endIndex);
}

// Get the current AGENT_INSTRUCTIONS from server.js
const AGENT_INSTRUCTIONS_FROM_SERVER = extractAgentInstructions();

// Output directory for test results
const outputDir = path.join(__dirname, '../../test_results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get next test number
function getNextTestNumber() {
  const files = fs.readdirSync(outputDir).filter(f => f.match(/^test_\d+\.json$/));
  if (files.length === 0) return 1;
  const numbers = files.map(f => parseInt(f.match(/test_(\d+)\.json/)[1]));
  return Math.max(...numbers) + 1;
}

// Use the AGENT_INSTRUCTIONS extracted from server.js to keep tests in sync
const AGENT_INSTRUCTIONS = AGENT_INSTRUCTIONS_FROM_SERVER;

// Original prompt archived below for reference, but we now use server.js directly
const AGENT_INSTRUCTIONS_ARCHIVED = `
# Personality
Start off the call with "Hello, this is Far East Chinese Restaurant. How can I help you today?"

You are Sarah, a friendly and efficient virtual assistant for Far East Chinese Restaurant.
You are polite, patient, and always ready to help customers place their orders.
You don't assume you know what the customer wants, make sure you ask clarifying questions. Especially with combination plates (if they want a combination plate or a regular plate), the size of their order, if it's a specialty (Specialties are (A1-A8)) then ask if they want it plain or with French fries or fried rice (and also what kind of fried rice they want).
Make it a goal to try to be as efficient as possible, try to take the customer's order and end the call as quickly as possible.

You have extensive knowledge of the menu and can answer questions about ingredients, preparation, and specials.
Don't give suggestions unless asked by the customer

# Questions (I only need you to obtain the following information):
*  What would the customer like to order
*  Once the customer tells you what they want, then ask for specifics, like size and clarifications
*  Size Questions:(
      -  Size options are: "Pt" (pint - smaller portion), "Qt" (quart - larger portion), or "Combination" (combo plate with fried rice and egg roll)
      -  Ask what size they want based on what is available in the menu:
      """
          > For regular orders that are availible in qt or pt, just ask "what size would you like?"
          > If an item is available as a combination as well as a regular order, please confirm which one they want.
          > For Chef Specialties, there is only one size so no need to ask, but if they request a size, then that is okay
      """
*  Ask clarifying questions if missing information or unsure about what the customer said.
*  Only summarize the order 1 time at the end once the customer has stated that they have finished their order
*  What the customer's phone number is (Only ask this at the end, after you take the order)

# Environment
You are assisting customers over the phone.
The customer is calling to place an order for takeout. (THERE IS NO DELIVERY).
You have access to the current menu, pricing, and restaurant information
Allow for substitutions and modifications of menu items
You also have access to tools that allow you to hang up the phone and submit the customer's order to the kitchen staff

# Tone
Your responses are friendly, clear, concise, and professional.
You use a friendly and welcoming tone.
You speak at a fast pace and enunciate clearly.
You use positive language and avoid slang or jargon.
You are patient and understanding, even when customers are indecisive or have special requests.

# Goal
*  Your primary goal is to accurately and efficiently take customer orders.
*  Be efficient with getting the customer's accurate order as quickly as possible.
*  Make sure you accurately get the customer's phone number at the end of the call.

2.  Order Taking:
    *   Listen to the customer carefully and answer any questions.
    *   Accurately record each item the customer orders requests.
    *   Confirm the quantity and size if not stated.

3.  Order Confirmation (At the end of the call):
    *   Repeat the entire order back to the customer to ensure accuracy.
    *   Confirm the total price, including tax.
    *   Ask for the customer's name and phone number for the order.

4.  Payment and Pickup/Delivery:
    *   Inform the customer of the price and the estimated pickup time. Average order (2-3 entrees) will be 10-15 minutes.

Success is measured by the accuracy of the orders taken, the efficiency of the order-taking process, and customer satisfaction.

# Guardrails
Never offer medical advice or information about allergens.
Never ask for sensitive personal information, such as credit card numbers, over the phone.
Never engage in inappropriate or offensive conversations.
If you are unsure of an answer or have issues with the customer, politely ask if the customer would like to speak to a person.
If the restaurant is closed or unable to fulfill the order, apologize to the customer and explain the situation.
Never offer delivery. Apologize about it if the customer asks for delivery.

# Tools
You have access to the following tools:
*  hang_up_call: Use this tool to end the phone call ONLY after you have: 1) submitted the order using submit_order, 2) spoken out loud the goodbye message with the estimated pickup time (10-15 minutes), and 3) said "bye bye" to the customer. 4) And wait at least 5 seconds after saying bye before calling this tool
*  submit_order: Use this tool to submit the order to the kitchen staff. Make sure the name is exactly what is stated on the menu, any changes need to go into the modification section for each item. Make sure the data is in JSON format following the Zod schema given to you. Submit the customer order ONLY ONCE, after you have confirmed all details AND collected the customer phone number. Do NOT call this tool until you have the phone number. Never call this tool more than once per order.

#  Price and Substitution policy
Only tell the customer the final price after calculations at the end.

Price calculation workflow:
The Price will be based on item, quantity, extras, and substitutions

Starting with item and quantity:
Price = item * quantity

Substitutions can be made for any item as long as it is on the menu.
Use this formula to calculate subsitutions:
(Item being ordered) * (substitution / Item being substituted)

For example:
Customer wants the General Chicken Combination, but they want to substitute the pork fried rice with chicken lo mein.
General Chicken Combination: $11.15
Pork Fried Rice: $5.95 for a pt
Chicken Lo Mein: $7.75 for the pt

Price  = 11.15 * (7.75 / 5.95)

Extras calculations:
Extra Chicken: +$2.00
Extra Beef: +$3.00
Extra Vegetable: Free

# Menu
"""FAR EAST KITCHEN
DELICIOUS CHINESE FOOD TO TAKE OUT OR EAT IN
125 Main Street, Binghamton, N.Y. 13905 (Across From Horizons Bank)
Tel: (607) 797-1166 / 5576

OPEN HOURS (OPEN 6 DAYS)
- Mon - Thurs: 11:00 am - 10:30 pm
- Fri & Sat:   11:00 am - 11:00 pm
- Closed on Sunday

======================================================================
APPETIZERS (No Rice)
  1. Vegetable Egg Roll (1) ........................................ 1.90
  2. Roast Pork Egg Roll (1) ....................................... 1.90
  3. Shrimp Egg Roll (1) ........................................... 2.00
  4. Vegetable Spring Roll (2) ..................................... 2.00
  5. Bar-B-Q Spare Ribs (S / L) ............................... 9.25 / 17.35
  6. Boneless Spare Ribs ...................................... 8.95 / 16.35
  7. Chinese Donut (10) ............................................ 6.25
  8. Fantail Shrimp (2) ............................................ 4.25
  9. Shrimp Toast .................................................. 6.25
 10. Fried Wonton w. Sweet & Sour Sauce ............................ 6.25
 11. Wonton w. Sesame Sauce (10) ................................... 7.25
 12. Dumplings ..................................................... 7.35
 13. Sesame Noodles ................................................ 7.35
 14. Pu Pu Platter (For 2) ......................................... 15.95
 15. Teriyaki Chicken (4) .......................................... 6.95
 16. Fried Jumbo Shrimp (5) ........................................ 7.95
 17. Crab Rangoon (6) .............................................. 6.25
 18. French Fries (S / L) ...................................... 3.35 / 5.45

======================================================================
SOUP (with Crisp Noodles)                                       Pt ......  Qt
 19. Wonton Soup ............................................... 3.35 | 5.35
 20. Egg Drop Soup ............................................. 3.35 | 5.35
 21. Chicken Rice Soup ......................................... 3.35 | 5.35
 22. Chicken Noodles Soup ...................................... 3.35 | 5.35
 23. Pork Yat Gaw Mein ......................................... 5.95 |  --
 24. Wonton Egg Drop Soup ...................................... 3.95 | 5.95
 25. Hot & Sour Soup ........................................... 3.95 | 5.95
 26. Fried Wonton Soup (for 2) .................................   -- | 7.35
 27. Veg. w. Bean Curd Soup (for 2) ............................   -- | 5.95
 27a. House Special Mei Fun Soup ...............................   -- | 7.35
 27b. House Special Chow Fun Soup ..............................   -- | 7.35
 27c. House Special Soup .......................................   -- | 7.35

======================================================================
CHOW MEIN (w. White Rice & Crisp Noodles)                       Pt ......  Qt
 28. Chicken Chow Mein ......................................... 7.35 | 10.55
 29. Roast Pork Chow Mein ...................................... 7.35 | 10.55
 30. Mixed Vegetable Chow Mein ................................. 6.95 | 10.15
 31. Beef Chow Mein ............................................ 7.95 | 11.15
 32. Shrimp Chow Mein .......................................... 7.95 | 11.15
 33. Special Chow Mein (Shrimp, Chicken, Roast Pork) ........... 7.95 | 11.15

======================================================================
CHOW FUN / MEI FUN (Soft Rice Noodles)                          Per Order
 34. Roast Pork Chow Fun or Mei Fun ............................ 10.55
 35. Chicken Chow Fun or Mei Fun ............................... 10.55
 36. Beef Chow Fun or Mei Fun .................................. 10.95
 37. Shrimp Chow Fun or Mei Fun ................................ 10.95
 38. Special Chow Fun or Mei Fun ............................... 11.55
 39. Vegetable Chow Fun or Mei Fun ............................. 10.15
 39a. Singapore Mei Fun ........................................ 11.55

======================================================================
CHOP SUEY (w. White Rice)                                       Pt ......  Qt
 40. Mixed Vegetable Chop Suey ................................. 6.95 | 10.15
 41. Roast Pork Chop Suey ...................................... 7.35 | 10.55
 42. Beef Chop Suey ............................................ 7.95 | 11.15
 43. Shrimp Chop Suey .......................................... 7.95 | 11.15
 44. Chicken Chop Suey ......................................... 7.35 | 10.55
 45. Special Chop Suey (Shrimp, Chicken, Roast Pork) ........... 7.95 | 10.95

======================================================================
FRIED RICE                                                      Pt ......  Qt
 46. Vegetable Fried Rice ...................................... 5.55 |  9.55
 47. Roast Pork Fried Rice ..................................... 5.95 |  9.95
 48. Shrimp Fried Rice ......................................... 6.75 | 10.55
 49. Chicken Fried Rice ........................................ 5.95 |  9.95
 49a. Beef Fried Rice .......................................... 6.75 | 10.55
 50. House Special Fried Rice .................................. 6.95 | 10.95

======================================================================
LO MEIN (Spaghetti, No Rice)                                    Pt ......  Qt
 51. Vegetable Lo Mein ......................................... 7.25 | 10.75
 52. Roast Pork Lo Mein ........................................ 7.75 | 10.95
 53. Beef Lo Mein .............................................. 7.95 | 11.55
 54. Chicken Lo Mein ........................................... 7.75 | 10.95
 55. Shrimp Lo Mein ............................................ 7.95 | 11.55
 56. Special Lo Mein (Shrimp, Chicken, Roast Pork) ............. 8.25 | 11.95

======================================================================
SIDE ORDER
  — White Rice (S / L) ..................................... 3.00 / 4.00
  — Fortune Cookie (5 pcs) ...................................... 1.00
  — Soda (Can) .................................................. 1.30
  — Crispy Noodle ............................................... 1.00
  — Homemade Iced Tea (S / L) ................................... 2.50

======================================================================
CHEF'S SPECIALTIES — Szechuan & Hunan (w. White Rice)  Per Order
 C1.  Jumbo Shrimp or Beef Szechuan Style ...................... 13.35
 C2.  Pork or Chicken Szechuan Style ........................... 12.55
 C3.  Crispy Shrimp ............................................ 13.95
 C4.  Jumbo Shrimp or Beef Hunan Style ......................... 13.35
 C5.  Pork or Chicken Hunan Style .............................. 12.55
 C6.  Moo Shu Pork or Chicken .................................. 12.55
 C7.  Moo Shu Shrimp or Beef ................................... 13.35
 C8.* Kung Po Chicken .......................................... 12.55
 C9.* Kung Po Shrimp or Beef ................................... 13.35
 C10. Beef w. Garlic Sauce ..................................... 13.35
 C11. Pork or Chicken w. Garlic Sauce .......................... 12.55
 C12. Shrimp w. Garlic Sauce ................................... 13.35
 C13. Sun See w. Garlic Sauce (Pork, Beef & Chicken) ........... 13.75
 C14.* Hot & Spicy Shrimp ...................................... 13.35
 C15. Sesame Beef or Orange Beef ............................... 13.95
 C16. General Tso's Chicken .................................... 12.95
 C17.* Pork or Beef w. Scallion Sauce .......................... 12.95
 C18. Scallops w. Garlic Sauce ................................  13.35
 C19. Sesame Chicken ........................................... 12.95
 C20.* Crispy Chicken w. Orange Flavor ......................... 12.95
 C21. Shrimp & Scallops Hunan Style ............................ 13.95
 C22. Beef & Scallops Hunan Style .............................. 13.95
 C23. Three Delights ........................................... 13.75
 C24. Four Seasons ............................................. 13.95
 C25. Happy Family ............................................. 16.95
 C26. Tung-Ting Shrimp ......................................... 13.35
 C27. Chicken w. Baby Shrimp ................................... 12.95
 C28. Dragon & Phoenix ......................................... 13.95
 C29. Lemon Chicken ............................................ 11.95
 C30. Subgum Wonton (with 8 fried wontons) ..................... 13.95
 C31. Butterfly Shrimp w. Bacon ................................ 13.95
 C32. Wor Shu Duck ............................................. 15.95
 C33. Special Duck ............................................. 17.95
  34. Seafood Delight .......................................... 16.95

======================================================================
BEEF (w. White Rice)                               Pt ......  Qt
 57. Beef w. Bean Sprouts ...................................... 8.55 | 12.95
 58. Pepper Steak w. Onion ..................................... 8.55 | 12.95
 59. Beef w. Pepper & Tomato ................................... 8.55 | 12.95
 60. Beef w. Chinese Vegetables ................................ 8.55 | 12.95
 61. Beef w. Mushrooms ......................................... 8.55 | 12.95
 62. Beef w. Oyster Sauce ...................................... 8.55 | 12.95
 63. Beef w. Snow Peas ......................................... 8.55 | 12.95
 64. Beef w. Onion & Curry Sauce ............................... 8.55 | 12.95
 65. Beef w. Broccoli .......................................... 8.55 | 12.95
 66. Beef w. Bean Curd ......................................... 8.55 | 12.95
 66a. Beef w. Black Bean Sauce ................................. 8.55 | 12.95
 67. Beef w. Cashew Nuts (Order) ...............................   -- | 12.95

======================================================================
ROAST PORK (w. White Rice)                          Pt ......  Qt
 68. Roast Pork w. Bean Sprouts ................................. 8.15 | 12.55
 69. Roast Pork w. Chinese Vegetables ..........................  8.15 | 12.55
 70. Roast Pork w. Mushrooms ...................................  8.15 | 12.55
 71. Roast Pork w. Snow Peas ...................................  8.15 | 12.55
 72. Roast Pork w. Bean Curd ...................................  8.15 | 12.55
 73. Roast Pork w. Oyster Sauce ................................. 8.15 | 12.55
 74. Roast Pork w. Broccoli ....................................  8.15 | 12.55

======================================================================
CHICKEN (w. White Rice)                             Pt ......  Qt
 75. Chicken w. Bean Curd ...................................... 8.15 | 12.55
 76. Chicken w. Snow Peas ...................................... 8.15 | 12.55
 77. Chicken w. Pepper & Tomato ................................ 8.15 | 12.55
 78. Chicken w. Oyster Sauce ................................... 8.15 | 12.55
 79. Chicken w. Onion & Curry Sauce ............................ 8.15 | 12.55
 80. Moo Goo Gai Pan ........................................... 8.15 | 12.55
 81. Chicken w. Broccoli ....................................... 8.15 | 12.55
 81a. Chicken w. Black Bean Sauce .............................. 8.15 | 12.55
 82. Chicken w. Cashew Nuts (Order) ............................   -- | 12.55

======================================================================
SEAFOOD (w. White Rice)                             Pt ......  Qt
 83. Lobster Sauce ............................................. 4.50 |  6.95
 84. Shrimp w. Bean Sprouts .................................... 8.55 | 13.35
 85. Shrimp w. Lobster Sauce ................................... 8.55 | 13.35
 86. Shrimp w. Chinese Vegetables .............................. 8.55 | 13.35
 87. Shrimp w. Pepper & Tomato ................................. 8.55 | 13.35
 88. Shrimp w. Mushrooms ....................................... 8.55 | 13.35
 89. Shrimp w. Bean Curd ....................................... 8.55 | 13.35
 90. Shrimp w. Onion & Curry Sauce ............................. 8.55 | 13.35
 91. Shrimp w. Snow Peas ....................................... 8.55 | 13.35
 92. Shrimp w. Oyster Sauce .................................... 8.55 | 13.35
 93. Shrimp w. Broccoli ........................................ 8.55 | 13.35
 93a. Shrimp w. Black Bean Sauce ............................... 8.55 | 13.35
 94. Shrimp w. Cashew Nuts (Order) .............................   -- | 13.35

======================================================================
EGG FOO YOUNG (w. White Rice)                      Per Order
 95. Roast Pork Egg Foo Young .................................. 11.15
 96. Shrimp Egg Foo Young ...................................... 11.95
 97. Chicken Egg Foo Young ..................................... 11.15
 98. Vegetable Egg Foo Young ................................... 10.95

======================================================================
SWEET & SOUR (w. White Rice)                        Per Order
 99. Sweet & Sour Pork ......................................... 11.95
100. Sweet & Sour Shrimp ....................................... 12.95
101. Sweet & Sour Chicken ...................................... 11.95

======================================================================
VEGETABLE DISHES (w. Rice)                          Per Order
102. Sauteed Mixed Vegetable ................................... 10.75
103a. Mixed Vegetable w. Garlic Sauce .......................... 10.75
104. Broccoli w. Garlic Sauce .................................. 10.75
105a. Bean Curd Szechuan Style ................................  10.75
106. Moo Shu Vegetable ......................................... 10.75
107. Bean Curd Home Style ...................................... 10.75
108. Bean Curd w. Brown Sauce .................................. 10.75
110. Sesame Bean Curd .......................................... 10.75
111. Bean Curd w. Garlic Sauce ................................. 10.75

======================================================================
SPECIALTIES (A-Items; price formats vary — see right of slashes)
 A1. Chicken Wing (4 pcs) or Half Chicken ............. 7.75 / 10.95 / 11.15 / 11.95 / 11.95
 A2. Spare Ribs Tips ................................. (Pt) 7.75 / (Qt) 11.95 / 10.95 / 11.15 / 11.95 / 11.95
 A3. Fried Scallop (10) ................................ 6.25 / 10.75 / 10.95 / 11.75 / 11.75
 A4. Fried Chicken Nuggets (10) ........................ 6.25 / 10.75 / 10.95 / 11.75 / 11.75
 A5. Fried Crab Stick (4) .............................. 6.25 / 10.75 / 10.95 / 11.75 / 11.75
 A6. Fried Chicken Wings w. Garlic Sauce .............. 8.75 / 11.95 / 12.15 / 12.95 / 12.95
 A8. Fried Baby Shrimp (18) ............................ 7.75 / 10.95 / 11.15 / 11.95 / 11.95

(Price columns for A-items, in order: Plain / with French Fries (or plain fried rice) / with Chicken or Pork (or Veg) Fried Rice / with Beef Fried Rice / with Shrimp Fried Rice.)

======================================================================
DIET MENU (Steamed; no salt or oil; w. White Rice & Sauce on side)
 D1. Steamed Mixed Vegetable ................................... 10.75
 D2. Steamed Chicken w. Mixed Vegetables ....................... 12.55
 D3. Steamed Jumbo Shrimp w. Mixed Vegetable ................... 13.35
 D4. Steamed Jumbo Shrimp & Chicken w. Mixed Vegetable ......... 13.95
 D5. Steamed Chicken Slices .................................... 14.95

======================================================================
COMBINATION PLATES (Served w. Pork Fried Rice & Egg Roll) (allow for substitutions and modifications for the pork fried rice and egg roll)
  1. Chicken Chow Mein ......................................... 10.95
  2. Shrimp w. Mixed Vegs ...................................... 11.15
  3. Pork or Chicken Egg Foo Young ............................. 11.15
  4. Pepper Steak .............................................. 11.15
  5. Roast Pork w. Chinese Veg ................................. 10.95
  6. Shrimp w. Lobster Sauce ................................... 11.15
  7. B-B-Q Spare Ribs or Boneless .............................. 11.55
  8. Sweet & Sour Pork or Chicken .............................. 10.95
  9. Moo Goo Gai Pan ........................................... 10.95
 10. Chicken or Pork w. Garlic Sauce ........................... 10.95
 11. Pork or Chicken w. Broccoli ............................... 10.95
 12. Chicken or Pork Lo Mein ................................... 10.95
 13. General Tso's Chicken ..................................... 11.15
 14. Sesame Chicken ............................................ 11.15
 15. Chicken w. Cashew Nuts .................................... 10.95
 16. Shrimp or Beef w. Broccoli ................................ 11.15
 17. Kung Pao Chicken .......................................... 10.95
 18. Hunan or Szechuan Chicken ................................. 10.95
 19. Mixed Vegetable w. Garlic Sauce ........................... 10.95
 20. Triple Delight (Shrimp, Chicken, Pork) .................... 11.15

======================================================================
LUNCHEON PLATES (11:00 am - 3:00 pm)
$1.00 Extra for Wonton or Egg Drop Soup — Please Order by Number
(Each served with Pork Fried Rice; see back page for detailed items.)

HOT & SPICY: We can alter the spice to suit your taste.
======================================================================
"""
`;

// Tool definitions for the agent
const tools = [
  {
    type: "function",
    function: {
      name: "submit_order",
      description: "Submit the customer order after confirming all details with the customer",
      parameters: {
        type: "object",
        properties: {
          phoneNumber: { type: "string", description: "Customer phone number" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                size: { type: "string" },
                price: { type: "number" },
                modifications: { type: "string" }
              },
              required: ["name", "quantity", "price"]
            }
          },
          notes: { type: "string" },
          totalPrice: { type: "number" }
        },
        required: ["phoneNumber", "items", "totalPrice"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "hang_up_call",
      description: "End the phone call after order is submitted and goodbye is said",
      parameters: { type: "object", properties: {} }
    }
  }
];

// Scoring criteria definitions
const SCORING_CRITERIA = {
  accuracy: {
    name: "Order Accuracy",
    description: "How accurately the agent captures the order items, quantities, and modifications",
    weight: 0.25
  },
  staysOnTrack: {
    name: "Stays On Track",
    description: "How well the agent keeps the conversation focused on ordering",
    weight: 0.15
  },
  problemSolving: {
    name: "Problem Solving",
    description: "How effectively the agent handles issues, clarifications, and edge cases",
    weight: 0.15
  },
  orderTaking: {
    name: "Order Taking Process",
    description: "How well the agent follows the order-taking flow (items, sizes, phone, summary)",
    weight: 0.20
  },
  efficiency: {
    name: "Efficiency",
    description: "How quickly and concisely the agent completes the order without unnecessary steps",
    weight: 0.10
  },
  professionalism: {
    name: "Professionalism",
    description: "How polite, patient, and professional the agent remains throughout",
    weight: 0.10
  },
  guardrails: {
    name: "Guardrail Compliance",
    description: "How well the agent adheres to safety guidelines (no allergen advice, no credit cards, no delivery)",
    weight: 0.05
  }
};

// Run a single conversation scenario
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${scenario.name} (${scenario.id})`);
  console.log(`Category: ${scenario.category} | Personality: ${scenario.personality}`);
  console.log('='.repeat(60));

  const transcript = [];
  const messages = [{ role: "system", content: AGENT_INSTRUCTIONS }];

  let orderSubmitted = null;
  let hangUpCalled = false;
  let turnCount = 0;
  const maxTurns = 30;

  // Start with agent greeting
  try {
    const initialResponse = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: tools,
        tool_choice: "auto"
      }),
      30000,
      'Initial greeting timed out'
    );

    const agentGreeting = initialResponse.choices[0].message;
    messages.push(agentGreeting);

    if (agentGreeting.content) {
      transcript.push({ role: "agent", content: agentGreeting.content });
      console.log(`Agent: ${agentGreeting.content}`);
    }
  } catch (error) {
    console.error("Error getting initial greeting:", error.message);
  }

  // Process customer script
  for (const customerLine of scenario.customer_script) {
    if (turnCount >= maxTurns) {
      console.log("Max turns reached, ending conversation");
      break;
    }

    // Customer turn
    transcript.push({ role: "customer", content: customerLine });
    console.log(`Customer: ${customerLine}`);
    messages.push({ role: "user", content: customerLine });

    // Agent response loop (handle tool calls)
    let continueLoop = true;
    while (continueLoop && turnCount < maxTurns) {
      turnCount++;

      try {
        // Small delay between API calls to avoid rate limits
        await sleep(500);

        const response = await withTimeout(
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            tools: tools,
            tool_choice: "auto"
          }),
          30000,
          'Conversation turn timed out'
        );

        const agentMessage = response.choices[0].message;
        messages.push(agentMessage);

        // Handle tool calls
        if (agentMessage.tool_calls && agentMessage.tool_calls.length > 0) {
          for (const toolCall of agentMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

            console.log(`[Tool Call: ${toolName}]`);
            transcript.push({
              role: "tool_call",
              tool: toolName,
              arguments: toolArgs
            });

            // Handle tool responses
            let toolResponse = "";
            if (toolName === "submit_order") {
              orderSubmitted = toolArgs;
              toolResponse = `Order submitted successfully. Order number: ${Math.floor(Math.random() * 1000)}`;
              console.log(`[Order Submitted: ${JSON.stringify(toolArgs, null, 2)}]`);
            } else if (toolName === "hang_up_call") {
              hangUpCalled = true;
              toolResponse = "Call ended successfully";
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResponse
            });
          }
        }

        // Output agent text response
        if (agentMessage.content) {
          transcript.push({ role: "agent", content: agentMessage.content });
          console.log(`Agent: ${agentMessage.content}`);
        }

        // Stop if no more tool calls or finished
        if (!agentMessage.tool_calls || agentMessage.tool_calls.length === 0) {
          continueLoop = false;
        }

        // End if hang up was called
        if (hangUpCalled) {
          continueLoop = false;
        }

      } catch (error) {
        console.error("Error in conversation:", error.message);
        continueLoop = false;
      }
    }

    if (hangUpCalled) break;
  }

  return {
    transcript,
    orderSubmitted,
    hangUpCalled,
    turnCount
  };
}

// Sleep utility for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Timeout wrapper for async functions
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Rate limited. Waiting ${delay / 1000}s before retry ${i + 1}/${maxRetries}...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

// Evaluate the conversation using GPT
async function evaluateConversation(scenario, result) {
  const evaluationPrompt = `
You are an expert evaluator for a restaurant phone ordering AI system.

Evaluate the following conversation between an AI agent (Sarah) and a customer based on these criteria. Score each from 0-100.

## Scenario Information
- **Name**: ${scenario.name}
- **Category**: ${scenario.category}
- **Personality**: ${scenario.personality}
- **Description**: ${scenario.description}
- **Test Objectives**: ${JSON.stringify(scenario.test_objectives)}
- **Expected Agent Behaviors**: ${JSON.stringify(scenario.expected_agent_behaviors)}

## Conversation Transcript
${result.transcript.map(t => {
  if (t.role === 'tool_call') {
    return `[TOOL: ${t.tool}] Args: ${JSON.stringify(t.arguments)}`;
  }
  return `${t.role.toUpperCase()}: ${t.content}`;
}).join('\n')}

## Order Submitted
${result.orderSubmitted ? JSON.stringify(result.orderSubmitted, null, 2) : 'No order was submitted'}

## Evaluation Criteria
For each criterion, provide a score (0-100) and brief justification:

1. **Order Accuracy** (weight: 25%): How accurately were items, quantities, sizes, prices captured?
2. **Stays On Track** (weight: 15%): Did agent keep conversation focused on ordering?
3. **Problem Solving** (weight: 15%): How well did agent handle clarifications, edge cases, unusual requests?
4. **Order Taking Process** (weight: 20%): Did agent follow proper flow (items → sizes → confirm → phone → summary)?
5. **Efficiency** (weight: 10%): Was conversation concise without unnecessary repetition?
6. **Professionalism** (weight: 10%): Was agent polite, patient, professional throughout?
7. **Guardrail Compliance** (weight: 5%): Did agent avoid allergen advice, credit cards, offering delivery?

Respond in JSON format:
{
  "scores": {
    "accuracy": { "score": number, "justification": "string" },
    "staysOnTrack": { "score": number, "justification": "string" },
    "problemSolving": { "score": number, "justification": "string" },
    "orderTaking": { "score": number, "justification": "string" },
    "efficiency": { "score": number, "justification": "string" },
    "professionalism": { "score": number, "justification": "string" },
    "guardrails": { "score": number, "justification": "string" }
  },
  "expectedBehaviorsChecklist": [
    { "behavior": "string", "met": boolean, "notes": "string" }
  ],
  "testObjectivesChecklist": [
    { "objective": "string", "met": boolean, "notes": "string" }
  ],
  "overallNotes": "string",
  "criticalIssues": ["string"]
}
`;

  try {
    return await retryWithBackoff(async () => {
      const response = await withTimeout(
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: evaluationPrompt }],
          response_format: { type: "json_object" }
        }),
        60000,
        'Evaluation timed out'
      );
      return JSON.parse(response.choices[0].message.content);
    });
  } catch (error) {
    console.error("Error evaluating conversation:", error.message);
    return null;
  }
}

// Calculate weighted score
function calculateWeightedScore(scores) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, criteria] of Object.entries(SCORING_CRITERIA)) {
    if (scores[key] && typeof scores[key].score === 'number') {
      totalScore += scores[key].score * criteria.weight;
      totalWeight += criteria.weight;
    }
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) / 100 : 0;
}

// Generate markdown report
function generateMarkdownReport(testResults) {
  const timestamp = new Date().toISOString();
  let md = `# Agent Scenario Test Results

**Test Run**: ${testResults.testNumber}
**Date**: ${timestamp}
**Total Scenarios**: ${testResults.scenarios.length}
**Average Score**: ${testResults.averageScore.toFixed(1)}/100

---

## Summary

| Category | Score | Status |
|----------|-------|--------|
`;

  // Category summaries
  const categoryScores = {};
  for (const result of testResults.scenarios) {
    const cat = result.scenario.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { total: 0, count: 0 };
    }
    categoryScores[cat].total += result.weightedScore;
    categoryScores[cat].count++;
  }

  for (const [category, data] of Object.entries(categoryScores)) {
    const avgScore = data.total / data.count;
    const status = avgScore >= 80 ? '✅ Pass' : avgScore >= 60 ? '⚠️ Needs Work' : '❌ Fail';
    md += `| ${category} | ${avgScore.toFixed(1)} | ${status} |\n`;
  }

  md += `\n---\n\n## Detailed Results\n\n`;

  // Individual scenario results
  for (const result of testResults.scenarios) {
    const status = result.weightedScore >= 80 ? '✅' : result.weightedScore >= 60 ? '⚠️' : '❌';

    md += `### ${status} ${result.scenario.name} (${result.scenario.id})

**Category**: ${result.scenario.category}
**Personality**: ${result.scenario.personality}
**Weighted Score**: ${result.weightedScore.toFixed(1)}/100

#### Scores
| Criterion | Score | Justification |
|-----------|-------|---------------|
`;

    if (result.evaluation && result.evaluation.scores) {
      for (const [key, criteria] of Object.entries(SCORING_CRITERIA)) {
        const score = result.evaluation.scores[key];
        if (score) {
          md += `| ${criteria.name} | ${score.score} | ${score.justification.replace(/\|/g, '\\|').substring(0, 100)}... |\n`;
        }
      }
    }

    md += `\n#### Test Objectives\n`;
    if (result.evaluation && result.evaluation.testObjectivesChecklist) {
      for (const obj of result.evaluation.testObjectivesChecklist) {
        const icon = obj.met ? '✅' : '❌';
        md += `- ${icon} ${obj.objective}: ${obj.notes}\n`;
      }
    }

    md += `\n#### Expected Behaviors\n`;
    if (result.evaluation && result.evaluation.expectedBehaviorsChecklist) {
      for (const beh of result.evaluation.expectedBehaviorsChecklist) {
        const icon = beh.met ? '✅' : '❌';
        md += `- ${icon} ${beh.behavior}: ${beh.notes}\n`;
      }
    }

    if (result.evaluation && result.evaluation.criticalIssues && result.evaluation.criticalIssues.length > 0) {
      md += `\n#### Critical Issues\n`;
      for (const issue of result.evaluation.criticalIssues) {
        md += `- ⚠️ ${issue}\n`;
      }
    }

    md += `\n#### Order Submitted\n`;
    if (result.orderSubmitted) {
      md += `\`\`\`json\n${JSON.stringify(result.orderSubmitted, null, 2)}\n\`\`\`\n`;
    } else {
      md += `*No order was submitted*\n`;
    }

    md += `\n#### Transcript\n`;
    for (const turn of result.transcript) {
      if (turn.role === 'tool_call') {
        md += `> **[TOOL: ${turn.tool}]** \`${JSON.stringify(turn.arguments)}\`\n\n`;
      } else {
        const speaker = turn.role === 'agent' ? '**Sarah (Agent)**' : '**Customer**';
        md += `${speaker}: ${turn.content}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  return md;
}


// CLI interface
function printUsage() {
  console.log(`
Agent Scenario Test Runner

Usage:
  node agentScenarioTest.js [options]

Options:
  --scenarios <ids>    Run specific scenarios (comma-separated)
                       Example: --scenarios order_001,order_005,order_010

  --limit <n>          Run first n scenarios
                       Example: --limit 5

  --category <name>    Run all scenarios in a specific category
                       Categories: basic_ordering, substitutions, specialty_items,
                       edge_cases, personality_challenge, unavailable_services,
                       unavailable_items, guardrails, stress_test, customer_questions,
                       restaurant_info, menu_clarification, modifications, special_menus,
                       communication_challenge, efficiency_test, time_restrictions,
                       ordering_style, context_order, price_verification, minimal_order

  --help               Show this help message

Examples:
  node agentScenarioTest.js --limit 3
  node agentScenarioTest.js --scenarios order_001,order_002
  node agentScenarioTest.js --category guardrails
`);
}

const args = process.argv.slice(2);
let scenarioIds = null;
let limit = null;
let category = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help') {
    printUsage();
    process.exit(0);
  }
  if (args[i] === '--scenarios' && args[i + 1]) {
    scenarioIds = args[i + 1].split(',').map(s => s.trim());
  }
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1]);
  }
  if (args[i] === '--category' && args[i + 1]) {
    category = args[i + 1].trim();
  }
}

// Main test runner with category support
async function runTestsWithCategory(scenarioIds = null, limit = null, category = null) {
  console.log('\n' + '='.repeat(60));
  console.log('FAR EAST RESTAURANT AGENT SCENARIO TEST');
  console.log('='.repeat(60));

  const testNumber = getNextTestNumber();
  console.log(`\nTest Run #${testNumber}`);

  // Filter scenarios
  let testScenarios = scenarios.test_scenarios;

  if (category) {
    testScenarios = testScenarios.filter(s => s.category === category);
    console.log(`Running category: ${category}`);
  }

  if (scenarioIds && scenarioIds.length > 0) {
    testScenarios = testScenarios.filter(s => scenarioIds.includes(s.id));
    console.log(`Running specific scenarios: ${scenarioIds.join(', ')}`);
  } else if (limit) {
    testScenarios = testScenarios.slice(0, limit);
    console.log(`Running first ${limit} scenarios`);
  }

  if (testScenarios.length === 0) {
    console.log('No scenarios match the criteria. Exiting.');
    process.exit(1);
  }

  console.log(`Total scenarios to run: ${testScenarios.length}\n`);

  const results = [];
  let totalScore = 0;

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\nProgress: ${i + 1}/${testScenarios.length}`);

    // Run the scenario
    const conversationResult = await runScenario(scenario);

    // Evaluate the conversation
    console.log('\nEvaluating conversation...');
    const evaluation = await evaluateConversation(scenario, conversationResult);

    // Calculate weighted score
    const weightedScore = evaluation ? calculateWeightedScore(evaluation.scores) : 0;
    totalScore += weightedScore;

    results.push({
      scenario: {
        id: scenario.id,
        name: scenario.name,
        category: scenario.category,
        personality: scenario.personality,
        description: scenario.description,
        test_objectives: scenario.test_objectives,
        expected_agent_behaviors: scenario.expected_agent_behaviors
      },
      transcript: conversationResult.transcript,
      orderSubmitted: conversationResult.orderSubmitted,
      hangUpCalled: conversationResult.hangUpCalled,
      turnCount: conversationResult.turnCount,
      evaluation: evaluation,
      weightedScore: weightedScore
    });

    console.log(`\nScore: ${weightedScore.toFixed(1)}/100`);

    // Delay between scenarios to avoid rate limits
    if (i < testScenarios.length - 1) {
      await sleep(3000);
    }
  }

  const averageScore = results.length > 0 ? totalScore / results.length : 0;

  const testResults = {
    testNumber,
    timestamp: new Date().toISOString(),
    totalScenarios: results.length,
    averageScore,
    categoryFilter: category || 'all',
    scoringCriteria: SCORING_CRITERIA,
    scenarios: results
  };

  // Save JSON results
  const jsonPath = path.join(outputDir, `test_${testNumber}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  console.log(`\nJSON results saved to: ${jsonPath}`);

  // Save Markdown report
  const mdPath = path.join(outputDir, `test_${testNumber}.md`);
  const mdReport = generateMarkdownReport(testResults);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`Markdown report saved to: ${mdPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Average Score: ${averageScore.toFixed(1)}/100`);
  console.log(`Pass Rate (≥80): ${(results.filter(r => r.weightedScore >= 80).length / results.length * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  return testResults;
}

// Run the tests
runTestsWithCategory(scenarioIds, limit, category).catch(console.error);
