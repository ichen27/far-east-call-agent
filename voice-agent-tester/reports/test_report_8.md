# Voice Agent Test Report

**Run ID:** 3308ff52
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 105.1 seconds

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
| Average Call Duration | 102.96s |
| Average Response Latency | 1074.81ms |
| Max Response Latency | 1625.29ms |
| Min Response Latency | 785.24ms |

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
**Call ID:** 3308ff52-01-regular_or
**Duration:** 103.0s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1075ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No substitutions, keep it as is, please.
[AGENT]: Sure, let me confirm a couple of details. For the General Tso's Chicken Combination Plate, it comes with pork fried rice and an egg roll. Do you want any substitutions on that fried rice or egg roll, or should I keep it as is?
[CUSTOMER]: No, that's it.
[AGENT]: Got it. No substitutions on the combination plate. And you also wanted a quart of pork fried rice. Anything else for your order?
[AGENT]: Perfect. Let me summarize your order. You have one General Tso's chicken combination plate and one quart of pork fried rice. The total comes to $22.10 before tax. Could I get your phone number for the order?
[CUSTOMER]: Sure, my phone number is 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1625 |
| 2 | 785 |
| 3 | 949 |
| 4 | 939 |
</details>

---


*Report generated on 2026-01-26T16:00:52.477956*