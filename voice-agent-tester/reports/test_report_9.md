# Voice Agent Test Report

**Run ID:** 4278e0ae
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 106.1 seconds

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
| Average Call Duration | 103.46s |
| Average Response Latency | 834.0ms |
| Max Response Latency | 1341.59ms |
| Min Response Latency | 37.4ms |

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
**Call ID:** 4278e0ae-01-regular_or
**Duration:** 103.5s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 834ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure, for the General Tso's chicken combination plate, it comes with pork fried rice and an egg roll. Would you like to keep it as is, or would you like to make any substitutions for the rice or egg roll?
[CUSTOMER]: I'll keep it as is, with the pork fried rice and egg roll.
[CUSTOMER]: No, that's it.
[AGENT]: Got it. So we have one General Tso's chicken combination plate with pork fried rice and egg roll and a quart of pork fried rice. Anything else you'd like to add?
[AGENT]: Perfect. Let me summarize your order. You have one General Tso's chicken combination plate, which comes with pork fried rice and an egg roll, and one quart of pork fried rice. Now I just need your phone number, please.
[CUSTOMER]: Sure, it's 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1109 |
| 2 | 848 |
| 3 | 37 |
| 4 | 1342 |
</details>

---


*Report generated on 2026-01-26T16:03:03.615603*