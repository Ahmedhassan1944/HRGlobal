# HRGlobal — Performance Enhancement Report

**Reference Commit:** `5c2955ef06c9956c264e2d109aec9b771f66a4c5`  
**Repository:** `Ahmedhassan1944/HRGlobal`  
**Report type:** Static performance audit with source-backed recommendations  
**Prepared by:** Manus AI  
**Date:** 24 August 2026

## 1. Executive assessment

The application already contains several sensible foundations: a single-load data strategy, `CacheService` storage, chunking for the employee payload, client-side debounce for Overview filters, sequence guards for stale filter responses, local SVG/GeoJSON map data, and a fixed-size map/chart layout. These decisions reduce unnecessary repeated work and are better than an implementation that reads Sheets on every interaction.

The highest performance opportunity is not a small JavaScript micro-optimization. It is the number and size of work units crossing the Google Apps Script boundary, followed by repeated full-data aggregation and repeated client-side rebuilds. The application currently loads a large inline HTML payload, performs a bootstrap request and a separate Hiring Trend request, scans the employee collection multiple times to build an Overview response, scans the full employee collection once per country for Nationalization calculations, rebuilds several DOM regions with `innerHTML`, and recreates the Chart.js instance on every chart reload.

The most important recommendation is to measure before and after each change. Google’s guidance recommends minimizing service calls and batching operations rather than optimizing insignificant JavaScript details [1]. The browser-side guidance likewise recommends profiling JavaScript, layout, and paint work before deciding whether a worker, DOM refactor, or micro-optimization is worthwhile [2]. This report therefore separates **confirmed code findings** from **performance hypotheses that require runtime measurement**.

### Overall priority

| Area | Current assessment | Improvement potential | Priority |
|---|---|---:|---:|
| Initial request sequence | Bootstrap plus a separate Hiring Trend request | High | P0 |
| Server-side repeated scans | Overview and Nationalization recalculate from the full employee array | High | P0 |
| Filter request behavior | Debounce and stale-response guard already exist | Medium; optimize only after measurement | P1 |
| Hiring Trend rendering | Chart is destroyed and recreated on every reload | Medium | P1 |
| Map rendering | Geometry is local, but labels and hit-testing do repeated DOM work | Medium | P1 |
| Cache implementation | Good baseline, but chunk reads/writes and invalidation can be hardened | Medium | P1 |
| Inline payload and external assets | Approximately 259 KB of core HTML before browser parsing | Medium | P1/P2 |
| CSS effects and DOM rebuilds | Mostly acceptable at current scale, but repeated updates can cost interaction time | Medium/Low | P2 |
| Date parsing | Repeated `Date` construction in quarter/month Hiring Trend aggregation | Low/Medium | P2 |

## 2. Audit scope and limitations

The audit inspected the committed source at the specified SHA, including `Code.gs`, `DataService.gs`, `DashboardService.gs`, `AnalyticsService.gs`, `Utils.gs`, `Config.gs`, `JavaScript.html`, `Styles.html`, `Index.html`, `Overview.html`, `Nationalization.html`, and `TestSuite.gs`. Static metrics were collected from the committed snapshot.

No production Web App URL, company network trace, real browser Performance recording, Apps Script execution-duration export, or representative high-volume spreadsheet was available in this audit. Consequently, this report does not claim actual seconds saved, actual p95 latency, or a confirmed Lighthouse score. Those measurements are part of the recommended implementation plan.

## 3. Measured static baseline from the Commit

The committed HTML shell and inline partials contain approximately **258,698 bytes** across the principal HTML files. `MapData.html` alone is approximately **130,402 bytes** and contains 227 occurrences of the GeoJSON `type` marker and 113 coordinate blocks in the static snapshot. The principal client files are approximately 63,284 bytes for `JavaScript.html` and 38,364 bytes for `Styles.html`.

| File | Approx. bytes | Approx. lines | Performance relevance |
|---|---:|---:|---|
| `MapData.html` | 130,402 | 11 | Large inline geometry parsed during page load |
| `JavaScript.html` | 63,284 | 1,586 | Main client runtime, requests, DOM, map, and chart |
| `Styles.html` | 38,364 | 1,396 | Layout, effects, scroll windows, chart/map sizing |
| `Index.html` | 6,238 | 126 | Startup shell and external resources |
| `Nationalization.html` | 8,148 | 170 | Cards and Hiring Trend shell |
| `Overview.html` | 9,141 | 231 | Overview tables, filters, and map shell |

The static size is not automatically a problem for an internal dashboard, but it creates a measurable first-load cost because Apps Script HTML Service injects the partials into one page. The correct decision is to compare first-load timing with and without geometry/libraries before splitting or lazy-loading assets.

## 4. Confirmed findings and improvement opportunities

### 4.1 Initial load uses two server-side data requests

`App.loadDashboardData()` first calls `getDashboardData()` and then calls `ChartRenderer.reload('year', null)`, which sends a second `getHiringTrend` request. This is confirmed in `JavaScript.html` around lines 1521–1544. The bootstrap payload already contains Overview and Nationalization data, so the separate chart request is a clear candidate for reducing startup latency.

**Recommended improvement.** Choose one measured strategy. The preferred option is to include the initial Year/All-Countries Hiring Trend payload in `getDashboardData()` when the chart is needed immediately. The alternative is to lazy-load the chart only after the active page is visible, but that would trade startup time for delayed chart availability. Do not automatically add data to the bootstrap response if the chart is not visible on the first page; compare both strategies with real timings.

**Acceptance measurement.** Record the number of server calls and the time from navigation start to the first correct chart render. The target should be one bootstrap request plus only the requests required by visible user actions, not two overlapping initial analytics requests.

### 4.2 Overview filters repeatedly scan and aggregate the full employee array

`buildOverviewPayload()` filters the complete employee array and then loops over the filtered records separately for Country, Department, and Nationality aggregation. It also loops over all employees again to create map aggregates. This is structurally approximately `O(E)` work with several passes for each filter request, where `E` is the employee count. The result is correct, but filter latency will grow linearly with the workforce size.

**Recommended improvement.** Build reusable in-memory indexes after the canonical data snapshot is loaded. Useful indexes include active employees by country, active employees by department, active employees by nationality, and a compact employee representation for the combinations the dashboard actually supports. Use one-pass aggregation where possible. Preserve the exact current filter semantics and the map’s unfiltered-context behavior before replacing the current loops.

Do not build an enormous all-combinations index without measuring memory and cache impact. Start with country and department indexes, measure, then add only the dimensions that reduce real response time.

**Acceptance measurement.** Compare server execution duration for unfiltered, Country-only, Department-only, and combined filters at realistic employee counts. Record p50 and p95 duration, response bytes, and equality of the returned headcount/tables/map pins.

### 4.3 Nationalization calculation performs one full employee scan per country

`buildNationalizationPayload()` loops through every country and calls `calculateNationalizationRate()` for each country. `calculateNationalizationRate()` itself loops through the full employee collection and resolves nationality membership for the target country. With six target countries, the same employee collection can be traversed about six times per Nationalization payload.

**Recommended improvement.** Replace repeated country-by-country scans with a single pass that aggregates `{countryKey, nationalCount, totalActive}` for all countries. Resolve `NationalityKey → Nationality.CountryKey` once per employee, then increment the appropriate aggregate. Apply the existing target and status logic after aggregation. This is a high-value server optimization because it reduces the algorithm from approximately `O(C × E)` to approximately `O(E + C)`, where `C` is the number of countries.

**Correctness constraint.** Preserve the current join path `Employee → NationalityKey → Nationality.CountryKey`; do not replace it with a fragile name comparison. Preserve `N/A` for non-applicable countries.

### 4.4 Hiring Trend repeats date parsing during aggregation

`buildHiringTrend()` calls `getHireYear()` for each employee. For Quarter and Month modes, `_buildLabel()` then calls `getHireQuarter()` or `getHireMonth()`, and each helper creates a new `Date` through `parseHireDateKey()`. This is a confirmed repeated-computation hotspot in `AnalyticsService.gs` and `Utils.gs`.

**Recommended improvement.** Normalize the `HireDateKey` once during data loading or create a compact derived date index containing year, quarter, month, and a validity flag. Use the derived fields in all three granularities. Keep the original raw field for traceability if required. Do not change timezone or date semantics without tests.

**Priority note.** This is lower priority than reducing server calls and repeated full scans. It should be optimized only after measuring Hiring Trend execution time.

### 4.5 Filter request control is already partly optimized, but can be made more robust

The client currently uses a 150 ms debounce and `_applyFiltersSeq` sequence guard in `OverviewCtrl.applyFilters()`. `ChartRenderer.reload()` has a similar debounce and `_reloadSeq` guard. These are good foundations: rapid changes are coalesced and stale responses are ignored.

However, each accepted filter action still sends a Google Apps Script call and the client does not appear to use a request key or a small response cache for repeated identical states. `google.script.run` calls are asynchronous [3], so correctness depends on guarding responses as well as reducing calls.

**Recommended improvement.** Add a normalized request key containing all relevant filter values. Skip a request when the key is identical to the already-applied state. Retain the sequence guard, and verify the response key before applying it. Optionally add a bounded in-memory cache for repeated identical Overview and Hiring Trend states, invalidated after Refresh. Keep the cache small and session-scoped.

Use a debounce only where multiple controls are changed in one user interaction. Do not increase the debounce to hide slow server work. A user selecting one control should see a responsive update.

### 4.6 Refresh invalidation has a fixed chunk-removal limit

`clientRefreshCache()` removes `EDECS_DASH_META`, loops from 0 to 19 to remove employee chunks, removes `EDECS_DASHBOARD_DATA`, and then calls `loadAllData()`. The normal loader currently chunks employee JSON at 85,000 characters. If a future dataset needs more than 20 chunks, the fixed invalidation loop can leave stale chunks behind.

**Recommended improvement.** Store the chunk count in a versioned metadata key and invalidate exactly the recorded chunk keys, or use a versioned cache namespace so old chunks become unreachable atomically. Add a lock around refresh so two users cannot simultaneously rebuild the same cache. CacheService is a short-term cache and reads can return `null`, so partial or missing chunks must continue to trigger safe recovery [4].

This is partly a reliability issue, but reliability failures often become performance failures because users retry Refresh or repeatedly reload the application.

### 4.7 Cache design is a good baseline but sequential chunk operations can be reviewed

`DataService.getCachedData()` reads metadata and then calls `cache.get()` once per employee chunk. `_persistToCache()` calls `cache.put()` once per chunk. This is safe and understandable, but the number of cache service calls grows with dataset size.

**Recommended improvement.** Verify whether the Apps Script runtime and project conventions support batch cache operations for the required keys. If supported, use batch reads/writes for chunks; otherwise retain chunking and measure whether chunk count is material before adding complexity. Do not assume cache persistence is guaranteed; the official documentation explicitly states that cached data may disappear before expiration [4].

Also consider storing a compact pre-aggregated analytics snapshot separately from the full employee payload if the dashboard can answer common filters without reconstructing every dimension for each request. Validate the cache size and invalidation behavior first.

### 4.8 Chart.js recreates the full chart on every reload

`ChartRenderer.render()` destroys an existing chart and creates a new Chart.js instance. `ChartRenderer.reload()` calls it after every chart-country or granularity change. At the current dataset size this may be acceptable, but it causes avoidable allocation, layout, plugin initialization, and animation work.

**Recommended improvement.** Keep one Chart.js instance and update its labels/datasets when only data changes. Recreate it only when the chart type or an incompatible configuration changes. Disable or shorten animations for rapid filter updates if profiling shows they contribute to interaction delay. Chart.js recommends disabling animations when render time is long, and recommends prepared/normalized data when the data satisfies those conditions [5]. Do not add decimation or Web Workers merely because they exist; the Hiring Trend dataset may be too small to benefit, and DOM-dependent interaction does not move cleanly to a worker.

**Correctness constraint.** Preserve the first-load sizing fix, `responsive: true`, `maintainAspectRatio: false`, skeleton behavior, stale-response guard, tooltip content, and Year/Quarter/Month behavior.

### 4.9 Map rendering repeats label and hit-test work during updates

The map geometry is local, which avoids remote tile requests and is an important resilience decision. However, `MapRenderer.updatePins()` and `_updateLabels()` perform repeated SVG attribute updates, `querySelectorAll()` calls, and `getComputedTextLength()` work. The map-level `pointermove` handler also uses `document.elementFromPoint()` on every pointer movement.

**Recommended improvement.** Keep stable references to target paths and label nodes during map initialization. Update only nodes whose state or count changed. Avoid recalculating label text widths on every filter update; cache measured widths by label text and font state. Do not call `MapRenderer.updatePins()` when map pins are unchanged by the current filter, since the project intentionally keeps map pins unfiltered for context.

For pointer hit-testing, use a stable delegated strategy and avoid unnecessary work when the pointer remains over the same target. If `elementFromPoint()` is still required for cross-browser correctness, throttle processing to one `requestAnimationFrame` per frame rather than running multiple DOM hit-tests in the same frame. Browser guidance recommends scheduling visual work with `requestAnimationFrame` and measuring long JavaScript tasks rather than guessing [2].

### 4.10 DOM rebuilds are simple but should be kept bounded

The table renderer rebuilds each table body with `innerHTML`, the KPI breakdown is rebuilt with `innerHTML`, and Nationalization cards are rebuilt as a complete grid. At the current dashboard size this is not automatically a bottleneck, and a full rebuild can be simpler and less error-prone than many individual mutations.

**Recommended improvement.** Keep the existing simple approach until runtime profiling shows a measurable interaction cost. If it becomes material, use a `DocumentFragment`, update only changed text/status nodes, and avoid recreating stable wrappers and event listeners. The six-row visible table requirement should not be “optimized” by deleting rows that users need to scroll to. The DOM-size guidance warns that larger DOMs and repeated DOM updates increase layout, style, and paint work [6].

### 4.11 Inline map geometry and external assets affect first paint

`Index.html` injects `Styles`, `MapData`, and `JavaScript` into one HTML response and loads Google Fonts plus Chart.js from external URLs. The local map geometry improves corporate-network reliability, but parsing 130 KB of inline geometry and waiting for an external Chart.js script and fonts can affect perceived startup performance.

**Recommended improvement.** Measure first. If the map is not required before the Overview page is visible, consider loading the map data at the point the map is initialized while keeping a local, bundled fallback. If the map must be immediately visible, simplify GeoJSON coordinates offline and retain only the precision needed at the fixed viewport. Do not simplify without a visual regression check for Egypt, Saudi Arabia, UAE, Oman, Tanzania, and Angola.

For predictable corporate performance, consider pinning and locally bundling Chart.js and the required fonts, or provide a system-font fallback and a locally available chart fallback. This recommendation is also about resilience: a blocked external resource can look like a slow application or an incomplete first render.

### 4.12 Loading-screen effects and CSS paint cost should be profiled

The loading screen uses animated logo glow, spinner, and an indeterminate progress animation. The dashboard also uses shadows, transitions, sticky/blurred UI effects, and map/card visual effects. These are not proven bottlenecks, but they add paint/compositing work during startup and interactions.

**Recommended improvement.** Keep the current design by default. Use the browser Performance panel to determine whether `backdrop-filter`, large shadows, or repeated transitions contribute to long frames. If they do, reduce blur radius and shadow spread, avoid animating expensive properties, and keep the existing `prefers-reduced-motion` behavior. Do not sacrifice the dashboard’s visual identity based on static assumptions.

### 4.13 Initialization has a safe guard but an avoidable fallback timer

The application registers `_initApp()` on `window.load` and also schedules a 500 ms fallback. `_appInitialized` prevents duplicate initialization, so this is primarily a timing and clarity issue rather than a confirmed duplicate-request bug.

**Recommended improvement.** Replace the dual startup path with one deterministic readiness strategy after verifying Apps Script HTML Service behavior in the company environment. If a fallback is necessary, make it a guarded diagnostic path and record which path won. The 12-second nuclear fallback in `Index.html` should not silently reveal a partially initialized dashboard; distinguish “data unavailable” from “shell visible.”

## 5. Performance recommendations by layer

| Layer | Recommended action | Expected benefit | Risk |
|---|---|---|---|
| Apps Script boundary | Reduce bootstrap calls; avoid unnecessary full payload calls | Lower startup latency and quota pressure | Medium: response contract changes |
| Server aggregation | Precompute/reuse indexes; aggregate Nationalization in one pass | Lower filter and card computation time | Medium: must preserve exact results |
| Cache | Version metadata, lock refresh, handle missing chunks, review batch operations | Better warm-load speed and reliability | Medium |
| Client requests | Normalized request keys, latest-response guard, bounded cache | Fewer duplicate/stale updates | Low/Medium |
| Hiring Trend | Reuse chart instance; update data; control animations | Faster chart interaction | Medium |
| Map | Stable node references, skip unchanged updates, rAF hit-testing | Smoother hover/filter interaction | Medium |
| DOM | Keep rebuilds bounded; fragment/update only if measured | Lower layout/paint cost | Low |
| Assets | Measure/lazy-load or simplify local map data; localize critical dependencies | Better first paint and corporate resilience | Medium |
| CSS | Profile blur/shadows/transitions before reducing them | Lower paint cost where proven | Low |
| Observability | Add controlled timing and request counters | Enables safe optimization decisions | Low |

## 6. Recommended implementation order

### Phase 0 — Establish a baseline

Add temporary, controlled measurements around `getDashboardData`, `getOverviewData`, `getNationalizationData`, `getHiringTrend`, client request count, response size, chart render duration, and filter-to-paint duration. Use Apps Script execution history for server-side timings and the browser Performance panel for client-side timings. Remove or gate verbose diagnostics before production.

Capture at least: cold load, warm load, Country filter, Department filter, combined filter, Reset, Hiring Trend granularity change, chart-country change, Nationalization open, and Refresh. Test with at least one small and one realistic production-sized dataset if available.

### Phase 1 — Highest-return, lowest-regression changes

First reduce unnecessary request work and fix the server algorithms: decide whether the initial Hiring Trend response belongs in bootstrap, optimize Nationalization to one employee pass, and introduce carefully scoped derived indexes. Add cache versioning and refresh locking. Preserve response equality through automated tests.

### Phase 2 — Client interaction efficiency

Next harden filter request keys and stale-response handling, reuse the Chart.js instance, skip unchanged map updates, and throttle map hit-testing through `requestAnimationFrame` if profiling confirms pointer cost. Keep the existing debounce short and responsive.

### Phase 3 — First-paint and asset improvements

Only after measuring, simplify the local map geometry, defer non-critical work, and localize critical external assets. Validate the corporate network case and all supported browsers after each asset change.

### Phase 4 — Visual paint tuning

Finally, tune blur, shadows, transitions, and loading animations only where a Performance recording demonstrates a real frame or interaction cost. Keep the visual design and accessibility behavior intact.

## 7. Suggested performance gates

These are proposed engineering gates, not measured results from this audit:

| Gate | Suggested rule |
|---|---|
| Initial server calls | No unnecessary duplicate analytics call during first load |
| Filter action | One effective request per intentional filter state |
| Stale response | An older response never overwrites a newer state |
| Overview render | Tables, KPI, map, and counts update once per accepted response |
| Chart lifecycle | One active Chart.js instance; no duplicate canvas or listeners |
| Map lifecycle | No repeated geometry rebuild when pins and geometry are unchanged |
| Cache refresh | All prior chunks become unreachable after refresh/version change |
| Data correctness | Optimized payloads equal the current implementation for representative fixtures |
| Browser behavior | Firefox, Chrome, Edge, and Brave are tested or explicitly marked unverified |
| Production observability | Timings and request counters are controlled and do not expose employee data |

## 8. Final prioritization

The first engineering sprint should focus on **bootstrap request consolidation, Nationalization one-pass aggregation, derived server indexes, and cache refresh/version safety**. These changes attack work that grows with data size and user activity.

The second sprint should focus on **Chart.js instance reuse, map update skipping, stable SVG references, and measured request-key caching**. These changes improve interaction responsiveness without redesigning the application.

Asset localization, GeoJSON simplification, CSS effect reduction, and micro-level date optimizations should follow measurement. They may help, but they are less important than reducing server calls and repeated full-data scans.

The project is therefore **well positioned for performance improvement without a rewrite**. The architecture does not require React, a new backend, or a replacement map library. It needs measured reduction of repeated work, stronger cache lifecycle control, and more efficient reuse of data and rendered objects.

## References

[1]: https://developers.google.com/apps-script/guides/support/best-practices "Google Apps Script Best Practices"

[2]: https://web.dev/articles/optimize-javascript-execution "Optimize JavaScript execution — web.dev"

[3]: https://developers.google.com/apps-script/guides/html/reference/run "google.script.run Client-side API — Google Apps Script"

[4]: https://developers.google.com/apps-script/reference/cache/cache-service "CacheService — Google Apps Script"

[5]: https://www.chartjs.org/docs/latest/general/performance.html "Performance — Chart.js"

[6]: https://web.dev/articles/dom-size-and-interactivity "How large DOM sizes affect interactivity — web.dev"
