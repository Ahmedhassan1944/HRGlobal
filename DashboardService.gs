/**
 * @fileoverview Payload builders for each dashboard view.
 *
 * Transforms raw DashboardData from DataService into lightweight,
 * client-ready JSON objects. Applies all filtering and aggregation here
 * so the client receives clean, structured payloads.
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW PAGE PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the full Overview page payload (Page 1).
 *
 * Applies Country and Department filters to headcount, tables.
 * Map pins always reflect all active employees (unfiltered) for geographic context.
 *
 * @param {DashboardData} data
 * @param {{ country: string|null, department: string|null }} filters
 * @returns {OverviewPayload}
 */
function buildOverviewPayload(data, filters) {
  const { employees, countries, nationalities, departments } = data;

  // ── Filtered active employees ─────────────────────────────────────────────
  const filtered = employees.filter(emp => {
    if (!emp.isActive) return false;

    if (filters.country) {
      const c = countries[emp.countryKey];
      if (!c || c.name !== filters.country) return false;
    }

    if (filters.department) {
      const d = departments[emp.departmentKey];
      if (!d || d.name !== filters.department) return false;
    }

    return true;
  });

  // ── Head Count ────────────────────────────────────────────────────────────
  const headCount = filtered.length;

  // ── Country Table ─────────────────────────────────────────────────────────
  const countryAcc = {};
  filtered.forEach(emp => {
    const c = countries[emp.countryKey];
    if (!c) return;
    countryAcc[c.name] = (countryAcc[c.name] || 0) + 1;
  });
  const countryTable = Object.entries(countryAcc)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Department Table ──────────────────────────────────────────────────────
  const deptAcc = {};
  filtered.forEach(emp => {
    const d = departments[emp.departmentKey];
    if (!d || !d.name) return;
    deptAcc[d.name] = (deptAcc[d.name] || 0) + 1;
  });
  const deptTable = Object.entries(deptAcc)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // ── Nationality Table (Top 15) ────────────────────────────────────────────
  const natAcc = {};
  filtered.forEach(emp => {
    const n = nationalities[emp.nationalityKey];
    if (!n || !n.name) return;
    natAcc[n.name] = (natAcc[n.name] || 0) + 1;
  });
  const nationalityTable = Object.entries(natAcc)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ── Map Pins (all active employees, unfiltered by dept) ───────────────────
  const mapAcc = {};
  employees.forEach(emp => {
    if (!emp.isActive) return;
    const c = countries[emp.countryKey];
    if (!c) return;
    mapAcc[c.name] = (mapAcc[c.name] || 0) + 1;
  });

  const mapPins = Object.values(countries)
    .map(c => {
      const coords = CONFIG.MAP_COORDINATES[c.name];
      if (!coords) return null;
      return {
        countryName: c.name,
        headCount:   mapAcc[c.name] || 0,
        lat:         coords.lat,
        lng:         coords.lng,
        color:       CONFIG.CHART_COLORS[c.name] || '#888888'
      };
    })
    .filter(Boolean);

  return { headCount, countryTable, deptTable, nationalityTable, mapPins };
}

// ─────────────────────────────────────────────────────────────────────────────
// NATIONALIZATION PAGE PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Nationalization page payload (Page 2).
 *
 * Each card includes: actual %, target %, variance, status label.
 * Only countries with NationalizationProgramApplicable = TRUE get a status.
 * Countries without the program show actual % only.
 *
 * @param {DashboardData} data
 * @param {string|null}   countryFilter  Country name filter or null for all
 * @returns {NationalizationPayload}
 */
function buildNationalizationPayload(data, countryFilter) {
  const { employees, countries, nationalities } = data;

  const totalActive = employees.filter(e => e.isActive).length;

  const cards = [];

  Object.values(countries).forEach(country => {
    if (countryFilter && country.name !== countryFilter) return;

    const { nationalCount, totalActive: countryActive, rate } =
      calculateNationalizationRate(employees, nationalities, country.key);

    const applicableTarget = country.nationalizationApplicable ? country.targetPct : null;
    const variance = applicableTarget !== null
      ? parseFloat((rate - applicableTarget).toFixed(2))
      : null;
    const status = applicableTarget !== null
      ? classifyNationalizationStatus(rate, applicableTarget)
      : 'N/A';

    cards.push({
      countryName:    country.name,
      actualPct:      parseFloat(rate.toFixed(2)),
      targetPct:      applicableTarget,
      variance:       variance,
      status:         status,
      nationalCount:  nationalCount,
      totalActive:    countryActive,
      applicable:     country.nationalizationApplicable
    });
  });

  // Sort per CONFIG.COUNTRIES display order
  cards.sort((a, b) => {
    const ai = CONFIG.COUNTRIES.indexOf(a.countryName);
    const bi = CONFIG.COUNTRIES.indexOf(b.countryName);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return { headCount: totalActive, cards };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns sorted arrays of available filter values for client dropdowns.
 *
 * @param {DashboardData} data
 * @returns {{ countries: string[], departments: string[] }}
 */
function buildFilterOptions(data) {
  const countries = Object.values(data.countries)
    .map(c => c.name)
    .filter(Boolean)
    .sort((a, b) => {
      // Honour CONFIG.COUNTRIES order first, then alphabetical
      const ai = CONFIG.COUNTRIES.indexOf(a);
      const bi = CONFIG.COUNTRIES.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

  const departments = Object.values(data.departments)
    .map(d => d.name)
    .filter(n => n && n !== 'undefined' && n !== '')
    .sort((a, b) => a.localeCompare(b));

  return { countries, departments };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OverviewPayload
 * @property {number}                                  headCount
 * @property {Array<{name:string, count:number}>}      countryTable
 * @property {Array<{name:string, count:number}>}      deptTable
 * @property {Array<{name:string, count:number}>}      nationalityTable
 * @property {Array<MapPin>}                           mapPins
 */

/**
 * @typedef {Object} NationalizationPayload
 * @property {number}                   headCount
 * @property {Array<NationalizationCard>} cards
 */

/**
 * @typedef {Object} NationalizationCard
 * @property {string}      countryName
 * @property {number}      actualPct
 * @property {number|null} targetPct
 * @property {number|null} variance
 * @property {string}      status
 * @property {number}      nationalCount
 * @property {number}      totalActive
 * @property {boolean}     applicable
 */

/**
 * @typedef {Object} MapPin
 * @property {string} countryName
 * @property {number} headCount
 * @property {number} lat
 * @property {number} lng
 * @property {string} color
 */
