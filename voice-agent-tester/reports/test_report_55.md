# Voice Agent Test Report

**Run ID:** 337ae419
**Date:** 2026-01-28
**Total Calls:** 5
**Total Duration:** 123.6 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 3/5 |
| ⚠️ Timeout | 0/5 |
| ⚠️ Incomplete | 2/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 96.4s |
| Average Response Latency | 668.38ms |
| Max Response Latency | 2102.08ms |
| Min Response Latency | 0.02ms |

### System Prompt Compliance
**Overall Compliance Score:** 59.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 4/5 |
| Asked for Size | 4/5 |
| Asked for Phone | 4/5 |
| Summarized Order | 4/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### rude_customer
**Call ID:** 337ae419-03-rude_custo
**Duration:** 79.0s
**Turns:** 3
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 296ms
**Compliance Score:** 60/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Ugh, finally someone answered. I need to order food. I want Beef with Broccoli, quart, and Chicken Lo Mein, pint. Got it?
[CUSTOMER]: *sigh* No, that's it. Can we move this along?
[AGENT]: Absolutely. I've got that. So far we have a quart of beef with broccoli and a pint of chicken lo mein. Is that everything you'd like to order today?
[CUSTOMER]: Oh my god, fine. It's 607-555-0003. Is that all you need?
[AGENT]: Understood. Let me summarize your order. You've ordered one quart of beef with broccoli for $12.95 and one pint of chicken lo mein for $7.75, totaling $20.70 before tax. Now could I have your phone number for the order, please?
[CUSTOMER]: Yes, that's all. Your order is placed. It should be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 653 |
| 2 | 1 |
| 3 | 233 |
</details>

---

### impatient_customer
**Call ID:** 337ae419-02-impatient_
**Duration:** 92.8s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 895ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I need to place a quick order: sesame chicken combo and a pint of wonton soup.
[AGENT]: Sure, I've got the sesame chicken combo and a pint of wonton soup. Would you like any substitutions for the pork fried rice or the egg roll in the combo?
[CUSTOMER]: No substitutions, just the regular combo. How long is this gonna take?
[CUSTOMER]: *sigh* Yes, that's it.
[AGENT]: Got it. No substitutions. The order typically takes about 10 to 15 minutes for pickup. Is that everything for your order today?
[CUSTOMER]: It's 607-555-0002. Thank you.
[AGENT]: Great, so your order is one sesame chicken combination plate for $11.15 and one pint of wonton soup for $3.35. That brings your total to $14.50 plus tax. Could I have your phone number please?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1367 |
| 2 | 901 |
| 3 | 903 |
| 4 | 408 |
</details>

---

### regular_order
**Call ID:** 337ae419-01-regular_or
**Duration:** 108.1s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 835ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Of course, I'd be happy to help with that. What would you like to order?
[CUSTOMER]: I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No modifications needed, just the quart of pork fried rice as is.
[AGENT]: Got it. So far we have one General Tso's chicken combination plate. Now for the quart of pork fried rice. Would you like any modifications or extras with that?
[CUSTOMER]: No, that's it.
[AGENT]: Understood. So we have one General Tso's chicken combination plate and one quart of pork fried rice. Is that everything for your order?
[AGENT]: Great! Let's go over your order. You have one General Tso's Chicken Combination Plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I have your phone number please?
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 498 |
| 2 | 889 |
| 3 | 2102 |
| 4 | 0 |
| 5 | 684 |
</details>

---

### delivery_request
**Call ID:** 337ae419-05-delivery_r
**Duration:** 97.0s
**Turns:** 5
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 434ms
**Compliance Score:** 25/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: I'm sorry. We don't offer delivery service. All orders are for pickup only. I'd be happy to take your order and have it ready for pickup. What would you like to order today?
[CUSTOMER]: Oh, okay. Pickup is fine. I'll have an order of General Tso's chicken, a quart of shrimp fried rice, and a pint of hot and sour soup.
[AGENT]: Sure. Would you like the General Tso's chicken as a regular order or as a combination plate that comes with pork fried rice and an egg roll?
[CUSTOMER]: I'll have the General Tso's chicken as a combination plate, please.
[AGENT]: Great. Would you like to keep the pork fried rice and egg roll with that combination, or would you like to make any substitutions?
[CUSTOMER]: No substitutions, I'll keep it as is.
[CUSTOMER]: Yes, that's everything.
[AGENT]: Perfect. So we have the General Tso's chicken combination plate, a quart of shrimp fried rice, and a pint of hot and sour soup. Is that everything for your order?
[CUSTOMER]: Alright, your order will be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 166 |
| 2 | 845 |
| 3 | 573 |
| 4 | 580 |
| 5 | 4 |
</details>

---

### off_menu_request
**Call ID:** 337ae419-04-off_menu_r
**Duration:** 105.0s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 883ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! Can I get an order of pad thai, please?
[CUSTOMER]: Oh, I see, my mistake. In that case, could I get a General Tso's chicken combo instead?
[AGENT]: I'm sorry, we don't have Pad Thai on our menu. We specialize in Chinese dishes. Would you like to order something else?
[AGENT]: Of course, we'll get that ready. Just to confirm, the General Tso's chicken combination comes with pork fried rice and an egg roll. Would you like any substitutions for the pork fried rice or the egg roll?
[CUSTOMER]: No substitutions, the pork fried rice and egg roll are perfect.
[CUSTOMER]: No, that's it.
[AGENT]: Great, I've got that down as a General Tso's chicken combination with no substitutions. Is there anything else you'd like to add to your order today?
[AGENT]: All right, let me confirm your order. You have one General Tso's chicken combination plate, which comes with pork fried rice and an egg roll. The total is $11.15. Could I have your phone number, please?
[CUSTOMER]: Sure, it's 607-555-0004.
[CUSTOMER]: Thank you for your order. It will be ready for pickup in about 20 minutes. If you have any other questions, feel free to call us back. Have a great day!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 656 |
| 2 | 325 |
| 3 | 1372 |
| 4 | 784 |
| 5 | 1279 |
</details>

---


*Report generated on 2026-01-28T02:12:19.908138*