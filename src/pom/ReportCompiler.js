const fs = require('fs');
const path = require('path');

const STATE_LOCK_PATH = path.join(__dirname, '..', '..', 'reports', 'active_run.json');
const DEFAULT_REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

/**
 * Compiles test results into a premium, two-fold separate page HTML reporting system.
 * Packages all reports, detail sub-pages, and screenshots into a timestamped, environment-specific folder,
 * utilizing a shared state lock to survive Playwright worker-respawn boundaries.
 */
class ReportCompiler {
  /**
   * Runtime Gherkin Markdown Parser to make the BDD file the single source of truth.
   */
  static parseGherkinMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const scenarios = [];
    
    let currentOutline = '';
    let inExamples = false;
    let headers = null;
    let rawGherkinLines = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // Skip markdown code block indicators
      if (trimmed.startsWith('```')) {
        continue;
      }

      if (trimmed.startsWith('Scenario Outline:')) {
        currentOutline = trimmed.replace('Scenario Outline:', '').trim();
        inExamples = false;
        headers = null;
        rawGherkinLines = [];
      }

      if (trimmed.startsWith('Examples:')) {
        inExamples = true;
        headers = null;
        continue;
      }

      if (inExamples && trimmed.startsWith('|')) {
        const cells = trimmed.split('|')
          .map(c => c.trim())
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        if (!headers) {
          headers = cells;
        } else {
          const rowObj = {};
          headers.forEach((header, idx) => {
            rowObj[header] = cells[idx] || '';
          });
          scenarios.push({
            outline: currentOutline,
            gherkin: rawGherkinLines.join('\n'),
            data: rowObj
          });
        }
      } else {
        if (currentOutline && !inExamples && trimmed !== '') {
          rawGherkinLines.push(line);
        }
        if (trimmed === '') {
          inExamples = false;
        }
      }
    }
    return scenarios;
  }

  /**
   * Dynamically resolves the active reports directory.
   * If a shared state lock exists, reads the timestamped environment path.
   * Else, defaults to the root reports folder.
   * 
   * @returns {string} The active run directory path.
   */
  static getRunDir() {
    if (fs.existsSync(STATE_LOCK_PATH)) {
      try {
        const lock = JSON.parse(fs.readFileSync(STATE_LOCK_PATH, 'utf8'));
        if (lock.runDir && fs.existsSync(lock.runDir)) {
          return lock.runDir;
        }
      } catch (err) {
        console.warn(`[ReportCompiler] Error parsing active_run.json: ${err.message}`);
      }
    }
    return DEFAULT_REPORTS_DIR;
  }

  /**
   * Resolves the active results database JSON path.
   */
  static getResultsPath() {
    return path.join(this.getRunDir(), 'test_results.json');
  }

  /**
   * Resolves the active Master Checklist HTML path.
   */
  static getMasterHtmlPath() {
    return path.join(this.getRunDir(), 'trade_comparison_report.html');
  }

  /**
   * Initializes the test results JSON database in a timestamped, environment-specific folder.
   * If already initialized for this active execution run, preserves states to survive worker respawns.
   * 
   * @param {string} domain - The target environment domain (e.g. 'mtmc2.demo.markit.partners').
   */
  static initializeRegistry(domain = 'mtmc2.demo.markit.partners') {
    const envTag = domain.includes('mtmc2') ? 'DemoC' : domain.includes('mtmb2') ? 'DemoB' : 'UAT';
    
    // 1. Establish the Shared Run State Lock if this is a completely fresh suite execution.
    // We check process.ppid (parent process ID) to detect if this is a worker restarted inside
    // the SAME Playwright execution session. This is 100% resilient to worker-respawn boundaries.
    let isFresh = true;
    if (fs.existsSync(STATE_LOCK_PATH)) {
      try {
        const lock = JSON.parse(fs.readFileSync(STATE_LOCK_PATH, 'utf8'));
        if (lock.ppid === process.ppid && lock.runDir && fs.existsSync(lock.runDir)) {
          isFresh = false;
          console.log(`[ReportCompiler] Shared run state matched parent PID [${process.ppid}]. Reusing active run folder.`);
        }
      } catch (err) {
        console.warn(`[ReportCompiler] Failed to parse active lock for freshness: ${err.message}`);
      }
    }

    if (isFresh) {
      const now = new Date();
      // Format timestamp as YYYY-MM-DD_HH-MM-SS
      const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/\..+/, '')
        .replace(/:/g, '-');
      
      const timestampedDirName = `run_${timestamp}_${envTag}`;
      const timestampedDirPath = path.join(DEFAULT_REPORTS_DIR, timestampedDirName);
      
      // Create the timestamped environment folder
      fs.mkdirSync(timestampedDirPath, { recursive: true });
      
      // Save path and PPID inside our state lock
      fs.writeFileSync(STATE_LOCK_PATH, JSON.stringify({ 
        runDir: timestampedDirPath, 
        domain, 
        envTag,
        ppid: process.ppid
      }, null, 2));
      console.log(`[ReportCompiler] Fresh execution detected (PID ${process.pid}, Parent PID ${process.ppid}). Created active run directory: ${timestampedDirPath}`);
    }

    const runDir = this.getRunDir();
    const resultsPath = this.getResultsPath();

    // Dynamically compile the initial Results Pool DIRECTLY from bdd_scenarios/COMPREHENSIVE_BDD_TEST_CASES.md at runtime!
    const BDD_FILE_PATH = path.join(__dirname, '..', '..', 'bdd_scenarios', 'COMPREHENSIVE_BDD_TEST_CASES.md');
    let initialPool = [];
    if (fs.existsSync(BDD_FILE_PATH)) {
      try {
        const parsedScenarios = this.parseGherkinMarkdown(BDD_FILE_PATH);
        const catCounters = { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 };

        const mappedPool = parsedScenarios.map(sc => {
          let id = '';
          let name = '';

          if (sc.outline.includes('Alphanumeric Search Parity')) {
            const idx = catCounters['1']++;
            id = `Scenario_1_${idx}`;
            name = `Scenario 1.${idx}: ${sc.data['FieldLabel']} Comparative Parity Run`;
          } 
          else if (sc.outline.includes('Date Range and Offset Formula Parity')) {
            const idx = catCounters['2']++;
            id = `Scenario_2_${idx}`;
            name = `Scenario 2.${idx}: ${sc.data['DateField']} Comparative Parity Run`;
          }
          else if (sc.outline.includes('Multi-Select Category Dropdown Value Parity')) {
            const idx = catCounters['3']++;
            id = `Scenario_3_${idx}`;
            name = `Scenario 3.${idx}: ${sc.data['FilterLabel']} Comparative Parity Run`;
          }
          else if (sc.outline.includes('Entity and Legal Identifier Filter Parity')) {
            const idx = catCounters['4']++;
            id = `Scenario_4_${idx}`;
            name = `Scenario 4.${idx}: ${sc.data['FilterLabel']} Comparative Parity Run`;
          }
          else if (sc.outline.includes('Product Tree Node Selection Parity')) {
            const idx = catCounters['5']++;
            id = `Scenario_5_${idx}`;
            name = `Scenario 5.${idx}: ${sc.data['ProductNode']} Comparative Parity Run`;
          }
          else if (sc.outline.includes('Currency Filtering Parity')) {
            const idx = catCounters['6']++;
            id = `Scenario_6_${idx}`;
            name = `Scenario 6.${idx}: Currency ${sc.data['CurrencyCode']} Comparative Parity Run`;
          }
          else if (sc.outline.includes('Numeric Economics Range Boundaries')) {
            const idx = catCounters['6']++;
            id = `Scenario_6_${idx}`;
            name = `Scenario 6.${idx}: ${sc.data['EconomicField']} Range Comparative Parity Run`;
          }
          else if (sc.outline.includes('Financial Attributes Search Parity')) {
            const idx = catCounters['6']++;
            id = `Scenario_6_${idx}`;
            name = `Scenario 6.${idx}: ${sc.data['CriteriaLabel']} Comparative Parity Run`;
          }

          return {
            id,
            name,
            gherkin: sc.gherkin,
            bddData: sc.data,
            status: 'NOT EXECUTED',
            notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
            gwtScreenshot: '',
            newUiScreenshot: '',
            gwtResultsScreenshot: '',
            newUiResultsScreenshot: '',
            mismatchesCount: 0,
            mismatches: {},
            matches: {}
          };
        });

        // Add Scenario 5 (UI Audit)
        mappedPool.push({
          id: 'Scenario_5',
          name: 'Scenario 5: Search Panel Visual Layout & Spelling Audit',
          gherkin: 'GIVEN: The user has logged into the OSTTRA Trade Blotter platform\nWHEN: The user compares the search criteria input fields on the GWT and ag-Grid panels\nTHEN: Both systems must render corresponding input fields with correct labels and spellings\nAND: All ag-Grid input fields must have adequate widths with zero layout distortion.',
          status: 'NOT EXECUTED',
          notExecutedReason: 'Bypassed in this targeted review run. Only focused on executing selected fields.',
          gwtScreenshot: '',
          newUiScreenshot: '',
          gwtResultsScreenshot: '',
          newUiResultsScreenshot: '',
          mismatchesCount: 0,
          mismatches: {},
          matches: {}
        });

        initialPool = mappedPool;
      } catch (err) {
        console.warn(`[ReportCompiler] Error parsing Gherkin markdown at ${BDD_FILE_PATH}: ${err.message}`);
      }
    } else {
      console.warn(`[ReportCompiler] BDD Feature File not found at: ${BDD_FILE_PATH}`);
    }

    // If the registry file already exists from an active run, we preserve completed states (survives worker-respawns)
    if (fs.existsSync(resultsPath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Dynamic Merge: Merge any existing completed states into our initialPool
        initialPool.forEach((scenario, idx) => {
          const matched = existingData.find(e => e.id === scenario.id);
          if (matched && matched.status !== 'NOT EXECUTED') {
            initialPool[idx] = matched; // Preserve completed status, screenshots, and audits
          }
        });

        // Keep any legacy scenarios from existingData that aren't in our new database registry (e.g. legacy direct specs)
        existingData.forEach(scenario => {
          if (!initialPool.some(e => e.id === scenario.id)) {
            initialPool.push(scenario);
          }
        });
        console.log('[ReportCompiler] Existing test registry resolved and dynamically merged.');
      } catch (err) {
        console.warn(`[ReportCompiler] Failed to parse existing registry: ${err.message}. Re-initializing.`);
      }
    }

    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(initialPool, null, 2));
    console.log('[ReportCompiler] Test registry initialized successfully inside run directory.');
  }

  /**
   * Updates the execution status and results for a specific scenario inside the registry.
   * 
   * @param {string} id - Scenario ID.
   * @param {Object} results - Results to merge.
   */
  static updateScenarioResult(id, results) {
    const resultsPath = this.getResultsPath();
    if (!fs.existsSync(resultsPath)) {
      this.initializeRegistry();
    }

    const pool = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
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
      fs.writeFileSync(resultsPath, JSON.stringify(pool, null, 2));
      console.log(`[ReportCompiler] Merged test results for scenario [${id}].`);
    } else {
      console.warn(`[ReportCompiler] Ignored result update. Unrecognized scenario ID: [${id}]`);
    }
  }

  /**
   * Compiles the test results database into a highly polished, two-fold HTML dashboard.
   */
  static compileHTMLReport() {
    const resultsPath = this.getResultsPath();
    if (!fs.existsSync(resultsPath)) {
      console.warn('[ReportCompiler] No results database found. Generating empty template.');
      this.initializeRegistry();
    }

    const pool = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const timestamp = new Date().toLocaleString();
    const runDir = this.getRunDir();
    const folderName = path.basename(runDir);

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
    <p>Last Compiled: ${timestamp} | Folder: ${folderName}</p>
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
      if (item.status === 'NOT EXECUTED') return; // Skip and exclude unexecuted/bypassed scenarios from the final report

      const statusClass = item.status.toLowerCase().replace(' ', '_');
      const badgeText = item.status;
      const nameContent = `<a href="${item.id}_detail.html" class="scenario-link">${item.name}</a>`;

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

    // Write Master Page inside the dynamic run directory
    fs.writeFileSync(this.getMasterHtmlPath(), masterHtml);
    console.log(`[ReportCompiler] Master checklist report written to: ${this.getMasterHtmlPath()}`);

    // Disabling root reports/ directory mirroring to ensure all generated reports 
    // strictly live inside their respective timestamped run directories.

    // ======================================================================
    // 🏛️ FOLD 2: DEDICATED DETAIL PAGES (Generate inside the dynamic run directory)
    // ======================================================================
    pool.forEach(item => {
      if (item.status === 'NOT EXECUTED') return;

      const statusClass = item.status.toLowerCase().replace(' ', '_');
      const detailHtmlPath = path.join(runDir, `${item.id}_detail.html`);

      // Dynamic row-count resolver
      let gwtCount = item.gwtRowsCount !== undefined ? item.gwtRowsCount : 0;
      let agCount = item.newUiRowsCount !== undefined ? item.newUiRowsCount : 0;
      
      let gwtTotal = item.gwtTotalTradeCount !== undefined && item.gwtTotalTradeCount !== null ? item.gwtTotalTradeCount : 'N/A';
      let agTotal = item.newUiTotalTradeCount !== undefined && item.newUiTotalTradeCount !== null ? item.newUiTotalTradeCount : 'N/A';

      // Fallback count parser for legacy/diagnostic visual check comparisons
      if (item.mismatches && item.mismatches["Query Status"]) {
        const qs = item.mismatches["Query Status"];
        if (qs.old && qs.old.includes('rows')) gwtCount = parseInt(qs.old) || 0;
        if (qs.new && qs.new.includes('rows')) agCount = parseInt(qs.new) || 0;
      }

      // Dynamic Assertion Alert Banner calculation
      let alertMessage = '';
      if (item.status === 'PASS') {
        alertMessage = `<strong>✅ Perfect Parity!</strong> Both legacy GWT and modern ag-Grid successfully loaded, reset, applied filter criteria, and scraped exactly matching transaction lists (<strong>${gwtCount} rows</strong>).`;
      } else {
        if (item.mismatches && item.mismatches['Execution Error']) {
          alertMessage = `<strong>⚠️ Setup Execution Error!</strong> The automated test steps were interrupted during setup or actions phase: <em>${item.mismatches['Execution Error'].new}</em>.`;
        } else if (gwtCount !== agCount) {
          alertMessage = `<strong>❌ Row Count Parity Mismatch!</strong> Legacy GWT Old UI retrieved <strong>${gwtCount} rows</strong>, but ag-Grid New UI retrieved <strong>${agCount} rows</strong>. This indicates a server-side replication delay or query filter criteria gap.`;
        } else {
          alertMessage = `<strong>❌ Cell-Level Parity Mismatch!</strong> Both GWT and ag-Grid returned identical data rows (<strong>${gwtCount} rows</strong>), but specific cells contain formatting or economic mismatches (detailed in the audit list below).`;
        }
      }

      // Dynamic BDD Parameter Grid construction
      let bddParamsHtml = '';
      if (item.bddData && Object.keys(item.bddData).length > 0) {
        bddParamsHtml += `
    <div class="section-title">BDD Parameter Values Applied (Runtime)</div>
    <div class="bdd-params-grid">`;
        Object.keys(item.bddData).forEach(key => {
          bddParamsHtml += `
      <div class="bdd-param-card">
        <div class="bdd-param-label">${key}</div>
        <div class="bdd-param-value">${item.bddData[key] || '(empty)'}</div>
      </div>`;
        });
        bddParamsHtml += `
    </div>`;
      }

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
    
    /* Scorecard layout styling */
    .scorecard-container {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .scorecard-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.01);
    }
    .scorecard-card.gwt { border-left: 5px solid #2b6cb0; }
    .scorecard-card.aggrid { border-left: 5px solid #4a5568; }
    .scorecard-card.status.pass { border-left: 5px solid #0ca678; background-color: #e6fcf5; }
    .scorecard-card.status.fail { border-left: 5px solid #f03e3e; background-color: #fff5f5; }
    
    .scorecard-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .scorecard-val {
      font-size: 24px;
      font-weight: 800;
      color: #2d3748;
    }
    .scorecard-card.status.pass .scorecard-val { color: #0ca678; }
    .scorecard-card.status.fail .scorecard-val { color: #f03e3e; }

    /* Alert Banner Layout */
    .alert-banner {
      padding: 15px 20px;
      border-radius: 6px;
      font-size: 15px;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .alert-banner.pass { background-color: #e6fcf5; border: 1px solid #c3fae8; color: #099268; }
    .alert-banner.fail { background-color: #fff5f5; border: 1px solid #ffe3e3; color: #c92a2a; }

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
    
    /* BDD Parameters styling */
    .bdd-params-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .bdd-param-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 15px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 4px rgba(0,0,0,0.01);
    }
    .bdd-param-label {
      font-size: 11px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .bdd-param-value {
      font-size: 15px;
      font-weight: 600;
      color: #2b6cb0;
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
    .screenshot-placeholder {
      display: none;
      align-items: center;
      justify-content: center;
      height: 250px;
      background: #f7fafc;
      color: #a0aec0;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      padding: 20px;
      border-top: 1px dashed #e2e8f0;
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

    <!-- ASSERTION PARITY SCORECARD PANEL -->
    <div class="scorecard-container" style="grid-template-columns: 1fr;">
      <div class="scorecard-card status ${statusClass}">
        <div class="scorecard-lbl">PARITY ASSERTION</div>
        <div class="scorecard-val">${item.status}</div>
      </div>
    </div>

    <!-- DATABASE QUERY PARITY SCORECARD PANEL -->
    <div class="scorecard-container" style="margin-top: -10px; margin-bottom: 25px; grid-template-columns: 1fr 1fr;">
      <div class="scorecard-card gwt" style="border-left: 5px solid #2b6cb0;">
        <div class="scorecard-lbl">GWT Header Trade Count (Total Matched)</div>
        <div class="scorecard-val" style="font-size: 20px;">${gwtTotal}</div>
      </div>
      <div class="scorecard-card aggrid" style="border-left: 5px solid #4a5568;">
        <div class="scorecard-lbl">ag-Grid Summary Trade Count (Total Matched)</div>
        <div class="scorecard-val" style="font-size: 20px;">${agTotal}</div>
      </div>
    </div>

    <!-- PARITY ASSERTION ALERT BANNER -->
    <div class="alert-banner ${statusClass}">
      ${alertMessage}
    </div>

    <div class="section-title">Plain English BDD Specification</div>
    <div class="gherkin-blockquote">${item.gherkin}</div>

    ${bddParamsHtml}

    <!-- FOUR SCREENSHOTS TWO-FOLD AUDITING LAYOUT -->
    <div class="section-title">1. Visual Inputs Auditing (Entered Values)</div>
    <div class="screenshot-grid">
      <div class="screenshot-box">
        <div class="screenshot-title">Old UI (GWT) Input State</div>
        <img src="${item.gwtScreenshot}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="window.open(this.src)" title="Click to enlarge GWT criteria">
        <div class="screenshot-placeholder">📸 Screenshot Bypassed (Bypass Fallback Active)</div>
      </div>
      <div class="screenshot-box">
        <div class="screenshot-title">New UI (ag-Grid) Input State</div>
        <img src="${item.newUiScreenshot}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="window.open(this.src)" title="Click to enlarge ag-Grid criteria">
        <div class="screenshot-placeholder">📸 Screenshot Bypassed (Bypass Fallback Active)</div>
      </div>
    </div>

    <div class="section-title">2. Visual Results Auditing (Scraped Grid Records)</div>
    <div class="screenshot-grid">
      <div class="screenshot-box">
        <div class="screenshot-title">Old UI (GWT) Grid Results</div>
        <img src="${item.gwtResultsScreenshot}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="window.open(this.src)" title="Click to enlarge GWT grid">
        <div class="screenshot-placeholder">📸 Screenshot Bypassed (Bypass Fallback Active)</div>
      </div>
      <div class="screenshot-box">
        <div class="screenshot-title">New UI (ag-Grid) Grid Results</div>
        <img src="${item.newUiResultsScreenshot}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="window.open(this.src)" title="Click to enlarge ag-Grid grid">
        <div class="screenshot-placeholder">📸 Screenshot Bypassed (Bypass Fallback Active)</div>
      </div>
    </div>

    <div class="section-title">3. Grid Data Row-by-Row Parity Audit</div>
    `;

      if (gwtCount === agCount && item.rowDetails && item.rowDetails.length > 0) {
        detailHtml += `
        <table class="audit-table">
          <thead>
            <tr>
              <th style="width: 8%;">Row</th>
              <th style="width: 25%;">Trade / Row ID</th>
              <th style="width: 52%;">Field-Level Comparison Diffs</th>
              <th style="width: 15%;">Row Parity</th>
            </tr>
          </thead>
          <tbody>`;

        item.rowDetails.forEach(row => {
          const rowClass = row.isMatch ? '' : 'mismatch';
          const rowStatus = row.isMatch 
            ? '<span class="audit-status match">✅ ROW MATCH</span>'
            : '<span class="audit-status mismatch">❌ ROW MISMATCH</span>';

          let diffContent = '';
          if (row.isMatch) {
            diffContent = `<div style="color: #0ca678; font-weight: 600; margin-bottom: 8px;">Perfect Row Match! (All ${row.matchesCount} fields match perfectly)</div>`;
            
            if (row.matches && Object.keys(row.matches).length > 0) {
              diffContent += `
                <details style="margin-top: 5px; font-size: 13px; color: #4a5568;">
                  <summary style="cursor: pointer; font-weight: 600; outline: none; color: #319795; user-select: none;">📁 View All ${row.matchesCount} Matched Fields</summary>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #2d3748; list-style-type: square; line-height: 1.4;">`;
              Object.keys(row.matches).forEach(field => {
                const matchVal = row.matches[field];
                diffContent += `<li><strong>${field}</strong>: <em>${matchVal.old}</em></li>`;
              });
              diffContent += `
                  </ul>
                </details>`;
            }
          } else {
            diffContent = '<div style="margin-bottom: 5px; font-weight: 600; color: #e53e3e;">Mismatched Fields:</div><ul style="margin: 0 0 10px 0; padding-left: 20px;">';
            Object.keys(row.mismatches).forEach(field => {
              const diff = row.mismatches[field];
              diffContent += `<li><strong>${field}</strong>: GWT="<em>${diff.old}</em>" vs ag-Grid="<em>${diff.new}</em>"</li>`;
            });
            diffContent += '</ul>';

            if (row.matches && Object.keys(row.matches).length > 0) {
              diffContent += `
                <details style="margin-top: 5px; font-size: 13px; color: #4a5568;">
                  <summary style="cursor: pointer; font-weight: 600; outline: none; color: #319795; user-select: none;">📁 View ${row.matchesCount} Matched Fields</summary>
                  <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #2d3748; list-style-type: square; line-height: 1.4;">`;
              Object.keys(row.matches).forEach(field => {
                const matchVal = row.matches[field];
                diffContent += `<li><strong>${field}</strong>: <em>${matchVal.old}</em></li>`;
              });
              diffContent += `
                  </ul>
                </details>`;
            }
          }

          detailHtml += `
            <tr class="${rowClass}">
              <td><strong>${row.rowIndex}</strong></td>
              <td><strong>${row.tradeId}</strong></td>
              <td>${diffContent}</td>
              <td>${rowStatus}</td>
            </tr>`;
        });

        detailHtml += `
          </tbody>
        </table>`;
      } else if (gwtCount !== agCount && gwtCount !== 'N/A' && agCount !== 'N/A') {
        // Prominent Row Count Mismatch warning and comparison bypass!
        detailHtml += `
        <div style="background-color: #fff9db; border: 1px solid #ffe066; color: #f59f00; padding: 20px; border-radius: 6px; font-size: 15px; font-weight: 600; line-height: 1.6; margin-top: 15px; margin-bottom: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.01);">
          ⚠️ Grid Data Cell Parity Comparison Bypassed: Row counts mismatch. 
          <br><span style="font-size: 14px; font-weight: normal; color: #495057;">Cell-by-cell comparison is bypassed because both interfaces retrieved different numbers of records (GWT loaded <strong>${gwtCount}</strong> rows, but ag-Grid loaded <strong>${agCount}</strong> rows). Cell parity audits are only mathematically valid when row counts are equal.</span>
        </div>`;
      } else {
        // Robust fallback flat layout for setup errors or legacy runs
        detailHtml += `
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
        if (item.mismatches && Object.keys(item.mismatches).length > 0) {
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
        if (item.matches && Object.keys(item.matches).length > 0) {
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
        </table>`;
      }

      detailHtml += `
  </div>

</body>
</html>`;

      fs.writeFileSync(detailHtmlPath, detailHtml);
      console.log(`[ReportCompiler] Detailed scenario sub-page written to: ${detailHtmlPath}`);
    });
  }

  /**
   * Cleans up the active run lock file at the end of the execution run.
   */
  static cleanStateLock() {
    if (fs.existsSync(STATE_LOCK_PATH)) {
      fs.unlinkSync(STATE_LOCK_PATH);
      console.log('[ReportCompiler] Active run state lock file cleaned.');
    }
  }
}

module.exports = {
  ReportCompiler
};
