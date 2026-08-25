/**
 * @fileoverview Analytics engine for EDECS HR Dashboard.
 *
 * Implements:
 * - Nationalization rate calculation using the correct join path:
 *     Employee → NationalityKey → Nationality.CountryKey (NOT name comparison)
 * - Nationalization compliance status classification
 * - Hiring trend aggregation (year / quarter / month granularity)
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// NATIONALIZATION ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates nationalization rates for all countries in a single pass.
 *
 * CORRECT LOGIC (per spec):
 *   For each ACTIVE employee:
 *     → Resolve their NationalityKey → Nationality object
 *     → Check if Nationality.CountryKey === employee's CountryKey
 *     → If yes, they are a national of that country
 *
 * NEVER compare Nationality.Name === Country.Name directly.
 *
 * @param {Array<EmployeeRecord>}              employees       Full employee array
 * @param {Object.<string, NationalityRecord>} nationalityMap  Keyed by NationalityKey
 * @returns {Object.<string, { nationalCount: number, totalActive: number, rate: number }>} Map keyed by CountryKey
 */
function calculateAllNationalizationRates(employees, nationalityMap) {
  const acc = {};

  employees.forEach(emp => {
    if (!emp.isActive) return;

    const cKey = emp.countryKey;
    if (!cKey) return;

    if (!acc[cKey]) {
      acc[cKey] = { totalActive: 0, nationalCount: 0, rate: 0 };
    }

    acc[cKey].totalActive++;

    const nat = nationalityMap[emp.nationalityKey];
    if (nat && nat.countryKey === cKey) {
      acc[cKey].nationalCount++;
    }
  });

  // Calculate final rates
  Object.keys(acc).forEach(cKey => {
    const data = acc[cKey];
    data.rate = data.totalActive > 0 ? (data.nationalCount / data.totalActive) * 100 : 0;
  });

  return acc;
}

/**
 * Classifies nationalization compliance based on a strict target and gap rule.
 *
 * Rules:
 *   actual >= target                                     → 'Above Target' (green)
 *   target - NEAR_GAP <= actual < target                 → 'Near Target' (amber)
 *   actual < target - NEAR_GAP                           → 'Below Target' (red)
 *
 * The gap is in absolute percentage points, not a relative multiplier.
 *
 * @param {number} actual   Current nationalization percentage
 * @param {number} target   Target nationalization percentage
 * @returns {'Above Target'|'Near Target'|'Below Target'}
 */
function classifyNationalizationStatus(actual, target) {
  if (actual >= target) {
    return 'Above Target';
  }

  if (actual < target && actual >= target - CONFIG.NEAR_TARGET_GAP_POINTS) {
    return 'Near Target';
  }

  return 'Below Target';
}

// ─────────────────────────────────────────────────────────────────────────────
// HIRING TREND ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds hiring trend data for the multi-line Chart.js chart.
 *
 * Generates Chart.js-compatible datasets grouped by time period per country.
 * All countries are included unless countryFilter is specified.
 *
 * @param {Array<EmployeeRecord>}          employees      Full employee array
 * @param {Object.<string, CountryRecord>} countryMap     Keyed by CountryKey
 * @param {'year'|'quarter'|'month'}       granularity    Time grouping
 * @param {string|null}                    countryFilter  Country name or null for all
 * @returns {{ labels: string[], datasets: Array<HiringDataset> }}
 */
function buildHiringTrend(employees, countryMap, granularity, countryFilter) {
  const currentYear = new Date().getFullYear();
  const startYear   = CONFIG.HIRING_START_YEAR;

  // Resolve target country keys
  const countryEntries = Object.values(countryMap).filter(c => {
    return !countryFilter || c.name === countryFilter;
  });

  // Build time labels
  const labels = _buildTimeLabels(granularity, startYear, currentYear);

  // Initialize data accumulator: { countryKey: { label: count } }
  const dataAcc = {};
  countryEntries.forEach(c => {
    dataAcc[c.key] = {};
    labels.forEach(lbl => { dataAcc[c.key][lbl] = 0; });
  });

  const targetKeys = new Set(countryEntries.map(c => c.key));

  // Accumulate hire counts
  employees.forEach(emp => {
    if (!targetKeys.has(emp.countryKey)) return;

    const year = getHireYear(emp.hireDateKey);
    if (!year || year < startYear || year > currentYear) return;

    const label = _buildLabel(granularity, emp.hireDateKey, year);
    if (!label) return;

    if (dataAcc[emp.countryKey] && dataAcc[emp.countryKey][label] !== undefined) {
      dataAcc[emp.countryKey][label]++;
    }
  });

  // Build Chart.js dataset array
  const datasets = countryEntries.map(c => ({
    label: c.name,
    color: CONFIG.CHART_COLORS[c.name] || '#888888',
    data:  labels.map(lbl => dataAcc[c.key][lbl] || 0)
  }));

  return { labels, datasets };
}

/**
 * Generates the full array of time period labels for the chart X-axis.
 *
 * @param {'year'|'quarter'|'month'} granularity
 * @param {number} startYear
 * @param {number} endYear
 * @returns {string[]}
 */
function _buildTimeLabels(granularity, startYear, endYear) {
  const labels = [];

  for (let y = startYear; y <= endYear; y++) {
    if (granularity === 'year') {
      labels.push(String(y));
    } else if (granularity === 'quarter') {
      for (let q = 1; q <= 4; q++) {
        labels.push(`${y} Q${q}`);
      }
    } else { // month
      for (let m = 1; m <= 12; m++) {
        labels.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
  }

  return labels;
}

/**
 * Builds the label key for a specific employee's hire period.
 *
 * @param {'year'|'quarter'|'month'} granularity
 * @param {string} hireDateKey  DDMMYYYY formatted string
 * @param {number} year
 * @returns {string|null}
 */
function _buildLabel(granularity, hireDateKey, year) {
  if (granularity === 'year') return String(year);

  if (granularity === 'quarter') {
    const q = getHireQuarter(hireDateKey);
    return q ? `${year} Q${q}` : null;
  }

  // month
  const m = getHireMonth(hireDateKey);
  return m ? `${year}-${String(m).padStart(2, '0')}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} HiringDataset
 * @property {string}   label  Country name
 * @property {string}   color  Hex color
 * @property {number[]} data   Array of hire counts matching labels array
 */
