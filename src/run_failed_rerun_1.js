const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the Failure Rerun 1 results JSON path
const RESULTS_PATH = path.join(__dirname, '..', 'reports', 'Failure Rerun 1 -22nd August - 30 min', 'test_results.json');

if (!fs.existsSync(RESULTS_PATH)) {
  console.error(`❌ Error: Failure Rerun 1 test_results.json not found at: ${RESULTS_PATH}`);
  process.exit(1);
}

console.log(`[Diagnostic] Reading Failure Rerun 1 test results from: ${RESULTS_PATH}`);
const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

// Filter for failures
const failedScenarios = results.filter(item => item.status === 'FAIL');

if (failedScenarios.length === 0) {
  console.log('🎉 Excellent! No failed test cases found in the Failure Rerun 1 report.');
  process.exit(0);
}

console.log(`\n==================================================`);
console.log(`❌ FOUND ${failedScenarios.length} FAILED SCENARIOS IN FAILURE RERUN 1:`);
console.log(`==================================================`);

const grepPatterns = [];

failedScenarios.forEach((sc, index) => {
  console.log(`  ${index + 1}. [${sc.id}] - ${sc.name || ''}`);
  
  // Map BDD scenario IDs to exact Playwright grep patterns
  if (sc.id.startsWith('Scenario_1_') || sc.id.startsWith('Scenario_2_') || sc.id.startsWith('Scenario_3_') || sc.id.startsWith('Scenario_4_') || sc.id.startsWith('Scenario_5_') || sc.id.startsWith('Scenario_6_')) {
    const parts = sc.id.replace('Scenario_', '').split('_');
    const displayId = parts.join('.');
    grepPatterns.push(`@scenario-${displayId}`);
  } else {
    // Standard Scenario fallback
    grepPatterns.push(sc.id);
  }
});

// Join patterns using Playwright's regex or selector (which is logical OR)
const combinedGrep = grepPatterns.join('|');
console.log(`\nCombined Grep Pattern: "${combinedGrep}"`);

console.log(`\n[Execution Engine] Launching Playwright sequentially (1 worker) in headless mode on DemoB...`);
const start = Date.now();

try {
  // Execute Playwright command
  execSync(`npx playwright test --grep "${combinedGrep}" --workers=1`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      BLOTTER_ENV: 'DemoB',
      CI: 'true' // Trigger headless mode natively in playwright.config.js
    }
  });
  console.log(`\n🎉 SUCCESS! All targeted rerun scenarios completed successfully!`);
} catch (err) {
  console.error(`\n❌ Execution Error: Some of the rerun scenarios failed during verification.`);
} finally {
  const elapsedMs = Date.now() - start;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  console.log(`==================================================`);
  console.log(`Total Rerun Execution Time: ${minutes} min ${seconds} sec`);
  console.log(`==================================================`);
}
