# Voice Agent Test Report

**Run ID:** 9194b5e0
**Date:** 2026-01-28
**Total Calls:** 1
**Total Duration:** 91.3 seconds

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
| Average Call Duration | 88.59s |
| Average Response Latency | 1184.74ms |
| Max Response Latency | 2942.25ms |
| Min Response Latency | 406.94ms |

### System Prompt Compliance
**Overall Compliance Score:** 55.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 0/1 |
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
**Call ID:** 9194b5e0-01-regular_or
**Duration:** 88.6s
**Turns:** 5
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1185ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Of course, I'm ready when you are. What would you like to order?
[CUSTOMER]: No, that's it.
[AGENT]: Got it. So we have the General Tso's Chicken Combination Plate and a quart of pork fried rice. Is that everything for your order today?
[CUSTOMER]: Sounds good.
[AGENT]: Perfect. Let me confirm your order. You have one General Toast Chicken Combination Plate for $11.15 and one quart of pork fried rice for $9.95. The total comes to $21.10 before tax.
[AGENT]: Thank you. Could you go ahead and give me your phone number for the order?
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 514 |
| 2 | 665 |
| 3 | 407 |
| 4 | 2942 |
| 5 | 1396 |
</details>

---


*Report generated on 2026-01-28T01:46:30.813193*