# Voice Agent Test Report

**Run ID:** 872f8eda
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 79.1 seconds

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
| Average Call Duration | 76.57s |
| Average Response Latency | 1285.5ms |
| Max Response Latency | 1963.43ms |
| Min Response Latency | 652.99ms |

### System Prompt Compliance
**Overall Compliance Score:** 55.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 1/1 |
| Asked for Size | 1/1 |
| Asked for Phone | 1/1 |
| Summarized Order | 0/1 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 872f8eda-01-regular_or
**Duration:** 76.6s
**Turns:** 3
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1285ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Sure thing. For the General Tso's chicken, it'll come with pork fried rice and an egg roll. And you want a quart of pork fried rice as well. Anything else for you? Or is that all for today?
[AGENT]: Great. Let me confirm your order. You have one General Tso's chicken combination plate and one quart of pork fried rice. Now, could I have your phone number, please?
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1963 |
| 2 | 653 |
| 3 | 1240 |
</details>

---


*Report generated on 2026-01-26T15:57:35.209062*