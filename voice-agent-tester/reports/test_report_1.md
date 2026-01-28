# Voice Agent Test Report

**Run ID:** 9d11e1cd
**Date:** 2026-01-25
**Total Calls:** 5
**Total Duration:** 327.9 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/5 |
| ⚠️ Timeout | 5/5 |
| ⚠️ Incomplete | 0/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 310.06s |
| Average Response Latency | 714.72ms |
| Max Response Latency | 1394.92ms |
| Min Response Latency | 328.45ms |

### System Prompt Compliance
**Overall Compliance Score:** 35.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 4/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 1/5 |
| Summarized Order | 1/5 |

### Call Issues
**⚠️ 5 calls had issues:**

| Issue Type | Count |
|------------|-------|
| ⚠️ Timed out (max duration) | 5 |

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 9d11e1cd-01-regular_or
**Duration:** 310.0s
**Turns:** 5
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 896ms
**Compliance Score:** 70/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure thing. For the General Tso's Chicken Combination Plate, would you like to make any substitutions to the pork fried rice or the egg roll?
[AGENT]: Then, for the quart of pork fried rice, your total will include both items. May I also have your phone number to complete the order?
[CUSTOMER]: Of course, my phone number is 607-555-0001.
[AGENT]: Thank you. Let me confirm your order so far. One General Tso's chicken combination plate with pork fried rice and egg roll, and one quart of pork fried rice.
[AGENT]: Is that correct, or would you like to make any changes?
[CUSTOMER]: That's correct, no changes. Thank you!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1395 |
| 2 | 879 |
| 3 | 705 |
| 4 | 1057 |
| 5 | 444 |
</details>

---

### impatient_customer
**Call ID:** 9d11e1cd-02-impatient_
**Duration:** 310.0s
**Turns:** 4
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 537ms
**Compliance Score:** 15/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Fahri's Chinese restaurant
[AGENT]: How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Got it
[CUSTOMER]: Yeah, yeah, that's fine, keep it that way.
[AGENT]: For the sesame chicken, it will come with pork fried rice and an egg roll. Would you like to keep it that way, or make any substitutions?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 673 |
| 2 | 696 |
| 3 | 453 |
| 4 | 328 |
</details>

---

### rude_customer
**Call ID:** 9d11e1cd-03-rude_custo
**Duration:** 310.2s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 847ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, a pint. And I hope you get it right this time.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 847 |
</details>

---

### off_menu_request
**Call ID:** 9d11e1cd-04-off_menu_r
**Duration:** 310.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 682ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! Um, can I get an order of pad thai, please?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 682 |
</details>

---

### delivery_request
**Call ID:** 9d11e1cd-05-delivery_r
**Duration:** 310.0s
**Turns:** 2
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 611ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant.
[AGENT]: How can I help you today?
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 583 |
| 2 | 640 |
</details>

---


*Report generated on 2026-01-25T17:09:32.768610*