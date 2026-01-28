# Voice Agent Test Report

**Run ID:** 81f90870
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 91.4 seconds

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
| Average Call Duration | 89.0s |
| Average Response Latency | 1017.47ms |
| Max Response Latency | 1642.87ms |
| Min Response Latency | 564.0ms |

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
**Call ID:** 81f90870-01-regular_or
**Duration:** 89.0s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1017ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Yes, that's it.
[AGENT]: Sure, for the General Tso's chicken, I've got that as a combination plate, and a quart of pork fried rice. Is that everything for your order?
[CUSTOMER]: Sounds good.
[AGENT]: Great, let me confirm your order. You have one General Tso's Chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. The total comes to $21.10 before tax.
[AGENT]: Whenever you're ready, please share your phone number so we can complete your order.
[CUSTOMER]: Sure, my phone number is 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 876 |
| 2 | 987 |
| 3 | 1643 |
| 4 | 564 |
</details>

---


*Report generated on 2026-01-26T17:15:28.123873*