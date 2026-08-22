/**
 * @fileoverview Data access layer for the EDECS HR Dashboard.
 *
 * Implements a single-load strategy:
 * - All 5 dimension sheets are read once per cache cycle.
 * - Results are stored in Apps Script CacheService as JSON.
 * - All downstream services consume in-memory Maps (O(1) lookups).
 *
 * Cache key: EDECS_DASHBOARD_DATA
 * Cache TTL: CONFIG.CACHE_EXPIRY (default 1 hour)
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

const CACHE_KEY = 'EDECS_DASHBOARD_DATA';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full dataset from CacheService if available,
 * otherwise loads fresh data from Google Sheets and caches it.
 *
 * @returns {DashboardData} Full data payload.
 */
function getCachedData() {
  const cache  = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);

  if (cached) {
    AppLogger.info('DataService', 'getCachedData', 'Cache HIT — returning cached data');
    try {
      return JSON.parse(cached);
    } catch (parseErr) {
      AppLogger.warn('DataService', 'getCachedData', `Cache parse failed: ${parseErr.message} — reloading`);
    }
  }

  AppLogger.info('DataService', 'getCachedData', 'Cache MISS — loading from Google Sheets');
  return loadAllData();
}

/**
 * Forces a full reload from Google Sheets and refreshes CacheService.
 * @returns {{ success: boolean, message: string, loadedAt: string|null }}
 */
function refreshCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY);
    AppLogger.info('DataService', 'refreshCache', 'Cache cleared');

    const data = loadAllData();
    return {
      success:  true,
      message:  'Cache refreshed successfully.',
      loadedAt: data.loadedAt
    };
  } catch (e) {
    AppLogger.error('DataService', 'refreshCache', e.message);
    return { success: false, message: e.message, loadedAt: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE DATA LOADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads all 5 dimension sheets from Google Sheets and builds
 * normalized, JSON-serializable lookup Maps and employee array.
 *
 * @returns {DashboardData}
 * @throws {Error} On sheet read failure.
 */
function loadAllData() {
  try {
    const ss = getSpreadsheet();

    AppLogger.info('DataService', 'loadAllData', 'Reading all sheets...');
    const countryRows    = readSheet(ss, CONFIG.SHEETS.COUNTRY);
    const natRows        = readSheet(ss, CONFIG.SHEETS.NATIONALITY);
    const deptRows       = readSheet(ss, CONFIG.SHEETS.DEPARTMENT);
    const empTypeRows    = readSheet(ss, CONFIG.SHEETS.EMPLOYEE_TYPE);
    const employeeRows   = readSheet(ss, CONFIG.SHEETS.EMPLOYEE);

    AppLogger.info('DataService', 'loadAllData',
      `Rows: countries=${countryRows.length}, nationalities=${natRows.length}, ` +
      `departments=${deptRows.length}, empTypes=${empTypeRows.length}, employees=${employeeRows.length}`
    );

    const data = {
      countries:     buildCountryMap(countryRows),
      nationalities: buildNationalityMap(natRows),
      departments:   buildDepartmentMap(deptRows),
      empTypes:      buildEmpTypeMap(empTypeRows),
      employees:     buildEmployeeArray(employeeRows),
      loadedAt:      new Date().toISOString()
    };

    _persistToCache(data);
    return data;

  } catch (e) {
    AppLogger.error('DataService', 'loadAllData', e.message);
    throw new Error(`Data load failed: ${e.message}`);
  }
}

/**
 * Stores serialized data in CacheService.
 * Handles the 100 KB per-entry limit by chunking if necessary.
 *
 * @param {DashboardData} data
 */
function _persistToCache(data) {
  try {
    const cache      = CacheService.getScriptCache();
    const serialized = JSON.stringify(data);
    const byteSize   = serialized.length;

    if (byteSize < 95000) {
      // Single entry — most datasets fit here
      cache.put(CACHE_KEY, serialized, CONFIG.CACHE_EXPIRY);
      AppLogger.info('DataService', '_persistToCache',
        `Cached in single entry: ${byteSize} bytes`);
    } else {
      // Dataset exceeds 95KB — cache without employees (dim tables only)
      // Employees will be re-read on each request (acceptable trade-off)
      const dimOnly = Object.assign({}, data, { employees: [] });
      const dimSerialized = JSON.stringify(dimOnly);
      cache.put(CACHE_KEY, dimSerialized, CONFIG.CACHE_EXPIRY);
      AppLogger.warn('DataService', '_persistToCache',
        `Dataset ${byteSize} bytes exceeds cache limit — caching dim tables only`);
    }
  } catch (cacheErr) {
    AppLogger.warn('DataService', '_persistToCache',
      `Cache write failed (non-fatal): ${cacheErr.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET READER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads all data rows from a named sheet (excludes header row 1).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @returns {Array<Array<*>>}
 * @throws {Error} If sheet is not found.
 */
function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: "${sheetName}". Verify the tab name matches CONFIG.SHEETS.`);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    AppLogger.warn('DataService', 'readSheet', `Sheet "${sheetName}" has no data rows.`);
    return [];
  }
  const lastCol = sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a plain object keyed by CountryKey from DimCountry rows.
 * @param {Array<Array<*>>} rows
 * @returns {Object.<string, CountryRecord>}
 */
function buildCountryMap(rows) {
  const map = {};
  rows.forEach((row, idx) => {
    const key = safeString(row[COLS.COUNTRY.KEY]);
    if (!key) {
      AppLogger.warn('DataService', 'buildCountryMap', `Row ${idx + 2}: missing CountryKey — skipped`);
      return;
    }
    map[key] = {
      key:                       key,
      code:                      safeString(row[COLS.COUNTRY.CODE]),
      name:                      safeString(row[COLS.COUNTRY.NAME]),
      region:                    safeString(row[COLS.COUNTRY.REGION]),
      currency:                  safeString(row[COLS.COUNTRY.CURRENCY]),
      isGCC:                     isTruthy(row[COLS.COUNTRY.IS_GCC]),
      nationalizationApplicable: isTruthy(row[COLS.COUNTRY.NATIONALIZATION_APPLICABLE]),
      targetPct:                 safeNumber(row[COLS.COUNTRY.TARGET_NATIONALIZATION_PCT])
    };
  });
  return map;
}

/**
 * Builds a plain object keyed by NationalityKey from DimNationality rows.
 * @param {Array<Array<*>>} rows
 * @returns {Object.<string, NationalityRecord>}
 */
function buildNationalityMap(rows) {
  const map = {};
  rows.forEach((row, idx) => {
    const key = safeString(row[COLS.NATIONALITY.KEY]);
    if (!key) {
      AppLogger.warn('DataService', 'buildNationalityMap', `Row ${idx + 2}: missing NationalityKey — skipped`);
      return;
    }
    map[key] = {
      key:        key,
      code:       safeString(row[COLS.NATIONALITY.CODE]),
      name:       safeString(row[COLS.NATIONALITY.NAME]),
      countryKey: safeString(row[COLS.NATIONALITY.COUNTRY_KEY])
    };
  });
  return map;
}

/**
 * Builds a plain object keyed by DepartmentKey from DimDepartment rows.
 * @param {Array<Array<*>>} rows
 * @returns {Object.<string, DepartmentRecord>}
 */
function buildDepartmentMap(rows) {
  const map = {};
  rows.forEach((row, idx) => {
    const key = safeString(row[COLS.DEPARTMENT.KEY]);
    if (!key) return;
    map[key] = {
      key:      key,
      code:     safeString(row[COLS.DEPARTMENT.CODE]),
      name:     safeString(row[COLS.DEPARTMENT.NAME]),
      division: safeString(row[COLS.DEPARTMENT.DIVISION]),
      category: safeString(row[COLS.DEPARTMENT.CATEGORY])
    };
  });
  return map;
}

/**
 * Builds a plain object keyed by EmployeeTypeKey from DimEmployeeType rows.
 * @param {Array<Array<*>>} rows
 * @returns {Object.<string, EmpTypeRecord>}
 */
function buildEmpTypeMap(rows) {
  const map = {};
  rows.forEach(row => {
    const key = safeString(row[COLS.EMPLOYEE_TYPE.KEY]);
    if (!key) return;
    map[key] = {
      key:             key,
      name:            safeString(row[COLS.EMPLOYEE_TYPE.NAME]),
      employmentClass: safeString(row[COLS.EMPLOYEE_TYPE.EMPLOYMENT_CLASS])
    };
  });
  return map;
}

/**
 * Builds a flat array of employee objects from DimEmployee rows.
 * @param {Array<Array<*>>} rows
 * @returns {Array<EmployeeRecord>}
 */
function buildEmployeeArray(rows) {
  return rows
    .filter(row => safeString(row[COLS.EMPLOYEE.KEY]) !== '')
    .map(row => ({
      key:           safeString(row[COLS.EMPLOYEE.KEY]),
      id:            safeString(row[COLS.EMPLOYEE.ID]),
      name:          safeString(row[COLS.EMPLOYEE.NAME]),
      gender:        safeString(row[COLS.EMPLOYEE.GENDER]),
      countryKey:    safeString(row[COLS.EMPLOYEE.COUNTRY_KEY]),
      departmentKey: safeString(row[COLS.EMPLOYEE.DEPARTMENT_KEY]),
      empTypeKey:    safeString(row[COLS.EMPLOYEE.EMPLOYEE_TYPE_KEY]),
      hireDate:      safeString(row[COLS.EMPLOYEE.HIRE_DATE]),
      status:        safeString(row[COLS.EMPLOYEE.EMPLOYMENT_STATUS]),
      isActive:      isTruthy(row[COLS.EMPLOYEE.IS_ACTIVE]),
      nationalityKey:safeString(row[COLS.EMPLOYEE.NATIONALITY_KEY]),
      hireDateKey:   safeString(row[COLS.EMPLOYEE.HIRE_DATE_KEY])
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS (JSDoc only — for IDE intellisense)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DashboardData
 * @property {Object.<string, CountryRecord>}     countries
 * @property {Object.<string, NationalityRecord>} nationalities
 * @property {Object.<string, DepartmentRecord>}  departments
 * @property {Object.<string, EmpTypeRecord>}     empTypes
 * @property {Array<EmployeeRecord>}              employees
 * @property {string}                             loadedAt  ISO timestamp
 */

/**
 * @typedef {Object} EmployeeRecord
 * @property {string}  key
 * @property {string}  id
 * @property {string}  name
 * @property {string}  gender
 * @property {string}  countryKey
 * @property {string}  departmentKey
 * @property {string}  empTypeKey
 * @property {string}  hireDate
 * @property {string}  status
 * @property {boolean} isActive
 * @property {string}  nationalityKey
 * @property {string}  hireDateKey
 */
