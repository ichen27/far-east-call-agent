# Voice Agent Test Report

**Run ID:** b3a91d40
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 82.7 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/5 |
| ⚠️ Timeout | 0/5 |
| ⚠️ Incomplete | 5/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 50.21s |
| Average Response Latency | 779.59ms |
| Max Response Latency | 1714.58ms |
| Min Response Latency | 0.02ms |

### System Prompt Compliance
**Overall Compliance Score:** 31.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 4/5 |
| Asked for Size | 2/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 0/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### rude_customer
**Call ID:** b3a91d40-03-rude_custo
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 578ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, I need beef with broccoli, quart, and chicken lo mein, pint. Number is 607-555-0003. Bye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 578 |
</details>

---

### delivery_request
**Call ID:** b3a91d40-05-delivery_r
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1396ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! I'd like shrimp lo mein, quart, for pickup. My number is 607-555-0005. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1396 |
</details>

---

### off_menu_request
**Call ID:** b3a91d40-04-off_menu_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 0ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi, I'd like to order some pad thai, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: I'm sorry, we are a Chinese restaurant. Would you like to try one of our Chinese dishes instead?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 0 |
</details>

---

### regular_order
**Call ID:** b3a91d40-01-regular_or
**Duration:** 79.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1422ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: No, that's it.
[AGENT]: Sure, I've got that. You'd like the General Tso's Chicken Combination Plate and a quart of pork fried rice. Is there anything else you'd like to add?
[CUSTOMER]: Alright, your order will be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1715 |
| 2 | 1130 |
</details>

---

### impatient_customer
**Call ID:** b3a91d40-02-impatient_
**Duration:** 75.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 502ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[CUSTOMER]: The combo, please.
[AGENT]: Sure, for the sesame chicken, would you like that as a regular order or as a combination plate with pork fried rice and an egg roll?
[CUSTOMER]: Got it. A sesame chicken combination plate with pork fried rice and an egg roll. Would you like to add anything else to your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 854 |
| 2 | 149 |
</details>

---


*Report generated on 2026-01-26T18:19:03.388320*