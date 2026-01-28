# Voice Agent Test Report

**Run ID:** 94354fe7
**Date:** 2026-01-26
**Total Calls:** 3
**Total Duration:** 89.8 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 2/3 |
| ⚠️ Timeout | 0/3 |
| ⚠️ Incomplete | 1/3 |
| ❌ Failed | 0/3 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 69.02s |
| Average Response Latency | 1100.78ms |
| Max Response Latency | 1615.96ms |
| Min Response Latency | 533.81ms |

### System Prompt Compliance
**Overall Compliance Score:** 56.67/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/3 |
| Asked for Size | 2/3 |
| Asked for Phone | 2/3 |
| Summarized Order | 2/3 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 94354fe7-01-regular_or
**Duration:** 67.0s
**Turns:** 3
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 948ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Yes, that's it.
[AGENT]: Sure thing. So I have a General Tso's chicken combination plate, which comes with pork fried rice and an egg roll, and a quart of pork fried rice as well. Is that everything for your order?
[AGENT]: Great. Let me confirm your order. You've got one General Tso's chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I get your phone number, please?
[CUSTOMER]: Sure, my number is 607-555-0001. Thanks, goodbye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 963 |
| 2 | 534 |
| 3 | 1347 |
</details>

---

### impatient_customer
**Call ID:** 94354fe7-02-impatient_
**Duration:** 63.0s
**Turns:** 3
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1066ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[CUSTOMER]: No, that's it.
[AGENT]: Sure thing. For the sesame chicken, I'll put that down as a combination plate. And you've got one pint of wonton soup. Is there anything else you'd like to order?
[AGENT]: Let me confirm your order. You've got one sesame chicken combination plate, which comes with pork fried rice and an egg roll, for $11.15, and one pint of wonton soup for $3.35. That makes your total $14.50. Could I get your phone number for the order?
[CUSTOMER]: It's 607-555-0002. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1616 |
| 2 | 544 |
| 3 | 1037 |
</details>

---

### rude_customer
**Call ID:** 94354fe7-03-rude_custo
**Duration:** 77.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1289ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint.
[CUSTOMER]: No, that's it.
[AGENT]: Sure, I've got a quart of beef with broccoli and a pint of chicken lo mein. Would you like to add anything else to your order?
[CUSTOMER]: Alright, may I have your address for delivery?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1472 |
| 2 | 1106 |
</details>

---


*Report generated on 2026-01-26T17:41:36.461042*