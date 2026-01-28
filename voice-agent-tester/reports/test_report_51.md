# Voice Agent Test Report

**Run ID:** dd6e93e9
**Date:** 2026-01-28
**Total Calls:** 2
**Total Duration:** 101.7 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 2/2 |
| ⚠️ Timeout | 0/2 |
| ⚠️ Incomplete | 0/2 |
| ❌ Failed | 0/2 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 94.5s |
| Average Response Latency | 840.8ms |
| Max Response Latency | 1470.77ms |
| Min Response Latency | 29.29ms |

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
**Call ID:** dd6e93e9-01-regular_or
**Duration:** 94.6s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 884ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Of course. I'd be happy to help. What would you like to order today?
[CUSTOMER]: I'd like to order the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Got it. So we have the General Tso's chicken combination plate and you also want a quart of pork fried rice. Is that everything for your order?
[AGENT]: Alright, let me summarize your order. You have one General Tso's Chicken Combination Plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I have your phone number please?
[CUSTOMER]: Sure, my phone number is 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 647 |
| 2 | 1439 |
| 3 | 29 |
| 4 | 1419 |
</details>

---

### impatient_customer
**Call ID:** dd6e93e9-02-impatient_
**Duration:** 94.4s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 798ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I need a sesame chicken combo and a pint of wonton soup. *sigh* Can we speed this up a bit?
[AGENT]: Of course, I'll be as quick as possible. Just to confirm, for the sesame chicken, would you like the combination plate that comes with pork fried rice and an egg roll?
[CUSTOMER]: Yeah, the combo is fine.
[CUSTOMER]: No, that's it.
[AGENT]: Great. I've got the sesame chicken combination plate and a pint of wonton soup. Is that everything for your order?
[CUSTOMER]: Uh-huh, okay.
[AGENT]: Understood. Let me summarize your order. One sesame chicken combination plate for $11.15 and one pint of wonton soup for $3.35. That brings your total to $14.50.
[AGENT]: Whenever you're ready, go ahead and give me your phone number.
[CUSTOMER]: It's 607-555-0002. Thank you.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 836 |
| 2 | 738 |
| 3 | 295 |
| 4 | 650 |
| 5 | 1471 |
</details>

---


*Report generated on 2026-01-28T01:58:28.916232*