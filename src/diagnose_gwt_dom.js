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
    await page.goto('https://mtmb2.demo.markit.partners/EQT/eauth/elogin.jsp');
    const userField = page.locator('input[type="text"], input[name*="user" i]').first();
    if (await userField.isVisible().catch(() => false)) {
      await userField.fill('mw.demo');
      await page.fill('input[type="password"]', 'Password007');
      await page.keyboard.press('Enter');
      await page.waitForNavigation().catch(() => {});
    }
    await page.goto('https://mtmb2.demo.markit.partners/EQT/ui/start.jsp#TradeBlotter:');
    await page.waitForTimeout(5000);

    let frame = page.frames().find(f => f.name() === 'frame_0') || page.mainFrame();
    
    // Expand criteria
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

    const structure = await frame.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td, th'));
      const workflowCell = cells.find(c => c.textContent.trim().toLowerCase().includes('workflow') && c.children.length === 0);
      if (!workflowCell) {
        // Broadest lookup
        const broadWorkflowCell = cells.find(c => c.textContent.trim().toLowerCase().includes('workflow'));
        if (!broadWorkflowCell) return { error: 'Workflow cell not found' };
        const row = broadWorkflowCell.closest('tr');
        return {
          cellText: broadWorkflowCell.textContent.trim(),
          rowHtml: row ? row.outerHTML : 'No parent row'
        };
      }

      const row = workflowCell.closest('tr');
      return {
        cellText: workflowCell.textContent.trim(),
        rowHtml: row ? row.outerHTML : 'No parent row'
      };
    });

    console.log('=== GWT WORKFLOW DOM STRUCTURE ===');
    console.log(JSON.stringify(structure, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
