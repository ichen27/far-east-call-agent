// Node.js web framework: handles HTTP routing, request/response management. 
// Using it to set up server end points
import express from 'express';
// ws is a lightweight websocket library
// Creates a persistent two way connect between client and server
import { WebSocketServer, WebSocket } from 'ws';
// Node's built in http module, using to create http server that both express and websocket can share
import { createServer } from 'http';
// Openai's SDK for building real-time voice agents
// RealtimeAgent defines the agent's personality, instructions, and tools
// RealtimeSession manages an active conversation with the agent
// tool is a function for defining callable tools that the agent can use mid conversation
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
// Extension package with integration for third party services
// Bridges Twilio's audio stream format with OpenAI's realtime API, handling audio endcoding/decoding
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
// Loads environment varibales from .env
import dotenv from 'dotenv';
// Typescripts schema validation library for input/output for agent tools
// Checks if json sent to and from agent tools is valid
import { z } from 'zod';
// Twillio's Node SDK
import Twilio from 'twilio';
import Database from 'better-sqlite3';
import { broadcastNewOrder } from './socket.js';






// loads variables from .env into process.env
dotenv.config();

// Checks to see if variables have been loaded
console.log('API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
console.log('API Key loaded:', process.env.TWILIO_ACCOUNT_SID ? 'Yes' : 'No');
console.log('API Key loaded:', process.env.TWILIO_AUTH_TOKEN ? 'Yes' : 'No');



// Open database connection
const db = new Database('fareast.db');
db.pragma('foreign_keys = ON');



// Twillio class constructor for accessing twillio methods
// Creates a Twillio client using keys
// Allows you to control phone calls
// Client front end
// I can send requests and get requests back
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


// Generate order number: simple incrementing number (1, 2, 3...) that resets daily
function generateOrderNumber() {
  const today = new Date().toISOString().slice(0, 10); // '2025-12-26'
  
  // Get count of orders created today
  const countResult = db.prepare(`
    SELECT COUNT(*) as count FROM orders 
    WHERE DATE(created_at) = DATE(?)
  `).get(today);
  
  return (countResult.count + 1).toString();
}

// Creates an Express web application
const app = express();
const server = createServer(app);

// Incoming call webhook

// Creates a POST endpoint at /incoming-call
// When someone called the Twillio phone number, Twilio sends the request here
// express.urlencoded() parses the form data Twillio sends
app.post('/incoming-call', express.urlencoded({ extended: false }), (req, res) => {
  //Extracts the unqiue caller ID from Twilio's request
  const callSid = req.body.CallSid;
  console.log('Incoming call:', callSid);
  
  // Responds to Twillio with TwiML (Twilio's XML language)
  // <Response> - Required wrapper
  // <Connect> - Tells Twilio to connect the call somewhere
  // <Stream url="..." - Tells Twilio to stream the call's audio to my WebSocket server
  // Parameter> - Passes the call ID along with the stream
  res.type('xml').send(`
    <Response>
      <Connect>
        <Stream url="wss://horotelic-chun-oversoothing.ngrok-free.dev/media-stream">
          <Parameter name="callSid" value="${callSid}" />
        </Stream>
      </Connect>
    </Response>
  `);
});


// WebSocket server to listen for Twilio audio stream
// Creates the websocket server
// Attatched to the same server as Express
// Listens at the path /media-stream
const wss = new WebSocketServer({ server, path: '/media-stream' });



const AGENT_INSTRUCTIONS = `
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
`;

// Web Socket Connection handler
// When Twilio connects to the WebSocket, this function runs
// twilioWs is the WebSocket connection to Twilio
// function takes in connection and twilio connection
wss.on('connection', (twilioWs) => {
  let callSid = null;
  
  // Listen for the stream start to get callSid
  // Listens for message from Twillio
  // takes in message and the data that twilio passes in
  twilioWs.on('message', (data) => {
    try {
      // Parse the message as JSON
      const msg = JSON.parse(data);
      // Check if its a start event and callSid is stored in customParameters
      if (msg.event === 'start' && msg.start?.customParameters?.callSid) {
        // Saves the callSid for later use (like needing to hang up)
        callSid = msg.start.customParameters.callSid;
        console.log('Got callSid:', callSid);
      }
    } catch (e) {}
  });


      /*
    Tool that the AI agent can use to submit order
    Log it for now
    I need it in JSON format
    Information I need:
    - Phone number
    - Items and Quantity
    - Any edits or notes
    - Price
     */

    /*
    Example output: 
    {
      "phoneNumber": "607-555-1234",
      "items": [
        { "name": "General Tso's Chicken", "quantity": 1, "size": null, "price": 12.95 },
        { "name": "Pork Fried Rice", "quantity": 1, "size": "Qt", "price": 9.95 }
      ],
      "notes": "Extra sauce on the side",
      "totalPrice": 24.74,
      "timestamp": "2025-12-25T15:30:00.000Z",
      "callSid": "CA1234567890abcdef"
    }

    ┌─────────────────────────────────────────────────────────────┐
    │                     AI AGENT (Sarah)                        │
    │                                                             │
    │  "Okay, I have your order: General Tso's Chicken,          │
    │   pork fried rice, total is $24.74. Your phone             │
    │   number is 607-555-1234. Let me submit that..."           │
    │                                                             │
    │              ↓ AI decides to call submit_order              │
    └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    ZOD VALIDATION                           │
    │                                                             │
    │  ✓ phoneNumber is a string                                 │
    │  ✓ items is an array of objects with required fields       │
    │  ✓ totalPrice is a number                                  │
    └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   EXECUTE FUNCTION                          │
    │                                                             │
    │  1. Build order object                                      │
    │  2. Add timestamp + callSid                                 │
    │  3. Log to console (JSON format)                           │
    │  4. Return success message                                  │
    └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                     AI AGENT (Sarah)                        │
    │                                                             │
    │  "Your order has been submitted! It'll be ready            │
    │   in about 15 minutes. Thank you for calling!"             │
    └─────────────────────────────────────────────────────────────┘
    */
    const submitOrder = tool({
      name: 'submit_order',
      description: 'Submit the customer order after confirming all details with the customer. Use this after you have confirmed the complete order, total price, and collected their phone number.',
      
      parameters: z.object({
        phoneNumber: z.string().describe('Customer phone number for the order'),
        items: z.array(z.object({
          name: z.string().describe('Name of the menu item'),
          quantity: z.number().describe('How many of this item'),
          size: z.string().optional().describe('Size if applicable: "Pt" (pint), "Qt" (quart), or "Combination"'),
          price: z.number().describe('Price for this line item'),
          modifications: z.string().optional().describe('Any special instructions or modifications')
        })).describe('Array of items in the order'),
        notes: z.string().optional().describe('Any special instructions'),
        totalPrice: z.number().describe('Total price of the order including tax'),
      }),
    
      execute: async ({ phoneNumber, items, notes, totalPrice }) => {
        try {
          // Generate unique order number
          const orderNumber = generateOrderNumber();
          
          // Insert into orders table
          const insertOrder = db.prepare(`
            INSERT INTO orders (order_number, phone_number, status, order_type, total, notes)
            VALUES (?, ?, 'pending', 'pickup', ?, ?)
          `);
          
          const orderResult = insertOrder.run(
            orderNumber,
            phoneNumber,
            totalPrice,
            notes || ''
          );
          
          const orderId = orderResult.lastInsertRowid;
          
          // Insert each item into order_items table
          const insertItem = db.prepare(`
            INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, size, unit_price, total, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          // Try to find menu_item_id by name (optional - helps link to menu)
          const findMenuItem = db.prepare(`
            SELECT id FROM menu_items WHERE name LIKE ? LIMIT 1
          `);
          
          for (const item of items) {
            // Try to match item name to menu_items table
            const menuItem = findMenuItem.get(`%${item.name}%`);
            const menuItemId = menuItem ? menuItem.id : null;
            
            // Calculate line total
            const lineTotal = item.quantity * item.price;
            
            insertItem.run(
              orderId,
              menuItemId,
              item.name,
              item.quantity,
              item.size || null,
              item.price,
              lineTotal,
              item.modifications || ''
            );
          }
          
          // Log the order
          console.log('📝 NEW ORDER SAVED TO DATABASE:');
          console.log(`   Order #: ${orderNumber}`);
          console.log(`   Phone: ${phoneNumber}`);
          console.log(`   Items (${items.length}):`);
          items.forEach((item, i) => {
            const mods = item.modifications ? ` [${item.modifications}]` : '';
            console.log(`     ${i + 1}. ${item.name} x${item.quantity} @ $${item.price.toFixed(2)}${mods}`);
          });
          console.log(`   Total: $${totalPrice.toFixed(2)}`);
          console.log(`   Call SID: ${callSid}`);

          // Broadcast order to connected frontend clients
          broadcastNewOrder({
            orderNumber,
            phoneNumber,
            items: items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              size: item.size || null,
              modifications: item.modifications || ''
            })),
            notes: notes || '',
            time: new Date().toISOString(),
            total: totalPrice,
            status: 'pending'
          });
          
          return `Order ${orderNumber} submitted successfully. Total: $${totalPrice.toFixed(2)}`;
          
        } catch (error) {
          console.error('Failed to save order:', error);
          return `Order recorded. Total: $${totalPrice.toFixed(2)}`;
        }
      },
    });
  /*
    // Function that runs when the AI calls the tool
    // async: this function can do that takes time, such as await
    // { phoneNumber, items, notes, totalPrice } = destructures the parameters the AI provided
    execute: async ({ phoneNumber, items, notes, totalPrice }) => {
      // Build the order object
      // 
      const order = {
        phoneNumber,
        items,
        notes: notes || '',
        totalPrice,
        timestamp: new Date().toISOString(),
        callSid: callSid,
      };
      
      console.log('📝 NEW ORDER SUBMITTED:');
      console.log(JSON.stringify(order, null, 2));
      
      // TODO: Save to database or send to kitchen display system
      
      return `Order submitted successfully. Total: $${totalPrice.toFixed(2)}`;
    },
  })
  */
  
  // Create hang up tool with access to callSid
  const hangUpTool = tool({
    // Defines the tools that the tools the AI can use: name, description, and parameters(inputs that it takes)
    name: 'hang_up_call',
    description: 'End the phone call. ONLY call this AFTER you have: 1) submitted the order, 2) told the customer their order will take 10-15 minutes, 3) said "Have a great day! Bye bye!" out loud. The customer MUST hear the goodbye message before hanging up.',
    parameters: z.object({}),

    // Function that runs when the AI calls this tool
    execute: async () => {
      console.log('Agent requested to hang up! CallSid:', callSid);
      console.log('Waiting 5 seconds before hanging up...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Check if we have Call ID
      if (callSid) {
        // If we have Call ID
        try {
          // Use Twilio's API to end the call by setting its status to "completed"
          await twilioClient.calls(callSid).update({ status: 'completed' });
          console.log('Call ended successfully');
          return 'Call ended successfully';
        } catch (err) {
          // If failed to hang up then return the failure message
          console.error('Failed to hang up:', err);
          return 'Failed to end call';
        }
      } else {
        // If we don't have Call ID
        console.error('No callSid available');
        return 'Could not end call - no call ID';
      }
    },
  });

  // Create the AI Agent
  // Creates the AI agent with: name, instructions, and tools
  const agent = new RealtimeAgent({
    name: 'Phone Assistant',
    instructions: AGENT_INSTRUCTIONS,
    tools: [hangUpTool, submitOrder],
  });

  // Bridges Twilio <-> OpenAI
  // Creates a "transport layer" that translate between twilio's and OpenAI's audio format
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: twilioWs,
  });
  
  //Creates a session combining the AI agent with this transport
  const session = new RealtimeSession(agent, { transport });

  // Connect to OpenAI's real-time API using API key
  session.connect({ apiKey: process.env.OPENAI_API_KEY })
  // When connected successfully, log it
  .then(() => {
    console.log('Connected to OpenAI!');
    
    // Trigger the AI to speak first - content must be an array
    // Sends a "fake" user message to trigger the AI to speak first
    session.sendMessage({
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: 'Hello',
        }
      ],
    });
  })
  // If connect fails, log the error
  .catch(err => console.error('OpenAI connection failed:', err));

});

// Start the server on port 3000
server.listen(3000, () => console.log('Server running on port 3000'));