const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--host-rules=MAP mtmb2.demo.markit.partners 10.204.145.6',
      '--ignore-certificate-errors'
    ]
  });
  const page = await browser.newPage();
  try {
    console.log('[Diag] Navigating to login page...');
    await page.goto('https://mtmb2.demo.markit.partners/EQT/eauth/elogin.jsp');
    const userField = page.locator('input[type="text"], input[name*="user" i]').first();
    if (await userField.isVisible().catch(() => false)) {
      await userField.fill('mw.demo');
      await page.fill('input[type="password"]', 'Password007');
      await page.keyboard.press('Enter');
      await page.waitForNavigation().catch(() => {});
    }
    console.log('[Diag] Navigating to ag-Grid New UI...');
    await page.goto('https://mtmb2.demo.markit.partners/mtp-ui/#/app/trade/tradeblotter');
    await page.waitForTimeout(6000);

    // Redirect Check
    const tradeBlotterNav = page.locator('button, a').filter({ hasText: /^Trade Blotter/i }).first();
    if (await tradeBlotterNav.isVisible().catch(() => false)) {
      await tradeBlotterNav.click({ force: true });
      await page.waitForTimeout(4000);
    }

    // Expand search criteria
    console.log('[Diag] Expanding all search criteria...');
    const showAllBtn = page.locator('button', { hasText: 'Show All Criteria' }).first();
    if (await showAllBtn.isVisible().catch(() => false)) {
      await showAllBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Locate Clearing Status card
    console.log('[Diag] Searching for Clearing Status card...');
    const labelLocator = page.locator('label, .card-label, .field-label').filter({ hasText: /^Clearing Status$/i }).first();
    const container = labelLocator.locator('xpath=./ancestor::*[contains(@class, "card") or contains(@class, "row") or contains(@class, "field") or contains(@class, "group") or contains(@class, "form")][1]');
    
    const dropdownTrigger = container.locator('p-dropdown, p-multiselect, .p-dropdown, .p-multiselect, .p-dropdown-trigger').first();
    if (await dropdownTrigger.count() > 0) {
      console.log('[Diag] Clicking Clearing Status dropdown component...');
      await dropdownTrigger.click({ force: true });
      await page.waitForTimeout(3000);

      const options = await page.evaluate(() => {
        const panel = document.querySelector('.p-dropdown-panel, .p-multiselect-panel, .p-overlaypanel, .p-overlay, .p-overlay-panel');
        if (!panel) return 'No dropdown overlay panel found on the page!';
        const items = Array.from(panel.querySelectorAll('.p-dropdown-item, .p-multiselect-item, li'));
        return items.map(item => {
          return {
            text: item.textContent.trim(),
            rawHtml: item.outerHTML.substring(0, 150)
          };
        });
      });
      console.log('=== ag-Grid CLEARING STATUS DROPDOWN OPTIONS ===');
      console.log(JSON.stringify(options, null, 2));
    } else {
      console.log('[Diag] Clearing Status dropdown trigger not found!');
    }

  } catch (err) {
    console.error('[Diag Error]', err);
  } finally {
    await browser.close();
  }
})();
