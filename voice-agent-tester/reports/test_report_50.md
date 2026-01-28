# Voice Agent Test Report

**Run ID:** 2cf7ef80
**Date:** 2026-01-28
**Total Calls:** 1
**Total Duration:** 99.5 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 1/1 |
| ⚠️ Timeout | 0/1 |
| ⚠️ Incomplete | 0/1 |
| ❌ Failed | 0/1 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 97.12s |
| Average Response Latency | 1110.16ms |
| Max Response Latency | 1394.3ms |
| Min Response Latency | 710.29ms |

### System Prompt Compliance
**Overall Compliance Score:** 70.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 1/1 |
| Asked for Size | 1/1 |
| Asked for Phone | 1/1 |
| Summarized Order | 1/1 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 2cf7ef80-01-regular_or
**Duration:** 97.1s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1110ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'd like to get the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure, I've got the General Tso's Chicken Combination Plate and a quart of pork fried rice. Is there anything else you'd like to add to your order?
[CUSTOMER]: No, that's it.
[AGENT]: Alright, let's go over your order. You have one General Tso's chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I get your phone number for the order?
[CUSTOMER]: Sure, my phone number is
[AGENT]: I'm ready whenever you are. Please go ahead with your phone number.
[CUSTOMER]: It's 607-555-0001. Thank you.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1394 |
| 2 | 1027 |
| 3 | 1309 |
| 4 | 710 |
</details>

---


*Report generated on 2026-01-28T01:55:41.753113*