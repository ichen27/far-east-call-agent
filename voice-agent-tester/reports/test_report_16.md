# Voice Agent Test Report

**Run ID:** 9ce594a8
**Date:** 2026-01-26
**Total Calls:** 3
**Total Duration:** 107.0 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/3 |
| ⚠️ Timeout | 0/3 |
| ⚠️ Incomplete | 3/3 |
| ❌ Failed | 0/3 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 91.69s |
| Average Response Latency | 1104.37ms |
| Max Response Latency | 1520.32ms |
| Min Response Latency | 693.01ms |

### System Prompt Compliance
**Overall Compliance Score:** 61.67/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/3 |
| Asked for Size | 2/3 |
| Asked for Phone | 2/3 |
| Summarized Order | 3/3 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### impatient_customer
**Call ID:** 9ce594a8-02-impatient_
**Duration:** 91.0s
**Turns:** 3
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 948ms
**Compliance Score:** 55/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order – sesame chicken combo and a wonton soup, pint.
[AGENT]: Sure, let's confirm the details. For the sesame chicken you want the combination plate, which comes with pork fried rice and an egg roll. And for the wonton soup, would you like a pint or a quart?
[CUSTOMER]: Yeah, the combo plate, and a pint of wonton soup.
[AGENT]: Got it. So that's a sesame chicken combination plate and a pint of wonton soup. Is there anything else you'd like to add?
[CUSTOMER]: No, that's it.
[CUSTOMER]: Great, your order is confirmed. Would you like to pick it up, or would you prefer delivery?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 693 |
| 2 | 979 |
| 3 | 1174 |
</details>

---

### rude_customer
**Call ID:** 9ce594a8-03-rude_custo
**Duration:** 93.0s
**Turns:** 3
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1307ms
**Compliance Score:** 60/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, a pint.
[AGENT]: Sure, I've got a quart of beef with broccoli and a pint of chicken lo mein. Is there anything else you'd like to order?
[CUSTOMER]: No, that's it. Just get it right this time, will you? Last time my order was messed up. And your prices seem high.
[CUSTOMER]: Finally. It's 607-555-0003. Are we done now?
[AGENT]: Understood. I'll make sure everything is correct. Let me confirm your order. One quart of beef with broccoli for $12.95 and one pint of chicken lo mein for $7.75. That brings the total to $20.70 before tax. Could I have your phone number to complete the order?
[CUSTOMER]: Yes, we're all set. Your order should be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1520 |
| 2 | 990 |
| 3 | 1410 |
</details>

---

### regular_order
**Call ID:** 9ce594a8-01-regular_or
**Duration:** 91.0s
**Turns:** 3
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1058ms
**Compliance Score:** 70/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Sure, I've got the General Tso's Chicken Combination Plate and a quart of pork fried rice. Is there anything else you'd like to add to your order?
[AGENT]: Great. Let me confirm your order. You've got one general toast chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I have your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0001.
[CUSTOMER]: Thank you! Your order will be ready for pickup in about 20 minutes.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 741 |
| 2 | 1130 |
| 3 | 1302 |
</details>

---


*Report generated on 2026-01-26T17:17:36.322870*