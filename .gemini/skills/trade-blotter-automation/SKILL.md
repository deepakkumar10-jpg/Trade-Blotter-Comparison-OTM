---
name: trade-blotter-automation
description: Automates, scrapes, and compares the GWT-based Old UI and ag-Grid-based New UI of the Markit EQT Trade Blotter. Use when running comparative regression testing, verifying input states, handling frozen/floating split grids, or debugging field mismatches.
---

# Trade Blotter Automation Skill

## Overview
This skill provides procedural workflows, GWT/ag-Grid DOM specifications, and comparative debugging strategies for Markit EQT's Trade Blotter UI automation and regression suite.

---

## 🚀 Execution Workflows

### Task 1: Running the Visual & Comparative Regression Suite
Run comparison tests to audit GWT-based Old UI behavior against ag-Grid-based New UI behavior.

#### Option A: Direct Playwright Spec Run (The Modern Standard)
Execute our POM-based headed test spec directly:
```bash
npx playwright test
```

#### Option B: Double-Click Headed Launcher
Run our custom double-click headed runner batch script in your project root to run tests visibly on your monitor:
```bash
.\Run_Headed_Tests.bat
```

---

## 🏛️ GWT vs ag-Grid DOM Best Practices
When modifying scripts, always prioritize these architectural constraints:

### 1. GWT State Synchronization
- **Mandate:** Simply modifying `input.value` fails to trigger GWT's underlying state bindings.
- **Workflow:** You must sequentially dispatch `focus` $\rightarrow$ `input` $\rightarrow$ `change` $\rightarrow$ `blur` events.
- **Details:** See [gwt_and_aggrid_dom.md](references/gwt_and_aggrid_dom.md) for low-level JavaScript helper methods.

### 2. GWT Coordinate-Based Grid Alignment
- **Mandate:** GWT splits columns across a frozen left pane (`.frozencontainer`) and floating right pane (`.data-grid`).
- **Workflow:** Row elements must be merged row-for-row. Cells must be dynamically aligned to column headers by calculating minimum absolute horizontal midpoint distances (`(left + right) / 2`) within a 100px tolerance threshold.
- **Details:** See [gwt_and_aggrid_dom.md](references/gwt_and_aggrid_dom.md) for alignment algorithm.

### 3. ag-Grid (New UI) Collapsible Filter Cards
- **Mandate:** Elements must be scrolled into view to prevent visual layout clipping. Collapsed accordion filter cards (`.filter-card`) must be expanded programmatically by clicking `.card-header` if the client height of `.card-body` is 0.
- **Details:** See [gwt_and_aggrid_dom.md](references/gwt_and_aggrid_dom.md).

---

## 🏛️ Playwright POM Testing Guidelines (Senior AI Standards)

When developing or executing POM tests in this repository, strictly adhere to these visual and data regression standards:

### 1. Playwright Worker-Respawn Registry Preservation
- **Behavior:** Playwright Test automatically tears down the active worker process and spawns a fresh worker to execute the next test case when a test fails. This re-executes `beforeAll` at the start of each subsequent test.
- **Mandate:** Any reporting registry initialization inside `beforeAll` (e.g., `ReportCompiler.initializeRegistry()`) MUST read and preserve already-completed scenario statuses (`PASS`/`FAIL`) from any existing test results JSON database, preventing subsequent worker-respawn runs from wiping completed test cases.

### 2. GWT Innermost Sibling Text-Node Locators
- **Behavior:** GWT nested table wrappers cause broad XPaths like `contains(., "Label")` to match GWT's outermost parent table container, resulting in element index conflicts.
- **Mandate:** Always locate GWT inner label cells using direct text-node contains checks coupled with innermost column constraints to isolate the specific filter row with absolute precision:
  `//tr[td[contains(text(), "Label")]]` or `//tr[td[contains(., "Label") and not(.//td)]]`
  This successfully targets GWT’s specific inner row container, completely filtering out outer layout wrappers.

### 3. ag-Grid (New UI) Redraw Settle Sequence
- **Behavior:** Clicking "Reset" on the New UI clears all input fields but collapses the criteria panel with a sliding transition animation that takes about 1.5 to 2.5 seconds to complete.
- **Mandate:** Always expand, reset, and re-expand the panel sequentially, allowing a stable 3s wait for GWT/ag-Grid layout animations to fully settle before attempting to type:
  `expandAllCriteria()` (FIRST) $\rightarrow$ `resetCriteria()` (SECOND) $\rightarrow$ `page.waitForTimeout(3000)` (THIRD) $\rightarrow$ `expandAllCriteria()` (FOURTH) $\rightarrow$ `forceClearAllInputs()` (FIFTH) $\rightarrow$ `fillFieldInput()` (SIXTH).

### 4. Visual Parity Reporting (4 Screenshots)
- **Mandate:** To satisfy visual regression verification, every executed test case detailed page must render exactly **four screenshots**:
  - `gwtScreenshot`: GWT criteria inputs panel.
  - `newUiScreenshot`: ag-Grid criteria inputs panel.
  - `gwtResultsScreenshot`: GWT search results table grid.
  - `newUiResultsScreenshot`: ag-Grid search results table grid.

---

## 🔍 Debugging Mismatches and Discrepancies
Comparative mismatches represent gaps in parity between Old and New UIs or scraping regressions. Follow this standard investigative playbook:

### Step 1: Review Master Parity Checklist
- Open **`reports/trade_comparison_report.html`** in any web browser. Scan for rows marked with a red **`FAIL`** status badge.
- Click on the scenario hyperlink to load its dedicated detailed page: **`reports/Scenario_X_detail.html`**.

### Step 2: Visual Parity Check
- Scroll down the detail sub-page to review the 4 screenshots side-by-side:
  - **Inputs Panel screenshots:** Check if the values were typed correctly and isolated on both panels.
  - **Grid Results screenshots:** Check if the resulting tables match or if there is a visual rendering discrepancy (e.g., GWT grid displays empty while ag-Grid is populated).

### Step 3: Column Audit Table
- Scroll down further to inspect the **Grid Data Column Comparison Table**. Discrepancies are highlighted in bold red with `❌ MISMATCH` (e.g. GWT="ERROR", ag-Grid=""). Use this data to coordinate with developers.
