const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--host-rules=MAP mtmb2.demo.markit.partners 10.204.145.6, MAP mtmc2.demo.markit.partners 10.204.145.7',
      '--ignore-certificate-errors'
    ]
  });
  const page = await browser.newPage();
  try {
    console.log('[Diagnostic] Logging in...');
    await page.goto('https://mtmb2.demo.markit.partners/EQT/eauth/elogin.jsp', { waitUntil: 'networkidle' });
    const userField = page.locator('input[type="text"], input[name*="user" i]').first();
    if (await userField.isVisible().catch(() => false)) {
      await userField.fill('mw.demo');
      await page.fill('input[type="password"]', 'Password007');
      await page.keyboard.press('Enter');
      await page.waitForNavigation().catch(() => {});
    }

    console.log('[Diagnostic] Navigating to GWT Old UI...');
    await page.goto('https://mtmb2.demo.markit.partners/EQT/ui/start.jsp#TradeBlotter:', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    let frame = page.frames().find(f => f.name() === 'frame_0') || page.mainFrame();
    
    // Expand GWT criteria
    const showCriteriaBtn = frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').first();
    if (await showCriteriaBtn.isVisible()) {
      await showCriteriaBtn.click();
      await page.waitForTimeout(1000);
    }
    const showAllBtn = frame.locator('//a[contains(text(), "Show All Criteria")]').first();
    if (await showAllBtn.isVisible().catch(() => false)) {
      await showAllBtn.click();
      await page.waitForTimeout(3000);
    }

    // Precise and robust GWT row cell selector matching GwtBlotterPage
    const xpathLabelCell = `//table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//td[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "counterparty company")] | //table[contains(@class, "filterFields") or contains(@class, "filter") or contains(@class, "criteria")]//th[not(.//td) and not(.//th) and contains(translate(normalize-space(translate(., '\\u00a0', ' ')), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "counterparty company")]`;
    const labelCell = frame.locator(xpathLabelCell).filter({ visible: true }).first();
    const row = labelCell.locator('xpath=./following-sibling::td[1]');
    const icon = row.locator('.multiselctIcon').first();
    
    if (await icon.isVisible()) {
      console.log('[Diagnostic] Found custom dropdown icon. Clicking it...');
      await icon.click();
      await page.waitForTimeout(3000);

      // Extract all options in the dropdown box popup overlay
      const options = await frame.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('.slectDropDownBoxBold, .gwt-PopupPanel div, .popupContent div, td, span'));
        return Array.from(new Set(divs.map(d => d.textContent.trim()).filter(Boolean))).slice(0, 100);
      });

      console.log('\n=========================================');
      console.log('🏛️ GWT COUNTERPARTY COMPANY OPTIONS:');
      console.log('=========================================');
      console.log(JSON.stringify(options, null, 2));
    } else {
      console.log('[Diagnostic] Custom dropdown icon not visible.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();