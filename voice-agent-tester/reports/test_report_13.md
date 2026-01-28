# Voice Agent Test Report

**Run ID:** acc07b24
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 82.1 seconds

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
| Average Call Duration | 79.98s |
| Average Response Latency | 837.79ms |
| Max Response Latency | 1041.25ms |
| Min Response Latency | 537.0ms |

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
**Call ID:** acc07b24-01-regular_or
**Duration:** 80.0s
**Turns:** 3
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 838ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Sure, I've got the General Tso's Chicken Combination Plate. It comes with pork fried rice and an egg roll. And a quart of pork fried rice as well. Is that everything for your order?
[AGENT]: Alright, let me confirm your order. You've got one General Tso's chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I get your phone number for the order, please?
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 537 |
| 2 | 1041 |
| 3 | 935 |
</details>

---


*Report generated on 2026-01-26T17:09:58.590655*