# Voice Agent Test Report

**Run ID:** 3c5d59a6
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 81.7 seconds

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
| Average Call Duration | 52.25s |
| Average Response Latency | 717.64ms |
| Max Response Latency | 1776.29ms |
| Min Response Latency | 326.32ms |

### System Prompt Compliance
**Overall Compliance Score:** 29.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 1/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### impatient_customer
**Call ID:** 3c5d59a6-02-impatient_
**Duration:** 39.1s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1262ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Sure. Let's go over your order quickly. You'd like one sesame chicken combo plate and a pint of wonton soup. Is that everything for today?
[CUSTOMER]: No, that's it. My phone number is 607-555-0002. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 748 |
| 2 | 1776 |
</details>

---

### regular_order
**Call ID:** 3c5d59a6-01-regular_or
**Duration:** 45.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1089ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Yes, that's correct. No, that's it. My phone number is 607-555-0001. Thanks, goodbye!
[AGENT]: Sure thing. Just to confirm, for the General Tso's chicken, you want the combination plate that comes with pork fried rice and an egg roll. And you'd like an additional quart of pork fried rice as well. Is that correct?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1521 |
| 2 | 657 |
</details>

---

### rude_customer
**Call ID:** 3c5d59a6-03-rude_custo
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 554ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint. And seriously, your phone rang forever.
[CUSTOMER]: Sorry about the wait on the line. I've got your order for a quart of beef with broccoli and a pint of chicken lo mein. Anything else I can get for you today?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 554 |
</details>

---

### off_menu_request
**Call ID:** 3c5d59a6-04-off_menu_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 357ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi there! Can I get an order of pad thai, please?
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: I'm sorry, but we are a Chinese restaurant and do not serve pad thai. May I suggest some of our popular dishes like kung pao chicken or sweet and sour pork?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 357 |
</details>

---

### delivery_request
**Call ID:** 3c5d59a6-05-delivery_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 326ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Sure, what would you like to order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 326 |
</details>

---


*Report generated on 2026-01-26T17:46:15.097382*