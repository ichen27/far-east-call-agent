# Voice Agent Test Report

**Run ID:** 0e586021
**Date:** 2026-01-26
**Total Calls:** 2
**Total Duration:** 87.8 seconds

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
| Average Call Duration | 77.02s |
| Average Response Latency | 1258.07ms |
| Max Response Latency | 4428.77ms |
| Min Response Latency | 284.54ms |

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

### impatient_customer
**Call ID:** 0e586021-02-impatient_
**Duration:** 69.0s
**Turns:** 6
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1032ms
**Compliance Score:** 70/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[CUSTOMER]: Sure, I can help you with that. You'd like one sesame chicken combo and a pint of wonton soup. Would you like anything else with your order?
[AGENT]: Thank you. So I have one sesame chicken combination and one pint of wonton soup.
[CUSTOMER]: No, that's it. How long is this gonna take?
[AGENT]: Would you like anything else with your order?
[AGENT]: Perfect. Let me confirm everything.
[AGENT]: You've ordered one sesame chicken combination plate and one pint of wonton soup.
[AGENT]: The total comes to $14.50. Could I have your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0002.
[CUSTOMER]: I think we got disconnected. I'll call back later. Goodbye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1059 |
| 2 | 1392 |
| 3 | 285 |
| 4 | 2156 |
| 5 | 675 |
| 6 | 627 |
</details>

---

### regular_order
**Call ID:** 0e586021-01-regular_or
**Duration:** 85.0s
**Turns:** 8
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1484ms
**Compliance Score:** 70/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'd like the General Tso's Chicken combination plate, and a quart of pork fried rice.
[CUSTOMER]: Got it. One General Tso's Chicken combination plate and a quart of pork fried rice. Would you like any appetizers or drinks with your order?
[AGENT]: Thank you
[CUSTOMER]: Yes, that's correct.
[AGENT]: Just to confirm, I've got the General Tso's chicken combination plate and a quart of pork fried rice.
[AGENT]: Would you like any changes to the fried rice or egg roll in the combination plate?
[CUSTOMER]: No changes, and I don't need anything else. Thank you.
[AGENT]: And do you need anything else, like appetizers or drinks?
[AGENT]: Understood. Let me confirm your order. One General Tso's chicken combination plate and one quart of pork fried rice.
[AGENT]: Your total comes to $23.10.
[AGENT]: Could I get your phone number, please?
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1843 |
| 2 | 628 |
| 3 | 421 |
| 4 | 724 |
| 5 | 4429 |
| 6 | 1749 |
| 7 | 1306 |
| 8 | 773 |
</details>

---


*Report generated on 2026-01-26T14:43:14.504559*