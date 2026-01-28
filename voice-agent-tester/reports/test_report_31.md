# Voice Agent Test Report

**Run ID:** 3e24a132
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 82.6 seconds

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
| Average Call Duration | 49.81s |
| Average Response Latency | 1222.62ms |
| Max Response Latency | 1709.06ms |
| Min Response Latency | 563.52ms |

### System Prompt Compliance
**Overall Compliance Score:** 34.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 5/5 |
| Asked for Size | 2/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 0/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### off_menu_request
**Call ID:** 3e24a132-04-off_menu_r
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1297ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! I'll have General Tso's chicken combo. My number is 607-555-0004. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1297 |
</details>

---

### delivery_request
**Call ID:** 3e24a132-05-delivery_r
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1709ms
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
| 1 | 1709 |
</details>

---

### rude_customer
**Call ID:** 3e24a132-03-rude_custo
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 1555ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, whatever. I need beef with broccoli, quart, and chicken lo mein, pint. My number is 607-555-0003. Bye.
[CUSTOMER]: Got it. Beef with broccoli, quart size, and chicken lo mein, pint size. We'll prepare your order and have it ready soon. Thank you for calling Far East Chinese Restaurant.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1555 |
</details>

---

### regular_order
**Call ID:** 3e24a132-01-regular_or
**Duration:** 75.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 736ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure, I've got the General Tso's Chicken Combination Plate, for the quart of pork fried rice. Is there anything else you'd like to add, or is that all for your order today?
[CUSTOMER]: That's all for my order. How long will it take to be ready?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 564 |
| 2 | 908 |
</details>

---

### impatient_customer
**Call ID:** 3e24a132-02-impatient_
**Duration:** 75.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 817ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Sure, got it. For the sesame chicken, I'll put that in as a combination plate with pork fried rice and an egg roll, and a pint of wonton soup. Is there anything else you'd like to add, or is that everything for your order?
[CUSTOMER]: No, that's it.
[CUSTOMER]: Alright, your order will be ready for pickup in about 20 minutes. See you soon!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 771 |
| 2 | 863 |
</details>

---


*Report generated on 2026-01-26T18:16:34.032350*