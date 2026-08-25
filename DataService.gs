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

const CACHE_KEY        = 'EDECS_DASHBOARD_DATA';
const CACHE_KEY_META   = 'EDECS_DASH_META';      // stores dims + metadata
const CACHE_KEY_EMP    = 'EDECS_DASH_EMP_';      // prefix; chunks: _0, _1, ...
const CACHE_CHUNK_SIZE = 85000;                  // 85 KB per chunk (under 100 KB limit)

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
  const cache   = CacheService.getScriptCache();
  const metaRaw = cache.get(CACHE_KEY_META);

  if (metaRaw) {
    try {
      const meta = JSON.parse(metaRaw);
      // Reassemble employee chunks
      const chunks = [];
      for (let i = 0; i < meta.empChunks; i++) {
        const chunk = cache.get(CACHE_KEY_EMP + i);
        if (!chunk) throw new Error(`Employee chunk ${i} missing from cache`);
        chunks.push(chunk);
      }
      const employees = JSON.parse(chunks.join(''));
      AppLogger.info('DataService', 'getCachedData',
        `Cache HIT — ${employees.length} employees from ${meta.empChunks} chunk(s)`);
      return {
        countries:     meta.countries,
        nationalities: meta.nationalities,
        departments:   meta.departments,
        empTypes:      meta.empTypes,
        employees:     employees,
        loadedAt:      meta.loadedAt
      };
    } catch (e) {
      AppLogger.warn('DataService', 'getCachedData',
        `Cache reassembly failed: ${e.message} — reloading from Sheets`);
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
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      throw new Error('Refresh is currently locked by another process. Please try again later.');
    }
    
    _clearCacheSafely();
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
  } finally {
    lock.releaseLock();
  }
}

/**
 * Safely removes all related cache keys, including chunks.
 * Uses a fallback chunk count if the metadata is missing or corrupted.
 */
function _clearCacheSafely() {
  const cache = CacheService.getScriptCache();
  
  let chunksToRemove = 50; // Fallback maximum
  const metaRaw = cache.get(CACHE_KEY_META);
  if (metaRaw) {
    try {
      const meta = JSON.parse(metaRaw);
      if (meta.empChunks) chunksToRemove = meta.empChunks;
    } catch (e) {
      AppLogger.warn('DataService', '_clearCacheSafely', 'Failed to parse meta, using fallback chunk count.');
    }
  }

  cache.remove(CACHE_KEY);
  cache.remove(CACHE_KEY_META);
  for (let i = 0; i < chunksToRemove; i++) {
    cache.remove(CACHE_KEY_EMP + i);
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
 * Stores data in CacheService using a chunked strategy to work around
 * the 100 KB per-entry limit.
 *
 * Strategy:
 *  - Dimension tables (countries, nationalities, departments, empTypes)
 *    are stored together in CACHE_KEY_META (always < 5 KB).
 *  - Employee array JSON is split into 85 KB chunks stored as
 *    CACHE_KEY_EMP_0, CACHE_KEY_EMP_1, etc.
 *
 * @param {DashboardData} data
 */
function _persistToCache(data) {
  try {
    const cache = CacheService.getScriptCache();

    // --- Serialize employees into chunks ---
    const empJson   = JSON.stringify(data.employees);
    const empChunks = [];
    for (let i = 0; i < empJson.length; i += CACHE_CHUNK_SIZE) {
      empChunks.push(empJson.substring(i, i + CACHE_CHUNK_SIZE));
    }

    // --- Build meta object (dims + chunk count) ---
    const meta = {
      countries:     data.countries,
      nationalities: data.nationalities,
      departments:   data.departments,
      empTypes:      data.empTypes,
      loadedAt:      data.loadedAt,
      empChunks:     empChunks.length
    };

    // --- Write everything to cache ---
    cache.put(CACHE_KEY_META, JSON.stringify(meta), CONFIG.CACHE_EXPIRY);
    empChunks.forEach((chunk, i) => {
      cache.put(CACHE_KEY_EMP + i, chunk, CONFIG.CACHE_EXPIRY);
    });

    AppLogger.info('DataService', '_persistToCache',
      `Cached: ${empJson.length} bytes of employees in ${empChunks.length} chunk(s)`);

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
