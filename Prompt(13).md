# Prompt(13) — Map Reset Button and Toggle-to-Reset Country Selection

## Task mode

This is a **code-change request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. Inspect the current repository and latest committed implementation first, then apply the requested changes in the actual project files. Do not return only an analysis, plan, pseudocode, or code snippet. Make the smallest safe implementation, review the diff, and report the exact files changed and the verification performed.

The current application already has a working Overview Reset button:

```text
#overview-reset-filters-btn
```

The existing Reset behavior must remain the single source of truth. Reuse it; do not create a second Reset implementation with slightly different behavior.

## Objectives

Implement both features below:

1. Add a Reset button inside the map card/header with the same visual language as the existing Overview Reset button.
2. When the user clicks a country that is already the currently selected country filter, treat that second click as a full Reset and apply exactly the same rules as the existing Reset button.

## Feature A — Reset button inside the map card

Add one accessible button inside the existing map card header in `Overview.html`, next to the map title or the existing `Interactive` badge. Use a unique ID such as:

```text
#map-reset-filters-btn
```

The button must:

- have `type="button"`;
- have visible text such as `✕ Reset` or `Reset`, consistent with the current filter Reset button;
- have an accessible name such as `Reset all dashboard filters`;
- use the existing Reset button CSS class where appropriate, or add a small directly related class without redesigning the dashboard;
- remain readable and aligned on desktop, tablet, and mobile;
- not create a second `id="map"` or alter the map viewport;
- not control zoom, pan, or map geometry.

Wire the button during the existing initialization flow. Do not attach a new listener every time the page is navigated to or the map is re-rendered.

## Feature B — Clicking the already-selected country resets everything

Inspect the current `MapRenderer._onCountryClick(iso3, displayName)` implementation and the existing country filter state in `AppState`.

Current behavior when clicking a country is to set the country dropdown, call:

```javascript
AppState.setOverviewFilter('country', optVal);
OverviewCtrl.applyFilters();
```

Keep that behavior when the clicked country is different from the currently selected country.

Add this exact toggle rule:

```text
If the clicked country resolves to the same canonical ISO3 code as the currently selected country filter, do a full Reset instead of applying the same filter again.
```

The comparison must use the existing canonical alias mapping so that these values are treated as the same country:

```text
KSA          ↔ Saudi Arabia ↔ SAU
Egypt        ↔ EGY
UAE          ↔ ARE or the project’s existing canonical code
Oman         ↔ OMN
Tanzania     ↔ TZA
Angola       ↔ AGO
```

Use the project’s existing mapping as the source of truth; do not introduce conflicting aliases.

When the same country is clicked again, the result must be exactly equivalent to clicking `#overview-reset-filters-btn` once. It must:

1. call `AppState.resetOverviewFilters()`;
2. set `#filter-country` to `All`;
3. set `#filter-department` to `All`;
4. call `OverviewCtrl.applyFilters()` once;
5. restore all KPI, tables, map fills, selected/dimmed states, labels, and counts to the unfiltered state;
6. reset any table scroll positions that the existing Reset behavior is responsible for;
7. hide any transient map tooltip and clear hover/selected visual state where appropriate;
8. avoid changing the map viewport or adding zoom/pan behavior.

Do not merely clear the map highlight or set only the dropdown value to `All`. The second click must execute the complete existing Reset workflow, including the other filters and all dependent dashboard components.

## Feature C — Show only the selected country when a Country filter is active

Add this exact visual rule to the existing Country filter behavior:

> When a Country filter is active, only the selected country remains visible as a target country on the map. The selected country keeps its polygon, its visible country name/label, its headcount details, and the active fill color `#b38126`. Every other target country must disappear from the target-country presentation: no active color, no visible permanent label, no tooltip, no hover highlight, no click target, and no keyboard focus target.

For example, when the Country filter is `Egypt`:

- Egypt remains visible with its polygon, the label `Egypt`, its headcount, and fill `#b38126`.
- Saudi Arabia, UAE, Oman, Tanzania, and Angola must have no visible target-country fill and no visible target-country labels.
- The other target countries must not remain merely dimmed or dark-colored as visible target countries.
- The dark background/context geography may remain as the base map, but it must not display the dashboard’s target-country labels or target-country interaction states.
- Moving the pointer over the hidden countries or their former locations must not show a tooltip or hover state.

Implement this as a reversible visual state, not by deleting GeoJSON features or permanently removing SVG nodes. Keep the existing path and label elements available so Reset can restore them without rebuilding the map or creating duplicate event listeners. Use the existing `_pathEls`, `_labelLayer`, and target-country state architecture. A class/state such as `map-country--filtered-out` is acceptable, provided it makes the non-selected target polygon visually absent and non-interactive using a reliable combination of `display:none` or `visibility:hidden`, `pointer-events:none`, `aria-hidden="true"`, and removal of `tabindex` where appropriate.

The selected country must remain visible even if its current headcount is zero, unless the application has an explicit existing no-data rule. Do not let the selected country disappear simply because `count === 0`.

When the Country filter is `All`, restore every target-country polygon and every target-country label to its normal unfiltered state. Clear all temporary visibility, `display`, `visibility`, `pointer-events`, `aria-hidden`, `tabindex`, class, fill, stroke, and hover state changes left by filtering. The map must return to the same state as the existing full Reset behavior.

Apply this visibility rule after every `OverviewCtrl.applyFilters()` and `MapRenderer.updatePins()` call, after a map Reset, and after repeated filter changes. Hover, focus, tooltip updates, and rerendering must not make filtered-out target countries visible again.

Use the existing canonical alias resolution. `KSA`, `Saudi Arabia`, and `SAU` must select the same Saudi Arabia feature. The visible display label must remain `Saudi Arabia`.

### Country-filter visibility matrix

| Country filter | Required target-country result |
|---|---|
| `All` | All target countries are restored with their normal labels, fills, and interactions. |
| `Egypt` | Only Egypt polygon and `Egypt` label are visible and active with `#b38126`; all other target countries are absent and non-interactive. |
| `KSA`, `Saudi Arabia`, or `SAU` | Only Saudi Arabia polygon and `Saudi Arabia` label are visible and active with `#b38126`; all other target countries are absent and non-interactive. |
| Any other target country | Only the selected country polygon and canonical display label are visible. |
| Full Reset | All target countries and labels return exactly to the `All` state. |

Do not implement this by leaving other target countries with `FILL_CONTEXT`, opacity, or a dark visible label. When a Country filter is active, non-selected target countries must be visually absent from the target-country layer.

## Single-source-of-truth Reset design

Refactor the existing Reset handler only if necessary to expose one reusable function, for example:

```javascript
FilterManager.resetOverviewFilters = function() {
  AppState.resetOverviewFilters();
  FilterManager.setDropdownValue('filter-country', 'All');
  FilterManager.setDropdownValue('filter-department', 'All');
  OverviewCtrl.applyFilters();
};
```

The exact owner/name may follow the current project conventions, but there must be one shared function used by all of these entry points:

- `#overview-reset-filters-btn` click;
- `#map-reset-filters-btn` click;
- second click on the already-selected map country.

Do not duplicate the Reset sequence in three separate event handlers. Do not call both the shared Reset function and the old inline sequence, because that would cause duplicate server requests and duplicate renders.

If `OverviewCtrl.applyFilters()` is asynchronous or returns a Promise in the current implementation, preserve the current behavior and do not introduce duplicate calls. The shared Reset function must be safe to call repeatedly.

## Country click state details

The toggle comparison must read the current state immediately before acting:

1. Read `AppState.get('overviewFilter').country`.
2. Resolve both the current filter value and clicked country to the same canonical ISO3 code.
3. If the current filter is not `All` and the canonical codes match, invoke the shared full Reset function and return immediately.
4. Otherwise, apply the existing country-filter flow exactly once.

Examples:

| Current country filter | Clicked country | Expected result |
|---|---|---|
| `All` | Egypt | Apply Egypt country filter. |
| `All` | Saudi Arabia | Apply Saudi Arabia/KSA country filter. |
| `KSA` | Saudi Arabia | Full Reset. |
| `Saudi Arabia` | `SAU` | Full Reset. |
| `Egypt` | Egypt | Full Reset. |
| `Egypt` | UAE | Switch the filter to UAE. |
| `Egypt` + a Department filter | Egypt | Full Reset of both Country and Department. |
| `All` + a Department filter | Egypt | Apply Egypt country filter and preserve the existing department-filter semantics unless the current application explicitly resets it. |

The clicked path must not trigger two competing actions. The selected country must not be filtered, reset, and filtered again due to duplicate handlers.

## Preserve existing visual and functional behavior

Do not modify unrelated features. Preserve:

- local SVG/GeoJSON map geometry and viewport;
- Saudi Arabia `SAU` mapping and active fill `#b38126`;
- permanent labels and tooltip behavior;
- the existing map highlight states;
- the six-row table viewport and all-data scrolling behavior;
- total-only table count badges;
- KPI values;
- Country and Department filters;
- Nationalization cards;
- Hiring chart;
- navigation and Google Apps Script server calls.

The new Reset button and repeated-country behavior must not re-enable zoom, add external map dependencies, or create a second map instance.

## Required verification

After implementation, review the diff and test these cases:

1. Click the map Reset button with no filters active: the dashboard remains stable and no duplicate request is created.
2. Select a country from the dropdown, then click the same country on the map: all filters reset exactly as with the existing Overview Reset button.
3. Click the same country a second time using both the display name and KSA/Saudi Arabia alias path where available.
4. Select Egypt and click UAE: the filter switches from Egypt to UAE instead of resetting.
5. Select a country and a Department, then click the selected country on the map: both filters return to `All`.
6. Click the map Reset button after a country and Department filter are active: both filters reset.
7. Confirm the Country dropdown, Department dropdown, KPI, tables, map colors, selected/dimmed states, and total badges all match the normal unfiltered state.
8. Confirm `OverviewCtrl.applyFilters()` is invoked only once per user action.
9. Confirm no duplicate Reset listeners appear after navigating away from Overview and back.
10. Confirm tooltip and hover state do not remain stale after a map Reset.
11. Confirm the new button is keyboard accessible and works with Enter and Space.
12. Confirm the button is usable at desktop, tablet, and mobile widths.
13. Apply the `Egypt` Country filter and confirm that only Egypt’s polygon, `Egypt` label, headcount details, and `#b38126` fill remain visible; all other target-country polygons and labels are absent and non-interactive.
14. Apply the `Saudi Arabia`/`KSA` Country filter and confirm that only the Saudi Arabia polygon and `Saudi Arabia` label remain visible with `#b38126`.
15. Confirm filtered-out countries do not show a tooltip, hover stroke, click response, or keyboard focus state.
16. Click Reset and confirm all six target countries and labels are restored exactly once.
17. Confirm the map viewport, local data, labels, KSA/SAU fill, table scrolling, and no-zoom behavior remain unchanged.

## Acceptance criteria

The implementation is accepted only when:

1. One visible Reset button exists in the map card and works.
2. The map Reset button and the existing Overview Reset button use one shared Reset function.
3. Clicking a different country applies the existing country filter behavior.
4. Clicking the already-selected country performs the complete Reset workflow.
5. Alias values such as `KSA`, `Saudi Arabia`, and `SAU` correctly resolve to the same country for the toggle comparison.
6. Reset clears Country and Department filters, updates all dependent components, and does not duplicate calls.
7. When a Country filter is active, only the selected target country polygon and label are visible; all other target-country polygons and labels are visually absent and non-interactive.
8. No stale tooltip, selected state, dimmed state, filtered-out state, or stale table/map data remains after Reset.
9. No duplicate event listeners or map instances are created.
10. Existing map, table, chart, KPI, navigation, and server behavior does not regress.
11. No zoom/pan or external map dependency is introduced.
12. The final report lists the files changed, the shared Reset function, the canonical comparison rule, the test cases performed, and any unverified cases.

Do not implement a partial reset. Do not clear only the map. Do not create a second reset algorithm. Do not claim completion without applying the code changes and reviewing the diff.
