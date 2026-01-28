# Voice Agent Test Report

**Run ID:** 405687cc
**Date:** 2026-01-25
**Total Calls:** 5
**Total Duration:** 205.0 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 0/5 |
| ⚠️ Timeout | 3/5 |
| ⚠️ Incomplete | 2/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 139.61s |
| Average Response Latency | 797.18ms |
| Max Response Latency | 1587.93ms |
| Min Response Latency | 247.81ms |

### System Prompt Compliance
**Overall Compliance Score:** 32.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 3/5 |
| Asked for Size | 1/5 |
| Asked for Phone | 1/5 |
| Summarized Order | 1/5 |

### Call Issues
**⚠️ 3 calls had issues:**

| Issue Type | Count |
|------------|-------|
| ⚠️ Timed out (max duration) | 3 |

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 405687cc-01-regular_or
**Duration:** 61.0s
**Turns:** 4
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 825ms
**Compliance Score:** 70/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[CUSTOMER]: Got it. One General Tso's Chicken combination plate and a quart of pork fried rice. Would you like to add any drinks or appetizers to your order?
[AGENT]: Thank you for that. Just to confirm, the General Tso's Chicken Combination Plate comes with pork fried rice and an egg roll.
[AGENT]: Did you want to make any substitutions for the pork fried rice or the egg roll on that combination plate?
[CUSTOMER]: No substitutions, that sounds perfect. My phone number is 607-555-0001.
[AGENT]: And after that, I'll need your phone number to complete the order.
[CUSTOMER]: I think we got disconnected. I'll call back later. Goodbye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 864 |
| 2 | 1588 |
| 3 | 458 |
| 4 | 389 |
</details>

---

### off_menu_request
**Call ID:** 405687cc-04-off_menu_r
**Duration:** 67.0s
**Turns:** 4
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 633ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi there! Can I get an order of pad thai, please?
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Oh, I see. Um, what about sushi rolls? Do you have those?
[AGENT]: I'm sorry, we don't have Pad Thai on our menu. We specialize in Chinese cuisine. Would you like to hear some of our noodle dishes or other options?
[CUSTOMER]: We don't serve sushi rolls either, as we focus on traditional Chinese dishes. Would you like to try some of our popular items like kung pao chicken or beef with broccoli?
[AGENT]: We don't serve sushi rolls either, as we focus on traditional Chinese dishes.
[AGENT]: Would you like to try some of our popular items like kung pao chicken or beef with broccoli?
[CUSTOMER]: Hmm, I was thinking of that orange chicken like Panda Express. Do you have that?
[CUSTOMER]: Yes, we do have orange chicken. It's a popular dish here. Would you like to place an order for that?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 721 |
| 2 | 376 |
| 3 | 600 |
| 4 | 838 |
</details>

---

### impatient_customer
**Call ID:** 405687cc-02-impatient_
**Duration:** 190.0s
**Turns:** 2
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 854ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant.
[AGENT]: How can I help you today?
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[CUSTOMER]: Got it. One sesame chicken combo and a pint of wonton soup. Would you like to add anything else to your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 391 |
| 2 | 1318 |
</details>

---

### rude_customer
**Call ID:** 405687cc-03-rude_custo
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 1425ms
**Compliance Score:** 30/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, a pint. Let's get this right, alright?
[CUSTOMER]: Of course, we can definitely help with that. So that's one quart of beef with broccoli and one pint of chicken lo mein. Anything else I can get for you today?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1425 |
</details>

---

### delivery_request
**Call ID:** 405687cc-05-delivery_r
**Duration:** 190.0s
**Turns:** 1
**Disconnect Reason:** `max_duration_reached`
**Avg Latency:** 248ms
**Compliance Score:** 15/100

**Status:** ⚠️ TIMEOUT
*Hit max duration limit*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Sure, can I have your address and phone number for the delivery?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 248 |
</details>

---


*Report generated on 2026-01-25T22:03:43.248249*