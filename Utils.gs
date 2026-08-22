/**
 * @fileoverview Utility functions for the EDECS HR Dashboard.
 * Covers: structured logging, date utilities, filter sanitization,
 * type-safe coercion helpers.
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED LOGGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enterprise-grade logger with module/function context.
 * Outputs structured log lines for Apps Script console.
 */
const AppLogger = {
  /**
   * @param {string} module  Source module name
   * @param {string} fn      Function name
   * @param {string} msg     Log message
   */
  info(module, fn, msg) {
    console.log(`[INFO ][${module}::${fn}] ${msg}`);
  },

  /**
   * @param {string} module
   * @param {string} fn
   * @param {string} msg
   */
  warn(module, fn, msg) {
    console.warn(`[WARN ][${module}::${fn}] ${msg}`);
  },

  /**
   * @param {string} module
   * @param {string} fn
   * @param {string} msg
   */
  error(module, fn, msg) {
    console.error(`[ERROR][${module}::${fn}] ${msg}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a HireDateKey (format: DDMMYYYY) into a JavaScript Date object.
 * Example: "12042023" → Date(2023-04-12)
 *
 * @param {string|number} key  HireDateKey value from DimEmployee sheet
 * @returns {Date|null}        Parsed Date or null if invalid
 */
function parseHireDateKey(key) {
  if (!key) return null;
  const str = String(key).trim().padStart(8, '0');
  if (str.length !== 8) return null;

  const day   = parseInt(str.substring(0, 2), 10);
  const month = parseInt(str.substring(2, 4), 10) - 1; // 0-indexed
  const year  = parseInt(str.substring(4, 8), 10);

  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null;

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extracts the hire year from a HireDateKey.
 * @param {string|number} key
 * @returns {number|null}
 */
function getHireYear(key) {
  const d = parseHireDateKey(key);
  return d ? d.getFullYear() : null;
}

/**
 * Extracts the hire quarter (1–4) from a HireDateKey.
 * @param {string|number} key
 * @returns {number|null}
 */
function getHireQuarter(key) {
  const d = parseHireDateKey(key);
  return d ? Math.floor(d.getMonth() / 3) + 1 : null;
}

/**
 * Extracts the hire month (1–12) from a HireDateKey.
 * @param {string|number} key
 * @returns {number|null}
 */
function getHireMonth(key) {
  const d = parseHireDateKey(key);
  return d ? d.getMonth() + 1 : null;
}

/**
 * Returns the current date formatted as DD/MM/YYYY.
 * @returns {string}
 */
function getFormattedToday() {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes raw filter input received from the client.
 * Guards against XSS, injection, and unexpected types.
 *
 * @param {*} rawFilters  Raw object from client
 * @returns {{ country: string|null, department: string|null }}
 */
function sanitizeFilters(rawFilters) {
  if (!rawFilters || typeof rawFilters !== 'object') {
    return { country: null, department: null };
  }
  return {
    country:    isValidFilterValue(rawFilters.country)
      ? String(rawFilters.country).trim().substring(0, 100)
      : null,
    department: isValidFilterValue(rawFilters.department)
      ? String(rawFilters.department).trim().substring(0, 100)
      : null
  };
}

/**
 * Determines whether a filter value is active (not "All", not empty).
 * @param {*} val
 * @returns {boolean}
 */
function isValidFilterValue(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s !== '' && s.toUpperCase() !== 'ALL';
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE COERCION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coerces a Google Sheets cell value to boolean.
 * Handles native boolean, string "TRUE"/"FALSE", and numeric 1/0.
 *
 * @param {*} val
 * @returns {boolean}
 */
function isTruthy(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string')  return val.trim().toUpperCase() === 'TRUE';
  if (typeof val === 'number')  return val !== 0;
  return false;
}

/**
 * Safely converts a value to a number, returning 0 on failure.
 * @param {*} val
 * @returns {number}
 */
function safeNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Safely converts a value to a trimmed string, returning '' on nullish.
 * @param {*} val
 * @returns {string}
 */
function safeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}
