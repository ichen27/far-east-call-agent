# Voice Agent Test Report

**Run ID:** 6a077455
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 79.2 seconds

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
| Average Call Duration | 65.42s |
| Average Response Latency | 613.98ms |
| Max Response Latency | 865.47ms |
| Min Response Latency | 146.67ms |

### System Prompt Compliance
**Overall Compliance Score:** 29.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 4/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 0/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### off_menu_request
**Call ID:** 6a077455-04-off_menu_r
**Duration:** 61.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 796ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! Can I get an order of pad thai, please?
[CUSTOMER]: I'm sorry, we don't serve pad thai here. Would you like to order some Chinese food instead?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 796 |
</details>

---

### rude_customer
**Call ID:** 6a077455-03-rude_custo
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 829ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint. And hurry up, I don't have all day here.
[CUSTOMER]: Got it. One quart of beef with broccoli and one pint of chicken lo mein. Anything else you'd like to add to your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 829 |
</details>

---

### delivery_request
**Call ID:** 6a077455-05-delivery_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 481ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! I'd like to place an order for delivery. Could you tell me about your popular dishes?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 481 |
</details>

---

### impatient_customer
**Call ID:** 6a077455-02-impatient_
**Duration:** 71.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 281ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, that's it.
[AGENT]: Sure, I've got a sesame chicken combo plate and a pint of wonton soup. Is that everything for your order today?
[CUSTOMER]: Alright, your order will be ready for pickup in about 20 minutes. Thank you for choosing Far East Chinese Restaurant!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 147 |
| 2 | 416 |
</details>

---

### regular_order
**Call ID:** 6a077455-01-regular_or
**Duration:** 77.0s
**Turns:** 2
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 682ms
**Compliance Score:** 40/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure. I've got the General Tso's chicken as a combination plate and a quart of pork fried rice. Is that everything for your order?
[CUSTOMER]: No, that's it.
[CUSTOMER]: Alright, your order will
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 499 |
| 2 | 865 |
</details>

---


*Report generated on 2026-01-26T16:56:47.001286*