# Prompt(15) — Hiring Trend Reliability, Filter Performance, and Correct Nationalization Status Rules

## Task mode

This is a **targeted code-change and verification request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`.

The reference Commit is:

```text
ee04b90b8040afe8fb0f2ff0b65a5a1d77f5b195
```

Inspect that Commit and the current repository state before editing. Review at minimum:

- `AnalyticsService.gs`
- `Config.gs`
- `DashboardService.gs`
- `DataService.gs`
- `JavaScript.html`
- `Nationalization.html`
- `Styles.html`
- `TestSuite.gs`

This request has three separate objectives:

1. Confirm and, if necessary, fix Hiring Trend so it renders correctly on first load and after filter changes.
2. Make filtered-data requests fast, efficient, race-safe, and free of duplicate requests without changing business results.
3. Correct and document the Nationalization card status rules, especially `Above Target`, `Near Target`, and `Below Target`.

Apply only the necessary changes in the actual project files. Do not return only an analysis or pseudocode. Do not modify unrelated map, table, navigation, or business logic. Review the full diff and report the exact files changed and the tests actually performed.

---

## Part A — Hiring Trend must work correctly on first load

### Current expected behavior

When Overview opens for the first time or after a hard refresh, the Hiring Trend chart must already be correctly sized and rendered. The user must not click a filter, change a granularity control, or interact with another component to make it appear correctly.

Inspect the current `ChartRenderer` lifecycle, `App.loadDashboardData()`, `Router.navigate()`, `LoadingManager`, and the `getHiringTrend` call before changing anything.

### Required checks and implementation rules

1. Confirm that the Overview chart container is visible and has non-zero dimensions before creating the Chart.js instance.
2. Preserve or implement `responsive: true` and `maintainAspectRatio: false` where appropriate.
3. Ensure the chart parent has a stable non-zero height and that the canvas is not initialized while `display:none` or while its parent is collapsed.
4. Ensure the initial sequence is deterministic: load data, show the chart canvas at the correct time, create or update exactly one chart, then resize after the final layout pass if needed.
5. Preserve the existing chart data, series, labels, colors, tooltip behavior, and Year/Quarter/Month controls.
6. When returning to Overview after visiting Nationalization, resize the existing chart safely without creating a duplicate Chart.js instance.
7. When changing the chart country or granularity, update or recreate the chart exactly once and display the new result without stale data.
8. Keep the existing loading skeleton and error behavior correct.
9. Do not solve the first-load issue with a user workaround or an arbitrary long timeout alone.
10. Do not create an uncontrolled polling loop, duplicate canvas, duplicate observer, or duplicate resize listener.

### Hiring Trend acceptance tests

Verify, without a workaround click:

- first navigation to Overview;
- hard refresh while Overview is the initial page;
- first load in Firefox, Chrome, Edge, and Brave when available;
- Country change for the chart;
- Year, Quarter, and Month changes;
- navigation to Nationalization and back;
- Refresh/new data load;
- multiple rapid control changes;
- desktop, tablet, and mobile widths.

The chart must be fully visible, correctly scaled, and based on the latest response in every tested scenario. If a browser cannot be tested, state that limitation explicitly.

---

## Part B — Efficient and reliable filtered-data requests

### Audit the current request paths first

Trace every call made by:

- `#filter-country`;
- `#filter-department`;
- the map Country click;
- the shared Reset button;
- the Hiring Trend Country selector;
- the Hiring Trend granularity controls;
- the Refresh button;
- navigation between Overview and Nationalization.

Identify where multiple handlers can issue duplicate or overlapping `google.script.run` requests. Do not change the Google Apps Script data contracts unless a directly related compatibility fix is necessary.

### Required performance and correctness behavior

1. **One request per intentional action.** A single dropdown change, map selection, Reset, chart-country change, or granularity change must not trigger duplicate server calls.
2. **Race-safe responses.** Google Apps Script calls cannot necessarily be cancelled after dispatch. Add a request sequence/token or equivalent latest-request guard so an old slow response can never overwrite the result of a newer filter selection.
3. **Current-state validation.** Before applying a response, verify that its request key still matches the current filters and control state. Ignore stale responses safely.
4. **No stale loading state.** A stale response or stale error must not hide a newer request’s loading state or display an old error over a newer successful result.
5. **Efficient filter batching.** If the existing UI can fire multiple filter changes in the same short interaction, use a small, clearly justified debounce or coalescing strategy. Do not add a long delay that makes the dashboard feel slow. A normal single control change should remain responsive.
6. **Avoid unnecessary full reloads.** Do not call `getDashboardData` when `getOverviewData` or the existing narrower function is sufficient for an Overview filter change. Do not reload Nationalization or Hiring Trend data unnecessarily when the changed control does not affect it.
7. **Safe optional client cache.** If useful, use a small in-memory cache keyed by the complete filter/request parameters for repeated identical requests during the current page session. Invalidate or bypass it after Refresh. Never show cached data in place of a newer intentional request without clearly matching the request key.
8. **Preserve filter semantics.** Country, Department, combined filters, map selection, Reset, and aliases such as `KSA`, `Saudi Arabia`, and `SAU` must continue to produce the same business result.
9. **No duplicate listeners.** Initialization and page navigation must not attach duplicate event listeners that multiply server calls.
10. **Do not block the UI.** Keep controls usable, show the existing loading indicators, and prevent the page from freezing while data is loading.
11. **Instrument only if useful.** Temporary or controlled timing diagnostics may be used to compare request count and duration, but do not expose sensitive data and do not leave noisy production logging.

### Filter performance acceptance tests

For each scenario, record the number of server calls and ensure the final UI represents the latest action:

- one Country dropdown change;
- one Department dropdown change;
- rapid Country then Department changes;
- combined filter changes;
- map click on a different country;
- map click on the already-selected country if the current release supports toggle-to-reset;
- shared Reset;
- repeated same-value selection;
- rapid changes followed by Reset;
- Refresh during an in-flight filter request;
- navigation away and back while a request is in flight.

The implementation must not append duplicate rows, show stale KPI values, restore an old map state, overwrite a newer table result, or leave a perpetual spinner. Do not claim performance improvement without actually checking request counts or clearly documenting what could not be measured.

---

## Part C — Nationalization card status logic

### Current logic found in the reference Commit

The reference implementation currently defines `CONFIG.NEAR_TARGET_THRESHOLD` as `2` and classifies based on variance around the target. That means a card may become `Near Target` even when the actual percentage is above the target, which is not the requested business rule.

The current rule must be replaced with the explicit rule below.

### Required business rule

Let:

```text
actual = actual nationalization percentage
 target = target percentage
NEAR_GAP = 10 percentage points
```

Classify in this exact order:

```javascript
if (actual >= target) {
  return 'Above Target';
}

if (actual < target && actual >= target - NEAR_GAP) {
  return 'Near Target';
}

return 'Below Target';
```

This is a **10 percentage-point gap**, not a relative 10% multiplier and not a symmetric ±10% band.

### Expected examples

For `target = 50%`:

| Actual | Expected status | Visual treatment |
|---:|---|---|
| 60% | Above Target | Green |
| 51% | Above Target | Green |
| 50% | Above Target | Green |
| 49.99% | Near Target | Yellow/amber |
| 45% | Near Target | Yellow/amber |
| 40% | Near Target | Yellow/amber |
| 39.99% | Below Target | Red |
| 20% | Below Target | Red |

Therefore, `51%` must **never** be `Near Target`. Any actual value equal to or greater than the target is `Above Target`.

### Implementation requirements

1. Update the authoritative server-side classification function, identified in the repository as `classifyNationalizationStatus(...)` in `AnalyticsService.gs` or its current equivalent.
2. Update `CONFIG.NEAR_TARGET_THRESHOLD` or replace it with a clearly named setting such as `NEAR_TARGET_GAP_POINTS: 10`.
3. Ensure the unit of the setting is documented as **percentage points**.
4. Keep `N/A` for countries where `nationalizationApplicable` is false or where the target is null; do not classify those cards as Below Target.
5. Keep `actualPct`, `targetPct`, and `variance` calculations unchanged unless a direct bug is found. The status classification must use the full-precision numeric values before display rounding.
6. Preserve the existing green, amber/yellow, and red CSS classes and status labels unless a directly related correction is required.
7. Ensure the UI status text and color are derived from the server-provided status and are not independently reclassified with a conflicting frontend rule.
8. Do not classify based on the formatted string, rounded display text, or variance sign alone.
9. Preserve the current card ordering, filters, counts, and Nationalization page layout.

### Required status unit tests

Add or update deterministic tests in `TestSuite.gs` or the project’s existing test location. At minimum, test:

```text
classifyNationalizationStatus(51, 50)      === 'Above Target'
classifyNationalizationStatus(50, 50)      === 'Above Target'
classifyNationalizationStatus(49.99, 50)   === 'Near Target'
classifyNationalizationStatus(45, 50)      === 'Near Target'
classifyNationalizationStatus(40, 50)      === 'Near Target'
classifyNationalizationStatus(39.99, 50)   === 'Below Target'
classifyNationalizationStatus(0, 50)       === 'Below Target'
```

Also test at least one non-50% target, for example:

```text
classifyNationalizationStatus(90, 85)      === 'Above Target'
classifyNationalizationStatus(80, 85)      === 'Near Target'
classifyNationalizationStatus(75, 85)      === 'Near Target'
classifyNationalizationStatus(74.99, 85)   === 'Below Target'
```

Test the `N/A` path separately through `buildNationalizationPayload(...)` for a non-applicable country.

---

## Preserve unrelated behavior

Do not change:

- local SVG/GeoJSON map geometry;
- map labels, hover, tooltip, KSA/SAU mapping, active fill `#b38126`;
- map Reset and same-country toggle behavior;
- six-row table viewport, full-data internal scrolling, and total-only count badges;
- KPI calculations;
- Nationalization card data other than the requested status rule;
- Hiring Trend business data or series;
- page navigation;
- external-resource policy;
- Google Apps Script contracts except where a directly related performance or status fix is necessary.

Do not reintroduce Leaflet, external map tiles, emoji flags, or any unrelated dependency.

## Required final review

After implementation:

1. Review the complete diff.
2. Identify the exact original cause of the Hiring Trend first-load issue and explain the lifecycle/sizing fix.
3. Report the request path changes, request de-duplication/race-safety method, and measured or unmeasured performance checks.
4. Report the exact Nationalization status formula and threshold unit.
5. Confirm that `51%` against a `50%` target is `Above Target`, not `Near Target`.
6. Confirm that a value between `40%` and below `50%` against a `50%` target is `Near Target`.
7. Confirm that values below `40%` are `Below Target`.
8. List the exact files changed and all tests actually performed.
9. Do not claim browser or performance coverage that was not actually verified.

## Final acceptance criteria

The work is accepted only when:

- Hiring Trend is correct on first page load without a user workaround.
- Hiring Trend remains correct after filters, granularity changes, navigation, refresh, and resizing.
- No stale filter response can overwrite a newer selection.
- Intentional filter actions do not create duplicate server requests.
- Current loading, error, and empty states remain correct.
- The Nationalization rule is:
  - `actual >= target` → `Above Target` / green;
  - `target - 10 percentage points <= actual < target` → `Near Target` / yellow/amber;
  - `actual < target - 10 percentage points` → `Below Target` / red.
- `51%` versus `50%` is green `Above Target`.
- `40%` versus `50%` is yellow/amber `Near Target`.
- `39.99%` versus `50%` is red `Below Target`.
- Non-applicable countries remain `N/A`.
- Existing map, tables, filters, navigation, and data contracts do not regress.
