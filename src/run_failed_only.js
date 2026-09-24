const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define historical results JSON path
const RESULTS_PATH = path.join(__dirname, '..', 'reports', 'Complete RUN-22 August- 2h 30m', 'test_results.json');

if (!fs.existsSync(RESULTS_PATH)) {
  console.error(`❌ Error: Historical test_results.json not found at: ${RESULTS_PATH}`);
  process.exit(1);
}

console.log(`[Diagnostic] Reading historical test results from: ${RESULTS_PATH}`);
const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

// Filter for failures
const failedScenarios = results.filter(item => item.status === 'FAIL');

if (failedScenarios.length === 0) {
  console.log('🎉 Excellent! No failed test cases found in the historical report.');
  process.exit(0);
}

console.log(`\n==================================================`);
console.log(`❌ FOUND ${failedScenarios.length} FAILED SCENARIOS IN THE SPECIFIED RUN:`);
console.log(`==================================================`);

const grepPatterns = [];

failedScenarios.forEach((sc, index) => {
  console.log(`  ${index + 1}. [${sc.id}] - ${sc.name || ''}`);
  
  // Map standard vs BDD scenario IDs to exact Playwright grep patterns
  if (sc.id.startsWith('Scenario_1_') || sc.id.startsWith('Scenario_2_') || sc.id.startsWith('Scenario_3_') || sc.id.startsWith('Scenario_4_') || sc.id.startsWith('Scenario_5_') || sc.id.startsWith('Scenario_6_')) {
    // BDD Scenario: e.g. Scenario_1_5 -> @scenario-1.5
    const parts = sc.id.replace('Scenario_', '').split('_');
    const displayId = parts.join('.');
    grepPatterns.push(`@scenario-${displayId}`);
  } else {
    // Comparative/Standard Scenario: e.g. Scenario_1, Scenario_2
    if (sc.id === 'Scenario_1') grepPatterns.push('Scenario 1 \\(Trade ID\\)');
    else if (sc.id === 'Scenario_2') grepPatterns.push('Scenario 2 \\(Deal ID\\)');
    else if (sc.id === 'Scenario_3') grepPatterns.push('Scenario 3 \\(Trade Date\\)');
    else if (sc.id === 'Scenario_4') grepPatterns.push('Scenario 4 \\(Account\\)');
    else if (sc.id === 'Scenario_5') grepPatterns.push('Scenario 5 \\(UI Audit\\)');
    else grepPatterns.push(sc.id); // Fallback
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
      CI: 'true'
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
