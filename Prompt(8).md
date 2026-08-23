# Google Antigravity Task Prompt — Disable Zoom and Add Correct Country Highlighting

## Role and scope

You are working inside the existing **EDECS HR Workforce & Nationalization Dashboard** built with Google Apps Script, HTML Service, vanilla JavaScript, and CSS inside HTML files.

The latest reviewed repository commit is:

```text
a5a86f6 — fix layout of charts
```

The current local SVG/GeoJSON map looks good and must be preserved visually. This is a focused interaction change only. Do not rebuild the map, replace the GeoJSON, change its viewport, change the country geometry, or redesign the dashboard.

Implement exactly two changes:

1. **Disable Zoom In and Zoom Out completely and permanently.**
2. **When the user selects a country by clicking its polygon, apply the existing Country filter and visually highlight the countries that remain within the active filter state while de-emphasizing countries excluded by that filter.**

Preserve all existing dashboard data, calculations, filters, labels, tooltips, KSA/Saudi Arabia mapping, local rendering, and layout.

---

## Current implementation points to inspect

Before editing, inspect the current files and trace the real implementation:

- `JavaScript.html` — current `MapRenderer`, zoom state, zoom controls, pan handlers, hover handlers, country click handler, and `updatePins()`.
- `Styles.html` — `.map-zoom-controls`, `.map-zoom-btn`, map cursor styles, SVG layers, and country states.
- `Overview.html` — existing `#map` host and dashboard layout.
- `DashboardService.gs` — existing `overview.mapPins` payload and filter semantics.
- `Config.gs` — country names, coordinate aliases, and existing configuration.

The current renderer includes zoom-related code such as:

```javascript
var _zoom = 1;
_buildZoomControls(host);
_applyZoom(delta);
_svg.addEventListener('wheel', ...);
```

The current country-click path uses the existing dashboard filter system through code equivalent to:

```javascript
AppState.setOverviewFilter('country', optVal);
OverviewCtrl.applyFilters();
```

Do not create a second filter store or duplicate backend aggregation logic.

---

## Requirement 1 — remove Zoom In and Zoom Out completely

The map must not support zoom in or zoom out in any way. The default Power BI-style composition must remain fixed after the map is rendered.

Remove or disable all zoom affordances and zoom mechanisms:

- Remove the visible `+` and `−` zoom buttons from the map.
- Remove `_buildZoomControls()` invocation and any zoom-control DOM elements.
- Remove or disable `_applyZoom()`.
- Remove or disable the SVG `wheel` handler that changes `_zoom`.
- Remove or disable any keyboard shortcut or programmatic path that changes `_zoom`.
- Remove the `scale(_zoom)` portion of the map transform, or keep the transform permanently fixed at scale `1` with no user-controlled zoom state.
- Do not allow mouse wheel, trackpad gestures, button clicks, keyboard keys, or touch gestures to zoom the map.
- Do not add another map library or replace the controls with a different zoom implementation.

The map should remain at its designed default framing and size. Do not change the geographic proportions to simulate zoom.

If the current drag/pan implementation is retained, it must not change scale. It may translate the map only if that behavior is already required and does not allow the user to zoom. If keeping pan introduces any unintended movement or makes the fixed Power BI-style composition unstable, disable pan as well and leave the map as a fixed interactive visualization for hover/focus/click only.

Update CSS to remove obsolete zoom-control styles if they are no longer used. Do not leave visible empty control space in the map.

Acceptance test for this requirement:

- No `+` or `−` buttons are visible.
- Scrolling over the map does not change the map scale.
- Clicking, pressing keys, or using touch gestures does not change the map scale.
- The map remains at the same default scale after hover, click, filter changes, page navigation, and rerendering.
- No `_zoom` value is changed by user interaction.

---

## Requirement 2 — country click and Highlight behavior

The country click must continue to use the existing Country filter architecture. Do not implement filtering only visually in the browser and do not create a second independent filter state.

When a user clicks a country polygon:

1. Resolve the clicked feature to its canonical ISO-3 code.
2. Resolve the correct existing dashboard filter value. For Saudi Arabia, use `KSA` if the dropdown/options and `AppState` use `KSA`; do not send raw `SAU` into a filter that expects `KSA`.
3. Set the existing Country filter.
4. Call the existing filter/update flow.
5. Let the existing dashboard data refresh the tables, KPI, and map payload.
6. Apply the visual map state consistently after the new payload arrives.

### Required visual meaning of Highlight

When no Country filter is active (`All Countries`):

- All target countries with positive headcount remain in the normal active state using the required fill `#b38126`.
- Non-target context countries remain dark.

When a specific Country filter is active, such as `Egypt`:

- The selected country remains strongly highlighted with the active fill `#b38126` and a clear selected outline.
- Countries that are not excluded by the active filter should retain the normal active treatment. If the current filter semantically limits the dataset to one country, then only the selected country should retain the active data highlight and the other target countries should be visibly de-emphasized. Do not ambiguously highlight countries whose data is excluded by the filter.
- The selected country must be visually distinguishable from the de-emphasized countries through outline, opacity, or a selected-state class, without changing the required active fill color.
- The visual state must match the actual filter/data semantics. Do not show a country as data-active if the active filtered payload gives it zero or excludes it.

Implement explicit states rather than relying only on `:hover`:

```text
map-country--active       → active data country, fill #b38126
map-country--selected     → clicked/filtered country, fill #b38126 plus selected outline
map-country--dimmed       → excluded or inactive country, darkened context appearance
map-country--context      → non-target geographic context
```

Use the actual filtered state/payload to determine these states. Do not invent headcount values and do not aggregate employee records in the browser.

If the existing backend deliberately sends unfiltered `mapPins` for geographic context, preserve that business rule and implement the visual selected/dimmed state from the active `AppState` Country filter. Clearly document the chosen behavior. Do not silently claim that all map values are filtered if they remain unfiltered.

When the Country filter is reset to `All`, remove the selected/dimmed state and restore the normal active map state for every target country with positive headcount.

---

## Hover and labels must remain stable

Hover is separate from click selection. Hover must never remove, hide, fade, or replace permanent labels.

- Keep the existing separate SVG path and label layers.
- If a hovered path is brought to the front, re-append it only inside the path layer.
- Hover may change stroke or stroke width, but must not overwrite the selected state or active fill.
- All six labels must remain visible during hover, focus, click, and filter updates.
- Saudi Arabia must continue to display the label `Saudi Arabia`.
- The `SAU` path must continue to receive `#b38126` whenever its active/selected state has positive headcount.

Do not use the tooltip as a replacement for the permanent label.

---

## Preserve the current map appearance

Do not change the map’s accepted visual design:

- Local SVG/GeoJSON renderer.
- Middle East and Africa framing.
- Dark charcoal context countries.
- Active fill exactly `#b38126`.
- Saudi Arabia polygon and label.
- Existing readable label sizing.
- Existing map card and layout.
- Existing hover, tooltip, click, keyboard accessibility, and `invalidateSize()` compatibility, except for the required zoom removal and highlight behavior.
- No OSM, CARTO, Azure Maps, Mapbox, Google Maps, tile, geocoding, or external GeoJSON requests.

Do not modify the Nationalization page or the Hiring Chart.

---

## Required files and minimal changes

Prefer a small, targeted change in:

| File | Required treatment |
|---|---|
| `JavaScript.html` | Remove/disable zoom behavior, preserve fixed map transform, and implement explicit selected/active/dimmed states tied to the existing Country filter. |
| `Styles.html` | Remove obsolete zoom-control styles and add only the minimal selected/dimmed state styles required. |
| `Overview.html` | Do not change unless a visible zoom-control placeholder must be removed. |
| `DashboardService.gs` | Do not change unless the existing click/filter data flow cannot support the required state. |
| `Config.gs` | Do not change unless canonical aliases are genuinely missing. |

Do not rewrite unrelated files. Do not alter business calculations or hard-code screenshot headcounts.

---

## Verification checklist

Verify the actual rendered application, not only the source code.

### Zoom removal

- No zoom buttons are visible.
- No zoom-related event changes the map scale.
- Mouse wheel over the map does not zoom.
- Keyboard and touch interactions do not zoom.
- The map remains at the same fixed scale after filter changes and rerendering.
- No unused control space remains.

### Country selection and highlighting

- Clicking Egypt updates the existing Country filter and the dashboard.
- Clicking Saudi Arabia updates the expected existing filter value, usually `KSA`.
- The clicked country remains visibly selected with fill `#b38126` and a clear outline.
- Countries excluded by the active filter are visibly de-emphasized.
- The visual state is restored when the filter is reset to `All Countries`.
- Existing Country and Department filter behavior remains intact.
- KPI, tables, and other visuals are not broken.

### Labels and map integrity

- All six permanent country labels remain visible during hover and focus.
- `Saudi Arabia` remains readable and attached to the correct `SAU` polygon.
- Hover does not reset selected state or active fill.
- The map remains local and makes no external map request.
- No console errors, duplicate map instances, or duplicate event listeners appear.

---

## Required final report

Report exactly:

1. Files changed.
2. Zoom code and controls removed or disabled.
3. Whether pan was retained or disabled and why.
4. How the clicked country is mapped to the existing filter value.
5. How active, selected, dimmed, and context states are determined.
6. How Saudi Arabia/KSA is handled.
7. Results of click, reset, hover, label, and no-zoom tests.
8. Any limitations or tests that could not be performed.

Do not report success without testing the actual rendered behavior.

## Final instruction

Make the map a fixed, non-zooming Power BI-style visualization. Preserve the current map appearance. Use the existing dashboard Country filter when a polygon is clicked, then visually distinguish the selected country and de-emphasize countries excluded by the active filter without changing the data model or breaking the rest of the application.
