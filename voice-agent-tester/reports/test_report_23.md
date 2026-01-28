# Voice Agent Test Report

**Run ID:** 16b9e82e
**Date:** 2026-01-26
**Total Calls:** 3
**Total Duration:** 73.3 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 1/3 |
| ⚠️ Timeout | 0/3 |
| ⚠️ Incomplete | 1/3 |
| ❌ Failed | 1/3 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 60.87s |
| Average Response Latency | 848.79ms |
| Max Response Latency | 2085.95ms |
| Min Response Latency | 211.76ms |

### System Prompt Compliance
**Overall Compliance Score:** 33.33/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 1/3 |
| Asked for Size | 1/3 |
| Asked for Phone | 1/3 |
| Summarized Order | 1/3 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 16b9e82e-01-regular_or
**Duration:** 57.0s
**Turns:** 0
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 0ms
**Compliance Score:** 15/100

**Status:** ❌ FAILED
*No transcript captured*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hello? Is anyone there?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
</details>

---

### impatient_customer
**Call ID:** 16b9e82e-02-impatient_
**Duration:** 65.0s
**Turns:** 3
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1221ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: No, that's it.
[AGENT]: Sure thing. For the sesame chicken, we have it as a combination plate with pork fried rice and an egg roll. I'll add that and a pint of wonton soup. Is there anything else you'd like to order?
[AGENT]: Great. Let's go over your order. You have one sesame chicken combination plate, which is $11.15, and one pint of wonton soup for $3.35. That brings your total to $14.50 before tax. Now, could I have your phone number for the order?
[CUSTOMER]: It's 607-555-0002. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 212 |
| 2 | 1367 |
| 3 | 2086 |
</details>

---

### rude_customer
**Call ID:** 16b9e82e-03-rude_custo
**Duration:** 60.6s
**Turns:** 2
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 1325ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, a pint. Ugh, your prices better be worth it this time.
[AGENT]: Thank you for your patience. I've got the beef with broccoli as a quart and the chicken lo mein as a pint. Is that everything for your order today?
[CUSTOMER]: No, that's it. My number is 607-555-0003. Bye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1620 |
| 2 | 1030 |
</details>

---


*Report generated on 2026-01-26T17:44:37.359127*