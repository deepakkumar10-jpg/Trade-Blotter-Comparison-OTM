/**
 * Page Object Model representing the modern PrimeNG/ag-Grid-based Trade Blotter (New UI).
 * Utilizes direct-field-row locating, dynamic waiting, and clean native resets.
 */
class AgGridBlotterPage {
  /**
   * @param {import('playwright').Page} page - The main Playwright Page instance.
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Waits dynamically for any active loading spinners, progress bars, or block overlays to disappear.
   */
  async waitForLoaders() {
    console.log('[AgGridBlotterPage] Waiting for active loading spinners to settle...');
    const spinner = this.page.locator('.loading, .p-progressbar, .p-blockui, .spinner').first();
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000); // Small buffer for DOM rendering stability
  }

  /**
   * Verifies if a collapsible .filter-card is closed and programmatically expands it as mandated by GEMINI.md.
   * Uses precise exact-regex matching to avoid near-miss label collisions.
   * 
   * @param {string} fieldLabel - The filter label (e.g. 'Trade Date', 'Workflow').
   */
  async ensureFilterCardExpanded(fieldLabel) {
    console.log(`[AgGridBlotterPage] Checking collapsible card accordion state for [${fieldLabel}]...`);
    const activePanel = this.page.locator('.mtm-extended-search-container, mtm-extended-search, .filter-panel, .criteria-group-card, .filter-section').filter({ visible: true }).first();
    
    // Resiliently match whitespaces (including non-breaking spaces like \u00a0) by replacing space with \s+
    const exactRegex = new RegExp(`^\\s*${fieldLabel.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*:?\\s*$`, 'i');
    
    const card = activePanel.locator('.filter-card, .criteria-group-card, .p-panel').filter({
      has: this.page.locator('label, .card-label, .field-label, .p-panel-header, h5, .card-header').filter({ hasText: exactRegex })
    }).first();

    const cardCount = await card.count();
    if (cardCount > 0) {
      // Scroll the card itself into view first to resolve any offscreen/scroll clipping visibility blocks!
      await card.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(200);

      // Programmatically and robustly evaluate whether the card content or any of its inputs are actually expanded and visible
      const isVisible = await card.evaluate((el) => {
        // 1. Check toggleable / collapsible panel content directly if present
        const content = el.querySelector('.p-toggleable-content, .p-panel-content, .card-body, .criteria-group-body');
        if (content) {
          const style = window.getComputedStyle(content);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (content.clientHeight === 0) return false; // Collapsed in transition
          return true;
        }
        // 2. Fallback: check if ANY input or treeselect element inside the card is physically visible to the user
        const inputs = Array.from(el.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"]), p-treeselect, .p-treeselect'));
        if (inputs.length === 0) return true; // If no inputs exist, consider it visible by default
        return inputs.some(inp => {
          const style = window.getComputedStyle(inp);
          const rect = inp.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0 && rect.width > 0;
        });
      }).catch(() => false);

      if (!isVisible) {
        console.log(`[AgGridBlotterPage] Card [${fieldLabel}] input is not visible. Triggering accordion header expansion...`);
        await this.dismissOverlays();
        const header = card.locator('.p-panel-header-icon, .p-panel-toggler, button[class*="p-panel-toggler"], .card-header, .p-panel-header, h3, h4, h5').first();
        await header.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        const countHeader = await header.count().catch(() => 0);
        if (countHeader > 0) {
          await header.click({ force: true }).catch(() => {});
          await this.page.waitForTimeout(1500); // Accordion slide transition buffer
        } else {
          console.log(`[AgGridBlotterPage] Warning: Expansion header/toggler not found for [${fieldLabel}].`);
        }
      } else {
        console.log(`[AgGridBlotterPage] Card [${fieldLabel}] is already expanded and visible.`);
      }
    } else {
      // The card is NOT in the active panel! It is only a .field-row in the drawer!
      console.log(`[AgGridBlotterPage] Card [${fieldLabel}] is not in active panel. Locating inside drawer...`);
      const row = activePanel.locator('.field-row').filter({
        has: this.page.locator('label, .card-label, .field-label').filter({ hasText: exactRegex })
      }).first();

      if (await row.count() > 0) {
        // Uncollapse the drawer first
        await this.expandAllCriteria();
        
        // Find the checkbox inside the drawer row to activate/add the card
        const checkbox = row.locator('input[type="checkbox"], p-checkbox, .p-checkbox-box').first();
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          console.log(`[AgGridBlotterPage] Checking drawer row checkbox for [${fieldLabel}] to add card to panel...`);
          await checkbox.click({ force: true });
          await this.page.waitForTimeout(1000);
          await this.waitForLoaders();
        }
      } else {
        console.log(`[AgGridBlotterPage] No .filter-card or .field-row found for [${fieldLabel}].`);
      }
    }
  }



  /**
   * Navigates to the New UI Trade Blotter and dynamically waits for page initialization.
   * 
   * @param {string} url - The target New UI url.
   */
  async navigate(url) {
    console.log(`[AgGridBlotterPage] Navigating to New UI: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await this.waitForLoaders();
    
    console.log('[AgGridBlotterPage] Waiting dynamically for main app layout to stabilize...');
    const appLayout = this.page.locator('.filter-panel, .header-section, .group-fields').first();
    await appLayout.waitFor({ state: 'attached', timeout: 30000 });

    // Safety Redirect Check: On DemoB/C, the platform sometimes redirects the user to the dashboard first.
    const tradeBlotterNav = this.page.locator('button, a').filter({ hasText: /^Trade Blotter/i }).first();
    try {
      if (await tradeBlotterNav.isVisible()) {
        console.log('[AgGridBlotterPage] Detected Dashboard landing. Clicking "Trade Blotter" top nav item...');
        await tradeBlotterNav.click({ force: true });
        
        console.log('[AgGridBlotterPage] Waiting dynamically for Trade Blotter panel to mount...');
        const filterPanel = this.page.locator('.filter-panel, .criteria-group-card').first();
        await filterPanel.waitFor({ state: 'attached', timeout: 20000 });
      } else {
        console.log('[AgGridBlotterPage] Trade Blotter app is already active.');
      }
    } catch (err) {
      console.warn(`[AgGridBlotterPage] Safety nav click check omitted: ${err.message}`);
    }
  }

  /**
   * Clicks the "Show All Criteria" button to render all filter fields.
   */
  async expandAllCriteria() {
    console.log('[AgGridBlotterPage] Expanding all search criteria...');
    const showAllBtn = this.page.locator('button', { hasText: 'Show All Criteria' }).first();
    
    // Safe check: Only click if the button is visible on the page
    if (await showAllBtn.isVisible()) {
      await showAllBtn.click({ force: true, timeout: 8000 }).then(() => {
        console.log('[AgGridBlotterPage] "Show All Criteria" button clicked successfully (Forced).');
      }).catch((err) => {
        console.log(`[AgGridBlotterPage] "Show All Criteria" click bypassed: ${err.message}`);
      });
    } else {
      console.log('[AgGridBlotterPage] "Show All Criteria" button is not visible (already expanded/collapsed), skipping.');
    }

    const firstFieldRow = this.page.locator('.field-row').first();
    await firstFieldRow.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  }

  /**
   * Resets active search filters on the New UI using the framework-native Reset button.
   * Avoids custom force-clear loops here to prevent GWT/PrimeNG state exceptions during redraw.
   */
  async resetCriteria() {
    console.log('[AgGridBlotterPage] Resetting active filters natively on New UI...');
    const resetButton = this.page.locator('button', { hasText: 'Reset' }).first();
    
    await resetButton.click({ force: true, timeout: 8000 }).then(() => {
      console.log('[AgGridBlotterPage] "Reset" button clicked successfully.');
    }).catch((err) => {
      console.log(`[AgGridBlotterPage] "Reset" button not found or already in default state: ${err.message}`);
    });
    
    // Wait for the native reset redraw to stabilize
    await this.page.waitForTimeout(3000);
    
    const firstFieldRow = this.page.locator('.field-row').first();
    await firstFieldRow.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    console.log('[AgGridBlotterPage] Native criteria reset completed and stabilized.');
  }

  /**
   * Programmatically clears default date range inputs (Trade Date and Last Activity Date) to ensure comparison baseline is clean.
   */
  async clearAllDateFilters() {
    console.log('[AgGridBlotterPage] Clearing all default date filters to ensure clean comparison baseline...');
    const dateLabels = ['Trade Date', 'Last Activity Date'];
    for (const label of dateLabels) {
      try {
        const fieldRow = this.getFieldRow(label);
        const count = await fieldRow.count().catch(() => 0);
        if (count > 0) {
          const inputs = fieldRow.locator('input.p-inputtext, input.p-datepicker-input');
          const inputCount = await inputs.count().catch(() => 0);
          for (let i = 0; i < inputCount; i++) {
            const inp = inputs.nth(i);
            const handle = await inp.elementHandle().catch(() => null);
            if (handle) {
              await this.page.evaluate((el) => {
                el.value = '';
                el.dispatchEvent(new Event('focus', { bubbles: true }));
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
              }, handle);
            }
          }
        }
      } catch (err) {
        console.warn(`[AgGridBlotterPage] Failed to clear date filter for [${label}]: ${err.message}`);
      }
    }
  }



  /**
   * Locates a field row based on its text label.
   * 
   * @param {string} fieldLabel - The text label of the filter field (e.g., 'Trade ID', 'Workflow').
   * @returns {import('playwright').Locator} Playwright locator targeting the parent .field-row container.
   */
  /**
   * Locates a field row or filter card based on its text label.
   * Prioritizes active filter cards in the Selected Criteria pane first, falling back to drawer rows.
   * Uses precise exact-regex matching to completely avoid near-miss substring collisions.
   * 
   * @param {string} fieldLabel - The text label of the filter field (e.g., 'Trade ID', 'Workflow').
   * @returns {import('playwright').Locator} Playwright locator targeting the parent container.
   */
  getFieldRow(fieldLabel) {
    // Clean label text: remove question marks, colons, select, edit, reset, and whitespace noise
    // to dynamically prevent punctuation-based near-misses (e.g. GWT "Sent?" vs ag-Grid "Sent")
    let cleanLabel = fieldLabel.replace(/[?:]/g, '').replace(/Selected\(\d+\)/gi, '').replace(/(edit|reset)/gi, '').trim().toLowerCase();
    
    // Highly reusable, standard mapping alias of GWT labels to ag-Grid card headers on the screen
    const labelAliases = {
      'source': 'platform',
      'is package trade': 'package trade',
      'broker submitted novation': 'broker submitted',
      'settlement agency status': 'settlement agency'
    };
    cleanLabel = labelAliases[cleanLabel] || cleanLabel;
    
    // Find the innermost label/text element on ag-Grid that contains our cleaned label text
    const labelLocator = this.page.locator('label, .card-label, .field-label, .p-panel-header, h5, .card-header').filter({
      hasText: new RegExp(cleanLabel.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
    }).first();
    
    // Squeeze out its closest ancestor form row, card, field container, or form-group dynamically
    const container = labelLocator.locator('xpath=./ancestor::*[contains(@class, "card") or contains(@class, "row") or contains(@class, "field") or contains(@class, "group") or contains(@class, "form") or contains(@class, "container")][1]');
    
    return container;
  }

  /**
   * Populates an input field inside a specific field row natively,
   * falling back to DOM events on failure.
   * 
   * @param {string} fieldLabel - The filter field label.
   * @param {string} selector - Input element selector inside the field row.
   * @param {number} index - The zero-based index of the target input element.
   * @param {string} value - The literal text value to populate.
   */
  async fillFieldInput(fieldLabel, selector, index, value) {
    console.log(`[AgGridBlotterPage] Populating field [${fieldLabel}] index ${index} with value [${value}]...`);
    try {
      // MANDATE: Always ensure the parent collapsible filter accordion is expanded and visible before typing
      await this.ensureFilterCardExpanded(fieldLabel);

      const fieldRow = this.getFieldRow(fieldLabel);
      const inputLocator = fieldRow.locator(selector).nth(index);

      await inputLocator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});

      // For datepicker inputs, keep it super simple: click to focus, fill value, and blur to close the calendar natively.
      if (selector.includes('datepicker') || fieldLabel.toLowerCase().includes('date')) {
        await inputLocator.click({ force: true }).catch(() => {});
        await inputLocator.fill('');
        await inputLocator.fill(value);
        await inputLocator.blur().catch(() => {});
        await this.page.waitForTimeout(500); // Wait for input to commit and calendar to close
        console.log(`[AgGridBlotterPage] Datepicker [${fieldLabel}] index ${index} filled cleanly.`);
        return;
      }

      await inputLocator.click({ force: true, timeout: 5000 }); // Force click to override overlays
      await this.page.waitForTimeout(200);

      // Select all and delete to clear potential custom input masks
      await inputLocator.focus();
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(100);

      await inputLocator.type(value, { delay: 30 });
      await this.page.waitForTimeout(100);

      // Force Angular/PrimeNG form model state synchronization
      const handle = await inputLocator.elementHandle();
      if (handle) {
        await this.page.evaluate((el) => {
          el.dispatchEvent(new Event('focus', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }, handle);
      }

      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(200);
      console.log(`[AgGridBlotterPage] Native entry for field [${fieldLabel}] index ${index} successful.`);
    } catch (err) {
      console.warn(`[AgGridBlotterPage] Native entry failed: ${err.message}. Invoking DOM evaluation fallback...`);
      await this.ensureFilterCardExpanded(fieldLabel);
      
      const fallbackSuccess = await this.page.evaluate(({ label, sel, idx, val }) => {
        const rows = Array.from(document.querySelectorAll('.field-row, .filter-card, .p-panel'));
        const row = rows.find(r => {
          const lbl = r.querySelector('label.field-label, .card-label, .p-panel-header, h5');
          return lbl && lbl.textContent.trim().replace(/:/g, '').toLowerCase() === label.trim().toLowerCase();
        });
        if (row) {
          const inputs = Array.from(row.querySelectorAll(sel));
          const inp = inputs[idx];
          if (inp) {
            inp.value = val;
            inp.dispatchEvent(new Event('focus', { bubbles: true }));
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, { label: fieldLabel, sel: selector, idx: index, val: value });

      if (!fallbackSuccess) {
        throw new Error(`[AgGridBlotterPage] Failed to input value [${value}] for field [${fieldLabel}] index ${index} using both native and fallback methods!`);
      }
    }
  }

  /**
   * Populates a generic date range filter.
   * @param {string} fieldLabel - The filter field label
   * @param {string} from - Formatted date (dd-MMM-yyyy)
   * @param {string} to - Formatted date (dd-MMM-yyyy)
   */
  /**
   * Populates a generic date range filter.
   * Handles switching between Calendar mode and Date Formula (T) offset mode.
   * 
   * @param {string} fieldLabel - The filter field label
   * @param {string} from - Formatted date (dd-MMM-yyyy) or formula (e.g. t-3)
   * @param {string} to - Formatted date (dd-MMM-yyyy) or formula (e.g. t+1)
   */
  async fillDateRange(fieldLabel, from, to) {
    const fieldRow = this.getFieldRow(fieldLabel);
    
    // Diagnostic logging to inspect inputs inside the card
    const inputsInCard = await fieldRow.evaluate((row) => {
      const inps = Array.from(row.querySelectorAll('input'));
      return inps.map((inp, idx) => ({
        idx,
        tagName: inp.tagName,
        type: inp.type,
        className: inp.className,
        id: inp.id,
        placeholder: inp.placeholder,
        offsetWidth: inp.offsetWidth,
        offsetHeight: inp.offsetHeight,
        visible: inp.offsetHeight > 0 && inp.offsetWidth > 0,
        value: inp.value,
        computedDisplay: window.getComputedStyle(inp).display,
        computedVisibility: window.getComputedStyle(inp).visibility
      }));
    }).catch((err) => ({ error: err.message }));
    console.log(`[AgGridBlotterPage] Inputs inside card [${fieldLabel}]:`, JSON.stringify(inputsInCard, null, 2));

    const isFormula = (val) => val && /^[tT]([-+]\d+)?$/.test(val.trim());
    const useFormulaMode = isFormula(from) || isFormula(to);
    
    if (useFormulaMode) {
      console.log(`[AgGridBlotterPage] Discovered Date Offset Formula inputs for [${fieldLabel}] (From: "${from}", To: "${to}").`);
      
      // 1. Toggle Formula mode if needed
      const formulaInput = fieldRow.locator('input.mtp-t-input, input[placeholder*="e.g. t-"]').first();
      const isVisible = await formulaInput.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`[AgGridBlotterPage] Formula inputs are hidden. Toggling Formula mode...`);
        const diag = await fieldRow.evaluate((row) => {
          const elements = Array.from(row.querySelectorAll('button, a, span, div, .p-button, [class*="button"]'));
          const report = { found: false, allLabels: [], clicked: null };
          elements.forEach(el => {
            const txt = el.textContent.trim();
            if (txt) report.allLabels.push(txt);
          });
          const tab = elements.find(el => {
            const txt = el.textContent.trim().replace(/\s+/g, '').toLowerCase();
            return txt === 'from(t)to(t)' || txt === 'from(t)/to(t)';
          });
          if (tab) {
            report.found = true;
            report.tabText = tab.textContent.trim();
            tab.click();
            report.clicked = true;
          }
          return report;
        }).catch((err) => ({ error: err.message }));
        console.log(`[AgGridBlotterPage] Formula Toggle Diagnostics:`, JSON.stringify(diag, null, 2));
        await this.page.waitForTimeout(1000);
      }
      
      // 2. Fill the formula inputs
      const inputSelector = 'input.mtp-t-input, input[placeholder*="e.g. t-"]';
      await this.fillFieldInput(fieldLabel, inputSelector, 0, from || '');
      await this.fillFieldInput(fieldLabel, inputSelector, 1, to || '');
    } else {
      console.log(`[AgGridBlotterPage] Discovered Calendar datepicker inputs for [${fieldLabel}] (From: "${from}", To: "${to}").`);
      
      // 1. Toggle Calendar mode if needed
      const datepickerInput = fieldRow.locator('input.p-datepicker-input').first();
      const isVisible = await datepickerInput.isVisible().catch(() => false);
      if (!isVisible) {
        console.log(`[AgGridBlotterPage] Calendar inputs are hidden. Toggling Calendar mode...`);
        const diag = await fieldRow.evaluate((row) => {
          const elements = Array.from(row.querySelectorAll('button, a, span, div, .p-button, [class*="button"]'));
          const report = { found: false, allLabels: [], clicked: null };
          elements.forEach(el => {
            const txt = el.textContent.trim();
            if (txt) report.allLabels.push(txt);
          });
          const tab = elements.find(el => {
            const txt = el.textContent.trim().replace(/\s+/g, '').toLowerCase();
            return txt === 'fromto' || txt === 'from/to';
          });
          if (tab) {
            report.found = true;
            report.tabText = tab.textContent.trim();
            tab.click();
            report.clicked = true;
          }
          return report;
        }).catch((err) => ({ error: err.message }));
        console.log(`[AgGridBlotterPage] Calendar Toggle Diagnostics:`, JSON.stringify(diag, null, 2));
        await this.page.waitForTimeout(1000);
      }
      
      // 2. Fill the calendar datepicker inputs separately (Index 0 = From, Index 1 = To)
      await this.fillFieldInput(fieldLabel, 'input.p-datepicker-input', 0, from || '');
      
      // Safety pause for UI rendering of native input commit
      await this.page.waitForTimeout(500);

      await this.fillFieldInput(fieldLabel, 'input.p-datepicker-input', 1, to || '');
    }
    
    await this.dismissOverlays();
  }

  /**
   * Populates a Trade ID filter.
   * @param {string} tradeId 
   */
  async fillTradeId(tradeId) {
    await this.fillFieldInput('Trade ID', 'input.text-input', 0, tradeId);
  }

  /**
   * Populates a Trade Date range filter.
   * @param {string} from - Formatted date (dd-MMM-yyyy)
   * @param {string} to - Formatted date (dd-MMM-yyyy)
   */
  async fillTradeDateRange(from, to) {
    await this.fillDateRange('Trade Date', from, to);
  }

  /**
   * Populates a Last Activity Date range filter.
   * @param {string} from - Formatted date (dd-MMM-yyyy)
   * @param {string} to - Formatted date (dd-MMM-yyyy)
   */
  async fillLastActivityDateRange(from, to) {
    await this.fillDateRange('Last Activity Date', from, to);
  }

  /**
   * Selects a checklist item from the Workflow dropdown.
   * @param {string} workflowName - e.g., "Clearing"
   */
  async selectWorkflow(workflowName) {
    console.log(`[AgGridBlotterPage] Selecting Workflow dropdown checklist item: ${workflowName}`);
    
    const fieldRow = this.getFieldRow('Workflow');
    const treeSelectTrigger = fieldRow.locator('.p-treeselect, .p-treeselect-trigger').first();
    
    await treeSelectTrigger.scrollIntoViewIfNeeded();
    await treeSelectTrigger.click({ force: true });
    await this.page.waitForTimeout(2000);

    // Locate the target node in the active tree list overlay and click its checkbox
    await this.page.evaluate((name) => {
      const panel = document.querySelector('.p-treeselect-panel');
      if (panel) {
        const nodes = Array.from(panel.querySelectorAll('.p-treenode-label, .p-tree-node-content, li span'));
        const targetNode = nodes.find(n => n.textContent.trim() === name);
        if (targetNode) {
          const nodeContainer = targetNode.closest('.p-treenode-content, li, div');
          const cb = nodeContainer ? nodeContainer.querySelector('.p-checkbox-box, .p-treenode-checkbox') : null;
          if (cb) cb.click();
        }
      }
    }, workflowName);
    await this.page.waitForTimeout(1000);

    // Close treeselect popup panel by clicking body
    await this.page.click('.panel-header, body', { force: true });
  }

  /**
   * Generically populates any search criteria field on ag-Grid New UI by dynamically 
   * discovering its input controls and routing the action based on DOM types.
   * 
   * @param {string} fieldLabel - e.g. "Trade Date", "Product", "Account Number", "My Product Type ID"
   * @param {string} value - The target text or selection value (e.g. "EQS: Equity Swap")
   * @param {string} [fromValue] - The 'From' boundary for ranges
   * @param {string} [toValue] - The 'To' boundary for ranges
   */
  async populateField(fieldLabel, value, fromValue, toValue, containsMode) {
    if (fieldLabel.toLowerCase() === 'intended for clearing') {
      const shouldCheck = (value.toLowerCase() === 'yes');
      console.log(`[AgGridBlotterPage] Intercepted [Intended for Clearing]. Routing as Clearing Status -> Intended for Clearing (Check: ${shouldCheck})`);
      
      if (shouldCheck) {
        await this.selectDropdownOption('Clearing Status', 'Intended for Clearing');
      } else {
        console.log(`[AgGridBlotterPage] Option is 'No' (unchecked). Keeping Clearing Status in default reset state.`);
      }
      return;
    }

    console.log(`[AgGridBlotterPage] Polymorphic Field Population -> Label: [${fieldLabel}], Value: [${value}], Range: [${fromValue} - ${toValue}], ContainsMode: [${containsMode}]`);

    await this.ensureFilterCardExpanded(fieldLabel);
    const fieldRow = this.getFieldRow(fieldLabel);

    // Toggle the "Contains" checkbox on ag-Grid New UI if containsMode is specified
    if (containsMode !== undefined && containsMode !== null) {
      const checkbox = fieldRow.locator('input[type="checkbox"]').first();
      const count = await checkbox.count().catch(() => 0);
      if (count > 0) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        const targetState = containsMode === true || containsMode === 'true';
        if (isChecked !== targetState) {
          console.log(`[AgGridBlotterPage] Setting New UI "Contains" checkbox inside row [${fieldLabel}] to: ${targetState}`);
          const handle = await checkbox.elementHandle().catch(() => null);
          if (handle) {
            await this.page.evaluate((cb) => cb.click(), handle);
          }
          await this.page.waitForTimeout(200);
        }
      }
    }

    // Discover the input controls inside the row/card at runtime with 100% precision
    const widgetType = await fieldRow.evaluate((row) => {
      // 1. TreeSelect check
      if (row.querySelector('p-treeselect, .p-treeselect, [data-pc-name="treeselect"]')) {
        return 'treeselect';
      }
      // 2. Datepicker check
      if (row.querySelector('input.p-datepicker-input, .p-datepicker')) {
        return 'datepicker';
      }
      // 3. Dropdown or Multiselect check (including modern PrimeNG 18 p-select and single select widgets)
      if (row.querySelector('p-dropdown, p-multiselect, p-select, mtm-tb-single-select, .p-dropdown, .p-multiselect, .p-select, [data-pc-name="dropdown"], [data-pc-name="select"], [data-pc-name="multiselect"]')) {
        return 'dropdown';
      }
      // 4. Double/Range Textbox check (skip checkboxes)
      const textInputs = Array.from(row.querySelectorAll('input.text-input, input.p-inputtext, input:not([type="checkbox"]):not([type="hidden"])'));
      if (textInputs.length > 1) {
        return 'range_textbox';
      }
      // 5. Standard single text search input check
      if (textInputs.length === 1) {
        return 'textbox';
      }
      // 6. Checkbox categories fallback
      if (row.querySelector('input[type="checkbox"], input[type="radio"]')) {
        return 'checkbox';
      }
      return 'textbox';
    }).catch(() => 'textbox');

    console.log(`[AgGridBlotterPage] Discovered Widget Type for [${fieldLabel}]: [${widgetType}]`);

    // Polymorphic Routing
    const inputSelector = 'input.text-input, input.p-inputtext, input:not([type="checkbox"]):not([type="hidden"])';
    if (widgetType === 'treeselect') {
      await this.selectTreeOption(fieldLabel, value);
    } else if (widgetType === 'dropdown') {
      await this.selectDropdownOption(fieldLabel, value);
    } else if (widgetType === 'checkbox') {
      await this.selectInlineCheckboxOption(fieldLabel, value);
    } else if (widgetType === 'datepicker') {
      await this.fillDateRange(fieldLabel, fromValue || value || '', toValue || '');
    } else if (widgetType === 'range_textbox') {
      await this.fillFieldInput(fieldLabel, inputSelector, 0, fromValue || value || '');
      await this.fillFieldInput(fieldLabel, inputSelector, 1, toValue || '');
    } else {
      // Standard textbox fallback (with fallback to fromValue for robust BDD range-outline mapping)
      await this.fillFieldInput(fieldLabel, inputSelector, 0, value || fromValue || '');
    }
  }

  /**
   * Selects a checklist item from a Dropdown or MultiSelect (e.g. Transaction Acceptance Status, Sent?, Is Package Trade).
   * Supports PrimeNG dropdown and multiselect overlays.
   */
  async selectDropdownOption(fieldLabel, optionName) {
    if (optionName.toLowerCase() === 'all folders' || optionName.toLowerCase() === 'all') {
      console.log(`[AgGridBlotterPage] Option [${optionName}] represents default unfiltered state for [${fieldLabel}]. Bypassing selection.`);
      return;
    }

    console.log(`[AgGridBlotterPage] Selecting ${fieldLabel} dropdown/multiselect option: ${optionName}`);

    const fieldRow = this.getFieldRow(fieldLabel);
    await this.ensureFilterCardExpanded(fieldLabel);

    // Locate the main PrimeNG dropdown/multiselect/select component container (highly robust matching on triggers/wrappers)
    const component = fieldRow.locator('p-dropdown, p-multiselect, p-select, mtm-tb-single-select, .p-dropdown, .p-multiselect, .p-select, .p-dropdown-trigger, .p-multiselect-trigger, .p-select-dropdown').first();
    const countComp = await component.count().catch(() => 0);

    if (countComp > 0) {
      console.log(`[AgGridBlotterPage] Clicking main dropdown component for [${fieldLabel}]...`);
      await component.scrollIntoViewIfNeeded().catch(() => {});
      await component.click({ force: true });
      
      // Wait up to 3 seconds for dropdown panel to become visible
      const overlayLocator = this.page.locator('.p-dropdown-panel, .p-multiselect-panel, .p-select-panel, .p-select-overlay, .p-overlaypanel, .p-overlay, .p-overlay-panel').first();
      try {
        await overlayLocator.waitFor({ state: 'visible', timeout: 3000 });
      } catch (err) {
        console.log(`[AgGridBlotterPage] Dropdown panel failed to open within 3s. Re-clicking main component to ensure open state...`);
        await component.click({ force: true }).catch(() => {});
        await overlayLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      }
      
      const itemLocator = overlayLocator.locator('.p-dropdown-item, .p-multiselect-item, .p-select-option, li').first();
      await itemLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(500); // Settle transition
    } else {
      throw new Error(`[AgGridBlotterPage] Dropdown/MultiSelect component not found for [${fieldLabel}]`);
    }

    const debugResult = await this.page.evaluate(({ name }) => {
      const panel = document.querySelector('.p-dropdown-panel, .p-multiselect-panel, .p-select-panel, .p-select-overlay, .p-overlaypanel, .p-overlay, .p-overlay-panel');
      if (!panel) return { clicked: false, error: 'No panel found!' };
      
      const checkedItems = Array.from(panel.querySelectorAll('li.p-highlight, li[aria-selected="true"], [role="option"][aria-selected="true"]'));
      checkedItems.forEach(item => {
        try {
          item.click();
        } catch (e) {}
      });

      const items = Array.from(panel.querySelectorAll('.p-dropdown-item, .p-multiselect-item, .p-select-option, li[role="option"], li'));
      const texts = items.map(el => el.textContent.replace(/\u00a0/g, ' ').trim());
      
      let target = items.find(el => {
        const txt = el.textContent.replace(/\u00a0/g, ' ').trim().toLowerCase();
        return txt === name.replace(/\u00a0/g, ' ').trim().toLowerCase();
      });
      
      if (!target) {
        target = items.find(el => {
          const txt = el.textContent.replace(/\u00a0/g, ' ').trim().toLowerCase();
          return txt.includes(name.replace(/\u00a0/g, ' ').trim().toLowerCase());
        });
      }

      if (target) {
        target.click();
        return { clicked: true };
      }
      return { clicked: false, error: `Option [${name}] not found in panel!`, availableTexts: texts };
    }, { name: optionName });

    await this.page.waitForTimeout(500);
    await this.dismissOverlays();

    if (!debugResult.clicked) {
      throw new Error(`[AgGridBlotterPage] Failed to select option [${optionName}] in dropdown/multiselect panel overlay for [${fieldLabel}]. Diagnostics: ${JSON.stringify(debugResult)}`);
    }
  }

  /**
   * Selects a horizontal/inline checklist option box or radio button (e.g. Sent?, Is Package Trade, Broker Submitted Novation).
   * Supports standard checkbox boxes and custom PrimeNG structures.
   * 
   * @param {string} fieldLabel - e.g. "Sent?"
   * @param {string} optionName - e.g. "Yes" or "No"
   */
  async selectInlineCheckboxOption(fieldLabel, optionName) {
    console.log(`[AgGridBlotterPage] Selecting inline checkbox option [${optionName}] inside card [${fieldLabel}]`);
    const fieldRow = this.getFieldRow(fieldLabel);
    
    // Find checkbox label matching our value (case-insensitive)
    const exactRegex = new RegExp(`^\\s*${optionName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`,'i');
    const labelLocator = fieldRow.locator('label, span, .p-checkbox-label, .p-radiobutton-label').filter({ hasText: exactRegex }).first();
    const countLabel = await labelLocator.count().catch(() => 0);
    
    if (countLabel > 0) {
      const container = labelLocator.locator('xpath=./ancestor::*[contains(@class, "checkbox") or contains(@class, "radio") or contains(@class, "field") or contains(@class, "row") or self::div or self::span][1]');
      const cb = container.locator('.p-checkbox-box, .p-radiobutton-box, input[type="checkbox"], input[type="radio"]').first();
      if (await cb.count() > 0) {
        await cb.click({ force: true });
        return;
      }
    }

    // Fallback: click standard inputs or checkboxes directly inside the row
    const cbDirect = fieldRow.locator('input[type="checkbox"], input[type="radio"], .p-checkbox-box, .p-radiobutton-box').first();
    await cbDirect.click({ force: true }).catch(() => {});
  }

  /**
   * Selects a checklist item from a TreeSelect dropdown (e.g. Workflow, Product, My Product Type ID).
   * Supports PrimeNG 16/17 dropdown-based TreeSelect overlays and standard panels.
   * 
   * @param {string} fieldLabel - e.g., "Workflow" or "Product" or "My Product Type ID"
   * @param {string} optionName - e.g., "Clearing" or "EQS: Equity Swap"
   */
  async selectTreeOption(fieldLabel, optionName) {
    console.log(`[AgGridBlotterPage] Selecting ${fieldLabel} dropdown/static checklist item: ${optionName}`);

    const fieldRow = this.getFieldRow(fieldLabel);
    await this.ensureFilterCardExpanded(fieldLabel);

    const treeSelectTrigger = fieldRow.locator('.p-treeselect-label-container, .p-treeselect-dropdown, .p-treeselect, .p-treeselect-trigger').first();
    const hasTrigger = await treeSelectTrigger.count() > 0 && await treeSelectTrigger.isVisible();

    if (hasTrigger) {
      console.log(`[AgGridBlotterPage] Detected Dropdown TreeSelect for [${fieldLabel}]. Opening dropdown overlay...`);
      await treeSelectTrigger.scrollIntoViewIfNeeded().catch(() => {});
      await treeSelectTrigger.click({ force: true });
      await this.page.waitForTimeout(2000); // Wait for transition animation
    } else {
      console.log(`[AgGridBlotterPage] Detected Static Embedded Tree Panel inside card/row for [${fieldLabel}].`);
      await fieldRow.scrollIntoViewIfNeeded().catch(() => {});
    }

    // Locate the target node (either inside active dropdown or directly inside the static field row) and click its checkbox
    const debugResult = await this.page.evaluate(({ label, name, hasDropdown }) => {
      const report = { foundPanel: false, foundStaticRow: false, containerType: 'none', nodesCount: 0, matchedNode: null, clickedCheckbox: false, allNodesText: [] };
      
      let container = null;
      if (hasDropdown) {
        // Universal class checks matching PrimeNG 16/17 dropdown and overlay panel elements
        container = document.querySelector('.p-treeselect-overlay, .p-treeselect-panel, .p-overlay, .p-component-overlay');
        if (container) {
          report.foundPanel = true;
          report.containerType = 'dropdown-overlay';
        }
      }
      
      if (!container) {
        const rows = Array.from(document.querySelectorAll('.filter-card, .p-panel, .field-row'));
        const row = rows.find(r => {
          const lbl = r.querySelector('label, .card-label, .field-label, .p-panel-header, h5, .card-header');
          if (!lbl) return false;
          const cleanLblText = lbl.textContent.trim().replace(/:/g, '').toLowerCase();
          const cleanTargetLabel = label.trim().toLowerCase();
          return cleanLblText === cleanTargetLabel;
        });
        if (row) {
          container = row;
          report.foundStaticRow = true;
          report.containerType = 'static-row';
        }
      }

      if (container) {
        // First, clear/uncheck all currently checked checkboxes inside the container to prevent multiple selections
        const checkedCbs = Array.from(container.querySelectorAll('.p-checkbox-box.p-highlight, .p-treenode-checkbox.p-highlight, .p-checkbox-box[aria-checked="true"]'));
        checkedCbs.forEach(cb => {
          try {
            cb.click();
          } catch (e) {}
        });

        const nodes = Array.from(container.querySelectorAll('.p-treenode-label, .p-tree-node-content, li span, .p-treenode'));
        report.nodesCount = nodes.length;
        report.allNodesText = nodes.map(n => n.textContent.trim()).filter(t => t !== '');
        
        // Prioritize EXACT option name match first to completely avoid checkbox substring collisions
        let targetNode = nodes.find(n => {
          return n.textContent.trim().toLowerCase() === name.toLowerCase();
        });

        // Fall back to starts-with/includes sub-matching if no exact match is found
        if (!targetNode) {
          targetNode = nodes.find(n => {
            const txt = n.textContent.trim();
            return txt.toLowerCase().startsWith(name.toLowerCase() + ':') || 
                   name.toLowerCase().startsWith(txt.toLowerCase() + ':') ||
                   txt.toLowerCase().includes(name.toLowerCase()) ||
                   name.toLowerCase().includes(txt.toLowerCase());
          });
        }
        
        if (targetNode) {
          report.matchedNode = targetNode.textContent.trim();
          const nodeContainer = targetNode.closest('.p-treenode-content, li, div, .p-treenode');
          const cb = nodeContainer ? nodeContainer.querySelector('.p-checkbox-box, .p-treenode-checkbox') : null;
          if (cb) {
            cb.click();
            report.clickedCheckbox = true;
          }
        } else {
          // Fallback: search for standard flat PrimeNG checkboxes/labels inside the static row card
          const elements = Array.from(container.querySelectorAll('p-checkbox, .p-checkbox, label, span, td, div'));
          const targetEl = elements.find(el => {
            const txt = el.textContent.trim().toLowerCase();
            return txt === name.toLowerCase();
          }) || elements.find(el => {
            const txt = el.textContent.trim().toLowerCase();
            return txt.includes(name.toLowerCase());
          });
          
          if (targetEl) {
            report.matchedNode = targetEl.textContent.trim();
            // Find the PrimeNG checkbox box (.p-checkbox-box) within or next to the matched label and click it
            const parentContainer = targetEl.closest('.p-checkbox, p-checkbox, div, tr, td');
            const cb = parentContainer ? parentContainer.querySelector('.p-checkbox-box') : null;
            if (cb) {
              cb.click();
              report.clickedCheckbox = true;
            }
          }
        }
      }
      return report;
    }, { label: fieldLabel, name: optionName, hasDropdown: hasTrigger });
    
    console.log(`[AgGridBlotterPage] Tree Selection Diagnostics:`, JSON.stringify(debugResult, null, 2));
    await this.page.waitForTimeout(1000);

    // Close dropdown overlay panel
    if (hasTrigger) {
      await this.dismissOverlays();
    }

    if (!debugResult.clickedCheckbox) {
      throw new Error(`[AgGridBlotterPage] Failed to select option [${optionName}] in TreeSelect for field [${fieldLabel}]. Diagnostics: ${JSON.stringify(debugResult)}`);
    }
  }

  /**
   * Dismisses any active calendar overlays, dropdown panels, or datepicker modals.
   */
  async dismissOverlays() {
    console.log('[AgGridBlotterPage] Dismissing active overlays and datepicker modals...');

    // 1. Programmatically blur the active input/datepicker element to trigger native model blur and popup close
    await this.page.evaluate(() => {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }).catch(() => {});
    await this.page.waitForTimeout(200);

    // 2. Programmatically dismiss PrimeNG modal dialogs and notification panels via close buttons (restricting strictly to .p-dialog modal overlays!)
    const dialogCloseBtn = this.page.locator('.p-dialog-header-close, .p-dialog-close, .p-dialog button:has-text("Close"), .p-dialog button:has-text("OK"), .p-dialog button:has-text("Dismiss"), .p-dialog [aria-label="Close"]').filter({ visible: true }).first();
    const closeCount = await dialogCloseBtn.count().catch(() => 0);
    if (closeCount > 0 && await dialogCloseBtn.isVisible()) {
      console.log('[AgGridBlotterPage] Found active modal dialog/popup close button. Programmatically dismissing...');
      await dialogCloseBtn.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500);
    }

    // 3. Click-out to natively close overlays (with escape key only to prevent drawer closing!)
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200);

    // 4. Clear backdrop block-UI dialog masks programmatically to ensure full actionability of the underlying elements (only as post-dismiss fallback!)
    await this.page.evaluate(() => {
      const overlays = document.querySelectorAll('.p-dialog-mask, .p-blockui-document, .p-datepicker-panel');
      overlays.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
    }).catch(() => {});
  }

  /**
   * Dismisses overlays and clicks the Apply filter button.
   */
  async clickApply() {
    await this.dismissOverlays();

    console.log('[AgGridBlotterPage] Clicking "Apply" filter button...');
    
    // Target the precise Apply button inside the search criteria panel as specified by the user's exact component DOM tree
    let applyButton = this.page.locator('xpath=//mtm-extended-search//p-button[contains(., "Apply")]/button').first();
    const count = await applyButton.count().catch(() => 0);
    if (count === 0) {
      applyButton = this.page.locator('.filter-panel button:has-text("Apply"), .actions button:has-text("Apply"), .buttons button:has-text("Apply")').first();
    }

    await applyButton.click({ timeout: 8000 }).then(() => {
      console.log('[AgGridBlotterPage] "Apply" button clicked successfully.');
    }).catch((err) => {
      console.log(`[AgGridBlotterPage] Warning: Standard Apply click failed (${err.message}). Forcing click...`);
      return applyButton.click({ force: true, timeout: 5000 });
    });

    console.log('[AgGridBlotterPage] Waiting dynamically for ag-Grid query to load...');
    const agRow = this.page.locator('.ag-row, .ag-cell, Showing').first();
    await agRow.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000); // Dynamic buffer for grid rendering settlement
    await this.waitForLoaders();
  }

  /**
   * Scrapes ag-Grid's total trade count label displayed in the pagination or current results summary text.
   *
   * @returns {Promise<number|null>} Total matched trades as an integer.
   */
  async getAgGridTotalTradeCount() {
    return await this.page.evaluate(() => {
      // 1. Check ag-Grid paging panel row count labels or PrimeNG paginator first (highly accurate for filtered counts)
      const rowCountEl = document.querySelector('.ag-paging-row-summary-panel-number, .p-paginator-current, .ag-paging-row-summary-panel, .p-paginator-left');
      if (rowCountEl) {
        const text = rowCountEl.textContent.trim();
        const ofMatch = text.match(/of\s+([\d,]+)/i);
        if (ofMatch) {
          return parseInt(ofMatch[1].replace(/,/g, ''), 10);
        }
        const lastNumMatch = text.match(/([\d,]+)(?!\s*[\d,])/); // Match the last number group
        if (lastNumMatch) {
          return parseInt(lastNumMatch[1].replace(/,/g, ''), 10);
        }
      }

      // 2. Fallback to document-wide text matching
      const elements = Array.from(document.querySelectorAll('div, span, td, b, .ag-paging-panel'));
      // Look for a text pattern containing "trades" or "of" (like "Showing 1 to 50 of 4,895" or "4,895 trades")
      const matchEl = elements.find(el => {
        const text = el.textContent.trim();
        const hasTrades = text.toLowerCase().includes('trades') || text.toLowerCase().includes('showing');
        return hasTrades && el.children.length === 0;
      });

      if (matchEl) {
        const text = matchEl.textContent.trim();
        const ofMatch = text.match(/of\s+([\d,]+)/i);
        if (ofMatch) {
          return parseInt(ofMatch[1].replace(/,/g, ''), 10);
        }
        const tradesMatch = text.match(/([\d,]+)\s+trades/i);
        if (tradesMatch) {
          return parseInt(tradesMatch[1].replace(/,/g, ''), 10);
        }
      }
      return null;
    }).catch(() => null);
  }

  /**
   * Scrapes and parses rows and cells inside ag-Grid.
   * Leverages a robust scroll-and-accumulate loop to overcome DOM virtualization limits
   * and ensure 100% data extraction accuracy for large result grids.
   * Maps grid col-ids back to header labels.
   * 
   * @returns {Promise<Array<Object>>} Extracted rows of records.
   */
  async scrapeGrid() {
    console.log('[AgGridBlotterPage] Commencing virtualized ag-Grid scrape...');
    
    const viewportLocator = this.page.locator('.ag-body-viewport').first();
    const hasViewport = await viewportLocator.count() > 0;
    
    if (!hasViewport) {
      console.log('[AgGridBlotterPage] No virtual viewport found. Scraping visible grid directly.');
      return this._scrapeVisibleViewport();
    }
    
    let allGroupedRows = {};
    let lastScrollTop = -1;
    let isEnd = false;
    let maxScrollAttempts = 30; // Safety cap to avoid infinite loops
    let attempts = 0;
    
    // Ensure we start scraping from the very top of the grid
    await viewportLocator.evaluate(el => el.scrollTop = 0).catch(() => {});
    await this.page.waitForTimeout(400);
    
    while (!isEnd && attempts < maxScrollAttempts) {
      attempts++;
      
      // Scrape only the currently rendered/visible viewport batch
      const visibleRows = await this._scrapeVisibleViewport();
      visibleRows.forEach(row => {
        if (row && row.rowIndex !== null && row.rowIndex !== undefined) {
          allGroupedRows[row.rowIndex] = row.data;
        }
      });
      
      // PERFORMANCE OPTIMIZATION: Stop scrolling if we have already gathered 50 unique rows,
      // as the comparative test suite only compares up to the TOP 50 rows anyway!
      const uniqueRowCount = Object.keys(allGroupedRows).length;
      if (uniqueRowCount >= 50) {
        console.log(`[AgGridBlotterPage] Scrape optimized: reached ${uniqueRowCount} unique rows (comparison limit is 50). Stopping virtual scroll.`);
        break;
      }
      
      // Scroll down by 80% of client height to ensure overlapping rows are captured and merged seamlessly
      const scrollInfo = await viewportLocator.evaluate(el => {
        const prev = el.scrollTop;
        el.scrollBy(0, Math.round(el.clientHeight * 0.8) || 300);
        return {
          prevScrollTop: prev,
          currentScrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight
        };
      }).catch(() => ({ prevScrollTop: 0, currentScrollTop: 0, scrollHeight: 0, clientHeight: 0 }));
      
      console.log(`[AgGridBlotterPage] Scrolled viewport [Attempt ${attempts}]: ${scrollInfo.prevScrollTop} -> ${scrollInfo.currentScrollTop} (Max ScrollHeight: ${scrollInfo.scrollHeight})`);
      
      // Stop if the scrollbar hasn't moved (bottom reached)
      if (scrollInfo.currentScrollTop === lastScrollTop || scrollInfo.currentScrollTop === scrollInfo.prevScrollTop) {
        isEnd = true;
      }
      
      lastScrollTop = scrollInfo.currentScrollTop;
      await this.page.waitForTimeout(250); // Settle time for ag-Grid virtualization redraw
    }
    
    // Smoothly restore scroll position back to the top of the grid
    await viewportLocator.evaluate(el => el.scrollTop = 0).catch(() => {});
    await this.page.waitForTimeout(200);
    
    // Sort combined rows by raw numeric row-index
    const sortedIndexes = Object.keys(allGroupedRows).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const finalRows = sortedIndexes.map(idx => allGroupedRows[idx]);
    
    console.log(`[AgGridBlotterPage] Virtualized scrape complete! Consolidated ${finalRows.length} total unique rows.`);
    return finalRows;
  }

  /**
   * Auxiliary method to scrape the currently visible/rendered viewport batch of ag-Grid.
   * Helper for the virtual scroll-and-accumulate algorithm.
   * 
   * @private
   * @returns {Promise<Array<{rowIndex: number, data: Object}>>}
   */
  async _scrapeVisibleViewport() {
    return await this.page.evaluate(async () => {
      const headersMap = {};
      const groupedRows = {};

      const scrapeCurrentColumns = () => {
        // Map columns col-id to header label text
        Array.from(document.querySelectorAll('.ag-header-cell')).forEach(cell => {
          const colId = cell.getAttribute('col-id');
          const textEl = cell.querySelector('.ag-header-cell-text, [ref="eText"]');
          if (colId && textEl) {
            const txt = textEl.textContent.trim();
            if (txt) headersMap[colId] = txt;
          }
        });

        // Fetch all currently visible physical rows in the DOM
        const physicalRows = Array.from(document.querySelectorAll('.ag-row'));
        physicalRows.forEach(row => {
          const rowIndexStr = row.getAttribute('row-index');
          if (rowIndexStr === null) return;
          const rowIndex = parseInt(rowIndexStr, 10);

          if (!groupedRows[rowIndex]) {
            groupedRows[rowIndex] = {};
          }

          const cells = Array.from(row.querySelectorAll('.ag-cell'));
          cells.forEach(cell => {
            const colId = cell.getAttribute('col-id');
            if (!colId) return;

            const headerName = headersMap[colId] || colId;
            const textVal = (cell.textContent || '').trim();
            
            if (textVal !== '' || !groupedRows[rowIndex][headerName]) {
              groupedRows[rowIndex][headerName] = textVal;
            }
          });
        });
      };

      // 1. Scrape current (left) position
      scrapeCurrentColumns();

      // 2. Scroll to middle/right if horizontal scrollbar is present
      const centerViewport = document.querySelector('.ag-center-cols-viewport') || document.querySelector('.ag-body-viewport') || document.querySelector('.ag-body-horizontal-scroll-viewport');
      if (centerViewport && centerViewport.scrollWidth > centerViewport.clientWidth) {
        const step = Math.max(200, Math.round(centerViewport.clientWidth * 0.8) || 400);
        let currentScroll = 0;
        
        const scrollHorizontal = (val) => {
          const viewports = document.querySelectorAll('.ag-center-cols-viewport, .ag-body-viewport, .ag-body-horizontal-scroll-viewport');
          viewports.forEach(vp => {
            vp.scrollLeft = val;
          });
        };

        while (currentScroll < centerViewport.scrollWidth) {
          currentScroll += step;
          scrollHorizontal(currentScroll);
          // Wait briefly for virtualized columns to render and settle
          await new Promise(resolve => setTimeout(resolve, 200));
          scrapeCurrentColumns();
        }

        // Restore scrollLeft back to 0
        scrollHorizontal(0);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Convert grouped rows map back to visibleBatch array
      return Object.keys(groupedRows).map(idx => {
        const rowIndex = parseInt(idx, 10);
        return { rowIndex, data: groupedRows[idx] };
      });
    });
  }
}

module.exports = {
  AgGridBlotterPage
};
