# Voice Agent Test Report

**Run ID:** cdcf750c
**Date:** 2026-01-25
**Total Calls:** 5
**Total Duration:** 207.7 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/5 |
| ⚠️ Timeout | 4/5 |
| ⚠️ Incomplete | 1/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 161.42s |
| Average Response Latency | 730.48ms |
| Max Response Latency | 1535.54ms |
| Min Response Latency | 170.97ms |

### System Prompt Compliance
**Overall Compliance Score:** 26.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 0/5 |

### Call Issues
**⚠️ 4 calls had issues:**

| Issue Type | Count |
|------------|-------|
| ⚠️ Timed out (max duration) | 4 |

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** cdcf750c-01-regular_or
**Duration:** 47.0s
**Turns:** 5
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 795ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Hello? Are you still there?
[CUSTOMER]: Great, thank you!
[AGENT]: Yes, I'm here and I've got your order started.
[AGENT]: you'd like the General Tso's Chicken Combination Plate.
[CUSTOMER]: No substitutions, that's fine as is.
[AGENT]: Would you like to make any substitutions for the pork fried rice or the egg roll that come with it?
[AGENT]: Also, I've noted the quart of pork fried rice. Anything else for your order?
[CUSTOMER]: Nope, that's all I need, thank you.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 976 |
| 2 | 224 |
| 3 | 1320 |
| 4 | 625 |
| 5 | 832 |
</details>

---

### impatient_customer
**Call ID:** cdcf750c-02-impatient_
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 288ms
**Compliance Score:** 15/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Alright, sesame chicken combo and a pint of wonton soup. Can I get your phone number for the order?
[CUSTOMER]: Hello? Are you still there?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 288 |
</details>

---

### rude_customer
**Call ID:** cdcf750c-03-rude_custo
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 862ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint. And can we hurry this up?
[CUSTOMER]: Hello? Are you still there?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 862 |
</details>

---

### off_menu_request
**Call ID:** cdcf750c-04-off_menu_r
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 171ms
**Compliance Score:** 15/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi there! Um, can I get an order of pad thai, please?
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Oh, I'm sorry, we don't have pad thai here. That's actually a Thai dish. We serve Chinese cuisine. Would you like to order something else?
[CUSTOMER]: Hello? Are you still there?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 171 |
</details>

---

### delivery_request
**Call ID:** cdcf750c-05-delivery_r
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 1536ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[CUSTOMER]: Hello? Are you still there?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1536 |
</details>

---


*Report generated on 2026-01-25T17:46:15.254490*