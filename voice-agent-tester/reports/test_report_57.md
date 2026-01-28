# Voice Agent Test Report

**Run ID:** e1f3e272
**Date:** 2026-01-28
**Total Calls:** 5
**Total Duration:** 167.8 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 4/5 |
| ⚠️ Timeout | 0/5 |
| ⚠️ Incomplete | 1/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 107.24s |
| Average Response Latency | 1125.65ms |
| Max Response Latency | 2340.13ms |
| Min Response Latency | 43.56ms |

### System Prompt Compliance
**Overall Compliance Score:** 62.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/5 |
| Asked for Size | 4/5 |
| Asked for Phone | 5/5 |
| Summarized Order | 5/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### impatient_customer
**Call ID:** e1f3e272-02-impatient_
**Duration:** 87.7s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 831ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a pint of wonton soup.
[CUSTOMER]: The combo, please.
[AGENT]: Sure, for the sesame chicken, would you like that as a combination plate with pork fried rice and an egg roll, or just a regular order?
[AGENT]: Great! So that's a sesame chicken combination plate. Now we'll add the pint of wonton soup. Is there anything else you'd like to order?
[CUSTOMER]: No, that's it.
[AGENT]: All right, let me confirm your order. You have one sesame chicken combination plate and one pint of wonton soup. The total comes to $18.30. Now, could I have your phone number, please?
[CUSTOMER]: Yeah, it's 607-555-0002. Thank you.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 967 |
| 2 | 969 |
| 3 | 487 |
| 4 | 899 |
</details>

---

### regular_order
**Call ID:** e1f3e272-01-regular_or
**Duration:** 101.6s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1433ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Of course. I'm ready to take your order. What would you like to order today?
[CUSTOMER]: I'd like to order the General Tso's Chicken combination plate and a quart of Pork Fried Rice.
[CUSTOMER]: I'll keep it as is, thank you. No, that's it for my order.
[AGENT]: Got it. For the General Tso's chicken combination plate, it comes with pork fried rice and an egg roll. Would you like to keep it that way or make any substitutions? Then we have the quart of pork fried rice. Anything else for your order?
[AGENT]: Great, let me summarize your order. You have one General Tso's Chicken Combination Plate and one quart of pork fried rice. The combination plate is $11.15 and the quart of pork fried rice is $9.95. The total comes to $21.10 before tax. Could I have your phone number please?
[CUSTOMER]: Sure, my phone number is 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1535 |
| 2 | 1533 |
| 3 | 461 |
| 4 | 2204 |
</details>

---

### rude_customer
**Call ID:** e1f3e272-03-rude_custo
**Duration:** 96.0s
**Turns:** 3
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1148ms
**Compliance Score:** 60/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Ugh, finally someone answered. I need to order some food, and I don't have all day. I want beef with broccoli, quart, and chicken lo mein, pint. Are you writing this down, or do I have to repeat myself?
[CUSTOMER]: *sigh* No, that's it. Can we move this along?
[AGENT]: I'm on it. No need to repeat yourself. I've got your order. Beef with broccoli quart and chicken lo mein pint. Is there anything else you'd like to add?
[AGENT]: Absolutely. Let's confirm your order. One quart of beef with broccoli for $12.95 and one pint of chicken lo mein for $7.75. That totals $20.70 before tax. Now, could I get your phone number for the order?
[CUSTOMER]: Oh my GOD, this is ridiculous. Fine, it's 607-555-0003. Are we done here?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1661 |
| 2 | 430 |
| 3 | 1353 |
</details>

---

### off_menu_request
**Call ID:** e1f3e272-04-off_menu_r
**Duration:** 105.9s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1377ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi! Can I get an order of pad thai, please?
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: I'm sorry, we don't have Pad Thai on our menu. We specialize in Chinese cuisine. Would you like to order something else?
[CUSTOMER]: Oh, sorry about that! I'll have the General Tso's chicken combo instead.
[AGENT]: No problem at all. Just to confirm, the General Tso's Chicken Combo comes with pork fried rice and an egg roll. Would you like to keep it as is, or would you like any substitutions for the rice or the egg roll?
[CUSTOMER]: I'll keep it as it is, thank you.
[CUSTOMER]: No, that's it.
[AGENT]: Great, I've got that down. Is there anything else you'd like to order, or is that everything for today?
[AGENT]: Thank you. So far, we have one General Tso's chicken combination plate with pork fried rice and an egg roll at $11.15. Your total comes to $11.15. Could I have your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0004.
[CUSTOMER]: Great, I've noted your phone number as 607-555-0004. Your order will be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 293 |
| 2 | 1454 |
| 3 | 1869 |
| 4 | 2340 |
| 5 | 930 |
</details>

---

### delivery_request
**Call ID:** e1f3e272-05-delivery_r
**Duration:** 145.0s
**Turns:** 5
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 839ms
**Compliance Score:** 55/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: I'm sorry, we don't offer delivery. We only do takeout. Would you like to place an order for pickup instead?
[CUSTOMER]: Oh, okay. Pickup is fine. I'll have an order of General Tso's chicken and a shrimp fried rice, both in the quart size.
[AGENT]: Sure, just to confirm, would you like the General Tso's chicken as a regular order or as a combination plate, which comes with pork fried rice and an egg roll?
[CUSTOMER]: I'll take the General Tso's chicken as a combination plate, please.
[AGENT]: Great, so that's a General Tso's chicken combination plate and a quart of shrimp fried rice. Is there anything else you'd like to add to your order?
[CUSTOMER]: No, that's it.
[AGENT]: All right, let me confirm your order. You have one General Tso's chicken combination plate for $11.15 and one quart of shrimp fried rice for $10.55. That brings your total to $22.10 before tax. Could I have your phone number for the order, please?
[CUSTOMER]: Sure, my phone number is 607-555-0005.
[CUSTOMER]: Got it. Your total is $22.10 before tax, and your order should be ready for pickup in about 20 minutes. Thank you for ordering from Far East Chinese Restaurant!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 44 |
| 2 | 768 |
| 3 | 1135 |
| 4 | 956 |
| 5 | 1291 |
</details>

---


*Report generated on 2026-01-28T02:47:40.669909*