// Text Chat Agent using OpenAI Agents SDK
// Run: node chat_agent.js
// Open: http://localhost:3001

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import Database from 'better-sqlite3';

console.log('OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

// Open database connection
const db = new Database('fareast.db');
db.pragma('foreign_keys = ON');

// Generate order number
function generateOrderNumber() {
  const today = new Date().toISOString().slice(0, 10);
  const countResult = db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE DATE(created_at) = DATE(?)
  `).get(today);
  return (countResult.count + 1).toString();
}

const AGENT_INSTRUCTIONS = `
# Personality
Start off with "Hello, this is Far East Chinese Restaurant. How can I help you today?"

You are Sarah, a friendly and efficient virtual assistant for Far East Chinese Restaurant.
You are polite, patient, and always ready to help customers place their orders.
You don't assume you know what the customer wants, make sure you ask clarifying questions. Especially with combination plates (if they want a combination plate or a regular plate), the size of their order, if it's a specialty (Specialties are (A1-A8)) then ask if they want it plain or with French fries or fried rice (and also what kind of fried rice they want).
Make it a goal to try to be as efficient as possible, try to take the customer's order and end the conversation as quickly as possible.

You have extensive knowledge of the menu and can answer questions about ingredients, preparation, and specials.
Don't give suggestions unless asked by the customer

# Questions (I only need you to obtain the following information):
*  What would the customer like to order
*  Once the customer tells you what they want, then ask for specifics, like size and clarifications
*  Size Questions:
      -  Size options are: "Pt" (pint - smaller portion), "Qt" (quart - larger portion), or "Combination" (combo plate with fried rice and egg roll)
      -  Ask what size they want based on what is available in the menu:
      """
          > For regular orders that are available in qt or pt (like Lo Mein, Fried Rice, Chow Mein, Beef dishes, etc.), ask "what size would you like - pint or quart?"
          > If an item is available as BOTH a Chef's Specialty AND a combination plate, ask which one they want. For example: General Tso's Chicken (C16) and Orange Chicken (C20) are ALSO available as Combination Plates #13 and #20 respectively.
          > IMPORTANT: Chef's Specialties (C1-C33) come in ONE SIZE ONLY (per order). Do NOT ask for pint or quart on Chef's Specialties.
          > A-Items (A1-A8) have options: plain, with french fries, or with fried rice (ask which type of fried rice).
      """
*  If a customer doesn't answer a required question (like size or regular vs combination), politely re-ask ONE TIME. If they still don't answer or say "that's all", assume the most common option (regular order for most items) and proceed with the order. Confirm your assumption: "I'll put that down as a regular order."
*  Ask clarifying questions if missing information or unsure about what the customer said.
*  Only summarize the order 1 time at the end once the customer has stated that they have finished their order
*  What the customer's phone number is (Only ask this at the end, after you take the order). Only phone number is needed - do NOT ask for customer's name.
      - Phone numbers should be 10 digits (or 7 digits for local). If a customer provides an incomplete number like "555-1234", ask for the area code: "Could I also get your area code?"

# Environment

You are assisting customers over text chat.
The customer is placing an order for takeout. (THERE IS NO DELIVERY).
You have access to the current menu, pricing, and restaurant information
Allow for substitutions and modifications of menu items
You also have access to a tool to submit the customer's order

# Tone

Your responses are friendly, clear, concise, and professional.
You use a friendly and welcoming tone.
You use positive language and avoid slang or jargon.
You are patient and understanding, even when customers are indecisive or have special requests.

# Goal
*  Your primary goal is to accurately and efficiently take customer orders.
*  Be efficient with getting the customer's accurate order as quickly as possible.
*  Make sure you accurately get the customer's phone number at the end.

2.  Order Taking:
    *   Listen to the customer carefully and answer any questions.
    *   Accurately record each item the customer orders requests.
    *   Confirm the quantity and size if not stated.

3.  Order Confirmation (At the end):
    *   Repeat the entire order back to the customer to ensure accuracy.
    *   Confirm the total price, including tax.
    *   Ask for the customer's phone number for the order (phone number only, do not ask for name).

4.  Payment and Pickup:
    *   Inform the customer of the price and the estimated pickup time. Average order (2-3 entrees) will be 10-15 minutes.

Success is measured by the accuracy of the orders taken, the efficiency of the order-taking process, and customer satisfaction.

# Guardrails

Never offer medical advice or information about allergens.
Never ask for sensitive personal information, such as credit card numbers.
Never engage in inappropriate or offensive conversations.
If you are unsure of an answer or have issues with the customer, politely ask if the customer would like to speak to a person.
If the restaurant is closed or unable to fulfill the order, apologize to the customer and explain the situation.
Never offer delivery. Apologize about it if the customer asks for delivery.

# Tools

You have access to the following tool:

*  submit_order: CRITICAL - You MUST call this tool to submit every order. Without calling this tool, the order is NOT placed. Call this tool IMMEDIATELY after collecting the phone number and confirming the order. Make sure item names match the menu exactly. Any modifications go in the modification field. Submit the customer order ONLY ONCE per conversation.

IMPORTANT ORDER COMPLETION FLOW:
1. Collect order items with sizes
2. Ask "Is that everything?" - wait for confirmation
3. Summarize the order with total price
4. Ask for phone number
5. Call submit_order tool (REQUIRED)
6. Say goodbye with pickup time (10-15 minutes)

FLEXIBILITY: If a customer provides their phone number early (before you ask), acknowledge it and continue. If a customer says "that's all" without answering all questions, fill in reasonable defaults (regular order, standard options) rather than repeatedly asking the same question.

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

# Important Menu Notes

CHEF'S SPECIALTIES vs COMBINATION PLATES - Many items appear in BOTH sections:
- General Tso's Chicken: Chef's Specialty C16 ($12.95) OR Combination Plate #13 ($11.15)
- Sesame Chicken: Chef's Specialty C19 ($12.95) OR Combination Plate #14 ($11.15)
- Orange Chicken (Crispy Chicken w. Orange Flavor): Chef's Specialty C20 ($12.95) OR Combination Plate #20 "Triple Delight" includes it
- Kung Pao Chicken: Chef's Specialty C8 ($12.55) OR Combination Plate #17 ($10.95)

When a customer asks for these popular items, ALWAYS ask: "Would you like that as a regular order or as a combination plate which comes with pork fried rice and an egg roll?"

COMBINATION PLATES (1-20) all come with Pork Fried Rice + Egg Roll for one fixed price. Substitutions allowed.

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
`;

// Define the submit_order tool
const submitOrder = tool({
  name: 'submit_order',
  description: 'Submit the customer order after confirming all details with the customer. Use this after you have confirmed the complete order, total price, and collected their phone number.',
  parameters: z.object({
    phoneNumber: z.string().describe('Customer phone number for the order'),
    items: z.array(z.object({
      name: z.string().describe('Name of the menu item'),
      quantity: z.number().describe('How many of this item'),
      size: z.string().describe('Size: "Pt" (pint), "Qt" (quart), "Combination", or "N/A" if not applicable'),
      price: z.number().describe('Price for this line item'),
      modifications: z.string().describe('Any special instructions or modifications, or empty string if none')
    })).describe('Array of items in the order'),
    notes: z.string().describe('Any special instructions, or empty string if none'),
    totalPrice: z.number().describe('Total price of the order including tax'),
  }),
  execute: async ({ phoneNumber, items, notes, totalPrice }) => {
    try {
      const orderNumber = generateOrderNumber();

      const insertOrder = db.prepare(`
        INSERT INTO orders (order_number, phone_number, status, order_type, total, notes)
        VALUES (?, ?, 'pending', 'pickup', ?, ?)
      `);

      const orderNotes = notes && notes.trim() ? notes : '';
      const orderResult = insertOrder.run(
        orderNumber,
        phoneNumber,
        totalPrice,
        orderNotes
      );

      const orderId = orderResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, size, unit_price, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const findMenuItem = db.prepare(`
        SELECT id FROM menu_items WHERE name LIKE ? LIMIT 1
      `);

      for (const item of items) {
        const menuItem = findMenuItem.get(`%${item.name}%`);
        const menuItemId = menuItem ? menuItem.id : null;
        const lineTotal = item.quantity * item.price;
        const size = item.size === 'N/A' ? null : item.size;
        const mods = item.modifications || '';

        insertItem.run(
          orderId,
          menuItemId,
          item.name,
          item.quantity,
          size,
          item.price,
          lineTotal,
          mods
        );
      }

      console.log('\n📝 NEW ORDER SAVED TO DATABASE:');
      console.log(`   Order #: ${orderNumber}`);
      console.log(`   Phone: ${phoneNumber}`);
      console.log(`   Items (${items.length}):`);
      items.forEach((item, i) => {
        const modsDisplay = item.modifications && item.modifications.trim() ? ` [${item.modifications}]` : '';
        const sizeDisplay = item.size && item.size !== 'N/A' ? ` (${item.size})` : '';
        console.log(`     ${i + 1}. ${item.name}${sizeDisplay} x${item.quantity} @ $${item.price.toFixed(2)}${modsDisplay}`);
      });
      console.log(`   Total: $${totalPrice.toFixed(2)}\n`);

      return `Order ${orderNumber} submitted successfully. Total: $${totalPrice.toFixed(2)}. Ready for pickup in 10-15 minutes.`;

    } catch (error) {
      console.error('Failed to save order:', error);
      return `Order recorded. Total: $${totalPrice.toFixed(2)}`;
    }
  },
});

// Create the chat agent
const chatAgent = new Agent({
  name: 'Far East Order Assistant',
  instructions: AGENT_INSTRUCTIONS,
  model: 'gpt-4o',
  tools: [submitOrder],
});

// Store conversation histories per session
const sessions = new Map();

// Create Express app
const app = express();
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve a simple HTML chat interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Far East - Chat Order</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .chat-container {
      width: 100%;
      max-width: 500px;
      height: 90vh;
      max-height: 800px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .chat-header h1 { font-size: 1.4rem; margin-bottom: 5px; }
    .chat-header p { font-size: 0.85rem; opacity: 0.9; }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8f9fa;
    }
    .message {
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
    }
    .message.user { align-items: flex-end; }
    .message.assistant { align-items: flex-start; }
    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 0.95rem;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .message.user .message-bubble {
      background: #c41e3a;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .message-bubble {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .message-label {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 4px;
      padding: 0 8px;
    }
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #c41e3a;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .chat-input-container {
      padding: 15px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }
    .chat-input-container input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #eee;
      border-radius: 25px;
      font-size: 1rem;
      outline: none;
    }
    .chat-input-container input:focus { border-color: #c41e3a; }
    .chat-input-container button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #c41e3a;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-input-container button:hover { background: #a01830; }
    .chat-input-container button:disabled { background: #ccc; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="chat-header">
      <h1>Far East Chinese Restaurant</h1>
      <p>125 Main Street, Binghamton, NY | (607) 797-1166</p>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-container">
      <input type="text" id="userInput" placeholder="Type your message..." autofocus>
      <button id="sendBtn" onclick="sendMessage()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"/>
        </svg>
      </button>
    </div>
  </div>
  <script>
    const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    let isProcessing = false;

    function addMessage(role, content) {
      const messagesDiv = document.getElementById('chatMessages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + role;
      const label = document.createElement('div');
      label.className = 'message-label';
      label.textContent = role === 'user' ? 'You' : 'Sarah';
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = content;
      messageDiv.appendChild(label);
      messageDiv.appendChild(bubble);
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTyping() {
      const messagesDiv = document.getElementById('chatMessages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'message assistant';
      typingDiv.id = 'typingIndicator';
      typingDiv.innerHTML = '<div class="message-label">Sarah</div><div class="typing-indicator"><span></span><span></span><span></span></div>';
      messagesDiv.appendChild(typingDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hideTyping() {
      const typing = document.getElementById('typingIndicator');
      if (typing) typing.remove();
    }

    async function sendMessage() {
      const input = document.getElementById('userInput');
      const message = input.value.trim();
      if (!message || isProcessing) return;

      input.value = '';
      addMessage('user', message);
      isProcessing = true;
      document.getElementById('sendBtn').disabled = true;
      showTyping();

      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message })
        });
        const data = await response.json();
        hideTyping();
        addMessage('assistant', data.response);
      } catch (error) {
        hideTyping();
        addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      }

      isProcessing = false;
      document.getElementById('sendBtn').disabled = false;
      input.focus();
    }

    document.getElementById('userInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Start conversation
    (async () => {
      showTyping();
      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: 'Hello' })
        });
        const data = await response.json();
        hideTyping();
        addMessage('assistant', data.response);
      } catch (error) {
        hideTyping();
        addMessage('assistant', 'Hello! Welcome to Far East Chinese Restaurant. How can I help you today?');
      }
    })();
  </script>
</body>
</html>
  `);
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message required' });
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Build conversation context as a string for the agent
  let conversationContext = '';
  if (history.length > 0) {
    conversationContext = '\n\n[Previous conversation in this session:]\n';
    for (const msg of history) {
      const role = msg.role === 'user' ? 'Customer' : 'Sarah';
      conversationContext += `${role}: ${msg.content}\n`;
    }
    conversationContext += '\n[Continue the conversation based on the above context.]\n\n';
  }

  // The input for the agent - just the current message with context
  const inputText = conversationContext + `Customer: ${message}`;

  try {
    console.log(`\n--- Chat Request ---`);
    console.log(`Session: ${sessionId}`);
    console.log(`Message: ${message}`);
    console.log(`History length: ${history.length}`);

    // Run the agent with a simple string input
    const result = await run(chatAgent, inputText, {
      maxTurns: 5,
    });

    // Extract response from modelResponses
    let responseText = '';

    if (result.state && result.state._modelResponses) {
      const modelResponses = result.state._modelResponses;
      if (modelResponses.length > 0) {
        const lastResponse = modelResponses[modelResponses.length - 1];
        if (lastResponse.output && lastResponse.output.length > 0) {
          for (const outputItem of lastResponse.output) {
            if (outputItem.type === 'message' && outputItem.content) {
              for (const contentItem of outputItem.content) {
                if (contentItem.type === 'output_text' && contentItem.text) {
                  responseText = contentItem.text;
                }
              }
            }
          }
        }
      }
    }

    console.log(`Response: ${responseText.slice(0, 100)}...`);

    // Update session history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: responseText });
    sessions.set(sessionId, history);

    res.json({ response: responseText || "I'm here to help you place an order!" });

  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Failed to process message', response: "Sorry, I encountered an error. Please try again." });
  }
});

// Clean up old sessions periodically (every 30 minutes)
setInterval(() => {
  if (sessions.size > 100) {
    const keysToDelete = Array.from(sessions.keys()).slice(0, 50);
    keysToDelete.forEach(key => sessions.delete(key));
  }
}, 30 * 60 * 1000);

const server = createServer(app);
const PORT = process.env.CHAT_PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║       Far East Chat Agent Server                   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║   Open: http://localhost:${PORT}                      ║
║                                                    ║
║   Text-based order taking using OpenAI Agents SDK  ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});
