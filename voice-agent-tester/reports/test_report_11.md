# Voice Agent Test Report

**Run ID:** 6a077455
**Date:** 2026-01-26
**Total Calls:** 6
**Total Duration:** 472.2 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 1/6 |
| ⚠️ Timeout | 0/6 |
| ⚠️ Incomplete | 5/6 |
| ❌ Failed | 0/6 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 70.6s |
| Average Response Latency | 602.2ms |
| Max Response Latency | 1047.8ms |
| Min Response Latency | 54.95ms |

### System Prompt Compliance
**Overall Compliance Score:** 35.83/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 5/6 |
| Asked for Size | 2/6 |
| Asked for Phone | 1/6 |
| Summarized Order | 1/6 |

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

### regular_order
**Call ID:** ebea2baf-01-regular_or
**Duration:** 96.5s
**Turns:** 4
**Disconnect Reason:** `phone_disconnected`
**Avg Latency:** 543ms
**Compliance Score:** 70/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Yes, that's correct.
[AGENT]: Sure, just to confirm, you'd like the General Tso's chicken as a combination plate, which comes with pork fried rice and an egg roll, and an additional quart of pork fried rice. Is that correct?
[CUSTOMER]: No, that's it.
[AGENT]: Great, I've noted that. Now, is there anything else you'd like to add to your order today?
[AGENT]: Understood. Let me summarize your order. You have one General Tso's chicken combination plate for $11.15 and one quart of pork fried rice for $9.95. That brings your total to $21.10 before tax. Could I have your phone number, please?
[CUSTOMER]: Sure, my phone number is 607-555-0001.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 944 |
| 2 | 126 |
| 3 | 55 |
| 4 | 1048 |
</details>

---


*Report generated on 2026-01-26T17:03:19.970840*