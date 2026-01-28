# Chat Scenario Test Results

**Test Run**: chat_test_2
**Date**: 2026-01-28T21:29:28.403Z
**Total Scenarios**: 5
**Average Score**: 78.0/100

---

## Summary by Category

| Category | Avg Score | Count |
|----------|-----------|-------|
| edge_cases | 62.5 | 2 |
| personality_challenge | 85.0 | 1 |
| guardrails | 90.0 | 1 |
| stress_test | 90.0 | 1 |

---

## Key Issues Found

*No critical issues found*

---

## Detailed Results

### [WARN] Vague Customer (order_006)

**Category**: edge_cases
**Score**: 75/100

#### Analysis
**Positives:**
- Order summary provided
- Regular vs combo clarification asked
- Price provided
- Pickup time mentioned

#### Transcript
**Customer**: Hello

**Sarah (Agent)**: Hello, this is Far East Chinese Restaurant. How can I help you today?

**Customer**: Yeah I want some chicken

**Sarah (Agent)**: Sure! We have various chicken options. Could you let me know which specific chicken dish you'd like? For example, we have General Tso's Chicken, Sesame Chicken, Kung Pao Chicken, and more.

**Customer**: The good one

**Sarah (Agent)**: Sure! Would you like the General Tso's Chicken or perhaps the Sesame Chicken? Both are popular choices. Would you like that as a regular order or as a combination plate with pork fried rice and an egg roll?

**Customer**: You know, the one everyone gets

**Sarah (Agent)**: Are you thinking of the General Tso's Chicken? Would you like that as a regular order or as a combination plate with pork fried rice and an egg roll?

**Customer**: Fine, just give me the General Tso's

**Sarah (Agent)**: Would you like the General Tso's Chicken as a regular order or as a combination plate with pork fried rice and an egg roll?

**Customer**: Regular I guess

**Sarah (Agent)**: Great choice! How many orders of the General Tso's Chicken would you like?

**Customer**: Done

**Sarah (Agent)**: Thank you! I'll put that down as one regular order of General Tso's Chicken.

Is there anything else you'd like to add to your order today?

**Customer**: 607-999-8888

**Sarah (Agent)**: Thank you! Your order has been placed for one regular General Tso's Chicken. The total comes to $12.95, and it'll be ready for pickup in 10-15 minutes. See you soon!

---

### [PASS] Rude Customer (order_007)

**Category**: personality_challenge
**Score**: 85/100

#### Analysis
**Positives:**
- Order summary provided
- Phone number collection attempted
- Size clarification asked
- Regular vs combo clarification asked
- Price provided
- Pickup time mentioned

#### Transcript
**Customer**: Hello

**Sarah (Agent)**: Hello, this is Far East Chinese Restaurant. How can I help you today?

**Customer**: Look I don't have all day. Beef with broccoli. Quart. That's it.

**Sarah (Agent)**: Sure thing! I'll put down a Beef with Broccoli in quart size for you.

Is that everything?

**Customer**: Why are you asking so many questions? I said that's it!

**Sarah (Agent)**: Thank you for confirming. I'll put that down as a regular order of Beef with Broccoli in quart size. 

Could I get your phone number for the order?

**Customer**: Fine. 607-555-0000. Happy now?

**Sarah (Agent)**: Thank you! Your order for Beef with Broccoli in quart size is confirmed and will be ready for pickup in 10-15 minutes. The total is $12.95.

Have a great day!

**Customer**: Whatever, bye

**Sarah (Agent)**: Thank you for your order! If you have any more questions or need anything else, feel free to reach out. Have a great day!

---

### [PASS] Prank Caller (order_025)

**Category**: guardrails
**Score**: 90/100

#### Analysis
**Positives:**
- Order summary provided
- Phone number collection attempted
- Phone number asked at appropriate time (end)
- Size clarification asked
- Price provided
- Pickup time mentioned

#### Transcript
**Customer**: Hello

**Sarah (Agent)**: Hello, this is Far East Chinese Restaurant. How can I help you today?

**Customer**: Is your refrigerator running?

**Sarah (Agent)**: It sure is! How can I assist you with your order today?

**Customer**: Do you have Prince Albert in a can?

**Sarah (Agent)**: I'm here to help with placing your order at Far East Chinese Restaurant. What would you like to order today?

**Customer**: What's the meaning of life?

**Sarah (Agent)**: I'm here to help you with your order today! Please let me know what you'd like to order, and I'll be happy to assist.

**Customer**: Fine I'll actually order. Give me fried rice, pint

**Sarah (Agent)**: Great choice! What type of fried rice would you like? We have vegetable, roast pork, shrimp, chicken, beef, and house special fried rice available.

**Customer**: Pork

**Sarah (Agent)**: Thank you! So far, we have a pint of roast pork fried rice. Is there anything else you’d like to add to your order?

**Customer**: Yeah that's it

**Sarah (Agent)**: Alright! Here's your order summary:

- 1 Pint of Roast Pork Fried Rice

Could I please get your phone number for the order?

**Customer**: 607-123-1234

**Sarah (Agent)**: Thank you for your order! Your total is $5.95. It'll be ready for pickup in 10-15 minutes. Have a great day!

---

### [FAIL] Hangup Without Ordering (order_041)

**Category**: edge_cases
**Score**: 50/100

#### Analysis

#### Transcript
**Customer**: Hello

**Sarah (Agent)**: Hello, this is Far East Chinese Restaurant. How can I help you today?

**Customer**: Hi, I want to order... actually you know what, never mind. Bye

**Sarah (Agent)**: If you change your mind and decide to order later, feel free to reach out! Have a great day!

---

### [PASS] Comprehensive Stress Test (order_050)

**Category**: stress_test
**Score**: 90/100

#### Analysis
**Positives:**
- Order summary provided
- Phone number collection attempted
- Phone number asked at appropriate time (end)
- Size clarification asked
- Regular vs combo clarification asked
- Price provided
- Pickup time mentioned

#### Transcript
**Customer**: Hello

**Sarah (Agent)**: Hello, this is Far East Chinese Restaurant. How can I help you today?

**Customer**: Okay I need: General Tso's combo with chicken fried rice instead of pork, no egg roll add extra spring roll

**Sarah (Agent)**: Would you like the General Tso's Chicken as a combination plate, which comes with the pork fried rice and egg roll, or as a regular order? It looks like you want the combo but with some changes. Just checking to confirm!

**Customer**: Two quarts of shrimp lo mein, one with extra shrimp

**Sarah (Agent)**: Great! Here's your order so far:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Two Quarts of Shrimp Lo Mein**
   - One with extra shrimp

Is there anything else you'd like to add?

**Customer**: Wait how much is that so far?

**Sarah (Agent)**: I’ll total that up for you:

1. **General Tso's Chicken Combination Plate**  
   - $11.15  
   - Substitute chicken fried rice for pork fried rice: calculated based on substitution formula

2. **Extra Spring Roll**  
   - $2.00

3. **Two Quarts of Shrimp Lo Mein** 
   - Regular: $11.55  
   - Extra Shrimp: $11.55 + $2.00

I'll calculate the exact substitution cost and total price before finalizing your order. Is there anything else you'd like to add?

**Customer**: Okay continue. Pu Pu platter, hold the spare ribs

**Sarah (Agent)**: Got it! Here's your updated order:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Extra Spring Roll**
   - $2.00

3. **Two Quarts of Shrimp Lo Mein**
   - One regular
   - One with extra shrimp

4. **Pu Pu Platter**
   - Hold the spare ribs

Is that everything you'd like to order today?

**Customer**: Three pints of wonton soup

**Sarah (Agent)**: Great! Here's your updated order:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Two Quarts of Shrimp Lo Mein**
   - One regular
   - One with extra shrimp

3. **Pu Pu Platter**
   - Hold the spare ribs

4. **Three Pints of Wonton Soup**

Is that everything you'd like to order today?

**Customer**: What time do you close?

**Sarah (Agent)**: We close at 10:30 pm from Monday to Thursday, and at 11:00 pm on Friday and Saturday. Is there anything else you'd like to order today?

**Customer**: Okay one more thing, beef with broccoli quart, extra beef, less sauce

**Sarah (Agent)**: Here's your updated order:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Two Quarts of Shrimp Lo Mein**
   - One regular
   - One with extra shrimp

3. **Pu Pu Platter**
   - Hold the spare ribs

4. **Three Pints of Wonton Soup**

5. **Beef with Broccoli Quart**
   - Extra beef
   - Less sauce

Is that everything you'd like to order today?

**Customer**: Actually change one of the wonton soups to hot and sour

**Sarah (Agent)**: Sure! I'll update your order now:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Two Quarts of Shrimp Lo Mein**
   - One regular
   - One with extra shrimp

3. **Pu Pu Platter**
   - Hold the spare ribs

4. **Two Pints of Wonton Soup**

5. **One Pint of Hot and Sour Soup**

6. **Beef with Broccoli Quart**
   - Extra beef
   - Less sauce

Is there anything else you'd like to add?

**Customer**: That's everything

**Sarah (Agent)**: Great! Here's your complete order:

1. **General Tso's Chicken Combination Plate**
   - Substitute chicken fried rice for pork fried rice
   - No egg roll; add an extra spring roll

2. **Two Quarts of Shrimp Lo Mein**
   - One regular
   - One with extra shrimp

3. **Pu Pu Platter**
   - Hold the spare ribs

4. **Two Pints of Wonton Soup**

5. **One Pint of Hot and Sour Soup**

6. **Beef with Broccoli Quart**
   - Extra beef
   - Less sauce

I'll calculate the total price for you.

Could I please have your phone number for the order?

**Customer**: Phone is 607-FAST-WOK, just kidding it's 607-327-8965

**Sarah (Agent)**: Your order has been successfully placed! 

- **Total Price:** $84.85
- **Pickup Time:** 10-15 minutes

Thank you for ordering with us, and see you soon! If you have any other questions, feel free to ask.

---

