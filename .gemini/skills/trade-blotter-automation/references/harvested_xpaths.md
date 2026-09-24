# Harvested Relative XPaths for EQT Portal (Old GWT UI)

This reference documents verified relative XPaths used to target specific inputs, checkboxes, and buttons inside the nested GWT iframe (`frame_0`). 

These relative XPaths avoid hardcoding absolute coordinates and are completely independent of specific Trade IDs.

---

## 📅 Date Fields

| Field Name | Type | Relative XPath |
| :--- | :--- | :--- |
| **Trade Date (From)** | `text` | `//tr[td[contains(normalize-space(text()), "Trade DateFrom")]]//input[not(@type="checkbox")][1]` |
| **Trade Date (To)** | `text` | `//tr[td[contains(normalize-space(text()), "Trade DateFrom")]]//input[not(@type="checkbox")][2]` |
| **Last Activity Date (From)** | `text` | `//tr[td[contains(normalize-space(text()), "Last Activity DateFrom")]]//input[not(@type="checkbox")][1]` |
| **Last Activity Date (To)** | `text` | `//tr[td[contains(normalize-space(text()), "Last Activity DateFrom")]]//input[not(@type="checkbox")][2]` |

---

## 🔍 Text Search Inputs

| Field Label | Selector Type | Relative XPath |
| :--- | :--- | :--- |
| **Trade ID** | `text` | `//tr[td[contains(normalize-space(text()), "Trade IDContains")]]//input[not(@type="checkbox")][2]` |
| **Trade ID (Contains Checkbox)** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Trade IDContains")]]//input[@type="checkbox"]` |
| **Deal ID** | `text` | `//tr[td[contains(normalize-space(text()), "Deal IDContains")]]//input[not(@type="checkbox")][2]` |
| **Deal ID (Contains Checkbox)** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Deal IDContains")]]//input[@type="checkbox"]` |
| **Counterparty Trade ID** | `text` | `//tr[td[contains(normalize-space(text()), "Counterparty Trade IDContains")]]//input[not(@type="checkbox")][2]` |
| **Counterparty Deal ID** | `text` | `//tr[td[contains(normalize-space(text()), "Counterparty Deal IDContains")]]//input[not(@type="checkbox")][2]` |

---

## ⚙️ Workflows & Statuses Checkboxes

| Workflow / Status Label | Type | Relative XPath |
| :--- | :--- | :--- |
| **Clearing** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Clearing")]]//input[@type="checkbox"]` |
| **Confirmations** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Confirmations")]]//input[@type="checkbox"]` |
| **Novations** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Novations")]]//input[@type="checkbox"]` |
| **Intended for Clearing** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Intended for Clearing")]]//input[@type="checkbox"]` |
| **Ready For Clearing** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Ready For Clearing")]]//input[@type="checkbox"]` |
| **Clearing Pending** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Clearing Pending")]]//input[@type="checkbox"]` |
| **Cleared** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Cleared")]]//input[@type="checkbox"]` |
| **New (Trade Type)** | `checkbox` | `//tr[td[contains(normalize-space(text()), "New")]]//input[@type="checkbox"]` |
| **Assignment** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Assignment")]]//input[@type="checkbox"]` |
| **Termination** | `checkbox` | `//tr[td[contains(normalize-space(text()), "Termination")]]//input[@type="checkbox"]` |

---

## 📊 Products Checkboxes

| Product Category | Type | Relative XPath |
| :--- | :--- | :--- |
| **IRS: Interest Rate Swaps** | `checkbox` | `//tr[td[contains(normalize-space(text()), "IRS: Rates Interest Rate Swaps")]]//input[@type="checkbox"]` |
| **FRA: Forward Rate Agreements** | `checkbox` | `//tr[td[contains(normalize-space(text()), "FRA: Forward Rate Agreements")]]//input[@type="checkbox"]` |
| **OIS: Overnight Index Swap** | `checkbox` | `//tr[td[contains(normalize-space(text()), "OIS: Overnight Index Swap")]]//input[@type="checkbox"]` |
| **CDS: Credit Default Swaps** | `checkbox` | `//tr[td[contains(normalize-space(text()), "CDS: Credit Default Swaps")]]//input[@type="checkbox"]` |
| **EQS: Equity Swap** | `checkbox` | `//tr[td[contains(normalize-space(text()), "EQS: Equity Swap")]]//input[@type="checkbox"]` |
