/**
 * Master Test Runner for StoreOps
 * Executes all 4 test suites sequentially and summarizes results.
 */

const { spawn } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Phase 3: Authentication & RBAC Tests', file: 'authTest.js' },
  { name: 'Phase 4: Master Data CRUD Tests', file: 'crudTest.js' },
  { name: 'Phase 5: Orders, Inventory & ACID Concurrency Tests', file: 'ordersInventoryTest.js' },
  { name: 'Phase 6: Dashboard & SQL Aggregation Tests', file: 'dashboardTest.js' },
];

const runSuite = (suite) => {
  return new Promise((resolve) => {
    console.log(`\n===============================================================`);
    console.log(`  RUNNING: ${suite.name}`);
    console.log(`===============================================================`);

    const child = spawn('node', [path.join(__dirname, suite.file)], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({ name: suite.name, success: code === 0 });
    });
  });
};

const runAllSuites = async () => {
  console.log('\n🚀 Starting StoreOps Master Verification Test Suite...\n');
  const startTime = Date.now();
  const results = [];

  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n===============================================================');
  console.log('             STOREOPS FINAL TEST EXECUTION SUMMARY             ');
  console.log('===============================================================');

  let allPassed = true;
  for (const r of results) {
    const mark = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} : ${r.name}`);
    if (!r.success) allPassed = false;
  }

  console.log('---------------------------------------------------------------');
  console.log(`Total Suites Executed : ${results.length}`);
  console.log(`Total Criteria Tested : 65 Automated Acceptance Cases`);
  console.log(`Execution Time        : ${duration}s`);
  console.log(`Final System Status   : ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('===============================================================\n');

  process.exit(allPassed ? 0 : 1);
};

runAllSuites();
