const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { TestOrchestrator } = require('../src/pom/TestOrchestrator');
const { ReportCompiler } = require('../src/pom/ReportCompiler');
const { GwtBlotterPage } = require('../src/pom/GwtBlotterPage');
const { AgGridBlotterPage } = require('../src/pom/AgGridBlotterPage');

// Load the dynamic test pool (generated dynamically by 'npm run harvest')
const POOL_PATH = path.join(__dirname, '..', 'data', 'harvested_test_pool.json');
if (!fs.existsSync(POOL_PATH)) {
  throw new Error('[Test Boot] Harvested test data pool not found! Please run "node src/harvest_test_data.js" once to generate it.');
}

const testPool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

// Dynamic Configurations aligned to the harvested domain (DemoC)
const DOMAIN = testPool.environment || 'mtmc2.demo.markit.partners';
const LOGIN_URL = `https://${DOMAIN}/EQT/eauth/elogin.jsp`;
const OLD_UI_URL = `https://${DOMAIN}/EQT/ui/start.jsp#TradeBlotter:`;
const NEW_UI_URL = `https://${DOMAIN}/mtp-ui/#/app/trade/tradeblotter`;

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

/**
 * Shared authentication helper to establish the EQT Portal session cookie.
 */
async function loginToPortal(page) {
  console.log(`[Test Auth] Navigating to EQT Portal login page: ${LOGIN_URL}`);
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
  
  console.log('[Test Auth] Populating EQT Portal credentials...');
  await page.fill('input[type="text"], input[name*="user" i]', 'mw.demo');
  await page.fill('input[type="password"]', 'Password007');
  
  const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      submitBtn.click()
    ]);
  } else {
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }
  console.log('[Test Auth] Login successful. Session cookie initialized.');
}

test.describe('EQT Trade Blotter: Multi-Field Comparative Parity Suite', () => {

  test.beforeAll(async () => {
    // Initialize the Two-Fold Report Registry on startup.
    // Pre-registers all 5 standard Gherkin scenarios as 'NOT EXECUTED' inside a unique,
    // timestamped and environment-tagged folder (e.g. reports/run_2026-07-05_09-45-12_DemoC/).
    ReportCompiler.initializeRegistry(DOMAIN);
    ReportCompiler.compileHTMLReport();
  });

  test.afterAll(async () => {
    // Clean up the active run lock file at the end of the entire test execution run.
    // Commented out to prevent premature lock deletion during Playwright worker restarts on test failures.
    // ReportCompiler.cleanStateLock();
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate once before executing each scenario.
    await loginToPortal(page);
  });

  /**
   * ======================================================================
   * 📋 SCENARIO 1: TRADE ID ISOLATED LOOKUP
   * ======================================================================
   */
  test('Scenario 1 (Trade ID): Isolated Field Test for Trade ID', async ({ page }) => {
    const tradeId = testPool.tradeIds[0] || 'IFS_ALCT_05062026';
    await TestOrchestrator.runComparison(page, {
      id: 'Scenario_1',
      domain: DOMAIN,
      fieldLabel: 'Trade ID',
      value: tradeId
    });
  });

  /**
   * ======================================================================
   * 📋 SCENARIO 2: DEAL ID ISOLATED LOOKUP
   * ======================================================================
   */
  test('Scenario 2 (Deal ID): Isolated Field Test for Deal ID', async ({ page }) => {
    const dealId = testPool.dealIds[0] || 'IFS_ALCT_05062026';
    await TestOrchestrator.runComparison(page, {
      id: 'Scenario_2',
      domain: DOMAIN,
      fieldLabel: 'Deal ID',
      value: dealId
    });
  });

  /**
   * ======================================================================
   * 📋 SCENARIO 3: TRADE DATE RANGE FILTERS
   * ======================================================================
   */
  test('Scenario 3 (Trade Date): Isolated Date Range Filtering Parity', async ({ page }) => {
    const targetDate = testPool.tradeDates[0] || '30-Jun-2026';
    await TestOrchestrator.runComparison(page, {
      id: 'Scenario_3',
      domain: DOMAIN,
      fieldLabel: 'Trade Date',
      fromValue: targetDate,
      toValue: targetDate
    });
  });

  /**
   * ======================================================================
   * 📋 SCENARIO 4: ACCOUNT NUMBER FILTERS
   * ======================================================================
   */
  test('Scenario 4 (Account): Isolated Account Number Filtering Parity', async ({ page }) => {
    const targetAccount = testPool.accounts.find(acc => acc !== '') || 'Block';
    await TestOrchestrator.runComparison(page, {
      id: 'Scenario_4',
      domain: DOMAIN,
      fieldLabel: 'Account Number',
      value: targetAccount
    });
  });

  /**
   * ======================================================================
   * 📋 SCENARIO 5: SEARCH PANEL VISUAL LAYOUT & SPELLING AUDIT
   * ======================================================================
   */
  test('Scenario 5 (UI Audit): Search Panel Visual Layout & Spelling Audit', async ({ page }) => {
    // 1. GWT Old UI Phase
    console.log('\n--- STARTING OLD UI (GWT) SEARCH PANEL AUDIT ---');
    const oldBlotter = new GwtBlotterPage(page);
    await oldBlotter.navigate(OLD_UI_URL);
    await oldBlotter.expandCriteria();
    await oldBlotter.resetCriteria();

    const runDir = ReportCompiler.getRunDir();

    // Capture full-page visual screenshot of GWT criteria panel inside the run folder
    const gwtCriteriaPath = path.join(runDir, 'Scenario_5_gwt_criteria.png');
    await page.screenshot({ path: gwtCriteriaPath });
    console.log('[Old UI GWT] Captured GWT criteria panel screenshot.');

    // Extract GWT labels and their bounding dimensions
    const gwtLabels = await oldBlotter.getFrame().then(frame => frame.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td[class*="Label"]'));
      return cells.map(cell => {
        const text = cell.textContent.trim().replace(/:/g, '');
        const rect = cell.getBoundingClientRect();
        return { text, width: Math.round(rect.width), height: Math.round(rect.height) };
      }).filter(item => item.text.length > 2 && item.text.length < 50 && !item.text.includes('\n') && !item.text.includes('Show'));
    }));

    // 2. ag-Grid New UI Phase
    console.log('\n--- STARTING NEW UI (ag-Grid) SEARCH PANEL AUDIT ---');
    const newBlotter = new AgGridBlotterPage(page);
    await newBlotter.navigate(NEW_UI_URL);
    await newBlotter.expandAllCriteria();
    await newBlotter.resetCriteria();
    await newBlotter.expandAllCriteria();

    // Capture full-page visual screenshot of New UI criteria panel inside the run folder
    const newCriteriaPath = path.join(runDir, 'Scenario_5_new_ui_criteria.png');
    await page.screenshot({ path: newCriteriaPath });
    console.log('[New UI ag-Grid] Captured New UI criteria panel screenshot.');

    // Extract New UI labels and their bounding dimensions
    const newLabels = await page.evaluate(() => {
      const labelEls = Array.from(document.querySelectorAll('label.field-label, .card-label, label'));
      return labelEls.map(el => {
        const text = el.textContent.trim().replace(/:/g, '');
        const rect = el.getBoundingClientRect();
        return { text, width: Math.round(rect.width), height: Math.round(rect.height) };
      }).filter(item => item.text.length > 2 && item.text.length < 50);
    });

    // 3. Spelling, Casing, and Layout Distortion Auditing
    console.log('\n--- PERFORMING SPELLING, CASING & LAYOUT AUDIT ---');
    const matches = {};
    const mismatches = {};

    gwtLabels.forEach(gwt => {
      // Find matching label in ag-Grid by fuzzy contains or exact match
      const matchingNew = newLabels.find(n => 
        n.text.toUpperCase() === gwt.text.toUpperCase() || 
        n.text.toUpperCase().includes(gwt.text.toUpperCase()) || 
        gwt.text.toUpperCase().includes(n.text.toUpperCase())
      );
      
      if (matchingNew) {
        // Spelling & Casing Check
        if (gwt.text !== matchingNew.text) {
          mismatches[`Field spelling of [${gwt.text}]`] = {
            old: `GWT: "${gwt.text}"`,
            new: `ag-Grid: "${matchingNew.text}"`
          };
        } else {
          matches[gwt.text] = {
            old: `Label: "${gwt.text}" (GWT width: ${gwt.width}px)`,
            new: `Label: "${matchingNew.text}" (ag-Grid width: ${matchingNew.width}px)`
          };
        }

        // Layout Distortion / UX Check
        if (matchingNew.width < 35) {
          mismatches[`Layout Distortion on [${matchingNew.text}]`] = {
            old: `Layout is healthy`,
            new: `DISTORTED! Label width is too narrow (${matchingNew.width}px). Potential text clipping!`
          };
        }
      } else {
        // Missing Field Check
        const skipGwtTexts = ['SAVE', 'CANCEL', 'EDIT', 'RESET', 'APPLY'];
        const isControl = skipGwtTexts.some(t => gwt.text.toUpperCase().includes(t));
        if (!isControl) {
          mismatches[`Field presence of [${gwt.text}]`] = {
            old: 'Present in GWT Old UI',
            new: 'MISSING in ag-Grid New UI! Potential migration gap.'
          };
        }
      }
    });

    // 4. Capture Results and Compile Sub-Page HTML Report
    ReportCompiler.updateScenarioResult('Scenario_5', {
      status: Object.keys(mismatches).length === 0 ? 'PASS' : 'FAIL',
      mismatchesCount: Object.keys(mismatches).length,
      mismatches,
      matches
    });
    ReportCompiler.compileHTMLReport();

    // Copy screenshots over to results image slots inside the dynamic run directory
    fs.copyFileSync(gwtCriteriaPath, path.join(runDir, 'Scenario_5_gwt_results.png'));
    fs.copyFileSync(newCriteriaPath, path.join(runDir, 'Scenario_5_new_ui_results.png'));

    console.log(`[UI Audit] Completed. Found ${Object.keys(mismatches).length} visual layout or spelling discrepancies.`);
    
    // Soft assert
    expect(Object.keys(mismatches).length).toBeLessThan(20);
  });
});
