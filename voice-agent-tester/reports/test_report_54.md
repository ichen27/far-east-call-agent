# Voice Agent Test Report

**Run ID:** 600a93ca
**Date:** 2026-01-28
**Total Calls:** 5
**Total Duration:** 153.8 seconds

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
| Average Call Duration | 90.65s |
| Average Response Latency | 773.84ms |
| Max Response Latency | 1587.78ms |
| Min Response Latency | 120.89ms |

### System Prompt Compliance
**Overall Compliance Score:** 56.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/5 |
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
**Call ID:** 600a93ca-03-rude_custo
**Duration:** 37.3s
**Turns:** 1
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 882ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, beef with broccoli, quart, and chicken lo mein, pint. Number is 607-555-0003. Bye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 882 |
</details>

---

### regular_order
**Call ID:** 600a93ca-01-regular_or
**Duration:** 95.3s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 791ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: Of course, I'd be happy to help you with your order. What would you like to order today?
[CUSTOMER]: I'd like to order the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Got it. So I have the General Tso's chicken combination plate and a quart of pork fried rice. Anything else for your order?
[AGENT]: Let me repeat your order to make sure everything is correct. One General Tso's chicken combination plate for $11.15. Two quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I get your phone number for the order, please?
[CUSTOMER]: Sure, my phone number is 607-555-0001.
[CUSTOMER]: Thank you. Your order will be ready for pickup in about 20 minutes. If you need anything else, feel free to call us back.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 436 |
| 2 | 788 |
| 3 | 351 |
| 4 | 1588 |
</details>

---

### impatient_customer
**Call ID:** 600a93ca-02-impatient_
**Duration:** 90.9s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 732ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need a place a quick order. I'll have the sesame chicken combo and a pint of wonton soup.
[CUSTOMER]: No substitutions, just the regular combo.
[AGENT]: Sure thing. For the sesame chicken, that comes as a combination plate with pork fried rice and an egg roll. Did you want to make any substitutions to the pork fried rice or the egg roll?
[CUSTOMER]: *sigh* Yes, that's it.
[AGENT]: Got it. Sesame chicken combo as is. And a pint of wonton soup. Is that everything for your order today?
[AGENT]: Let me confirm your order. Sesame chicken combination plate, which comes with pork fried rice and an egg roll for $11.15 and a pint of wonton soup for $3.35. That brings your total to $14.50 before tax. Could I get your phone number for the order?
[CUSTOMER]: It's 607-555-0002. Thank you.
[CUSTOMER]: You're welcome. We'll have your order ready soon.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 627 |
| 2 | 904 |
| 3 | 121 |
| 4 | 1275 |
</details>

---

### off_menu_request
**Call ID:** 600a93ca-04-off_menu_r
**Duration:** 98.7s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 758ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! Can I get an order of pad thai, please?
[AGENT]: I'm sorry, we don't have Pad Thai on our menu. We specialize in Chinese cuisine. Can I help you find something else from our menu today?
[CUSTOMER]: Oh, my mistake! I'll have General Tso's chicken combo then.
[CUSTOMER]: I'll keep it as is, thanks.
[AGENT]: Sure, the General Tso's Chicken combination plate comes with pork fried rice and an egg roll. Would you like to make any substitutions, or keep it as is?
[CUSTOMER]: No, that's it.
[AGENT]: Great! I've got the General Tso's chicken combination plate with pork fried rice and an egg roll. Is there anything else you'd like to order today?
[AGENT]: Thank you. Let me confirm your order. One General Tso's chicken combination plate with pork fried rice and an egg roll. The total comes to $11.15. Could I get your phone number for the order, please?
[CUSTOMER]: Sure, it's 607-555-0004. Thank you!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 558 |
| 2 | 742 |
| 3 | 123 |
| 4 | 973 |
| 5 | 1393 |
</details>

---

### delivery_request
**Call ID:** 600a93ca-05-delivery_r
**Duration:** 131.1s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 707ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: I'm sorry, we don't offer delivery at the moment. It's takeout only. You can place an order for pickup. What would you like to order today?
[CUSTOMER]: Oh, okay. I'll order for pickup then. I'll have a quart of General Tso's chicken and an order of vegetable spring rolls.
[CUSTOMER]: I'll go with the Chef Specialty General Tso's chicken, please.
[AGENT]: Just to clarify, General Tso's Chicken is available as a Chef's Specialty or as a Combination Plate. The Chef's Specialty comes in one size. Did you want the Chef's Specialty General Tso's Chicken or the Combination Plate with pork fried rice and an egg roll?
[CUSTOMER]: No, that's it.
[AGENT]: Great choice. So we have the Chef's Specialty General Tso's Chicken and an order of Vegetable Spring Rolls. Is there anything else you'd like to add?
[AGENT]: Thank you. Let me confirm your order. You have the chef's specialty General Tso's chicken for $12.95 and one order of vegetable spring rolls for $2. That brings your total to $14.95 plus tax. Could I have your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0001. Thank you.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 383 |
| 2 | 972 |
| 3 | 201 |
| 4 | 914 |
| 5 | 1065 |
</details>

---


*Report generated on 2026-01-28T02:02:46.165481*