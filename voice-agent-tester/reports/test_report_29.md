# Voice Agent Test Report

**Run ID:** d73c9f4b
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 82.3 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 1/5 |
| ⚠️ Timeout | 0/5 |
| ⚠️ Incomplete | 4/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 51.81s |
| Average Response Latency | 785.46ms |
| Max Response Latency | 1704.85ms |
| Min Response Latency | 230.91ms |

### System Prompt Compliance
**Overall Compliance Score:** 32.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 4/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 1/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** d73c9f4b-01-regular_or
**Duration:** 41.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 958ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure, I've got the General Tso's Chicken Combination Plate and a quart of pork fried rice. Is there anything else you'd like to add?
[CUSTOMER]: No, that's it. My number is 607-555-0001. Thanks, goodbye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1196 |
| 2 | 720 |
</details>

---

### impatient_customer
**Call ID:** d73c9f4b-02-impatient_
**Duration:** 41.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 968ms
**Compliance Score:** 30/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[AGENT]: Sure thing. Just to confirm, that's a sesame chicken combo plate which comes with pork fried rice and an egg roll, and a pint of wonton soup. Is that everything for your order?
[CUSTOMER]: Yeah, that's it. My number is 607-555-0002. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 231 |
| 2 | 1705 |
</details>

---

### rude_customer
**Call ID:** d73c9f4b-03-rude_custo
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 945ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint.
[CUSTOMER]: Got it. A quart of beef with broccoli and a pint of chicken lo mein. Would you like to add anything else to your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 945 |
</details>

---

### off_menu_request
**Call ID:** d73c9f4b-04-off_menu_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 539ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! Can I get an order of pad thai please?
[CUSTOMER]: I'm sorry, but we're a Chinese restaurant. Would you like to order something from our Chinese menu instead?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 539 |
</details>

---

### delivery_request
**Call ID:** d73c9f4b-05-delivery_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 518ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[CUSTOMER]: Great! Can I have your address and phone number to get started?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 518 |
</details>

---


*Report generated on 2026-01-26T18:12:41.440165*