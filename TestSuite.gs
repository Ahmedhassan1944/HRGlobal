/**
 * @fileoverview EDECS HR Dashboard — Comprehensive Test Suite
 *
 * Tests cover:
 *   T01 — Configuration & Setup
 *   T02 — Spreadsheet Connectivity
 *   T03 — Sheet Existence & Structure
 *   T04 — Data Loading (DataService)
 *   T05 — Cache Integrity (write → read → verify)
 *   T06 — Analytics (Nationalization, Hiring Trend)
 *   T07 — Dashboard Payload (getDashboardData full simulation)
 *   T08 — Web App Readiness (doGet, HTML includes)
 *   T09 — End-to-End Workflow (simulates browser open)
 *   T10 — Filter & Search Logic
 *
 * HOW TO RUN:
 *   In Apps Script editor, select function "runAllTests" and click ▶ Run.
 *   Results are printed to the Execution Log with PASS / FAIL / WARN.
 *   A summary is also returned — look for the final line.
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER FRAMEWORK
// ─────────────────────────────────────────────────────────────────────────────

const TestRunner = (() => {
  const _results = [];
  let   _current  = '';

  function _pass(name, detail) {
    const msg = `  ✅ PASS  ${name}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    _results.push({ suite: _current, name, status: 'PASS', detail });
  }

  function _fail(name, detail) {
    const msg = `  ❌ FAIL  ${name}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    _results.push({ suite: _current, name, status: 'FAIL', detail });
  }

  function _warn(name, detail) {
    const msg = `  ⚠️  WARN  ${name}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    _results.push({ suite: _current, name, status: 'WARN', detail });
  }

  function _suite(name) {
    _current = name;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📋 ${name}`);
    console.log('═'.repeat(60));
  }

  function _assert(condition, name, passDetail, failDetail) {
    if (condition) _pass(name, passDetail);
    else           _fail(name, failDetail || 'Assertion failed');
  }

  function _summary() {
    const total  = _results.length;
    const passed = _results.filter(r => r.status === 'PASS').length;
    const failed = _results.filter(r => r.status === 'FAIL').length;
    const warned = _results.filter(r => r.status === 'WARN').length;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📊 TEST SUMMARY`);
    console.log('═'.repeat(60));
    console.log(`  Total : ${total}`);
    console.log(`  ✅ Pass  : ${passed}`);
    console.log(`  ❌ Fail  : ${failed}`);
    console.log(`  ⚠️  Warn  : ${warned}`);
    console.log('═'.repeat(60));

    if (failed === 0) {
      console.log(`  🚀 ALL TESTS PASSED — Dashboard is ready to open!`);
    } else {
      console.log(`  🔴 ${failed} TEST(S) FAILED — Fix before opening dashboard.`);
      _results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`     → [${r.suite}] ${r.name}: ${r.detail}`));
    }
    console.log('═'.repeat(60));

    return { total, passed, failed, warned, allPassed: failed === 0 };
  }

  return { pass: _pass, fail: _fail, warn: _warn, suite: _suite, assert: _assert, summary: _summary };
})();


// ─────────────────────────────────────────────────────────────────────────────
// T01 — CONFIGURATION & SETUP
// ─────────────────────────────────────────────────────────────────────────────

function test_T01_Configuration() {
  TestRunner.suite('T01 — Configuration & Setup');

  // 1. Script Properties contains SPREADSHEET_ID
  try {
    const props = PropertiesService.getScriptProperties();
    const id    = props.getProperty('SPREADSHEET_ID');
    TestRunner.assert(
      !!id && id.trim().length > 10,
      'SPREADSHEET_ID is set in Script Properties',
      `ID = ${id ? id.substring(0, 8) + '...' : 'null'}`,
      'SPREADSHEET_ID is missing! Go to Project Settings → Script Properties and add it.'
    );
  } catch (e) {
    TestRunner.fail('SPREADSHEET_ID check', e.message);
  }

  // 2. CONFIG object is accessible
  try {
    TestRunner.assert(
      typeof CONFIG === 'object' && CONFIG.SHEETS,
      'CONFIG object is defined',
      `Cache TTL = ${CONFIG.CACHE_EXPIRY}s`
    );
  } catch (e) {
    TestRunner.fail('CONFIG object', e.message);
  }

  // 3. Required sheet names defined
  try {
    const required = ['COUNTRY', 'NATIONALITY', 'DEPARTMENT', 'EMPLOYEE', 'EMPLOYEE_TYPE'];
    const missing  = required.filter(k => !CONFIG.SHEETS[k]);
    TestRunner.assert(
      missing.length === 0,
      'All required sheet names defined in CONFIG.SHEETS',
      `[${Object.values(CONFIG.SHEETS).join(', ')}]`,
      `Missing keys: ${missing.join(', ')}`
    );
  } catch (e) {
    TestRunner.fail('CONFIG.SHEETS', e.message);
  }

  // 4. AppLogger is accessible
  try {
    AppLogger.info('TestSuite', 'T01', 'Logger test');
    TestRunner.pass('AppLogger is accessible and functional');
  } catch (e) {
    TestRunner.fail('AppLogger', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// T02 — SPREADSHEET CONNECTIVITY
// ─────────────────────────────────────────────────────────────────────────────

function test_T02_SpreadsheetConnectivity() {
  TestRunner.suite('T02 — Spreadsheet Connectivity');

  let ss;
  try {
    ss = getSpreadsheet();
    TestRunner.assert(!!ss, 'getSpreadsheet() opens successfully', ss.getName());
  } catch (e) {
    TestRunner.fail('getSpreadsheet()', e.message);
    TestRunner.warn('T02 skipped', 'Cannot connect to Spreadsheet — remaining T02 tests skipped');
    return null;
  }

  // Spreadsheet name not empty
  TestRunner.assert(
    ss.getName().length > 0,
    'Spreadsheet has a name',
    ss.getName()
  );

  // Spreadsheet has sheets
  const sheets = ss.getSheets();
  TestRunner.assert(
    sheets.length >= 5,
    `Spreadsheet has at least 5 tabs`,
    `Found ${sheets.length} tab(s): [${sheets.map(s => s.getName()).join(', ')}]`,
    `Only ${sheets.length} tab(s) found — expected at least 5`
  );

  return ss;
}


// ─────────────────────────────────────────────────────────────────────────────
// T03 — SHEET EXISTENCE & STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

function test_T03_SheetStructure(ss) {
  TestRunner.suite('T03 — Sheet Existence & Structure');

  if (!ss) {
    TestRunner.warn('T03 skipped', 'No spreadsheet connection');
    return;
  }

  const expectedSheets = [
    { key: 'COUNTRY',       minCols: 8, label: 'DimCountry'      },
    { key: 'NATIONALITY',   minCols: 4, label: 'DimNationality'   },
    { key: 'DEPARTMENT',    minCols: 5, label: 'DimDepartment'    },
    { key: 'EMPLOYEE',      minCols: 12, label: 'DimEmployee'     },
    { key: 'EMPLOYEE_TYPE', minCols: 3, label: 'DimEmployeeType'  }
  ];

  expectedSheets.forEach(({ key, minCols, label }) => {
    const sheetName = CONFIG.SHEETS[key];
    const sheet     = ss.getSheetByName(sheetName);

    if (!sheet) {
      TestRunner.fail(
        `Sheet "${sheetName}" exists`,
        `Tab not found! Rename your tab to exactly "${sheetName}" (case-sensitive)`
      );
      return;
    }
    TestRunner.pass(`Sheet "${sheetName}" exists`);

    // Check it has data rows
    const lastRow = sheet.getLastRow();
    TestRunner.assert(
      lastRow >= 2,
      `"${sheetName}" has data rows`,
      `${lastRow - 1} data row(s)`,
      `Sheet is empty or has only a header row`
    );

    // Check minimum column count
    const lastCol = sheet.getLastColumn();
    TestRunner.assert(
      lastCol >= minCols,
      `"${sheetName}" has at least ${minCols} columns`,
      `${lastCol} column(s) found`,
      `Expected ≥${minCols} columns but found ${lastCol}. Check column order in Config.gs`
    );
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// T04 — DATA LOADING (DataService)
// ─────────────────────────────────────────────────────────────────────────────

function test_T04_DataLoading() {
  TestRunner.suite('T04 — Data Loading (DataService)');

  let data;
  try {
    // Force fresh load, bypass cache
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY_META);
    data = loadAllData();
    TestRunner.pass('loadAllData() completed without error');
  } catch (e) {
    TestRunner.fail('loadAllData()', e.message);
    return null;
  }

  // Countries
  const countryCount = Object.keys(data.countries).length;
  TestRunner.assert(countryCount > 0, 'Countries map is not empty', `${countryCount} countries`);

  // Nationalities
  const natCount = Object.keys(data.nationalities).length;
  TestRunner.assert(natCount > 0, 'Nationalities map is not empty', `${natCount} nationalities`);

  // Departments
  const deptCount = Object.keys(data.departments).length;
  TestRunner.assert(deptCount > 0, 'Departments map is not empty', `${deptCount} departments`);

  // Employees
  const empCount = data.employees.length;
  TestRunner.assert(empCount > 0, 'Employee array is not empty', `${empCount} employees loaded`);
  TestRunner.assert(
    empCount > 100,
    'Employee count is realistic (>100)',
    `${empCount} employees`,
    `Only ${empCount} employees found — expected more than 100`
  );

  // Active employees
  const activeCount = data.employees.filter(e => e.isActive).length;
  TestRunner.assert(
    activeCount > 0,
    'At least one active employee exists',
    `${activeCount} active employees`,
    'No active employees found! Check IsActive column values (should be TRUE/FALSE)'
  );

  // Employee record structure
  const sampleEmp = data.employees[0];
  const requiredFields = ['key', 'id', 'name', 'countryKey', 'departmentKey', 'nationalityKey', 'isActive'];
  const missingFields  = requiredFields.filter(f => !(f in sampleEmp));
  TestRunner.assert(
    missingFields.length === 0,
    'Employee record has all required fields',
    `Fields: [${requiredFields.join(', ')}]`,
    `Missing fields: [${missingFields.join(', ')}]`
  );

  return data;
}


// ─────────────────────────────────────────────────────────────────────────────
// T05 — CACHE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

function test_T05_CacheIntegrity(data) {
  TestRunner.suite('T05 — Cache Integrity (Write → Read → Verify)');

  if (!data) {
    TestRunner.warn('T05 skipped', 'No data from T04');
    return;
  }

  const originalCount = data.employees.length;

  // Force write to cache
  try {
    _persistToCache(data);
    TestRunner.pass('_persistToCache() wrote without error', `${originalCount} employees`);
  } catch (e) {
    TestRunner.fail('_persistToCache()', e.message);
    return;
  }

  // Verify meta key exists
  const cache   = CacheService.getScriptCache();
  const metaRaw = cache.get(CACHE_KEY_META);
  TestRunner.assert(!!metaRaw, 'Cache meta key (EDECS_DASH_META) was written');

  // Parse meta
  let meta;
  try {
    meta = JSON.parse(metaRaw);
    TestRunner.pass('Cache meta is valid JSON');
  } catch (e) {
    TestRunner.fail('Cache meta JSON.parse', e.message);
    return;
  }

  // Chunk count
  TestRunner.assert(
    meta.empChunks > 0,
    `Cache has at least 1 employee chunk`,
    `${meta.empChunks} chunk(s)`
  );

  // Each chunk exists
  let allChunksExist = true;
  for (let i = 0; i < meta.empChunks; i++) {
    const chunk = cache.get(CACHE_KEY_EMP + i);
    if (!chunk) {
      TestRunner.fail(`Employee chunk ${i} (EDECS_DASH_EMP_${i}) exists in cache`);
      allChunksExist = false;
    }
  }
  if (allChunksExist) {
    TestRunner.pass(`All ${meta.empChunks} employee chunks are present in cache`);
  }

  // Read back via getCachedData
  let readback;
  try {
    readback = getCachedData();
    TestRunner.pass('getCachedData() reads back without error');
  } catch (e) {
    TestRunner.fail('getCachedData() readback', e.message);
    return;
  }

  // Employee count matches
  TestRunner.assert(
    readback.employees.length === originalCount,
    'Employee count matches after cache round-trip',
    `${readback.employees.length} employees read back (written: ${originalCount})`,
    `Mismatch! Written: ${originalCount}, Read back: ${readback.employees.length} — cache is corrupted`
  );

  // Active count
  const activeReadback = readback.employees.filter(e => e.isActive).length;
  TestRunner.assert(
    activeReadback > 0,
    'Active employees survived cache round-trip',
    `${activeReadback} active employees after readback`
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// T06 — ANALYTICS (Nationalization & Hiring Trend)
// ─────────────────────────────────────────────────────────────────────────────

function test_T06_Analytics(data) {
  TestRunner.suite('T06 — Analytics (Nationalization & Hiring Trend)');

  if (!data) {
    TestRunner.warn('T06 skipped', 'No data from T04');
    return;
  }

  // Nationalization rates
  try {
    const payload = buildNationalizationPayload(data, null);
    TestRunner.assert(typeof payload === 'object' && Array.isArray(payload.cards), 'buildNationalizationPayload() returns valid payload');

    TestRunner.assert(
      payload.cards.length > 0,
      'Nationalization payload has at least 1 country card',
      `${payload.cards.length} countries`
    );

    // Verify card structure
    const firstCard = payload.cards[0];
    TestRunner.assert(
      typeof firstCard.nationalCount === 'number' &&
      typeof firstCard.totalActive   === 'number' &&
      typeof firstCard.actualPct     === 'number',
      'Nationalization card has correct numeric fields',
      `${firstCard.countryName}: national=${firstCard.nationalCount}, total=${firstCard.totalActive}, pct=${firstCard.actualPct}%`
    );

    // Verify pct is between 0 and 100
    const allValid = payload.cards.every(c => c.actualPct >= 0 && c.actualPct <= 100);
    TestRunner.assert(
      allValid,
      'All nationalization percentages are between 0% and 100%',
      'All percentages valid'
    );
  } catch (e) {
    TestRunner.fail('Nationalization analytics', e.message);
  }

  // Hiring trend
  try {
    const trend = buildHiringTrend(data.employees, data.countries, 'year', null);
    TestRunner.assert(Array.isArray(trend.labels), 'Hiring trend returns labels array');
    TestRunner.assert(Array.isArray(trend.datasets), 'Hiring trend returns datasets array');
    TestRunner.assert(
      trend.labels.length > 0,
      'Hiring trend has at least 1 time label',
      `${trend.labels.length} year label(s): ${trend.labels[0]} → ${trend.labels[trend.labels.length - 1]}`
    );
    TestRunner.assert(
      trend.datasets.length > 0,
      'Hiring trend has at least 1 dataset (country)',
      `${trend.datasets.length} country dataset(s)`
    );
  } catch (e) {
    TestRunner.fail('Hiring trend analytics', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// T07 — DASHBOARD PAYLOAD (getDashboardData simulation)
// ─────────────────────────────────────────────────────────────────────────────

function test_T07_DashboardPayload() {
  TestRunner.suite('T07 — getDashboardData() Full Simulation');

  let result;
  try {
    result = getDashboardData();
    TestRunner.pass('getDashboardData() executed without throwing');
  } catch (e) {
    TestRunner.fail('getDashboardData() threw an exception', e.message);
    return;
  }

  // success flag
  TestRunner.assert(
    result.success === true,
    'Result has success: true',
    '',
    `success is "${result.success}", error: "${result.error}"`
  );

  if (!result.success) {
    TestRunner.fail('Stopping T07 — server returned failure', result.error);
    return;
  }

  // Overview payload
  const ov = result.overview;
  TestRunner.assert(typeof ov === 'object', 'Result has overview object');
  TestRunner.assert(
    typeof ov.headCount === 'number' && ov.headCount > 0,
    'Overview.headCount is a positive number',
    `headCount = ${ov.headCount}`,
    `headCount = ${ov.headCount} — expected a positive integer`
  );
  TestRunner.assert(Array.isArray(ov.countryTable)    && ov.countryTable.length > 0,    'Overview.countryTable has rows',    `${ov.countryTable.length} rows`);
  TestRunner.assert(Array.isArray(ov.deptTable)       && ov.deptTable.length > 0,       'Overview.deptTable has rows',       `${ov.deptTable.length} rows`);
  TestRunner.assert(Array.isArray(ov.nationalityTable) && ov.nationalityTable.length > 0,'Overview.nationalityTable has rows',`${ov.nationalityTable.length} rows`);
  TestRunner.assert(Array.isArray(ov.mapPins)         && ov.mapPins.length > 0,         'Overview.mapPins has entries',      `${ov.mapPins.length} map pins`);

  // Nationalization payload
  const nat = result.nationalization;
  TestRunner.assert(typeof nat === 'object', 'Result has nationalization object');
  TestRunner.assert(
    typeof nat.headCount === 'number' && nat.headCount > 0,
    'Nationalization.headCount is positive',
    `headCount = ${nat.headCount}`
  );
  TestRunner.assert(Array.isArray(nat.cards) && nat.cards.length > 0, 'Nationalization.cards has entries', `${nat.cards.length} country card(s)`);

  // Card structure
  if (nat.cards.length > 0) {
    const card = nat.cards[0];
    const cardFields = ['countryName', 'totalActive', 'nationalCount', 'actualPct', 'status'];
    const missingCardFields = cardFields.filter(f => !(f in card));
    TestRunner.assert(
      missingCardFields.length === 0,
      'Nationalization card has all required fields',
      `[${cardFields.join(', ')}]`,
      `Missing: ${missingCardFields.join(', ')}`
    );
  }

  // Filter options
  const fo = result.filterOptions;
  TestRunner.assert(typeof fo === 'object', 'Result has filterOptions object');
  TestRunner.assert(Array.isArray(fo.countries)   && fo.countries.length > 0,   'filterOptions.countries is populated', `[${fo.countries.join(', ')}]`);
  TestRunner.assert(Array.isArray(fo.departments) && fo.departments.length > 0, 'filterOptions.departments is populated', `${fo.departments.length} departments`);

  // Meta
  TestRunner.assert(typeof result.meta === 'object' && result.meta.today, 'Result has meta.today', result.meta.today);
  TestRunner.assert(typeof result.meta.loadedAt === 'string',             'Result has meta.loadedAt timestamp', result.meta.loadedAt);
}


// ─────────────────────────────────────────────────────────────────────────────
// T08 — WEB APP READINESS (doGet + HTML includes)
// ─────────────────────────────────────────────────────────────────────────────

function test_T08_WebAppReadiness() {
  TestRunner.suite('T08 — Web App Readiness (HTML Includes)');

  const htmlFiles = ['Index', 'Styles', 'Components', 'Overview', 'Nationalization', 'JavaScript'];

  htmlFiles.forEach(filename => {
    try {
      const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
      TestRunner.assert(
        content && content.length > 100,
        `HTML file "${filename}.html" is readable`,
        `${content.length} bytes`
      );
    } catch (e) {
      TestRunner.fail(`HTML file "${filename}.html"`, `Cannot read: ${e.message}`);
    }
  });

  // Test doGet (simulate)
  try {
    const output = doGet({});
    const html   = output.getContent();
    TestRunner.assert(
      html.includes('EDECS') && html.length > 1000,
      'doGet() serves valid HTML with EDECS content',
      `${html.length} bytes`
    );
  } catch (e) {
    TestRunner.fail('doGet() simulation', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// T09 — END-TO-END: Simulates exact browser open sequence
// ─────────────────────────────────────────────────────────────────────────────

function test_T09_EndToEnd() {
  TestRunner.suite('T09 — End-to-End: Full Browser Open Simulation');

  console.log('  Simulating: Browser opens dashboard URL...');

  // Step 1: doGet serves HTML
  let html;
  try {
    html = doGet({}).getContent();
    TestRunner.pass('Step 1: doGet() serves HTML page');
  } catch (e) {
    TestRunner.fail('Step 1: doGet()', e.message);
    return;
  }

  // Step 2: JS calls getDashboardData
  console.log('  Simulating: JavaScript calls getDashboardData()...');
  let payload;
  try {
    payload = getDashboardData();
    TestRunner.pass('Step 2: getDashboardData() returns successfully');
  } catch (e) {
    TestRunner.fail('Step 2: getDashboardData()', e.message);
    return;
  }

  if (!payload.success) {
    TestRunner.fail('Step 2: getDashboardData() success flag', payload.error);
    return;
  }

  // Step 3: Payload has non-zero headcount
  TestRunner.assert(
    payload.overview.headCount > 0,
    'Step 3: overview.headCount is non-zero (loading screen WILL hide)',
    `headCount = ${payload.overview.headCount}`,
    `headCount = 0 → loading screen would hang because no data to render`
  );

  // Step 4: Hiring trend works
  console.log('  Simulating: Chart requests hiring trend...');
  try {
    const trend = getHiringTrend('year', null);
    TestRunner.assert(
      trend.success && trend.trend.labels.length > 0,
      'Step 4: getHiringTrend() returns chart data',
      `${trend.trend.labels.length} year labels, ${trend.trend.datasets.length} countries`
    );
  } catch (e) {
    TestRunner.fail('Step 4: getHiringTrend()', e.message);
  }

  // Step 5: Filters work (country = Egypt)
  console.log('  Simulating: User selects Egypt filter...');
  try {
    const filtered = getOverviewData({ country: 'Egypt', department: 'All' });
    TestRunner.assert(
      filtered.success,
      'Step 5: getOverviewData({country:"Egypt"}) succeeds',
      `headCount = ${filtered.overview ? filtered.overview.headCount : 'N/A'}`
    );
  } catch (e) {
    TestRunner.fail('Step 5: getOverviewData filter', e.message);
  }

  // Step 6: Cache survives a second call
  console.log('  Simulating: Second page load (cache check)...');
  try {
    const payload2 = getDashboardData();
    TestRunner.assert(
      payload2.success && payload2.overview.headCount === payload.overview.headCount,
      'Step 6: Second getDashboardData() returns same headCount (cache works)',
      `${payload2.overview.headCount} = ${payload.overview.headCount}`
    );
  } catch (e) {
    TestRunner.fail('Step 6: Second getDashboardData()', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// T10 — FILTER & SEARCH LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function test_T10_FilterLogic() {
  TestRunner.suite('T10 — Filter & Search Logic');

  try {
    // 1. Get available countries from filter options dynamically
    const dashData = getDashboardData();
    TestRunner.assert(dashData.success, 'Can retrieve dashboard data for filter list');
    const countries = dashData.success ? dashData.filterOptions.countries : [];
    
    // 2. All countries filter
    const all = getOverviewData({ country: 'All', department: 'All' });
    TestRunner.assert(all.success, 'getOverviewData(All, All) succeeds');
    const allCount = all.overview ? all.overview.headCount : 0;

    // 3. Each country filter should be <= total
    let sumByCountry = 0;
    countries.forEach(country => {
      try {
        const res = getOverviewData({ country, department: 'All' });
        if (res.success) {
          const count = res.overview.headCount;
          sumByCountry += count;
          TestRunner.assert(
            count <= allCount,
            `Filter by "${country}" returns ≤ total headcount`,
            `${country}: ${count} ≤ total: ${allCount}`
          );
        } else {
          TestRunner.warn(`Filter by "${country}"`, res.error || 'no data');
        }
      } catch (e) {
        TestRunner.fail(`Filter by "${country}"`, e.message);
      }
    });

    TestRunner.assert(
      sumByCountry === allCount,
      'Sum of all country filters = total headcount (no double-counting)',
      `${sumByCountry} = ${allCount}`,
      `Mismatch: sum=${sumByCountry} vs total=${allCount} — possible data integrity issue`
    );

  } catch (e) {
    TestRunner.fail('Filter logic', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MASTER TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all test suites in order.
 * Select this function and click ▶ Run in the Apps Script editor.
 */
function runAllTests() {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║   EDECS HR DASHBOARD — SYSTEM TEST SUITE                ║');
  console.log('║   ' + new Date().toLocaleString() + '                    ║');
  console.log('╚' + '═'.repeat(58) + '╝');

  try {
    test_T01_Configuration();
  } catch (e) { console.log(`T01 crashed: ${e.message}`); }

  let ss;
  try {
    ss = test_T02_SpreadsheetConnectivity();
  } catch (e) { console.log(`T02 crashed: ${e.message}`); }

  try {
    test_T03_SheetStructure(ss);
  } catch (e) { console.log(`T03 crashed: ${e.message}`); }

  let data;
  try {
    data = test_T04_DataLoading();
  } catch (e) { console.log(`T04 crashed: ${e.message}`); }

  try {
    test_T05_CacheIntegrity(data);
  } catch (e) { console.log(`T05 crashed: ${e.message}`); }

  try {
    test_T06_Analytics(data);
  } catch (e) { console.log(`T06 crashed: ${e.message}`); }

  try {
    test_T07_DashboardPayload();
  } catch (e) { console.log(`T07 crashed: ${e.message}`); }

  try {
    test_T08_WebAppReadiness();
  } catch (e) { console.log(`T08 crashed: ${e.message}`); }

  try {
    test_T09_EndToEnd();
  } catch (e) { console.log(`T09 crashed: ${e.message}`); }

  try {
    test_T10_FilterLogic();
  } catch (e) { console.log(`T10 crashed: ${e.message}`); }

  return TestRunner.summary();
}

/**
 * Quick sanity check — runs only T09 (End-to-End).
 * Use this before opening the dashboard to verify it will work.
 */
function quickCheck() {
  console.log('⚡ Quick Check — End-to-End Sanity Test');
  try {
    test_T09_EndToEnd();
  } catch (e) {
    console.log(`QuickCheck crashed: ${e.message}`);
  }
  TestRunner.summary();
}
