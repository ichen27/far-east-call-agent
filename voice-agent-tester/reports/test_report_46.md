# Voice Agent Test Report

**Run ID:** f3d286d7
**Date:** 2026-01-28
**Total Calls:** 1
**Total Duration:** 75.5 seconds

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
| Average Call Duration | 73.02s |
| Average Response Latency | 962.27ms |
| Max Response Latency | 1339.39ms |
| Min Response Latency | 617.52ms |

### System Prompt Compliance
**Overall Compliance Score:** 40.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 0/1 |
| Asked for Size | 1/1 |
| Asked for Phone | 0/1 |
| Summarized Order | 1/1 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** f3d286d7-01-regular_or
**Duration:** 73.0s
**Turns:** 4
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 962ms
**Compliance Score:** 40/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to place an order for pickup, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: Of course, what would you like to order today?
[CUSTOMER]: I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Got it. Just to confirm, the General Tso's chicken as a combination plate comes with pork fried rice and an egg roll. Did you want to keep that pork fried rice or make any substitutions?
[CUSTOMER]: I'll keep the pork fried rice with the combination plate, no substitutions.
[AGENT]: Perfect, so that's the General Tso's Chicken combination plate with pork fried rice and an egg roll, and a quart of pork fried rice. Is that everything for your order?
[CUSTOMER]: No, that's it. My phone number is 607-555-0001. Thanks, goodbye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 618 |
| 2 | 1339 |
| 3 | 726 |
| 4 | 1167 |
</details>

---


*Report generated on 2026-01-28T01:39:28.898350*