# Voice Agent Test Report

**Run ID:** 35cef8b7
**Date:** 2026-01-26
**Total Calls:** 2
**Total Duration:** 114.5 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 1/2 |
| ⚠️ Timeout | 0/2 |
| ⚠️ Incomplete | 1/2 |
| ❌ Failed | 0/2 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 94.29s |
| Average Response Latency | 550.07ms |
| Max Response Latency | 988.58ms |
| Min Response Latency | 85.95ms |

### System Prompt Compliance
**Overall Compliance Score:** 70.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 2/2 |
| Asked for Size | 2/2 |
| Asked for Phone | 2/2 |
| Summarized Order | 2/2 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 35cef8b7-01-regular_or
**Duration:** 81.6s
**Turns:** 3
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 394ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Sure thing. Just to confirm, that's one General Tso's chicken combination plate and one quart of pork fried rice. Is there anything else you'd like to add?
[CUSTOMER]: Sure, it's 607-555-0001.
[AGENT]: Great, here's your order summary. One General Tso's Chicken Combination Plate for $11.15 and one quart of pork fried rice for $9.95. The total comes to $21.10 before tax. Could I get your phone number for the order, please?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 937 |
| 2 | 158 |
| 3 | 86 |
</details>

---

### impatient_customer
**Call ID:** 35cef8b7-02-impatient_
**Duration:** 107.0s
**Turns:** 4
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 706ms
**Compliance Score:** 70/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order—sesame chicken combo and a wonton soup, pint.
[AGENT]: Sure, I've got that started. For the sesame chicken, just to confirm, you want the combination plate that comes with pork fried rice and an egg roll. Did you want any substitutions on the rice or egg roll?
[CUSTOMER]: Yeah, the combo is fine, no substitutions. Can we speed this up a bit?
[CUSTOMER]: No, that's it.
[AGENT]: Of course, I've got the sesame chicken combination as is and a pint of wonton soup. Is that everything for your order?
[AGENT]: Great, let me confirm your order. You have one sesame chicken combination plate for $11.15 and one pint of wonton soup for $3.35. That brings your total to $14.50. Could I get your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0002.
[CUSTOMER]: Thanks, I've got your number down. Your order will be ready for pickup in about 15 minutes. Is there anything else I can assist you with?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 800 |
| 2 | 927 |
| 3 | 110 |
| 4 | 989 |
</details>

---


*Report generated on 2026-01-26T17:23:37.967431*