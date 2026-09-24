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
    console.log('[Diag] Navigating to Trade Blotter Old UI...');
    await page.goto('https://mtmb2.demo.markit.partners/EQT/ui/start.jsp#TradeBlotter:');
    await page.waitForTimeout(5000);

    let frame = page.frames().find(f => f.name() === 'frame_0') || page.mainFrame();
    
    // Expand criteria
    console.log('[Diag] Expanding criteria panel...');
    const showCriteriaBtn = frame.locator('.showCriteriaLink, a:has-text("Show Criteria")').first();
    if (await showCriteriaBtn.isVisible()) {
      await showCriteriaBtn.click();
      await page.waitForTimeout(1000);
    }
    const showAllBtn = frame.locator('//a[contains(text(), "Show All Criteria")]').first();
    if (await showAllBtn.isVisible().catch(() => false)) {
      await showAllBtn.click();
      await page.waitForTimeout(2000);
    }

    const allRowsText = await frame.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table[class*="filter"] tr, table[class*="criteria"] tr'));
      return rows.map(r => {
        const tds = Array.from(r.querySelectorAll('td, th'));
        return tds.map(td => td.textContent.trim()).filter(Boolean).join(' | ');
      }).filter(Boolean);
    });

    console.log('=== GWT ALL VISIBLE ROW LABELS ===');
    console.log(allRowsText.slice(0, 100));

  } catch (err) {
    console.error('[Diag Error]', err);
  } finally {
    await browser.close();
  }
})();
