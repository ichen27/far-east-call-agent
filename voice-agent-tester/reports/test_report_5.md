# Voice Agent Test Report

**Run ID:** 4365ce24
**Date:** 2026-01-26
**Total Calls:** 2
**Total Duration:** 72.1 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/2 |
| ⚠️ Timeout | 0/2 |
| ⚠️ Incomplete | 2/2 |
| ❌ Failed | 0/2 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 55.02s |
| Average Response Latency | 903.55ms |
| Max Response Latency | 1521.31ms |
| Min Response Latency | 56.04ms |

### System Prompt Compliance
**Overall Compliance Score:** 40.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 2/2 |
| Asked for Size | 2/2 |
| Asked for Phone | 0/2 |
| Summarized Order | 0/2 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 4365ce24-01-regular_or
**Duration:** 59.0s
**Turns:** 4
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 950ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Got it. One General Tso's Chicken combination plate and a quart of pork fried rice. Is there anything else you'd like to add to your order?
[AGENT]: Thanks for confirming those items. Now, for the General Tso's chicken combination plate, it comes with pork fried rice and an egg roll.
[AGENT]: Would you like to keep it that way, or would you like to make any substitutions, like a different type of fried rice or a different side?
[CUSTOMER]: I'll keep it just the way it comes, with pork fried rice and an egg roll. Thank you.
[CUSTOMER]: Great! Your order will be ready for pickup in about 20 minutes. See
[AGENT]: Perfect. I've got that note.
[CUSTOMER]: May I have your phone number for the order, please?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1086 |
| 2 | 1001 |
| 3 | 879 |
| 4 | 832 |
</details>

---

### impatient_customer
**Call ID:** 4365ce24-02-impatient_
**Duration:** 51.0s
**Turns:** 6
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 858ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[CUSTOMER]: Sure, I can help you with that. Would you like to pick up your order, or do you need it delivered?
[AGENT]: Sure, I'd be happy to.
[CUSTOMER]: Pick up. How long will it take?
[AGENT]: Your order will be ready for pickup in about 10 to 15 minutes.
[AGENT]: Let me confirm the details with you first.
[CUSTOMER]: Yes, that's right.
[AGENT]: You ordered a sesame chicken combination plate and a pint of wonton soup, is that correct?
[CUSTOMER]: I think we got disconnected. I'll call back later. Goodbye.
[AGENT]: Great.
[CUSTOMER]: Can I get your phone number, please?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1275 |
| 2 | 715 |
| 3 | 1278 |
| 4 | 1521 |
| 5 | 56 |
| 6 | 300 |
</details>

---


*Report generated on 2026-01-26T14:49:13.792165*