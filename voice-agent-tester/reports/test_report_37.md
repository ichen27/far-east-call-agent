# Voice Agent Test Report

**Run ID:** 7c00e3ad
**Date:** 2026-01-26
**Total Calls:** 5
**Total Duration:** 43.4 seconds

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
| Average Call Duration | 19.81s |
| Average Response Latency | 861.6ms |
| Max Response Latency | 1635.57ms |
| Min Response Latency | 415.6ms |

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
**Call ID:** 7c00e3ad-01-regular_or
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 416ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! I'll have General Tso's Chicken combo and a quart of pork fried rice. My number is 607-555-0001. Thanks, goodbye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 416 |
</details>

---

### impatient_customer
**Call ID:** 7c00e3ad-02-impatient_
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 1636ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hey, quick order - sesame chicken combo and wonton soup, pint. My number is 607-555-0002. Gotta run, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 1636 |
</details>

---

### rude_customer
**Call ID:** 7c00e3ad-03-rude_custo
**Duration:** 21.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 833ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Yeah hi, I want beef with broccoli, quart, and chicken lo mein, pint. My number is 607-555-0003. Are we done now? Bye.
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 833 |
</details>

---

### off_menu_request
**Call ID:** 7c00e3ad-04-off_menu_r
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 747ms
**Compliance Score:** 30/100

**Status:** ⚠️ INCOMPLETE
*Call ended but order flow incomplete*

<details>
<summary>View Full Transcript</summary>

```
[AGENT]: Hello, this is Far East Chinese Restaurant. How can I help you today?
[CUSTOMER]: Hi! General Tso's chicken combo please. My number is 607-555-0004. Thanks, bye!
```
</details>

<details>
<summary>Latency Measurements</summary>

| Turn | Latency (ms) |
|------|-------------|
| 1 | 747 |
</details>

---

### delivery_request
**Call ID:** 7c00e3ad-05-delivery_r
**Duration:** 19.0s
**Turns:** 1
**Disconnect Reason:** `customer_goodbye`
**Avg Latency:** 677ms
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
| 1 | 677 |
</details>

---


*Report generated on 2026-01-26T18:33:34.252097*