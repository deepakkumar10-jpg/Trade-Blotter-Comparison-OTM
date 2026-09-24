# Markit EQT Trade Blotter: GWT vs. ag-Grid Comparative Testing Framework

An automated end-to-end regression, behavioral, visual, and data parity testing framework for the **Markit EQT Trade Blotter**. This test suite validates feature and data parity between the legacy **Google Web Toolkit (GWT) Old UI** and the modern **PrimeNG / ag-Grid New UI** across multiple staging environments (`DemoB`, `DemoC`, `UAT`).

---

## 📋 Overview & Architectural Highlights

- **100% Free & Open-Source Stack:** Built on Node.js and `@playwright/test`.
- **Page Object Model (POM):** Clean, reusable separation of concerns:
  - `GwtBlotterPage.js` — Handles authentication, GWT iframe navigation (`frame_0`), coordinate-based frozen/floating pane horizontal merging, and 4-bubble-event input synchronization.
  - `AgGridBlotterPage.js` — Handles modern filter cards, accordion expansion, and ag-Grid DOM virtualization.
  - `DataComparator.js` — Performs key-by-key parity matching, normalizes representations (e.g. `.` vs `N/A`), and highlights discrepancies.
  - `ReportCompiler.js` — Unifies test results into a single interactive HTML report with side-by-side screenshot comparisons.
- **Dynamic BDD Specification:** Executes 112 comprehensive scenarios mapped to Gherkin specifications (`bdd_scenarios/COMPREHENSIVE_BDD_TEST_CASES.md`).

---

## 🚀 Prerequisites & Installation

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Google Chrome** installed locally

### 2. Installation
Clone the repository and install the project dependencies:

```bash
git clone https://github.com/deepakkumar10-jpg/Trade-Blotter-Comparison-OTM.git
cd Trade-Blotter-Comparison-OTM
npm install
```

If Playwright browsers are not yet installed on your machine:
```bash
npx playwright install chrome
```

---

## 🧪 Running Tests

Tests can be executed across various granularities: a single scenario, a targeted group of scenarios, a tag category, or the entire 112-scenario test suite.

### 1. Run a Single Scenario

Every BDD test is tagged with an exact identifier: `@scenario-<Part>.<Index>`.

#### In PowerShell:
```powershell
# Run Scenario 1.1 (Trade ID Exact Search) in headed browser
$env:BLOTTER_ENV="DemoB"; npx playwright test --grep "@scenario-1.1" --headed

# Run Scenario 1.3 (Deal ID Exact Search)
$env:BLOTTER_ENV="DemoB"; npx playwright test --grep "@scenario-1.3" --headed

# Run Scenario 3.1 (Trade Date Range Filter)
$env:BLOTTER_ENV="DemoB"; npx playwright test --grep "@scenario-3.1" --headed
```

#### In Windows Command Prompt (CMD):
```cmd
set BLOTTER_ENV=DemoB && npx playwright test --grep "@scenario-1.1" --headed
```

---

### 2. Run Multiple Scenarios

You can combine multiple scenarios using regex alternation (`|`) inside the `--grep` argument:

```powershell
# Run Scenarios 1.1, 1.2, and 1.3
npx playwright test --grep "@scenario-1.1|@scenario-1.2|@scenario-1.3" --headed

# Run all Part 1 scenarios (Alphanumeric IDs: 1.1 through 1.37)
npx playwright test --grep "@scenario-1\." --headed

# Run all Part 3 scenarios (Date Range Filters)
npx playwright test --grep "@scenario-3\." --headed
```

---

### 3. Run by Functional Category Tags

Scenarios are organized into functional tags for domain-specific regression runs:

| Tag | Category Description | Count | Example Command |
| :--- | :--- | :---: | :--- |
| `@id` | Alphanumeric Trade & Deal IDs | 35 | `npx playwright test --grep "@id" --headed` |
| `@date` | Date range boundary fields | 9 | `npx playwright test --grep "@date" --headed` |
| `@dropdown` | Workflow status & dropdown trees | 17 | `npx playwright test --grep "@dropdown" --headed` |
| `@entity` | Counterparties, Brokers, LEIs | 13 | `npx playwright test --grep "@entity" --headed` |
| `@product` | Product asset class & trees | 3 | `npx playwright test --grep "@product" --headed` |
| `@economics`| Monetary amounts & currencies | 28 | `npx playwright test --grep "@economics" --headed` |
| `@all-bdd` | Complete BDD regression suite | 112 | `npx playwright test --grep "@all-bdd" --headed` |

---

### 4. Headed vs. Headless Execution

- **Headed Mode (Visual verification)**:
  Add `--headed` to observe the browser interact with both UIs in real-time:
  ```bash
  npx playwright test --grep "@scenario-1.1" --headed
  ```
- **Headless Mode (Fast CI/CD execution)**:
  Omit `--headed`:
  ```bash
  npx playwright test --grep "@date"
  ```

---

### 5. Switching Target Environments

You can switch target environments via the `BLOTTER_ENV` environment variable:

- **DemoB** (Default):
  ```powershell
  $env:BLOTTER_ENV="DemoB"; npx playwright test --grep "@scenario-1.1" --headed
  ```
- **DemoC**:
  ```powershell
  $env:BLOTTER_ENV="DemoC"; npx playwright test --grep "@scenario-1.1" --headed
  ```
- **UAT**:
  ```powershell
  $env:BLOTTER_ENV="UAT"; npx playwright test --grep "@scenario-1.1" --headed
  ```

---

### 6. One-Click Batch Runners

For quick manual execution without typing CLI arguments:
- **`Run_BDD_TestSuite.bat`**: Configurable batch file to pick tags (`@date`, `@id`, `@scenario-1.1`, etc.) and environment (`DemoB`, `DemoC`, `UAT`).
- **`Run_Headed_Tests.bat`**: Launches the complete parity suite in standard headed Chrome.

---

## 📊 Reports & Test Artifacts

Each test run compiles an interactive report under the `reports/` directory:

```
reports/
└── run_YYYY-MM-DD_HH-MM-SS_DemoB/
    ├── trade_comparison_report.html   <-- Main unified HTML checklist report
    ├── test_results.json              <-- Raw JSON parity dataset
    ├── Scenario_1_1_detail.html       <-- Granular scenario match/mismatch diff
    ├── Scenario_1_1_gwt_criteria.png  <-- GWT input criteria screenshot
    ├── Scenario_1_1_new_ui_criteria.png<-- ag-Grid input criteria screenshot
    ├── Scenario_1_1_gwt_results.png   <-- GWT grid results screenshot
    └── Scenario_1_1_new_ui_results.png<-- ag-Grid results screenshot
```

To view the report, open `trade_comparison_report.html` in any browser.

---

## 📁 Repository Directory Structure

```
.
├── bdd_scenarios/              # Formal Gherkin BDD test case specifications
│   └── COMPREHENSIVE_BDD_TEST_CASES.md
├── data/                       # Harvested XPaths, input pools, and mock records
│   ├── harvested_test_pool.json
│   ├── new_ui_fields_xpaths.json
│   └── old_ui_fields_xpaths.json
├── reports/                    # Historical and active test execution runs & HTML diff reports
├── src/
│   ├── pom/                    # Page Object Model & Core Framework Modules
│   │   ├── AgGridBlotterPage.js# ag-Grid New UI automation
│   │   ├── GwtBlotterPage.js   # GWT Old UI automation & grid scraping
│   │   ├── DataComparator.js   # Tabular & field-level comparison engine
│   │   └── ReportCompiler.js   # Unified HTML report generator
│   └── ...                     # Diagnostic utilities & DOM extractors
├── tests/
│   ├── bdd_comprehensive.spec.js # Dynamic runner executing all 112 BDD scenarios
│   ├── trade_blotter_comparison.spec.js # Core isolated field & layout tests
│   └── harvest_xpaths.spec.js  # Automated XPath discovery & DOM audit
├── playwright.config.js        # Playwright runner configuration (timeouts, viewport, Chrome)
├── Run_BDD_TestSuite.bat       # Configurable batch runner
├── Run_Headed_Tests.bat        # Headed batch execution launcher
└── README.md                   # Project documentation
```

---

## 👥 Contributing & Adding New Scenarios

1. Define the Gherkin scenario and test data example in `bdd_scenarios/COMPREHENSIVE_BDD_TEST_CASES.md`.
2. Add any new DOM selectors or XPaths to `data/new_ui_fields_xpaths.json` or `data/old_ui_fields_xpaths.json`.
3. The dynamic runner in `tests/bdd_comprehensive.spec.js` will automatically pick up and register the scenario for execution and reporting.
