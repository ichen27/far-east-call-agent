# Voice Agent Test Report

**Run ID:** 6eac00ac
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 82.2 seconds

## Quick Status Overview

| Status | Count |
|--------|-------|
| ✅ Passed | 2/5 |
| ⚠️ Timeout | 0/5 |
| ⚠️ Incomplete | 3/5 |
| ❌ Failed | 0/5 |

## Executive Summary

### Performance Metrics
| Metric | Value |
|--------|-------|
| Average Call Duration | 52.61s |
| Average Response Latency | 712.86ms |
| Max Response Latency | 1847.14ms |
| Min Response Latency | 4.87ms |

### System Prompt Compliance
**Overall Compliance Score:** 31.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 2/5 |
| Asked for Size | 2/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 2/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 6eac00ac-01-regular_or
**Duration:** 37.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1136ms
**Compliance Score:** 55/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi, I'd like to place an order for pickup, please. I'll have the General Tso's Chicken combination plate and a quart of pork fried rice.
[AGENT]: Sure thing. So that's one General Tso's chicken combination plate and a quart of pork fried rice. Is there anything else you'd like to add to your order?
[CUSTOMER]: No, that's it. My number is 607-555-0001. Thanks, goodbye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1531 |
| 2 | 741 |
</details>

---

### off_menu_request
**Call ID:** 6eac00ac-04-off_menu_r
**Duration:** 37.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1214ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi there! Can I get an order of pad thai, please?
[AGENT]: I'm sorry, we don't have Pad Thai on our menu. We offer a variety of Chinese dishes like lo mein, chow fun, mei fun, and more. Would you like to try something else from our menu?
[CUSTOMER]: Oh sorry! I'll just have General Tso's chicken combo then. My number is 607-555-0004. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 581 |
| 2 | 1847 |
</details>

---

### rude_customer
**Call ID:** 6eac00ac-03-rude_custo
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 947ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Fire East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, took long enough. I need to order some food - beef with broccoli, make it a quart, and chicken lo mein, pint. This is taking forever.
[CUSTOMER]: Got it. One quart of beef with broccoli and a pint of chicken lo mein. Would you like anything else with your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 947 |
</details>

---

### impatient_customer
**Call ID:** 6eac00ac-02-impatient_
**Duration:** 71.0s
**Turns:** 2
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 62ms
**Compliance Score:** 40/100

**Status:** ✅ PASSED
*Call completed successfully*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hey, I need to place a quick order - sesame chicken combo and a wonton soup, pint.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, that's it. My number is 607-555-0002. Thanks, bye!
[AGENT]: Sure, I've got that. Just to confirm, the sesame chicken as a combination plate, which comes with pork fried rice and an egg roll, and one pint of wonton soup. Is that everything for your order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 5 |
| 2 | 118 |
</details>

---

### delivery_request
**Call ID:** 6eac00ac-05-delivery_r
**Duration:** 59.0s
**Turns:** 1
**Disconnect Reason:** `silence_monitor`
**Avg Latency:** 205ms
**Compliance Score:** 15/100

**Status:** ⚠️ INCOMPLETE
*Ended: silence_monitor*

<details>
<summary>View Full Transcript</summary>

```
[CUSTOMER]: Hi! I'd like to place an order for delivery, please.
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Great! Could you please provide your address and let me know what you'd like to order?
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 205 |
</details>

---


*Report generated on 2026-01-26T17:50:12.623173*