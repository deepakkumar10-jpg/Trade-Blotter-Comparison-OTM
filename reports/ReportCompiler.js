const fs = require('fs');
const path = require('path');

const RESULTS_PATH = path.join(__dirname, '..', '..', 'reports', 'test_results.json');
const MASTER_HTML_PATH = path.join(__dirname, '..', '..', 'reports', 'trade_comparison_report.html');
const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

/**
 * Compiles test results into a premium, two-fold separate page HTML reporting system.
 * Renders four screenshots (GWT Input vs ag-Grid Input and GWT Results vs ag-Grid Results) on detail pages.
 */
class ReportCompiler {
  /**
   * Initializes or resets the test results JSON database in our reports folder.
   */
  static initializeRegistry() {
    const initialPool = [
      {
        id: 'Scenario_1',
        name: 'Scenario 1 (Trade ID): Dynamic Isolated Comparative Parity Run',
        gherkin: `GIVEN: The user is logged into the OSTTRA Trade Blotter platform\nWHEN: The user performs an exact lookup for an active harvested [Trade ID]\n      (and ensures all other date and status filters are completely empty)\nTHEN: Both GWT (Old UI) and ag-Grid (New UI) must load the record\nAND: Core financial economics (Trade ID, Deal ID, Notional, Product) must align.`,
        status: 'NOT EXECUTED',
        notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
        gwtScreenshot: '',
        newUiScreenshot: '',
        gwtResultsScreenshot: '',
        newUiResultsScreenshot: '',
        mismatchesCount: 0,
        mismatches: {},
        matches: {}
      },
      {
        id: 'Scenario_2',
        name: 'Scenario 2 (Deal ID): Dynamic Isolated Comparative Parity Run',
        gherkin: `GIVEN: The user is logged into the OSTTRA Trade Blotter platform\nWHEN: The user performs an exact lookup using a specific active [Deal ID]\n      (and ensures all other Trade ID and date filters are completely empty)\nTHEN: Both GWT and ag-Grid must retrieve the identical transaction row.`,
        status: 'NOT EXECUTED',
        notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
        gwtScreenshot: '',
        newUiScreenshot: '',
        gwtResultsScreenshot: '',
        newUiResultsScreenshot: '',
        mismatchesCount: 0,
        mismatches: {},
        matches: {}
      },
      {
        id: 'Scenario_3',
        name: 'Scenario 3 (Trade Date): Isolated Date Range Filtering Parity',
        gherkin: `GIVEN: The user is logged into the OSTTRA Trade Blotter platform\nWHEN: The user filters by a specific [Trade Date Range] (From/To)\n      (and ensures all Trade ID, Deal ID, and Account filters are completely empty)\nTHEN: Both UIs must isolate and display exactly the same set of trades executed on that date.`,
        status: 'NOT EXECUTED',
        notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
        gwtScreenshot: '',
        newUiScreenshot: '',
        gwtResultsScreenshot: '',
        newUiResultsScreenshot: '',
        mismatchesCount: 0,
        mismatches: {},
        matches: {}
      },
      {
        id: 'Scenario_4',
        name: 'Scenario 4 (Account): Isolated Account Number Filtering Parity',
        gherkin: `GIVEN: The user is logged into the OSTTRA Trade Blotter platform\nWHEN: The user filters trades by a specific Account Number\n      (and ensures all Trade ID, Deal ID, and Dates are completely empty)\nTHEN: Both GWT and ag-Grid must render only rows corresponding to that account.`,
        status: 'NOT EXECUTED',
        notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
        gwtScreenshot: '',
        newUiScreenshot: '',
        gwtResultsScreenshot: '',
        newUiResultsScreenshot: '',
        mismatchesCount: 0,
        mismatches: {},
        matches: {}
      },
      {
        id: 'Scenario_5',
        name: 'Scenario 5 (UI Audit): Search Panel Visual Layout & Spelling Audit',
        gherkin: `GIVEN: The user has logged into the OSTTRA Trade Blotter platform\nWHEN: The user compares the search criteria input fields on the GWT and ag-Grid panels\nTHEN: Both systems must render corresponding input fields with correct labels and spellings\nAND: All ag-Grid input fields must have adequate widths with zero layout distortion.`,
        status: 'NOT EXECUTED',
        notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
        gwtScreenshot: '',
        newUiScreenshot: '',
        gwtResultsScreenshot: '',
        newUiResultsScreenshot: '',
        mismatchesCount: 0,
        mismatches: {},
        matches: {}
      }
    ];

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(initialPool, null, 2));
    console.log('[ReportCompiler] Test registry initialized successfully.');
  }

  /**
   * Updates the execution status and results for a specific scenario inside the registry.
   * 
   * @param {string} id - Scenario ID.
   * @param {Object} results - Results to merge.
   */
  static updateScenarioResult(id, results) {
    if (!fs.existsSync(RESULTS_PATH)) {
      this.initializeRegistry();
    }

    const pool = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
    const scIdx = pool.findIndex(item => item.id === id);

    if (scIdx !== -1) {
      pool[scIdx] = {
        ...pool[scIdx],
        ...results,
        gwtScreenshot: `${id}_gwt_criteria.png`,
        gwtResultsScreenshot: `${id}_gwt_results.png`,
        newUiScreenshot: `${id}_new_ui_criteria.png`,
        newUiResultsScreenshot: `${id}_new_ui_results.png`
      };
      fs.writeFileSync(RESULTS_PATH, JSON.stringify(pool, null, 2));
      console.log(`[ReportCompiler] Merged test results for scenario [${id}].`);
    }
  }

  /**
   * Compiles the test results database into a highly polished, two-fold HTML dashboard.
   */
  static compileHTMLReport() {
    if (!fs.existsSync(RESULTS_PATH)) {
      console.warn('[ReportCompiler] No results database found. Generating empty template.');
      this.initializeRegistry();
    }

    const pool = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
    const timestamp = new Date().toLocaleString();

    // ======================================================================
    // 🏛️ FOLD 1: MASTER CHECKLIST PAGE
    // ======================================================================
    let masterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OSTTRA Trade Blotter Master Parity Checklist</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      padding: 25px 20px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .container {
      max-width: 950px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .checklist-table {
      width: 100%;
      background: white;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .checklist-table th, .checklist-table td {
      padding: 20px 25px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .checklist-table th {
      background-color: #edf2f7;
      font-weight: 600;
      color: #4a5568;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .scenario-link {
      font-size: 16px;
      font-weight: 600;
      color: #2b6cb0;
      text-decoration: none;
      transition: color 0.15s;
    }
    .scenario-link:hover {
      color: #1a365d;
      text-decoration: underline;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: center;
      min-width: 100px;
    }
    .status-badge.pass { background-color: #e6fcf5; color: #0ca678; }
    .status-badge.fail { background-color: #fff5f5; color: #f03e3e; }
    .status-badge.not_executed { background-color: #f1f3f5; color: #495057; }
    
    .skip-reason {
      margin-top: 5px;
      font-size: 12px;
      color: #718096;
      font-style: italic;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>OSTTRA Trade Blotter Master Parity Checklist</h1>
    <p>Last Compiled: ${timestamp} | Environment: DemoC (mtmc2.demo.markit.partners)</p>
  </div>

  <div class="container">
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 15%;">Scenario ID</th>
          <th style="width: 60%;">Gherkin Scenario Title</th>
          <th style="width: 25%;">Execution Status</th>
        </tr>
      </thead>
      <tbody>`;

    pool.forEach(item => {
      const statusClass = item.status.toLowerCase().replace(' ', '_');
      const badgeText = item.status === 'NOT EXECUTED' ? 'Not Executed' : item.status;
      
      // Hyperlink to detail sub-page if executed, else standard text
      const nameContent = item.status !== 'NOT EXECUTED' 
        ? `<a href="${item.id}_detail.html" class="scenario-link">${item.name}</a>`
        : `<div class="scenario-link" style="color: #718096; cursor: default;">${item.name}</div>
           <div class="skip-reason">Reason: ${item.notExecutedReason}</div>`;

      masterHtml += `
        <tr>
          <td><strong>${item.id}</strong></td>
          <td>${nameContent}</td>
          <td><span class="status-badge ${statusClass}">${badgeText}</span></td>
        </tr>`;
    });

    masterHtml += `
      </tbody>
    </table>
  </div>

</body>
</html>`;

    // Write Master Page
    fs.writeFileSync(MASTER_HTML_PATH, masterHtml);
    console.log(`[ReportCompiler] Master checklist report written to: ${MASTER_HTML_PATH}`);

    // ======================================================================
    // 🏛️ FOLD 2: DEDICATED DETAIL PAGES WITH 4 SCREENSHOTS COMPARATIVE AUDIT
    // ======================================================================
    pool.forEach(item => {
      if (item.status === 'NOT EXECUTED') return; // Skip unexecuted templates

      const statusClass = item.status.toLowerCase().replace(' ', '_');
      const detailHtmlPath = path.join(REPORTS_DIR, `${item.id}_detail.html`);

      let detailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scenario Detail: ${item.id}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .back-nav {
      background-color: white;
      border-bottom: 1px solid #edf2f7;
      padding: 15px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .back-link {
      font-size: 15px;
      font-weight: 600;
      color: #2b6cb0;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: color 0.15s;
    }
    .back-link:hover {
      color: #1a365d;
    }
    .container {
      max-width: 1100px;
      margin: 30px auto;
      padding: 0 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      padding: 30px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #edf2f7;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #2d3748;
    }
    .status-badge {
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-badge.pass { background-color: #e6fcf5; color: #0ca678; }
    .status-badge.fail { background-color: #fff5f5; color: #f03e3e; }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1a365d;
      border-left: 4px solid #2b6cb0;
      padding-left: 10px;
      margin: 30px 0 15px 0;
    }
    
    .gherkin-blockquote {
      background: #f8f9fa;
      border-left: 4px solid #1e3c72;
      padding: 15px 20px;
      margin-bottom: 30px;
      font-family: Consolas, Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      border-radius: 0 4px 4px 0;
      white-space: pre-wrap;
      color: #2d3748;
    }
    
    .screenshot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 35px;
    }
    .screenshot-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }
    .screenshot-title {
      background: #edf2f7;
      padding: 10px 15px;
      font-weight: 600;
      font-size: 14px;
      color: #4a5568;
      text-align: center;
    }
    .screenshot-box img {
      width: 100%;
      height: auto;
      display: block;
      cursor: zoom-in;
    }
    
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 40px;
    }
    .audit-table th, .audit-table td {
      border: 1px solid #e2e8f0;
      padding: 12px 15px;
      text-align: left;
    }
    .audit-table th {
      background-color: #f7fafc;
      font-weight: 600;
      color: #4a5568;
    }
    .audit-table tr.mismatch {
      background-color: #fff5f5;
    }
    .audit-table tr.mismatch td {
      border-color: #feb2b2;
    }
    .audit-status {
      font-weight: bold;
    }
    .audit-status.match { color: #0ca678; }
    .audit-status.mismatch { color: #f03e3e; }
  </style>
</head>
<body>

  <!-- Top Navigation Back Bar -->
  <div class="back-nav">
    <a href="trade_comparison_report.html" class="back-link">← Back to Master Report</a>
  </div>

  <div class="container">
    
    <div class="header-row">
      <h1>${item.name}</h1>
      <span class="status-badge ${statusClass}">${item.status}</span>
    </div>

    <div class="section-title">Plain English BDD Specification</div>
    <div class="gherkin-blockquote">${item.gherkin}</div>

    <!-- FOUR SCREENSHOTS TWO-FOLD AUDITING LAYOUT -->
    <div class="section-title">1. Visual Inputs Auditing (Entered Values)</div>
    <div class="screenshot-grid">
      <div class="screenshot-box">
        <div class="screenshot-title">Old UI (GWT) Input State</div>
        <img src="${item.gwtScreenshot}" onclick="window.open(this.src)" title="Click to enlarge GWT criteria">
      </div>
      <div class="screenshot-box">
        <div class="screenshot-title">New UI (ag-Grid) Input State</div>
        <img src="${item.newUiScreenshot}" onclick="window.open(this.src)" title="Click to enlarge ag-Grid criteria">
      </div>
    </div>

    <div class="section-title">2. Visual Results Auditing (Scraped Grid Records)</div>
    <div class="screenshot-grid">
      <div class="screenshot-box">
        <div class="screenshot-title">Old UI (GWT) Grid Results</div>
        <img src="${item.gwtResultsScreenshot}" onclick="window.open(this.src)" title="Click to enlarge GWT grid">
      </div>
      <div class="screenshot-box">
        <div class="screenshot-title">New UI (ag-Grid) Grid Results</div>
        <img src="${item.newUiResultsScreenshot}" onclick="window.open(this.src)" title="Click to enlarge ag-Grid grid">
      </div>
    </div>

    <div class="section-title">3. Grid Data Column Comparison & Audit</div>
    <table class="audit-table">
      <thead>
        <tr>
          <th style="width: 30%;">Field Name</th>
          <th style="width: 30%;">Old UI Value (GWT)</th>
          <th style="width: 30%;">New UI Value (ag-Grid)</th>
          <th style="width: 10%;">Parity</th>
        </tr>
      </thead>
      <tbody>`;

      // Mismatches
      if (Object.keys(item.mismatches).length > 0) {
        Object.keys(item.mismatches).forEach(field => {
          const disc = item.mismatches[field];
          detailHtml += `
            <tr class="mismatch">
              <td><strong>${field}</strong></td>
              <td>${disc.old}</td>
              <td>${disc.new}</td>
              <td><span class="audit-status mismatch">❌ MISMATCH</span></td>
            </tr>`;
        });
      }

      // Matches
      if (Object.keys(item.matches).length > 0) {
        Object.keys(item.matches).forEach(field => {
          const disc = item.matches[field];
          detailHtml += `
            <tr>
              <td>${field}</td>
              <td>${disc.old}</td>
              <td>${disc.new}</td>
              <td><span class="audit-status match">✅ MATCH</span></td>
            </tr>`;
        });
      }

      detailHtml += `
      </tbody>
    </table>
  </div>

</body>
</html>`;

      fs.writeFileSync(detailHtmlPath, detailHtml);
      console.log(`[ReportCompiler] Detailed scenario sub-page written to: ${detailHtmlPath}`);
    });
  }
}

module.exports = {
  ReportCompiler
};
