# Voice Agent Test Report

**Run ID:** 6d229db5
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 44.3 seconds

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
| Average Call Duration | 20.6s |
| Average Response Latency | 1274.2ms |
| Max Response Latency | 1656.48ms |
| Min Response Latency | 868.1ms |

### System Prompt Compliance
**Overall Compliance Score:** 30.0/100

| Behavior | Result |
|----------|--------|
| Greeted Properly | 5/5 |
| Asked for Size | 0/5 |
| Asked for Phone | 0/5 |
| Summarized Order | 0/5 |

### Call Issues
✅ All calls completed without issues.

### Guardrail Violations (0 total)
✅ No guardrail violations detected.

---

## Detailed Results by Call

### regular_order
**Call ID:** 6d229db5-01-regular_or
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1375ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! General Tso's Chicken combo and pork fried rice, quart. My number is 607-555-0001. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1375 |
</details>

---

### impatient_customer
**Call ID:** 6d229db5-02-impatient_
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 881ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, sesame chicken combo and wonton soup, pint. My number is 607-555-0002. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 881 |
</details>

---

### rude_customer
**Call ID:** 6d229db5-03-rude_custo
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1656ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah, hi, I need beef with broccoli, quart, and chicken lo mein, pint. Number is 607-555-0003. Bye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1656 |
</details>

---

### off_menu_request
**Call ID:** 6d229db5-04-off_menu_r
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 868ms
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
| 1 | 868 |
</details>

---

### delivery_request
**Call ID:** 6d229db5-05-delivery_r
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1591ms
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
| 1 | 1591 |
</details>

---


*Report generated on 2026-01-26T18:31:28.437929*