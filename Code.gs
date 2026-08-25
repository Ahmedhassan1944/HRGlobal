/**
 * @fileoverview Entry point for the EDECS HR Dashboard Google Apps Script Web App.
 *
 * Exposes:
 *   doGet()               — serves the HTML dashboard
 *   include()             — template partial injector
 *   getDashboardData()    — bootstrap data (initial load)
 *   getOverviewData()     — filtered overview payload
 *   getNationalizationData() — nationalization payload
 *   getHiringTrend()      — hiring trend chart data
 *   getFilterOptions()    — dropdown options
 *   refreshCache()        — cache management
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// WEB APP ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serves the EDECS HR Dashboard as a Google Apps Script Web App.
 * Deploy: Deploy → New Deployment → Web App → Execute as Me → Anyone (or domain).
 *
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle('EDECS HR Dashboard — Workforce & Nationalization')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    AppLogger.error('Code', 'doGet', err.message);
    return HtmlService.createHtmlOutput(`
      <style>
        body { font-family: sans-serif; background:#1F242D; color:#E5C158;
               display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
        .err { text-align:center; }
        h1 { color:#E8A838; }
      </style>
      <div class="err">
        <h1>⚠ Dashboard Unavailable</h1>
        <p>Unable to load dashboard. Please contact your system administrator.</p>
        <small style="color:#6C757D;">Error: ${err.message}</small>
      </div>
    `);
  }
}

/**
 * Injects an HTML partial file's content into the parent template.
 * Used by Index.html: <?!= include('Styles') ?>
 *
 * @param {string} filename  File name without extension (e.g. 'Styles')
 * @returns {string}         Raw HTML content of the file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-CALLABLE SERVER FUNCTIONS
// All functions below are called via google.script.run from JavaScript.html
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full bootstrap payload for the initial dashboard load.
 * Called once when the page first opens.
 *
 * @returns {{ success: boolean, overview: OverviewPayload,
 *             nationalization: NationalizationPayload,
 *             filterOptions: Object, trend: Object, meta: Object }}
 */
function getDashboardData() {
  try {
    AppLogger.info('Code', 'getDashboardData', 'Bootstrap data requested');
    const data            = getCachedData();
    const filters         = sanitizeFilters({});
    const overview        = buildOverviewPayload(data, filters);
    const nationalization = buildNationalizationPayload(data, null);
    const filterOptions   = buildFilterOptions(data);
    const trendData       = buildHiringTrend(data.employees, data.countries, 'year', null);

    return {
      success:       true,
      overview,
      nationalization,
      filterOptions,
      trend:         trendData,
      meta: {
        loadedAt: data.loadedAt,
        today:    getFormattedToday()
      }
    };
  } catch (e) {
    AppLogger.error('Code', 'getDashboardData', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Returns filtered overview data for Page 1.
 * Called when the user changes Country or Department filters.
 *
 * @param {Object} rawFilters  { country: string, department: string }
 * @returns {{ success: boolean, overview: OverviewPayload }}
 */
function getOverviewData(rawFilters) {
  try {
    AppLogger.info('Code', 'getOverviewData', `Filters: ${JSON.stringify(rawFilters)}`);
    const data    = getCachedData();
    const filters = sanitizeFilters(rawFilters);
    const overview = buildOverviewPayload(data, filters);
    return { success: true, overview };
  } catch (e) {
    AppLogger.error('Code', 'getOverviewData', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Returns nationalization payload for Page 2.
 *
 * @param {string|null} countryFilter  Country name or null/"All" for all
 * @returns {{ success: boolean, nationalization: NationalizationPayload }}
 */
function getNationalizationData(countryFilter) {
  try {
    AppLogger.info('Code', 'getNationalizationData', `Filter: ${countryFilter}`);
    const data = getCachedData();
    const cf   = isValidFilterValue(countryFilter)
      ? String(countryFilter).trim()
      : null;
    const nationalization = buildNationalizationPayload(data, cf);
    return { success: true, nationalization };
  } catch (e) {
    AppLogger.error('Code', 'getNationalizationData', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Returns hiring trend data for the multi-line chart.
 *
 * @param {string}      granularity    'year' | 'quarter' | 'month'
 * @param {string|null} countryFilter  Country name or null for all
 * @returns {{ success: boolean, trend: { labels: string[], datasets: Array } }}
 */
function getHiringTrend(granularity, countryFilter) {
  try {
    AppLogger.info('Code', 'getHiringTrend', `gran=${granularity} country=${countryFilter}`);
    const data             = getCachedData();
    const validGranularity = ['year', 'quarter', 'month'].includes(granularity)
      ? granularity
      : 'year';
    const cf = isValidFilterValue(countryFilter)
      ? String(countryFilter).trim()
      : null;
    const trend = buildHiringTrend(data.employees, data.countries, validGranularity, cf);
    return { success: true, trend };
  } catch (e) {
    AppLogger.error('Code', 'getHiringTrend', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Returns available filter values for client dropdown population.
 *
 * @returns {{ success: boolean, filterOptions: { countries: string[], departments: string[] } }}
 */
function getFilterOptions() {
  try {
    const data = getCachedData();
    return { success: true, filterOptions: buildFilterOptions(data) };
  } catch (e) {
    AppLogger.error('Code', 'getFilterOptions', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clears CacheService and forces a full reload from Google Sheets.
 * Called from the client via the Refresh button in the navbar.
 * DataService.refreshCache() is in global scope (all .gs files share scope).
 *
 * @returns {{ success: boolean, message: string }}
 */
function clientRefreshCache() {
  try {
    // refreshCache() is defined in DataService.gs and handles locking & safe invalidation
    const res = refreshCache();
    if (!res.success) throw new Error(res.message);
    return { success: true, message: 'Cache refreshed.' };
  } catch (e) {
    AppLogger.error('Code', 'clientRefreshCache', e.message);
    return { success: false, error: e.message };
  }
}
