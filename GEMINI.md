# Markit EQT Trade Blotter: GWT vs ag-Grid Comparative Testing Framework

This repository houses the automated regression and visual/data comparison testing suite for the Markit EQT Trade Blotter. It tracks parity between the legacy Google Web Toolkit (GWT) Old UI and the modern PrimeNG/ag-Grid New UI across multiple environments (`DemoC`, `DemoB`, `UAT`).

---

## 📐 Core Comparative Testing Strategy (Option C)

We utilize a **100% Free and Open-Source Enterprise Testing Architecture** built on Playwright (`@playwright/test`) employing three fundamental layers:

1. **Data & Economics Parity:** Serailizing tabular grid records into standard JSON schemas, comparing them key-by-key, and handling structural formatting nuances (e.g., standardizing `.` vs `N/A` or date representations).
2. **Visual Parity via Native Masking:** Leveraging Playwright's native screenshot engine combined with custom region **masking** arrays. We programmatically "black out" highly dynamic text areas (such as the data grid rows or date inputs) to verify the layout, card headers, and button borders render perfectly without false positives from live data shifts.
3. **DOM Structural Integrity:** Utilizing `expect(locator).toMatchSnapshot()` to compare DOM structures without relying on raw pixel diffing, rendering tests completely resilient to framework-specific CSS and padding differences.

---

## 🏛️ GWT & ag-Grid Architectural Constraints

When writing or refactoring test scripts in this codebase, you must adhere strictly to these engineering standards:

### 1. GWT (Old UI) Input State Synchronization
In GWT, programmatically assigning values to inputs bypassing framework binding fails. To synchronize programmatic entries:
- **Rule:** You must sequentially dispatch four bubble events on the targeted input element inside the nested GWT iframe (`frame_0`):
  $$\text{Target Input} \rightarrow \text{Dispatch Event Focus} \rightarrow \text{Input} \rightarrow \text{Change} \rightarrow \text{Blur}$$
- **Usage Example:**
  ```javascript
  async function fillGWTInput(frame, selector, index, value) {
    await frame.evaluate(({ sel, idx, val }) => {
      const inputs = Array.from(document.querySelectorAll(sel));
      const inp = inputs[idx];
      if (inp) {
        inp.value = val;
        inp.dispatchEvent(new Event('focus', { bubbles: true }));
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        inp.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, { sel: selector, idx: index, val: value });
  }
  ```

### 2. GWT Coordinate-Based Grid Merging
The GWT grid splits columns across a frozen left pane (`.frozencontainer` / Status fields) and a floating right pane (`.data-grid` / economics fields).
- **Row Mapping:** Rows must be merged horizontally 1-to-1 based on index `rIdx`.
- **Header Mapping:** Cells do not map to indexes easily. Map cells to headers dynamically by calculating horizontal midpoint proximity:
  $$\text{midpoint} = \frac{\text{rect.left} + \text{rect.right}}{2}$$
  Find the header with the minimum absolute distance to the cell. Only align if the distance is within a **100px tolerance threshold**.

### 3. ag-Grid (New UI) Collapsible Filter Cards
- **Rule:** Ensure elements are scrolled programmatically into view (`scrollIntoViewIfNeeded()`) to prevent floating header layout overlap.
- **Rule:** Collapsible `.filter-card` accordions must be programmatically checked. If the client height of `.card-body` is 0 or display is `none`, click `.card-header` to trigger GWT/Angular expansion transitions, waiting at least 1000ms for stable render.

### 4. Playwright Worker-Respawn Registry Preservation (Critical Session Lock)
Playwright Test automatically tears down the active worker process and spawns a fresh worker to execute the next test case when a test fails. This re-executes `beforeAll` and `afterAll` hooks, which can lead to reporting directory splitting and registry loss.
- **Rule:** Any active run lock file (`active_run.json`) MUST use the **parent process ID (`process.ppid`)** to uniquely identify the execution session.
- **Rule:** All spawned worker processes within the same run share the same parent PID. `ReportCompiler.initializeRegistry()` must read `active_run.json` and reuse the active run directory if the current `process.ppid` matches the stored parent PID.
- **Rule:** Do NOT delete or clean the state lock inside `test.afterAll` hooks during individual worker teardowns. This ensures all scenarios (passed and failed) are compiled into a **single, unified checklist HTML report**.

---

## 🛠️ Phased Implementation Plan (Refactoring Blueprint)

Future refactoring work should execute along these approved architectural phases:

### Phase 1: Framework Refactoring & Page Object Model (POM)
- Initialize `@playwright/test` runner inside the repository.
- Structure page objects under `src/pom/`:
  - `GwtBlotterPage.js` — Handles logging in, XPath-based inputs, and coordinate-based grid scraping.
  - `AgGridBlotterPage.js` — Handles card expansion, ag-Grid element parsing, and New UI actions.

### Phase 2: Data-Driven Field Coverage Matrix
- Define parameterized testing configurations inside a central JSON payload.
- Design parameterized `test.describe` loops that run standard and boundary data vectors (Dates, Text searches, Checkbox groups) dynamically through both the `GwtBlotterPage` and `AgGridBlotterPage`.

### Phase 3: Visual Masking & Snapshot Pipeline
- Configure local visual assertions using `expect(page).toHaveScreenshot({ mask: [gridSelector, footerSelector] })`.
- Align baseline golden images inside a `__screenshots__` repository directory.
- Calibrate `maxDiffPixelRatio` within a $0.02$ to $0.05$ boundary to eliminate font anti-aliasing false failures.

### Phase 4: UI State & Anomaly Assertions
- Implement Playwright's actionability checks (`toBeVisible()`, `toBeEnabled()`) before running visual captures.
- Enforce explicit waiting models on the loader spinner classes (`.loading`, `.p-progressbar`) to guarantee page settlement before data is compared.

---

## 🚀 Execution & CLI Commands

### Direct Node Comparison Tool (Legacy Baseline)
Run visual and data tests via the manual controller bat:
```bash
.\Run_Comparison.bat
```
Or execute the script directly:
```bash
node src/compare_blotters.js --section <Dates|TradeDetails|Instrument> --env <DemoC|DemoB|UAT> [--headless]
```

### Element XPath Harvester (Diagnostic Tool)
Re-harvest and audit GWT input relative XPaths if elements render empty grids:
```bash
node src/extract_all_fields_xpaths.js
```
The output is written to `reports/RELATIVE_XPATHS_REPORT.md` and `data/new_ui_fields_xpaths.json` / `data/old_ui_fields_xpaths.json`.

---

## 🛡️ Project Guardrails

- **Summarize Execution Outcomes:** After every test run, modification, or action performed, you must compile and present a detailed, high-signal, and transparent summary of what you did, including the exact results, behavioral findings, and any next steps/recommendations. This ensures continuous peer alignment and clear visibility into codebase status.

---

## 🔍 Debugging Comparative Mismatches
When a test outputs an **`❌ MISMATCH`** inside the reports (`reports/trade_comparison_report.html` or `reports/TRADE_COMPARISON_REPORT.md`):

1. **Format Check:** Verify if the discrepancy is formatting-based (such as `.` vs `N/A` or standardizing empty strings). If so, update the data normalizer in `compare_blotters.js` or in the scraping utility.
2. **Visual Check:** Cross-reference `${scenario_id}_old_ui.png` and `${scenario_id}_new_ui.png` in the `reports/` folder. Check if the page rendering was incomplete (timing issue) or if an element layout failed.
3. **Selector Audit:** If scraping fails completely, execute `node src/extract_all_fields_xpaths.js` to see if elements have been moved or updated on the EQT server-side.
