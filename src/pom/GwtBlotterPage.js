const { fillGWTInput } = require('./GwtUtils');
const GWT_XPATHS = require('../../data/demob_gwt_xpaths.json');

const GWT_CHECKBOX_OPTIONS = {
  "Workflow": ["Clearing", "Confirmations", "Novations", "Paper"],
  "Currency": ["AUD", "BRL", "CAD", "CHF", "CZK", "EUR", "GBP", "HKD", "HUF", "ILS", "INR", "JPY", "MXN", "NOK", "NZD", "PLN", "SEK", "SGD", "TRY", "USD", "ZAR"],
  "Document Status": ["All Internal", "Doc(s) Recv'd", "Req. Revision", "Intermediate", "Signatory", "Approved", "Addn'l Intermediate", "Awaiting Add Signatory", "Counterparty", "Doc(s) Req'd", "Add. Doc(s) Req'd", "Disputed", "Executed", "Closed"],
  "Novation Status": ["Awaiting Reply: STP", "Cancelled", "Complete: STP", "Disputed: STP", "EE Approved: STP", "Error: STP", "Granted: MTM Email", "Granted: Offline Consent", "Overdue: STP", "Pending: STP", "RP Consented: STP", "Refused: MTM Email", "Refused: Offline Consent", "Refused: STP", "Requested: MTM Email", "Requested: STP"],
  "Transaction Acceptance Status": ["Accepted", "Rejected", "Pending"],
  "Clearing Status": ["Intended for Clearing", "Ready For Clearing", "Clearing Pending", "Cleared", "Clearing Rejected"],
  "Transaction Type": ["New", "Assignment", "Part. Asgm", "Full Asgm", "Amendment", "Termination", "Part. Term", "Full Term", "Exercise", "Part. Exercise", "Full Exercise", "Cancel", "Expiry", "Exit", "Extension", "Rerate", "Substitution", "Increase"]
};

/**
 * Page Object Model representing the legacy GWT-based Trade Blotter (Old UI).
 * Employs dynamic frame resolution, 100% dynamic waiting, and label-based relative locator XPaths.
 */
class GwtBlotterPage {
  /**
   * @param {import('playwright').Page} page - The main Playwright Page instance.
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Dynamically resolves and returns the active GWT frame context that contains the GWT content on demand.
   * Prioritizes the GWT iframe container (frame_0) only if it actually contains the active criteria elements,
   * otherwise falls back dynamically to the main/root frame context to handle DemoB.
   * 
   * @returns {Promise<import('playwright').Frame>}
   */
  async getFrame() {
    // 1. Check if GWT criteria elements reside directly inside frame_0 (standard GWT iframe on DemoC)
    const frame0 = this.page.frames().find(f => f.name() === 'frame_0');
    if (frame0) {
      // Wait up to 10 seconds for GWT assets to become active inside frame_0 before making a decision
      const isGwtReady = await Promise.race([
        frame0.locator('.showCriteriaLink, a:has-text("Show Criteria")').waitFor({ state: 'attached', timeout: 10000 }).then(() => true).catch(() => false),
        frame0.locator('#showCriteriaLink, .filterFields, .criteria').waitFor({ state: 'attached', timeout: 10000 }).then(() => true).catch(() => false)
      ]);
      if (isGwtReady) {
        return frame0;
      }
    }

    // 2. Check if GWT criteria elements reside directly inside the main/root frame context first (standard on DemoB)
    const hasCriteriaOnMain = await this.page.locator('.showCriteriaLink, a:has-text("Show Criteria")').count().catch(() => 0);
    if (hasCriteriaOnMain > 0) {
      return this.page.mainFrame();
    }

    // 3. Scan all other subframes to see if GWT criteria elements are present inside any of them
    for (const f of this.page.frames()) {
      const hasCriteria = await f.locator('.showCriteriaLink, a:has-text("Show Criteria")').count().catch(() => 0);
      if (hasCriteria > 0) {
        return f;
      }
    }
    
    // Default to main frame
    return this.page.mainFrame();
  }

  /**
   * Navigates to the GWT Trade Blotter Old UI and dynamically waits for frame stabilization.
   * 
   * @param {string} url - The target Old UI url.
   */
  async navigate(url) {
    console.log(`[GwtBlotterPage] Navigating to GWT Old UI: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('[GwtBlotterPage] Waiting dynamically for GWT frame_0 to become active...');
    const frame = await this.getFrame();
    
    // Dynamically wait for GWT's criteria panel link to appear
    const expandLink = frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').first();
    try {
      await expandLink.waitFor({ state: 'attached', timeout: 30000 });
    } catch (err) {
      console.log('--- DEBUG GWT Old UI NAVIGATION TIMEOUT ---');
      console.log('Active Page URL:', this.page.url());
      const bodyHtml = await frame.evaluate(() => document.body.innerHTML).catch(() => 'Failed to retrieve HTML');
      console.log('Frame HTML:', bodyHtml.substring(0, 1500));
      throw err;
    }
    console.log('[GwtBlotterPage] GWT frame successfully stabilized.');
  }

  /**
   * Programmatically expands GWT criteria panels, waiting dynamically for elements to appear.
   * Safe against double-expansion (prevents collapsing the panel if already visible).
   */
  async expandCriteria() {
    const frame = await this.getFrame();
    
    // Check if the GWT criteria panel is already expanded by checking the text of the toggle link (contains "Hide" if expanded)
    const isAlreadyExpanded = await frame.evaluate(() => {
      const link = document.querySelector('.showCriteriaLink, a[class*="showCriteria"]');
      return link && link.textContent.trim().toLowerCase().includes('hide');
    }).catch(() => false);

    if (isAlreadyExpanded) {
      console.log('[GwtBlotterPage] GWT criteria panel is already expanded and visible.');
      return;
    }

    console.log('[GwtBlotterPage] Expanding basic GWT criteria panel...');
    
    const showCriteriaBtn = frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').first();
    if (await showCriteriaBtn.isVisible().catch(() => false)) {
      console.log('[GwtBlotterPage] Clicking Show Criteria...');
      await showCriteriaBtn.click();
      await this.page.waitForTimeout(2000); // 2s basic slide transition buffer
    }

    console.log('[GwtBlotterPage] Expanding extended GWT criteria panel...');
    const showAllBtn = frame.locator('//a[contains(text(), "Show All Criteria")]').first();
    // Wait dynamically up to 5s for the Show All Criteria link to appear after basic expansion
    await showAllBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await showAllBtn.isVisible().catch(() => false)) {
      console.log('[GwtBlotterPage] Clicking Show All Criteria...');
      await showAllBtn.click();
      await this.page.waitForTimeout(3000); // 3s extended slide transition buffer
    }
  }

  /**
   * Resets GWT filters natively using the framework Reset controls.
   */
  async resetCriteria() {
    const frame = await this.getFrame();
    console.log('[GwtBlotterPage] Resetting active filters natively on Old UI...');
    
    const oldResetButton = frame.locator('button.resetButton:has-text("Reset"), button:has-text("Reset")').first();
    if (await oldResetButton.isVisible()) {
      await oldResetButton.click();
      await this.page.waitForTimeout(3000);
    } else {
      const oldResetLink = frame.locator('a:has-text("Reset")').first();
      if (await oldResetLink.isVisible()) {
        await oldResetLink.click();
        await this.page.waitForTimeout(3000);
      }
    }
    console.log('[GwtBlotterPage] GWT native criteria reset completed and stabilized.');
  }

  /**
   * Translates ag-Grid criteria field labels to native GWT criteria row labels.
   * Handles discrepancies like "Workflow" -> "ClearingConfirmationsNovationsPaper" and "Bunched Order Block MW ID" -> "Block MW ID".
   * 
   * @param {string} label - The input/ag-Grid search label.
   * @returns {string} The translated GWT row label.
   */
  translateLabel(label) {
    const translations = {
      "Bunched Order Block MW ID": "Block MW ID",
      "Account Number": "Account"
    };
    const env = (process.env.BLOTTER_ENV || 'DemoB').toUpperCase();
    if (label === "Fixed Rate (1st Leg Rate)") {
      if (env.includes('DEMOC')) {
        return "Fixed Rate (%)";
      } else {
        return "Fixed Rate";
      }
    }
    if (label === "Workflow") {
      if (env.includes('DEMOC')) {
        return "Confirmations";
      } else {
        return "Workflow";
      }
    }
    return translations[label] || label;
  }

  /**
   * Precise GWT row locator that matches rows starting exactly with rowLabel
   * (or its translated form) to eliminate substring label collisions.
   * Leverages bottom-up /ancestor::tr[1] traversal from the innermost td cell,
   * filtering strictly for visible rows to avoid hidden basic criteria clones.
   * 
   * @param {string} rowLabel - The target row label.
   * @returns {Promise<import('playwright').Locator>} Playwright locator for GWT <tr> row.
   */
  async getRowLocator(rowLabel) {
    const frame = await this.getFrame();
    const cleanLabel = rowLabel.trim().toLowerCase();
    
    // 1. Target td/th cells strictly inside GWT's criteria fields table, selecting the immediate following td sibling containing the controls
    const xpathLabelCell = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//td[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${cleanLabel}")] | //table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//th[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${cleanLabel}")]`;
    const loc = frame.locator(xpathLabelCell).filter({ visible: true });
    const count = await loc.count().catch(() => 0);
    if (count > 0) {
      return loc.first().locator('xpath=./following-sibling::td[1]');
    }
    
    // 2. Translated label starts-with
    const translated = this.translateLabel(rowLabel).trim().toLowerCase();
    const xpathTranslatedCell = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//td[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${translated}")] | //table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//th[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${translated}")]`;
    const locTrans = frame.locator(xpathTranslatedCell).filter({ visible: true });
    const countTrans = await locTrans.count().catch(() => 0);
    if (countTrans > 0) {
      return locTrans.first().locator('xpath=./following-sibling::td[1]');
    }
    
    // 3. Safety Fallback (broadest contains matching on innermost td/th inside criteria table)
    const xpathFallbackCell = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//td[not(.//td) and not(.//th) and contains(normalize-space(.), "${rowLabel}")] | //table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//th[not(.//td) and not(.//th) and contains(normalize-space(.), "${rowLabel}")]`;
    const locFallback = frame.locator(xpathFallbackCell).filter({ visible: true });
    const countFallback = await locFallback.count().catch(() => 0);
    if (countFallback > 0) {
      return locFallback.first().locator('xpath=./following-sibling::td[1]');
    }

    // Ultimate fallback back to the original ancestor tr logic
    const xpathOriginalTr = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//td[not(.//td) and not(.//th) and contains(normalize-space(.), "${rowLabel}")]/ancestor::tr[td//input or th//input or td//select or th//select or td//a or th//a][1]`;
    return frame.locator(xpathOriginalTr).filter({ visible: true }).first();
  }

  /**
   * Helper to locate GWT input elements using label-based relative XPaths.
   * Leverages innermost cell matching to filter out GWT outer nested table layout containers.
   * 
   * @param {string} rowLabel - The exact text label of the row (e.g., 'Trade ID', 'Deal ID', 'Account Number').
   * @param {number} [index=0] - The index of the input inside the targeted row.
   * @returns {Promise<import('playwright').Locator>}
   */
  async getFieldInputLocator(rowLabel, index = 0) {
    const translatedLabel = this.translateLabel(rowLabel);
    
    // Bounds check: if index > 0, make sure GWT's row actually has more than index textboxes, otherwise return null
    if (index > 0) {
      const row = await this.getRowLocator(translatedLabel).catch(() => null);
      if (row) {
        const totalInputs = await row.locator('input:not([type="checkbox"]):not([type="hidden"])').filter({ visible: true }).count().catch(() => 0);
        if (totalInputs > 0 && index >= totalInputs) {
          console.log(`[GwtBlotterPage] Field [${translatedLabel}] has only ${totalInputs} inputs. Requested index ${index} is out of bounds.`);
          return null;
        }
      }
    }

    const fieldData = GWT_XPATHS[rowLabel];
    if (fieldData && fieldData.found && fieldData.baseRowXPath) {
      const frame = await this.getFrame();
      const row = frame.locator(`xpath=${fieldData.baseRowXPath}`).filter({ visible: true }).first();
      
      const classSelector = 'input.dateLabel, input.exactRangeDataLabel, input.extendedexactRangeDataLabel';
      const classLocator = row.locator(classSelector).filter({ visible: true });
      const count = await classLocator.count().catch(() => 0);
      if (count > index) {
        return classLocator.nth(index);
      }
      
      const fallbackLocator = row.locator('input:not([type="checkbox"]):not([type="hidden"])').filter({ visible: true });
      const fallbackCount = await fallbackLocator.count().catch(() => 0);
      if (fallbackCount > index) {
        return fallbackLocator.nth(fallbackCount > 1 && index === 0 ? 1 : index);
      }
    }

    const row = await this.getRowLocator(rowLabel);
    
    // 1. Direct high-precision GWT input class-name targeting (filters out GWT structural/dummy focus-tracking inputs)
    const classSelector = 'input.dateLabel, input.exactRangeDataLabel, input.extendedexactRangeDataLabel';
    const classLocator = row.locator(classSelector).filter({ visible: true });
    const count = await classLocator.count().catch(() => 0);
    
    if (count > 0) {
      return classLocator.nth(index);
    }
    
    // 2. Failsafe fallback (general non-checkbox inputs, using index 1 as the primary text box, or 0 if only one exists)
    const fallbackLocator = row.locator('input:not([type="checkbox"]):not([type="hidden"])').filter({ visible: true });
    const fallbackCount = await fallbackLocator.count().catch(() => 0);
    if (fallbackCount > 1) {
      return fallbackLocator.nth(1 + index);
    }
    return fallbackLocator.first();
  }

  /**
   * Automatically checks the activation checkbox on the left of a GWT criteria row to ensure the filter is active.
   * 
   * @param {string} rowLabel - e.g. "Product"
   */
  async activateRowCheckbox(rowLabel) {
    const fieldData = GWT_XPATHS[rowLabel];
    if (fieldData && fieldData.found && fieldData.activationCheckboxXPath) {
      const frame = await this.getFrame();
      const cb = frame.locator(`xpath=${fieldData.activationCheckboxXPath}`).first();
      const count = await cb.count().catch(() => 0);
      if (count > 0) {
        const isChecked = await cb.isChecked().catch(() => false);
        if (!isChecked) {
          console.log(`[GwtBlotterPage] Activating GWT checkbox for row [${rowLabel}] via harvested XPath...`);
          const handle = await cb.elementHandle();
          if (handle) {
            await frame.evaluate((cbEl) => {
              if (!cbEl.checked) {
                cbEl.click();
                cbEl.dispatchEvent(new Event('focus', { bubbles: true }));
                cbEl.dispatchEvent(new Event('input', { bubbles: true }));
                cbEl.dispatchEvent(new Event('change', { bubbles: true }));
                cbEl.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }, handle).catch(() => {});
          }
          await this.page.waitForTimeout(500);
        }
      }
      return;
    }

    const row = await this.getRowLocator(rowLabel);
    // Locate the first checkbox inside the GWT row
    const checkboxLocator = row.locator('input[type="checkbox"]').first();
    const count = await checkboxLocator.count().catch(() => 0);
    if (count > 0) {
      // Use browser-side evaluation to check if the checkbox is the leftmost row-activation checkbox (and NOT a Contains checkbox)
      const shouldClick = await checkboxLocator.evaluate((cb) => {
        const parent = cb.closest('.gwt-CheckBox, span, label, td');
        if (parent) {
          const txt = parent.textContent.trim().toLowerCase();
          const title = (parent.title || '').trim().toLowerCase();
          const className = (parent.className || '').trim().toLowerCase();
          // If the parent has "contains" or "exactmatch" in text/title/class, it is NOT the leftmost activation checkbox!
          if (txt.includes('contains') || title.includes('contains') || className.includes('exactmatch') || className.includes('contains')) {
            return false;
          }
        }
        return !cb.checked;
      }).catch(() => false);

      if (shouldClick) {
        console.log(`[GwtBlotterPage] Activating GWT checkbox for row [${rowLabel}]...`);
        const handle = await checkboxLocator.elementHandle();
        if (handle) {
          const frame = await this.getFrame();
          await frame.evaluate((cb) => {
            // Find the visible clickable parent container or click the checkbox directly
            const parent = cb.closest('.gwt-CheckBox, span, label') || cb;
            parent.click();
            cb.dispatchEvent(new Event('focus', { bubbles: true }));
            cb.dispatchEvent(new Event('input', { bubbles: true }));
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            cb.dispatchEvent(new Event('blur', { bubbles: true }));
          }, handle).catch(() => {});
        }
        await this.page.waitForTimeout(500);
      }
    }
  }

  async deactivateRowCheckbox(rowLabel) {
    const fieldData = GWT_XPATHS[rowLabel];
    if (fieldData && fieldData.found && fieldData.activationCheckboxXPath) {
      const frame = await this.getFrame();
      const cb = frame.locator(`xpath=${fieldData.activationCheckboxXPath}`).first();
      const count = await cb.count().catch(() => 0);
      if (count > 0) {
        const isChecked = await cb.isChecked().catch(() => false);
        if (isChecked) {
          console.log(`[GwtBlotterPage] Deactivating GWT checkbox for row [${rowLabel}] via harvested XPath...`);
          const handle = await cb.elementHandle();
          if (handle) {
            await frame.evaluate((cbEl) => {
              if (cbEl.checked) {
                cbEl.checked = false;
                cbEl.click();
                cbEl.dispatchEvent(new Event('focus', { bubbles: true }));
                cbEl.dispatchEvent(new Event('input', { bubbles: true }));
                cbEl.dispatchEvent(new Event('change', { bubbles: true }));
                cbEl.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }, handle).catch(() => {});
          }
          await this.page.waitForTimeout(500);
        }
      }
      return;
    }

    const row = await this.getRowLocator(rowLabel);
    // Locate the first checkbox inside the GWT row
    const checkboxLocator = row.locator('input[type="checkbox"]').first();
    const count = await checkboxLocator.count().catch(() => 0);
    if (count > 0) {
      // Use browser-side evaluation to check if the checkbox is the leftmost row-activation checkbox (and NOT a Contains checkbox)
      const shouldClick = await checkboxLocator.evaluate((cb) => {
        const parent = cb.closest('.gwt-CheckBox, span, label, td');
        if (parent) {
          const txt = parent.textContent.trim().toLowerCase();
          const title = (parent.title || '').trim().toLowerCase();
          const className = (parent.className || '').trim().toLowerCase();
          // If the parent has "contains" or "exactmatch" in text/title/class, it is NOT the leftmost activation checkbox!
          if (txt.includes('contains') || title.includes('contains') || className.includes('exactmatch') || className.includes('contains')) {
            return false;
          }
        }
        return cb.checked;
      }).catch(() => false);

      if (shouldClick) {
        console.log(`[GwtBlotterPage] Deactivating GWT checkbox for row [${rowLabel}]...`);
        const handle = await checkboxLocator.elementHandle();
        if (handle) {
          const frame = await this.getFrame();
          await frame.evaluate((cb) => {
            const parent = cb.closest('.gwt-CheckBox, span, label') || cb;
            parent.click();
            cb.dispatchEvent(new Event('focus', { bubbles: true }));
            cb.dispatchEvent(new Event('input', { bubbles: true }));
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            cb.dispatchEvent(new Event('blur', { bubbles: true }));
          }, handle).catch(() => {});
        }
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Selects an option inside a GWT custom select box dropdown list natively.
   * 
   * @param {string} fieldLabel - e.g. "Clearing Status"
   * @param {string} optionName - e.g. "Intended for Clearing"
   */
  async selectGwtCustomDropdownOption(fieldLabel, optionName) {
    const frame = await this.getFrame();
    const translatedLabel = this.translateLabel(fieldLabel);
    
    // Natively activate row checkbox first
    await this.activateRowCheckbox(fieldLabel);

    const row = await this.getRowLocator(translatedLabel).catch(() => null);
    if (row) {
      const icon = row.locator('.multiselctIcon').first();
      if (await icon.count() > 0) {
        console.log(`[GwtBlotterPage] Opening GWT custom dropdown for [${translatedLabel}]...`);
        await icon.click();
        await this.page.waitForTimeout(1000);

        const targetOption = frame.locator('.slectDropDownBoxBold').filter({ hasText: new RegExp(`^\\s*${optionName}\\s*$`, 'i') }).filter({ visible: true }).first();
        if (await targetOption.count() > 0) {
          console.log(`[GwtBlotterPage] Clicking GWT custom dropdown option: ${optionName}`);
          await targetOption.click();
          await this.page.waitForTimeout(500);
        }
        
        // Close GWT custom dropdown panel overlay cleanly by clicking the body
        await frame.locator('body').first().click().catch(() => {});
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Targets a specific inline checkbox option inside GWT's active dropdown checklist overlay.
   * 
   * @param {string} fieldLabel - e.g. "Workflow"
   * @param {string} optionName - e.g. "Confirmations"
   * @param {boolean} checked - Whether to check or uncheck
   * @param {boolean} [strictPopup=false] - If true, strictly restrict search inside GWT's active popup panel overlay to prevent matching hidden inline checkboxes
   */
  async setGwtCheckboxOption(fieldLabel, optionName, checked, strictPopup = false) {
    const frame = await this.getFrame();
    const translatedLabel = this.translateLabel(fieldLabel);
    
    // Check if the option represents "All Folders" or "All" (which is the default unfiltered state)
    if (optionName.toLowerCase() === 'all folders' || optionName.toLowerCase() === 'all') {
      console.log(`[GwtBlotterPage] Option [${optionName}] represents default unfiltered state for [${fieldLabel}]. Bypassing selection.`);
      return;
    }

    // Natively ensure the leftmost row activation checkbox in Column 0 is active first (if present)
    await this.activateRowCheckbox(fieldLabel);

    console.log(`[GwtBlotterPage] Setting GWT checkbox option [${fieldLabel} -> ${optionName}] to: ${checked} (strictPopup: ${strictPopup})`);

    const row = await this.getRowLocator(translatedLabel).catch(() => null);

    // Build standard, high-precision native Playwright XPaths relative to GWT's active dropdown overlay document-wide or inline row:
    const locators = strictPopup ? [
      // 1. Checkbox next to Option Name in adjacent cells in the same row (innermost td matching text, then preceding sibling td checkbox)
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//td[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}" and not(.//td)]/preceding-sibling::td[1]//input[@type="checkbox"]`),
      
      // 2. Checkbox inside the same td/span/label/div matching text exactly
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[self::td or self::span or self::label or self::div][normalize-space(translate(., '\u00a0', ' ')) = "${optionName}" and not(.//td) and not(.//div)]//input[@type="checkbox"]`),
      
      // 3. Label tag relationship
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//input[@type="checkbox" and @id = //label[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"]/@for]`),

      // 4. Sibling relationship
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//input[@type="checkbox" and (following-sibling::*[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"] or preceding-sibling::*[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"])]`),

      // 5. Fallbacks GWT Popup row matches
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//tr[td[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}" and not(.//td)]]//input[@type="checkbox"]`),
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//tr[not(.//tr) and (descendant::*[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"] or contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}"))]//input[@type="checkbox"]`),

      // 6. GWT Tree / general span / div option label matching fallback (crucial for Folder tree widget!)
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[self::div or self::span or contains(@class, "TreeItem")][descendant::*[contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")] or contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")]//input[@type="checkbox"]`)
    ] : [
      // 1. Popup Panel Row context (Edit Overlay)
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//td[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}" and not(.//td)]/preceding-sibling::td[1]//input[@type="checkbox"]`),
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//tr[td[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}" and not(.//td)]]//input[@type="checkbox"]`),
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//tr[not(.//tr) and (descendant::*[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"] or contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}"))]//input[@type="checkbox"]`),
      
      // 2. GWT Tree / general span / div option label matching fallback (crucial for Folder tree widget!)
      frame.locator(`xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[self::div or self::span or contains(@class, "TreeItem")][descendant::*[contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")] or contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")]//input[@type="checkbox"]`),

      // 3. Inline Row context (direct sibling row checkboxes on page)
      ...(row ? [
        row.locator(`xpath=.//*[self::tr or self::div or self::td or self::span][descendant::*[normalize-space(translate(., '\u00a0', ' ')) = "${optionName}"] or contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")]//input[@type="checkbox"]`),
        row.locator(`xpath=.//td[contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")]/preceding-sibling::td[1]//input[@type="checkbox"]`),
        row.locator(`xpath=.//*[self::span or self::label or self::div][contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")]//input[@type="checkbox"]`),
        row.locator(`xpath=.//input[@type="checkbox" and (following-sibling::*[contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")] or preceding-sibling::*[contains(normalize-space(translate(., '\u00a0', ' ')), "${optionName}")])]`)
      ] : []),

      // 3. Fallbacks
      frame.locator(`xpath=.//label[translate(normalize-space(.), " ", " ") = "${optionName}"]/preceding-sibling::input[@type="checkbox"]`),
      frame.locator(`xpath=.//span[translate(normalize-space(.), " ", " ") = "${optionName}"]//input[@type="checkbox"]`),
      frame.locator(`xpath=.//td[translate(normalize-space(.), " ", " ") = "${optionName}"]//input[@type="checkbox"]`),
      frame.locator(`xpath=.//input[@id=//label[translate(normalize-space(.), " ", " ") = "${optionName}"]/@for]`),
      frame.locator(`xpath=.//*[translate(normalize-space(.), " ", " ") = "${optionName}"]/..//input[@type="checkbox"]`)
    ];

    let targetLocator = null;
    for (const loc of locators) {
      const count = await loc.count().catch(() => 0);
      if (count > 0) {
        targetLocator = loc.first();
        break;
      }
    }

    if (!targetLocator) {
      const cleanOption = optionName.toLowerCase().trim();
      // Prioritize the actual clickable GWT .slectDropDownBoxBold widgets first with full case insensitivity
      const xpathSelect = `xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[contains(@class, "slectDropDownBoxBold")][translate(normalize-space(translate(., '\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = "${cleanOption}"]`;
      const popupOption = frame.locator(xpathSelect).first();
      const countPopupOpt = await popupOption.count().catch(() => 0);
      if (countPopupOpt > 0) {
        console.log(`[GwtBlotterPage] Discovered direct click .slectDropDownBoxBold option [${optionName}] inside GWT popup panel. Clicking directly...`);
        await popupOption.click();
        await this.page.waitForTimeout(1000);
        return;
      }
      
      const xpathFallback = `xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[self::div or self::td][translate(normalize-space(translate(., '\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = "${cleanOption}"]`;
      const popupOptionFallback = frame.locator(xpathFallback).first();
      const countFallback = await popupOptionFallback.count().catch(() => 0);
      if (countFallback > 0) {
        console.log(`[GwtBlotterPage] Discovered fallback direct click option [${optionName}] inside GWT popup panel. Clicking directly...`);
        await popupOptionFallback.click();
        await this.page.waitForTimeout(1000);
        return;
      }
    }

    if (!targetLocator && row) {
      // Fallback 100% robust row-scoped browser-side click for horizontal GWT checkbox options
      console.log(`[GwtBlotterPage] Standard XPaths failed. Running GWT row-scoped fallback click for [${optionName}]...`);
      const rowHandle = await row.elementHandle().catch(() => null);
      if (rowHandle) {
        const elementsInfo = await frame.evaluate((rowEl) => {
          const elements = Array.from(rowEl.querySelectorAll('td, span, div, label, input'));
          return elements.map(el => ({
            tag: el.tagName,
            text: el.textContent.trim(),
            className: el.className,
            html: el.outerHTML.substring(0, 120)
          }));
        }, rowHandle).catch(() => []);
        console.log(`[GwtBlotterPage] Elements inside GWT Row [${translatedLabel}]:`, JSON.stringify(elementsInfo, null, 2));

        const clickedInline = await frame.evaluate(({ rowEl, name, isChecked }) => {
          // Query elements strictly inside GWT's resolved row container to prevent outer page collisions
          const elements = Array.from(rowEl.querySelectorAll('.slectDropDownBoxBold, td, span, div, label'));
          const target = elements.find(el => {
            const txt = el.textContent.trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
            // Match exact text first
            return txt === name || txt.replace(/\s+/g, ' ') === name;
          }) || elements.find(el => {
            const txt = el.textContent.trim().toLowerCase();
            return txt.includes(name.toLowerCase());
          });

          if (target) {
            const parent = target.closest('tr, td, .gwt-CheckBox') || target;
            const cb = parent.querySelector('input[type="checkbox"]');
            if (cb) {
              if (cb.checked !== isChecked) {
                cb.click();
                cb.dispatchEvent(new Event('focus', { bubbles: true }));
                cb.dispatchEvent(new Event('input', { bubbles: true }));
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                cb.dispatchEvent(new Event('blur', { bubbles: true }));
              }
              return true;
            }
          }
          return false;
        }, { rowEl: rowHandle, name: optionName, isChecked: !!checked }).catch(() => false);

        if (clickedInline) {
          return; // Successfully clicked and handled inline!
        }
      }
    }

    if (!targetLocator) {
      // Check if GWT popup is a checklist panel without checkboxes (GWT Tree Widget)
      // and natively locate the text node to click it directly!
      const textSelector = `xpath=//*[contains(@class, "gwt-PopupPanel") or contains(@class, "popupContent")]//*[self::div or self::span or self::a or contains(@class, "TreeItem")][not(.//*[self::div or self::span or self::a]) and (normalize-space(translate(., '\\u00a0', ' ')) = "${optionName}" or contains(normalize-space(translate(., '\\u00a0', ' ')), "${optionName}"))]`;
      const textLocator = frame.locator(textSelector).filter({ visible: true }).first();
      const textCount = await textLocator.count().catch(() => 0);
      if (textCount > 0) {
        console.log(`[GwtBlotterPage] Click target checkbox not found. Clicking GWT popup label text directly for option [${optionName}]...`);
        await textLocator.click();
        await this.page.waitForTimeout(500);
        return; // Successfully clicked label text directly!
      }
    }

    if (targetLocator) {
      const isChecked = await targetLocator.isChecked().catch(() => false);
      if (checked !== isChecked) {
        console.log(`[GwtBlotterPage] Click target locator found. Setting GWT state to: ${checked}`);
        const handle = await targetLocator.elementHandle();
        if (handle) {
          await frame.evaluate(({ cb, targetState }) => {
            if (cb.checked !== targetState) {
              cb.click(); // Click input directly to avoid double-toggle state reverts
              cb.dispatchEvent(new Event('focus', { bubbles: true }));
              cb.dispatchEvent(new Event('input', { bubbles: true }));
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('blur', { bubbles: true }));
            }
          }, { cb: handle, targetState: !!checked });
        }
        await this.page.waitForTimeout(200);
      } else {
        console.log(`[GwtBlotterPage] Checkbox [${optionName}] is already in target state: ${checked}`);
      }

      // Programmatically and natively click GWT's checklist popup panel OK button to commit selections
      const popup = frame.locator('.gwt-PopupPanel, .glassPanel, .popupContent').first();
      const okBtn = popup.locator('button, input[type="button"], a, .p-button, [class*="button"]').filter({ hasText: /^(ok|apply|submit|select)$/i }).first();
      const hasOk = await okBtn.count().catch(() => 0);
      if (hasOk > 0) {
        console.log(`[GwtBlotterPage] Clicking native GWT popup 'OK' button`);
        await okBtn.click();
      } else {
        // Fallback to raw evaluation
        await frame.evaluate(() => {
          const popupPanel = document.querySelector('.gwt-PopupPanel, .glassPanel, .popupContent');
          if (popupPanel) {
            const btn = Array.from(popupPanel.querySelectorAll('button, input[type="button"], a, div, span, td, .p-button, [class*="button"]')).find(el => {
              const txt = el.textContent.trim().toLowerCase();
              return txt === 'ok' || txt === 'apply' || txt === 'submit' || txt === 'select';
            });
            if (btn) {
              btn.click();
            }
          }
        }).catch(() => {});
      }
      await this.page.waitForTimeout(500);
    } else {
      throw new Error(`[GwtBlotterPage] setGwtCheckboxOption failed to locate option [${optionName}] in GWT row [${translatedLabel}]`);
    }
  }

  /**
   * Targets a horizontal 'Yes' / 'No' checkbox inside a specific GWT criteria row directly.
   * 
   * @param {string} fieldLabel - e.g. "Intended for Clearing"
   * @param {string} optionName - e.g. "Yes" or "No"
   * @param {boolean} checked - target state
   */
  async setGwtInlineRowCheckbox(fieldLabel, optionName, checked) {
    const frame = await this.getFrame();
    const translatedLabel = this.translateLabel(fieldLabel);
    console.log(`[GwtBlotterPage] Setting GWT inline row checkbox [${translatedLabel} -> ${optionName}] to: ${checked}`);

    await this.activateRowCheckbox(fieldLabel);

    const row = await this.getRowLocator(translatedLabel);
    
    // Locate the checkbox element inside this specific row by filtering child GWT CheckBox containers by option text
    const checkboxContainer = row.locator('.gwt-CheckBox, td, span, label').filter({ hasText: new RegExp(`^${optionName}$`, 'i') }).first();
    const cb = checkboxContainer.locator('input[type="checkbox"]').first();
    const count = await cb.count().catch(() => 0);
    
    if (count > 0) {
      const isChecked = await cb.isChecked().catch(() => false);
      if (checked !== isChecked) {
        console.log(`[GwtBlotterPage] Toggling inline checkbox inside row [${translatedLabel}] for option [${optionName}]...`);
        const handle = await cb.elementHandle();
        if (handle) {
          await frame.evaluate(({ cbEl, targetState }) => {
            if (cbEl.checked !== targetState) {
              const parent = cbEl.closest('.gwt-CheckBox, span, label') || cbEl;
              parent.click();
              cbEl.dispatchEvent(new Event('focus', { bubbles: true }));
              cbEl.dispatchEvent(new Event('input', { bubbles: true }));
              cbEl.dispatchEvent(new Event('change', { bubbles: true }));
              cbEl.dispatchEvent(new Event('blur', { bubbles: true }));
            }
          }, { cbEl: handle, targetState: !!checked });
        }
        await this.page.waitForTimeout(500);
      } else {
        console.log(`[GwtBlotterPage] Inline checkbox inside row [${translatedLabel}] for option [${optionName}] is already in target state: ${checked}`);
      }
    } else {
      throw new Error(`[GwtBlotterPage] setGwtInlineRowCheckbox failed to locate option [${optionName}] in GWT row [${translatedLabel}]`);
    }
  }

  /**
   * Populates any GWT input field dynamically based on its row label,
   * triggering the full GWT state synchronization sequence.
   * 
   * @param {string} rowLabel - GWT row label.
   * @param {number} index - Input index inside the row.
   * @param {string} value - Value to enter.
   */
  async fillFieldInput(rowLabel, index, value) {
    const frame = await this.getFrame();
    const translatedLabel = this.translateLabel(rowLabel);
    console.log(`[GwtBlotterPage] Populating GWT field [${translatedLabel}] index ${index} with value [${value}]...`);
    
    // Natively ensure the row checkbox is checked so GWT recognizes and processes the filter!
    await this.activateRowCheckbox(translatedLabel);

    const row = await this.getRowLocator(translatedLabel);

    // Check if the GWT row contains an HTML select dropdown list (e.g. Is Package Trade, Sent?, Intended for Clearing)
    const selectLocator = row.locator('select').first();
    const selectCount = await selectLocator.count().catch(() => 0);
    if (selectCount > 0) {
      console.log(`[GwtBlotterPage] GWT row [${translatedLabel}] contains a select element. Selecting option [${value}]...`);
      await selectLocator.selectOption({ label: value }).catch(() => selectLocator.selectOption({ value: value }));
      await this.page.waitForTimeout(500);
      return;
    }
    
    // Diagnostic logging to inspect exactly what input elements exist inside the GWT row
    const inputsInRow = await row.evaluate((el) => {
      const inps = Array.from(el.querySelectorAll('input'));
      return inps.map(inp => ({
        tagName: inp.tagName,
        type: inp.type,
        className: inp.className,
        id: inp.id,
        offsetWidth: inp.offsetWidth,
        visible: inp.offsetHeight > 0 && inp.offsetWidth > 0,
        value: inp.value
      }));
    }).catch((err) => ({ error: err.message }));
    console.log(`[GwtBlotterPage] Inputs inside row [${translatedLabel}]:`, JSON.stringify(inputsInRow, null, 2));

    const inputLocator = await this.getFieldInputLocator(translatedLabel, index);
    if (!inputLocator) {
      console.log(`[GwtBlotterPage] Input locator at index ${index} does not exist for GWT row [${translatedLabel}]. Skipping population safely.`);
      return;
    }
    
    await inputLocator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    const handle = await inputLocator.elementHandle();
    
    if (handle) {
      const cleanLabel = rowLabel.toLowerCase();
      const isSuggestBox = ['counterparty company', 'counterparty legal entity'].includes(cleanLabel);

      if (isSuggestBox) {
        console.log(`[GwtBlotterPage] Using native keyboard entry and Tab/Enter commit for GWT SuggestBox field [${translatedLabel}]...`);
        await inputLocator.focus();
        await inputLocator.fill('');
        await inputLocator.type(value, { delay: 50 });
        await this.page.waitForTimeout(1000); // Allow SuggestBox popup to render
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(500);
      } else {
        await frame.evaluate(({ el, val }) => {
          el.value = val;
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }, { el: handle, val: value });
      }
      const valAfter = await inputLocator.inputValue().catch(() => null);
      console.log(`[GwtBlotterPage] GWT field [${translatedLabel}] value after write: "${valAfter}"`);
    } else {
      throw new Error(`[GwtBlotterPage] Unable to resolve input element handle for field [${rowLabel}]`);
    }
  }

  /**
   * Enters a specific Trade ID criteria.
   * @param {string} tradeId 
   */
  async fillTradeId(tradeId) {
    await this.fillFieldInput('Trade ID', 0, tradeId);
  }

  /**
   * Enters Trade Date Range (From = index 0, To = index 1 inside the 'Trade Date' row).
   * @param {string} from - Formatted date (dd-MMM-yyyy)
   * @param {string} to - Formatted date (dd-MMM-yyyy)
   */
  async fillTradeDateRange(from, to) {
    await this.fillFieldInput('Trade Date', 0, from || '');
    await this.fillFieldInput('Trade Date', 1, to || '');
  }

  /**
   * Enters Last Activity Date Range.
   * @param {string} from - Formatted date (dd-MMM-yyyy)
   * @param {string} to - Formatted date (dd-MMM-yyyy)
   */
  async fillLastActivityDateRange(from, to) {
    await this.fillFieldInput('Last Activity Date', 0, from || '');
    await this.fillFieldInput('Last Activity Date', 1, to || '');
  }

  /**
   * Selects a specific checklist workflow checkbox.
   * @param {string} workflowName - e.g. "Clearing"
   * @param {boolean} checked 
   */
  async selectWorkflow(workflowName, checked) {
    const frame = await this.getFrame();
    console.log(`[GwtBlotterPage] Setting GWT workflow checkbox [${workflowName}] to: ${checked}`);
    
    await frame.evaluate(({ name, isChecked }) => {
      const divs = Array.from(document.querySelectorAll('.slectDropDownBoxBold, div'));
      const targetDiv = divs.find(d => d.textContent.trim() === name && (d.offsetParent !== null || d.getBoundingClientRect().width > 0));
      if (targetDiv) {
        const cb = targetDiv.querySelector('input[type="checkbox"]') || targetDiv.parentElement.querySelector('input[type="checkbox"]');
        if (cb) {
          if (isChecked && !cb.checked) cb.click();
          else if (!isChecked && cb.checked) cb.click();
        }
      }
    }, { name: workflowName, isChecked: !!checked });
  }

  /**
   * Targets and checks/unchecks the "Contains" checkbox (the second checkbox) inside a GWT alphanumeric row.
   * 
   * @param {string} rowLabel - The target row label.
   * @param {boolean|string} checked - Target check state.
   */
  async setGwtContainsCheckbox(rowLabel, checked) {
    const fieldData = GWT_XPATHS[rowLabel];
    const targetState = checked === true || checked === 'true';
    if (fieldData && fieldData.found && fieldData.containsCheckboxXPath) {
      const frame = await this.getFrame();
      const cb = frame.locator(`xpath=${fieldData.containsCheckboxXPath}`).first();
      const count = await cb.count().catch(() => 0);
      if (count > 0) {
        const isChecked = await cb.isChecked().catch(() => false);
        if (isChecked !== targetState) {
          console.log(`[GwtBlotterPage] Setting GWT "Contains" checkbox inside row [${rowLabel}] to: ${targetState} via harvested XPath...`);
          const handle = await cb.elementHandle();
          if (handle) {
            await frame.evaluate(({ cbEl, val }) => {
              if (cbEl.checked !== val) {
                cbEl.click();
                cbEl.dispatchEvent(new Event('focus', { bubbles: true }));
                cbEl.dispatchEvent(new Event('input', { bubbles: true }));
                cbEl.dispatchEvent(new Event('change', { bubbles: true }));
                cbEl.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }, { cbEl: handle, val: targetState }).catch(() => {});
          }
          await this.page.waitForTimeout(200);
        }
      }
      return;
    }

    const row = await this.getRowLocator(rowLabel);
    const checkboxes = row.locator('input[type="checkbox"]');
    const count = await checkboxes.count().catch(() => 0);
    if (count > 0) {
      const containsCheckbox = checkboxes.first();
      const isChecked = await containsCheckbox.isChecked().catch(() => false);
      const targetState = checked === true || checked === 'true';
      if (targetState !== isChecked) {
        console.log(`[GwtBlotterPage] Setting GWT "Contains" checkbox inside row [${rowLabel}] to: ${targetState}`);
        const handle = await containsCheckbox.elementHandle();
        if (handle) {
          const frame = await this.getFrame();
          await frame.evaluate(({ cb, val }) => {
            if (cb.checked !== val) {
              cb.click();
              cb.dispatchEvent(new Event('focus', { bubbles: true }));
              cb.dispatchEvent(new Event('input', { bubbles: true }));
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('blur', { bubbles: true }));
            }
          }, { cb: handle, val: targetState });
        }
        await this.page.waitForTimeout(200);
      }
    }
  }

  /**
   * Generically populates any search criteria field on GWT Old UI by dynamically 
   * discovering its input controls and routing the action based on DOM types.
   * 
   * @param {string} fieldLabel - e.g. "Trade Date", "Product", "Account Number", "Trade ID"
   * @param {string} value - The target text or selection value (e.g. "EQS: Equity Swap")
   * @param {string} [fromValue] - The 'From' boundary for ranges
   * @param {string} [toValue] - The 'To' boundary for ranges
   * @param {boolean|string} [containsMode] - The contains check state for alphanumeric queries
   */
  async populateField(fieldLabel, value, fromValue, toValue, containsMode) {
    if (fieldLabel.toLowerCase() === 'intended for clearing') {
      const shouldCheck = (value.toLowerCase() === 'yes');
      console.log(`[GwtBlotterPage] Intercepted [Intended for Clearing]. Routing as Clearing Status -> Intended for Clearing (Check: ${shouldCheck})`);
      
      if (shouldCheck) {
        await this.selectGwtCustomDropdownOption('Clearing Status', 'Intended for Clearing');
      } else {
        console.log(`[GwtBlotterPage] Option is 'No' (unchecked). Keeping Clearing Status in default reset state.`);
      }
      return;
    }

    if (fieldLabel.toLowerCase() === 'sent?') {
      // Normalize Yes/No to GWT's native inline checkbox row options Y/N
      value = value.toLowerCase() === 'yes' ? 'Y' : 'N';
      console.log(`[GwtBlotterPage] Normalized [Sent?] value to: [${value}]`);
    }

    console.log(`[GwtBlotterPage] Polymorphic Field Population -> Label: [${fieldLabel}], Value: [${value}], Range: [${fromValue} - ${toValue}], ContainsMode: [${containsMode}]`);
    
    // Automatically ensure the criteria panel is expanded and visible before any field population!
    await this.expandCriteria();

    const frame = await this.getFrame();
    
    // Dynamically wait up to 15s for GWT's criteria table rows to be fully attached and stabilized before locating
    console.log('[GwtBlotterPage] Waiting dynamically for GWT criteria panel rows to attach...');
    await frame.locator('td, th').filter({ hasText: /^Trade ID/i }).first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});

    const translatedLabel = this.translateLabel(fieldLabel);

    // 1. High-precision dynamic classification based on GWT innermost row XPath and standard flat categories
    const isDateField = fieldLabel.toLowerCase().includes('date');
    const isRangeField = (fromValue !== undefined && fromValue !== null && fromValue !== '') || (toValue !== undefined && toValue !== null && toValue !== '');
    
    // Check if the field is a horizontal "Yes" / "No" checkbox row inside GWT's panel natively
    const isInlineCheckboxRow = [
      'intended for clearing', 'sent?', 'is package trade', 'broker submitted novation'
    ].includes(fieldLabel.toLowerCase());

    // Only Product and My Product Type ID use GWT's modal popups / Edit link. All other categories are inline checkbox lists on DemoC, but Select overlays on DemoB.
    const hasEditLink = [
      'product', 'my product type id', 'workflow', 'clearing status', 
      'reconciliation state', 'document status', 'folder',
      'novation status', 'transaction acceptance status', 'settlement agency status', 'status',
      'broker id', 'executing broker', 'intermediating broker', 'transferor', 'transferee', 'remaining party'
    ].includes(fieldLabel.toLowerCase());

    // FlatCheckboxGroup: GWT rows that list each option as a separate horizontal row (empty on DemoB except Source)
    const isFlatCheckboxGroup = [
      'source'
    ].includes(fieldLabel.toLowerCase());

    const isCheckboxCategory = hasEditLink || isInlineCheckboxRow;

    // 2. Natively ensure GWT's row activation checkbox in Column 0 is active
    await this.activateRowCheckbox(fieldLabel);

    // 2.1 Check if the GWT row contains a native select element first (highly robust on all environments)
    const row = await this.getRowLocator(translatedLabel).catch(() => null);
    if (row) {
      const selectLocator = row.locator('select').first();
      const selectCount = await selectLocator.count().catch(() => 0);
      if (selectCount > 0) {
        console.log(`[GwtBlotterPage] GWT row [${translatedLabel}] contains a native select element. Selecting option [${value}]...`);
        await selectLocator.selectOption({ label: value }).catch(() => selectLocator.selectOption({ value: value })).catch((err) => {
          throw new Error(`[GwtBlotterPage] Failed to select option [${value}] in select element for GWT row [${translatedLabel}]: ${err.message}`);
        });
        await this.page.waitForTimeout(500);
        return;
      }

      // 2.1.1 Check if GWT row contains a custom GWT select textbox with value "Select..." (Counterparty Company, Counterparty Legal Entity, etc.)
      const selectTextBox = row.locator('input.gwt-TextBox.placeholderText, input[value="Select..."]').first();
      const countSelectTextBox = await selectTextBox.count().catch(() => 0);
      if (countSelectTextBox > 0) {
        console.log(`[GwtBlotterPage] GWT row [${translatedLabel}] contains a custom select textbox. Clicking it to open checklist overlay...`);
        await selectTextBox.click();
        await this.page.waitForTimeout(1000); // Wait for popup overlay to show

        // Wait up to 15s for popup overlay to appear
        const popup = frame.locator('.gwt-PopupPanel, .glassPanel, .popupContent').first();
        try {
          await popup.waitFor({ state: 'visible', timeout: 15000 });
        } catch (err) {
          throw new Error(`[GwtBlotterPage] GWT select textbox popup overlay failed to open within 15s for [${translatedLabel}]`);
        }
        await this.page.waitForTimeout(500);

        // Select the option inside GWT's checklist popup panel overlay and commit
        await this.setGwtCheckboxOption(fieldLabel, value, true, true);
        return;
      }

      // 2.2 Check if the GWT row contains a custom GWT select dropdown box with an icon (highly robust for Source, Folder, etc.)
      // Skip this if the label represents a standard GWT text input box (like Counterparty Company/Legal Entity)
      const isStandardTextBox = [
        'counterparty company', 'counterparty legal entity', 'clearing house', 'execution venue'
      ].includes(fieldLabel.toLowerCase());

      const icon = row.locator('.multiselctIcon').first();
      const countIcon = await icon.count().catch(() => 0);
      if (countIcon > 0 && !hasEditLink && !isStandardTextBox) {
        console.log(`[GwtBlotterPage] GWT row [${translatedLabel}] contains a custom dropdown icon. Opening dropdown list overlay...`);
        await icon.click();
        await this.page.waitForTimeout(1000); // Wait for dropdown list panel overlay to show

        // Find the visible .slectDropDownBoxBold matching our value and click it!
        const targetOption = frame.locator('.slectDropDownBoxBold').filter({ hasText: new RegExp(`^\\s*${value}\\s*$`, 'i') }).filter({ visible: true }).first();
        const countOpt = await targetOption.count().catch(() => 0);
        if (countOpt > 0) {
          console.log(`[GwtBlotterPage] Clicking GWT custom dropdown option: ${value}`);
          await targetOption.click();
          await this.page.waitForTimeout(500);
          
          // Click GWT frame's body to cleanly close the custom dropdown list overlay!
          await frame.locator('body').first().click().catch(() => {});
          await this.page.waitForTimeout(500);
          return;
        }
      }
    }

    // 3. Polymorphic Routing
    if (isDateField || isRangeField) {
      // Date Range or Numeric Range (From / To Bounds)
      console.log(`[GwtBlotterPage] Routing [${fieldLabel}] as Range Field.`);
      await this.fillFieldInput(fieldLabel, 0, fromValue || value || '');
      await this.fillFieldInput(fieldLabel, 1, toValue || '');
    } else if (isInlineCheckboxRow) {
      // Inline Yes/No Checkbox Row
      console.log(`[GwtBlotterPage] Routing [${fieldLabel}] as Inline Checkbox Row.`);
      const otherOption = value.toLowerCase() === 'yes' ? 'No' : 'Yes';
      await this.setGwtInlineRowCheckbox(fieldLabel, otherOption, false);
      await this.setGwtInlineRowCheckbox(fieldLabel, value, true);
    } else if (isFlatCheckboxGroup) {
      // Flat Checkbox Group (e.g. Workflow, Clearing Status, Transaction Type, Currency, Document Status, Novation Status, Transaction Acceptance Status)
      console.log(`[GwtBlotterPage] Routing [${fieldLabel}] as Flat Checkbox Group.`);
      
      // First, deactivate all other sibling options inside GWT's row to prevent multiple selections
      const siblings = GWT_CHECKBOX_OPTIONS[fieldLabel] || [];
      for (const sibling of siblings) {
        if (sibling.toLowerCase() !== value.toLowerCase()) {
          await this.setGwtCheckboxOption(fieldLabel, sibling, false);
        }
      }

      // Then, check our target checkbox option inside the row
      await this.setGwtCheckboxOption(fieldLabel, value, true);
      
      console.log(`[GwtBlotterPage] Flat Checkbox Group population completed successfully for option [${value}]`);
    } else if (hasEditLink) {
      // Checkbox Category Group using Edit Overlay (e.g. Product, My Product Type ID, Workflow)
      console.log(`[GwtBlotterPage] Routing [${fieldLabel}] as Checkbox Category Group via Edit overlay Scoped within the GWT Row.`);

      const row = await this.getRowLocator(translatedLabel).catch(() => null);
      if (row) {
        // Scroll row into view to ensure accurate Playwright visibility calculations
        await row.scrollIntoViewIfNeeded().catch(() => {});

        // 1. Check if GWT's row contains a custom GWT select dropdown box first (.slectDropDownBoxBold) and is visible
        const dropdownBox = row.locator('.slectDropDownBoxBold, div[class*="BoxBold"]').first();
        if (await dropdownBox.count() > 0 && await dropdownBox.isVisible().catch(() => false)) {
          console.log(`[GwtBlotterPage] Clicking GWT custom dropdown box for [${translatedLabel}]`);
          await dropdownBox.click().catch(() => dropdownBox.evaluate(el => el.click()));
        } else {
          // Natively locate and click row-level inline 'Edit' link
          const rowEditLink = row.locator('a').filter({ hasText: 'Edit' }).first();
          if (await rowEditLink.count() > 0) {
            console.log(`[GwtBlotterPage] Clicking row-level inline 'Edit' link for [${translatedLabel}]`);
            await rowEditLink.scrollIntoViewIfNeeded().catch(() => {});
            await rowEditLink.click().catch(() => rowEditLink.evaluate(el => el.click()));
          } else {
            // General fallback
            const fallbackEdit = row.locator('a').first();
            if (await fallbackEdit.count() > 0) {
              console.log(`[GwtBlotterPage] Clicking general row fallback link for [${translatedLabel}]`);
              await fallbackEdit.scrollIntoViewIfNeeded().catch(() => {});
              await fallbackEdit.click().catch(() => fallbackEdit.evaluate(el => el.click()));
            }
          }
        }
      } else {
        throw new Error(`[GwtBlotterPage] Failed to locate GWT row for [${translatedLabel}] to perform Edit actions`);
      }
      
      // Wait up to 15 seconds for GWT's checklist popup panel overlay to become visible, throwing error if it fails to open
      const popup = frame.locator('.gwt-PopupPanel, .glassPanel, .popupContent').first();
      try {
        await popup.waitFor({ state: 'visible', timeout: 15000 });
      } catch (err) {
        throw new Error(`[GwtBlotterPage] GWT checklist popup panel overlay failed to open within 15 seconds for GWT row [${translatedLabel}]`);
      }
      await this.page.waitForTimeout(500); // Allow overlay transition to fully settle

      // Natively uncheck default GWT options inside the popup checklist overlay if they are not our target value
      if (fieldLabel.toLowerCase() === 'workflow' && value.toLowerCase() !== 'clearing') {
        console.log(`[GwtBlotterPage] Unchecking default GWT 'Clearing' option inside popup checklist...`);
        await this.setGwtCheckboxOption(fieldLabel, 'Clearing', false, true).catch(() => {});
      }
      if (fieldLabel.toLowerCase() === 'clearing status' && value.toLowerCase() !== 'intended for clearing') {
        console.log(`[GwtBlotterPage] Unchecking default GWT 'Intended for Clearing' option inside popup checklist...`);
        await this.setGwtCheckboxOption(fieldLabel, 'Intended for Clearing', false, true).catch(() => {});
      }
      if (fieldLabel.toLowerCase() === 'document status' && value.toLowerCase() !== 'all internal') {
        console.log(`[GwtBlotterPage] Unchecking default GWT 'All Internal' option inside popup checklist...`);
        await this.setGwtCheckboxOption(fieldLabel, 'All Internal', false, true).catch(() => {});
      }
      if (fieldLabel.toLowerCase() === 'novation status' && value.toLowerCase() !== 'awaiting reply: stp') {
        console.log(`[GwtBlotterPage] Unchecking default GWT 'Awaiting Reply: STP' option inside popup checklist...`);
        await this.setGwtCheckboxOption(fieldLabel, 'Awaiting Reply: STP', false, true).catch(() => {});
      }

      // Check the target option inside GWT's active dropdown checklist overlay and commit selections by clicking OK button
      await this.setGwtCheckboxOption(fieldLabel, value, true, true);
    } else {
      // Standard Alphanumeric Input (Trade ID, Deal ID, Account Number, Bunched Order Block MW ID)
      console.log(`[GwtBlotterPage] Routing [${fieldLabel}] as Standard Alphanumeric Input.`);
      await this.fillFieldInput(fieldLabel, 0, value);
      
      // Sync GWT's "Contains" checkbox state based on the scenario's containsMode
      await this.setGwtContainsCheckbox(fieldLabel, containsMode);
    }
  }

  /**
   * Triggers filter application and waits for results to render.
   */
  async clickApply() {
    const frame = await this.getFrame();
    
    // Diagnostic log to verify exactly what criteria are active on GWT before clicking Apply
    const activeCriteria = await frame.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const active = [];
      rows.forEach(r => {
        const checkbox = r.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          const text = r.textContent.trim().split('\n')[0].trim().substring(0, 50);
          const inputs = Array.from(r.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"])'));
          const vals = inputs.map(inp => inp.value);
          active.push({ label: text, values: vals });
        }
      });
      return active;
    }).catch(() => []);
    console.log(`[GwtBlotterPage] Active GWT Criteria before Apply:`, JSON.stringify(activeCriteria, null, 2));

    console.log('[GwtBlotterPage] Clicking "Apply" filter button...');
    const oldApply = frame.locator('button.applyButton, button:has-text("Apply")').first();
    
    if (await oldApply.isVisible()) {
      await oldApply.click();
      console.log('[GwtBlotterPage] Waiting dynamically for data query to stabilize...');
      
      const loadingPanel = frame.locator('.gwt-PopupPanel, .glassPanel, div:has-text("Loading")').first();
      const count = await loadingPanel.count().catch(() => 0);
      if (count > 0 && await loadingPanel.isVisible()) {
        console.log('[GwtBlotterPage] Detected GWT loading popup panel. Waiting for detachment...');
        await loadingPanel.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      } else {
        await this.page.waitForTimeout(5000); // Safe 5s buffer for background RPC query execution
      }
    } else {
      throw new Error('[GwtBlotterPage] Apply button not found.');
    }
  }

  /**
   * Scrapes GWT's total trade count label displayed in GWT's paging summary panel (e.g. "1 - 50 of 712").
   * 
   * @returns {Promise<number|null>} Total matched trades as an integer.
   */
  async getGwtTotalTradeCount() {
    const frame = await this.getFrame();
    return await frame.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, span, td, b'));
      // Find GWT's paging panel row summary text (typically "1 - 50 of 712" or "1 - 1 of 1")
      const matchEl = elements.find(el => {
        const text = el.textContent.trim();
        const isPagingText = /^\d+\s*-\s*\d+\s+of\s+[\d,]+/i.test(text);
        return isPagingText && el.children.length === 0;
      });

      if (matchEl) {
        const text = matchEl.textContent.trim();
        const match = text.match(/of\s+([\d,]+)/i);
        if (match) {
          return parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
      
      // Fallback: Check static header if paging is absent (e.g. "All Workflow and All Statuses: 4,895 trades")
      const fallbackEl = elements.find(el => {
        const text = el.textContent.trim();
        return text.toLowerCase().includes('trades') && el.children.length === 0;
      });
      if (fallbackEl) {
        const text = fallbackEl.textContent.trim();
        const match = text.match(/([\d,]+)\s+trades/i);
        if (match) {
          return parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
      return null;
    }).catch(() => null);
  }

  /**
   * Scrapes the currently visible page of GWT split grid tables with coordinate midpoint clustering.
   * 
   * @private
   * @returns {Promise<Array<Object>>} Resolved horizontal rows.
   */
  async _scrapeVisiblePage() {
    const frame = await this.getFrame();
    return await frame.evaluate(() => {
      const headerEls = Array.from(document.querySelectorAll('.tb-header-text, .tradeBlotter-rightPanel .tb-header-text'));
      const headers = headerEls.map(el => {
        const rect = el.getBoundingClientRect();
        return { 
          text: el.textContent.trim(), 
          mid: (rect.left + rect.right) / 2 
        };
      }).filter(h => h.text !== '');

      const frozenRows = Array.from(document.querySelectorAll('.datafrozenGrid-full tbody tr, .frozencontainer tbody tr'));
      const floatingRows = Array.from(document.querySelectorAll('.datafloatingGrid-full tbody tr, .data-grid tbody tr, .tradeBlotter-rightPanel tbody tr'));

      const numRows = Math.max(frozenRows.length, floatingRows.length);
      const scrapedRows = [];

      for (let rIdx = 0; rIdx < numRows; rIdx++) {
        const fRow = frozenRows[rIdx];
        const flRow = floatingRows[rIdx];

        const fCells = fRow ? Array.from(fRow.querySelectorAll('td')).map(td => {
          const rect = td.getBoundingClientRect();
          return { text: td.textContent.trim(), mid: (rect.left + rect.right) / 2 };
        }) : [];

        const flCells = flRow ? Array.from(flRow.querySelectorAll('td')).map(td => {
          const rect = td.getBoundingClientRect();
          return { text: td.textContent.trim(), mid: (rect.left + rect.right) / 2 };
        }) : [];

        const allCells = [...fCells, ...flCells];
        const rowMap = {};

        allCells.forEach(cell => {
          let closestHeader = null;
          let minDiff = Infinity;
          
          headers.forEach(header => {
            const diff = Math.abs(cell.mid - header.mid);
            if (diff < minDiff) {
              minDiff = diff;
              closestHeader = header;
            }
          });

          if (closestHeader && minDiff < 100) {
            rowMap[closestHeader.text] = cell.text;
          }
        });

        if (Object.keys(rowMap).length > 0) {
          // Safeguard: Only push rows that contain meaningful, non-empty data cells
          const hasMeaningfulData = Object.values(rowMap).some(val => val !== '' && val !== 'N/A' && val !== '.');
          if (hasMeaningfulData) {
            scrapedRows.push(rowMap);
          }
        }
      }
      return scrapedRows;
    });
  }

  /**
   * Scrapes GWT split grid tables dynamically, paginating if a next page control is available.
   * 
   * @returns {Promise<Array<Object>>} Resolved consolidated horizontal rows.
   */
  async scrapeGrid() {
    console.log('[GwtBlotterPage] Commencing coordinate-based GWT grid scrape...');
    const frame = await this.getFrame();

    // Dynamically wait up to 15s for GWT's grid row cells to be fully attached to the DOM before scraping
    const rowSelector = '.datafrozenGrid-full tbody tr, .frozencontainer tbody tr, .datafloatingGrid-full tbody tr, .data-grid tbody tr, .tradeBlotter-rightPanel tbody tr';
    await frame.locator(rowSelector).first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000); // Safe 2s stabilization dwell time

    let allScrapedRows = [];
    let isEnd = false;
    let pagesScraped = 0;
    const maxPages = 15; // Safety cap to avoid infinite loops

    while (!isEnd && pagesScraped < maxPages) {
      pagesScraped++;
      const visibleRows = await this._scrapeVisiblePage();
      allScrapedRows.push(...visibleRows);

      // Locate GWT's Next Page image/button inside the frame dynamically
      const nextBtn = frame.locator('img[title*="Next Page"], img[alt*="Next Page"], [class*="nextPage"], [class*="NextPage"], button:has-text("Next"), a:has-text("Next")').first();
      const count = await nextBtn.count().catch(() => 0);
      
      if (count > 0 && await nextBtn.isVisible().catch(() => false)) {
        console.log(`[GwtBlotterPage] Navigating to GWT Next Page (Page ${pagesScraped})...`);
        await nextBtn.click({ force: true });
        
        // Wait for GWT GWTPopupPanel / Loading panels and settle transitions
        const loadingPanel = frame.locator('.gwt-PopupPanel, .glassPanel, div:has-text("Loading")').first();
        const loadCount = await loadingPanel.count().catch(() => 0);
        if (loadCount > 0 && await loadingPanel.isVisible()) {
          await loadingPanel.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        } else {
          await this.page.waitForTimeout(3000);
        }
      } else {
        isEnd = true;
      }
    }

    console.log(`[GwtBlotterPage] GWT scrape complete! Consolidated ${allScrapedRows.length} total rows.`);
    return allScrapedRows;
  }
}

module.exports = {
  GwtBlotterPage
};
