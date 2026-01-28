# Voice Agent Test Report

**Run ID:** 55f306ca
**Date:** 2026-01-26
**Total Calls:** 1
**Total Duration:** 66.9 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/1 |
| ⚠️ Timeout | 0/1 |
| ⚠️ Incomplete | 1/1 |
| ❌ Failed | 0/1 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 61.02s |
| Average Response Latency | 752.14ms |
| Max Response Latency | 1050.76ms |
| Min Response Latency | 224.4ms |

### System Prompt Compliance
**Overall Compliance Score:** 25.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 0/1 |
| Asked for Size | 1/1 |
| Asked for Phone | 0/1 |
| Summarized Order | 0/1 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 55f306ca-01-regular_or
**Duration:** 61.0s
**Turns:** 3
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 752ms
**Compliance Score:** 25/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: I'll keep it that way, thank you.
[AGENT]: Of course, for the General Tso's chicken, it comes with pork fried rice and an egg roll. Would you like to keep it that way, or make any substitutions?
[CUSTOMER]: That's all I need, thank you.
[AGENT]: Great, so we've got the General Tso's Chicken Combination Plate as is, and a quart of pork fried rice. Are you all set with your order, or would you like to add anything else?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 981 |
| 2 | 1051 |
| 3 | 224 |
</details>

---


*Report generated on 2026-01-26T15:06:22.526696*