const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Resolve Target Environment Domain (DemoC / DemoB / UAT)
let DOMAIN = 'mtmb2.demo.markit.partners';
if (process.env.BLOTTER_ENV) {
  const envUpper = process.env.BLOTTER_ENV.toUpperCase();
  if (envUpper.includes('DEMOB')) DOMAIN = 'mtmb2.demo.markit.partners';
  else if (envUpper.includes('DEMOC')) DOMAIN = 'mtmc2.demo.markit.partners';
  else if (envUpper.includes('UAT')) DOMAIN = 'mtmuat2.demo.markit.partners';
  else DOMAIN = process.env.BLOTTER_ENV;
}

const OLD_UI_URL = `https://${DOMAIN}/EQT/ui/start.jsp#TradeBlotter:`;

test.describe('EQT Trade Blotter: XPath Harvester', () => {

  test('Harvest GWT Old UI relative XPaths natively inside browser context', async ({ page }) => {
    // 1. Authenticate and log in
    const loginUrl = `https://${DOMAIN}/EQT/eauth/elogin.jsp`;
    console.log(`[Harvester] Navigating and logging in on: ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    const userField = page.locator('input[type="text"], input[name*="user" i]').first();
    if (await userField.isVisible()) {
      await userField.fill('mw.demo');
      await page.fill('input[type="password"]', 'Password007');
      await page.click('input[type="submit"], button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    }
    console.log('[Harvester] Login successful.');

    // 2. Load GWT Old UI and stabilize
    console.log(`[Harvester] Navigating to GWT Old UI: ${OLD_UI_URL}...`);
    await page.goto(OLD_UI_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000); // 5s stable buffer

    // Resolve active frame
    let frame = page.frames().find(f => f.name() === 'frame_0');
    if (frame) {
      const hasCriteria = await frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').count().catch(() => 0);
      if (hasCriteria === 0) {
        frame = page.mainFrame();
      }
    } else {
      frame = page.mainFrame();
    }
    console.log(`[Harvester] Active GWT frame resolved: [${frame.url()}].`);

    // Expand basic & extended criteria panel
    console.log('[Harvester] Expanding GWT criteria panels...');
    const showCriteriaBtn = frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').first();
    if (await showCriteriaBtn.isVisible().catch(() => false)) {
      await showCriteriaBtn.click();
      await page.waitForTimeout(2000);
    }
    const showAllBtn = frame.locator('//a[contains(text(), "Show All Criteria")]').first();
    if (await showAllBtn.isVisible().catch(() => false)) {
      await showAllBtn.click();
      await page.waitForTimeout(2000);
    }

    // 3. Scan DOM and harvest robust XPaths for all fields browser-side
    console.log('[Harvester] Scanning GWT DOM and harvesting robust relative XPaths...');
    const xpathMapping = await frame.evaluate(() => {
      const fields = [
        'Trade ID', 'Deal ID', 'Account Number', 'Bunched Order Block MW ID', 'Counterparty Trade ID', 'Counterparty Deal ID', 'Counterparty Allocation Deal ID', 'Selective Netting ID', 'Netting String', 'Clearing House Trade ID', 'USI', 'USI Issuer', 'Cleared Trade USI', 'Cleared Trade USI Issuer', 'DTCC Warehouse TRI', 'Associated Trade Id', 'Block SEF Trade ID', 'Block USI', 'Block USI Issuer', 'Block UTI', 'Block UTI Issuer', 'SEF Trade ID', 'Package Name', 'Package ID', 'Match Id', 'My Replaced Trade Id', 'Post Clearing Batch ID', 'Post Clearing Activity Type', 'Post Clearing Sub-Category', 'Deal ID(PDF Digitized)', 'Trade ID(PDF Digitized)', 'Package Trade Identifier', 'Multi Deal Id', 'UPI', 'Trade Date', 'Settle Date', 'Maturity Date', 'Last Activity Date', 'Creation Date', 'Execution Date', 'Expiry Date', 'Strike Date', 'CCP Upfront Fee Settlement Date', 'Workflow', 'Clearing Status', 'Transaction Type', 'Currency', 'Document Status', 'Novation Status', 'Transaction Acceptance Status', 'Product', 'My Product Type ID',
        'Cancellable Option', 'Comments', 'Confirm Id', 'Description', 'Direction', 'Fee', 'Fixed Rate', 'Independent Amount', 'Initial Price', 'Notional', '# of Shares/Options', 'Primary Asset Class', 'Put/Call', 'Strategy', 'Strike Price', 'Trader Initials', 'Sub Account Number', '2nd leg (call) notional', '2nd leg (call) currency', 'Purchase Price', 'Repurchase Price', 'Purchase Security Nominal', 'Purchase Security Quantity', 'Product Sub-Type', 'Fee/Premium Direction', 'Straddle', 'Settlement Currency', 'Transaction Sub-Type / Amendment Type'
      ];

      const mapping = {};

      fields.forEach(fieldLabel => {
        const cleanLabel = fieldLabel.trim().toLowerCase();
        
        // Find the cell containing the text
        const cells = Array.from(document.querySelectorAll('td, th'));
        const cell = cells.find(c => {
          const txt = c.textContent.trim().replace(/\s+/g, ' ').toLowerCase();
          return txt === cleanLabel || txt === cleanLabel + ':' || txt.startsWith(cleanLabel + ' ');
        });

        if (cell) {
          // Find parent rows (inner and outer if nested)
          let tr = cell.closest('tr');
          let outerTr = tr;
          
          // GWT nested table check: If parent of tr is inside another table, step up to find the main outer tr row
          const parentTable = tr.closest('table');
          if (parentTable) {
            const wrapperCell = parentTable.closest('td, th');
            if (wrapperCell) {
              const wrapperTr = wrapperCell.closest('tr');
              if (wrapperTr) {
                outerTr = wrapperTr;
              }
            }
          }

          // Exact equality matching after translating non-breaking space to standard space!
          const safeLabel = fieldLabel.replace(/"/g, '\\"');
          // Physical literal non-breaking space character inside browser JS context
          const nbs = String.fromCharCode(160);
          
          // Base row selector: Exact equality check on translated text, restricted to filterFields table
          const baseRowXPath = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//tr[td[not(.//td) and not(.//th) and (translate(normalize-space(.), "${nbs}", " ") = "${safeLabel}" or translate(normalize-space(.), "${nbs}:", " ") = "${safeLabel}" or translate(normalize-space(.), "${nbs}", " ") = "${safeLabel}:")] or th[not(.//td) and not(.//th) and (translate(normalize-space(.), "${nbs}", " ") = "${safeLabel}" or translate(normalize-space(.), "${nbs}:", " ") = "${safeLabel}" or translate(normalize-space(.), "${nbs}", " ") = "${safeLabel}:")]]`;

          // Check if there is an activation checkbox (excluding Contains)
          const checkboxes = Array.from(outerTr.querySelectorAll('input[type="checkbox"]'));
          let activationCheckboxXPath = null;
          let containsCheckboxXPath = null;

          if (checkboxes.length > 0) {
            // Leftmost activation checkbox is the first checkbox in the row
            const firstCb = checkboxes[0];
            const isContains = (firstCb.closest('span, td')?.title || '').toLowerCase().includes('contains') || 
                               (firstCb.closest('span, td')?.textContent || '').toLowerCase().includes('contains');
            
            if (!isContains) {
              activationCheckboxXPath = `${baseRowXPath}//input[@type="checkbox"][1]`;
            }

            // Contains checkbox has title Contains or next to "Contains"
            const containsCb = checkboxes.find(cb => {
              const text = (cb.closest('span, td')?.title || cb.closest('span, td')?.textContent || '').toLowerCase();
              return text.includes('contains');
            });
            if (containsCb) {
              const idx = checkboxes.indexOf(containsCb) + 1;
              containsCheckboxXPath = `${baseRowXPath}//input[@type="checkbox"][${idx}]`;
            }
          }

          // Input Textbox: Match input elements not type="checkbox"
          const inputs = Array.from(outerTr.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"])'));
          const textboxes = [];
          inputs.forEach((inp, idx) => {
            textboxes.push(`${baseRowXPath}//input[not(@type="checkbox")][${idx + 1}]`);
          });

          // Dropdown / Edit link
          const editLink = Array.from(outerTr.querySelectorAll('.multiEditLink, a')).find(el => el.textContent.trim().toLowerCase() === 'edit');
          let editLinkXPath = null;
          if (editLink) {
            editLinkXPath = `${baseRowXPath}//a[contains(@class, "multiEditLink") or contains(text(), "Edit")]`;
          }

          mapping[fieldLabel] = {
            found: true,
            labelNodeText: cell.textContent.trim(),
            baseRowXPath,
            textboxes,
            activationCheckboxXPath,
            containsCheckboxXPath,
            editLinkXPath
          };
        } else {
          mapping[fieldLabel] = {
            found: false,
            message: `Label cell for [${fieldLabel}] not found in GWT frame DOM.`
          };
        }
      });

      return mapping;
    });

    const outPath = path.join(__dirname, '..', 'data', 'demob_gwt_xpaths.json');
    fs.writeFileSync(outPath, JSON.stringify(xpathMapping, null, 2));
    console.log(`[Harvester] Successfully harvested and saved DemoB GWT relative XPaths to: ${outPath}`);
    console.log('[Harvester] === HARVEST COMPLETE ===');
  });

});
