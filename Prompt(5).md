# Google Antigravity Task Prompt — Fix Saudi Arabia/KSA Map Integration

## Role

You are working inside the existing Google Apps Script project **EDECS HR Workforce & Nationalization Dashboard**. Perform a focused bug fix in the current repository. Do not rebuild the map and do not redesign the dashboard.

The current local SVG map is generally working, but Saudi Arabia is not receiving the required active polygon fill, and the Saudi Arabia label/hover behavior must remain correct. The root cause has been identified in the actual repository code and must be fixed at the data-integration boundary, not only with CSS or visual workarounds.

## Confirmed root cause in the current repository

In `DashboardService.gs`, map pins are created using the country display name as an exact key:

```javascript
const coords = CONFIG.MAP_COORDINATES[c.name];
if (!coords) return null;
```

In `Config.gs`, the coordinate key is currently `KSA`, while the country dimension may provide the display name `Saudi Arabia`. Therefore, when `c.name === 'Saudi Arabia'`, the coordinate lookup fails, the country is removed by `.filter(Boolean)`, and Saudi Arabia never reaches the frontend `MapRenderer.updatePins()` function.

The current frontend already contains the relevant alias and geometry:

- `KSA`, `Saudi Arabia` → `SAU`.
- `MapData.html` contains a valid feature with `ISO_A3: 'SAU'` and `NAME: 'Saudi Arabia'`.
- `FILL_ACTIVE` is intended to be exactly `#b38126`.
- `MapRenderer` uses separate path and label SVG layers.

Do not assume the walkthrough report is proof. Inspect the current files and verify the actual implementation before editing.

---

## Primary objectives

Fix all of the following without changing unrelated dashboard behavior:

1. Saudi Arabia must be included in the backend `overview.mapPins` payload whether the dimension value is `KSA`, `Saudi Arabia`, or the canonical code `SAU`.
2. The Saudi Arabia feature must resolve to canonical ISO-3 code `SAU`.
3. When Saudi Arabia has a positive headcount, its SVG polygon must visibly use exactly `#b38126`, the same active fill as the other five target countries.
4. The permanent label must be visible and must read exactly `Saudi Arabia`.
5. Hovering Egypt, Saudi Arabia, UAE, or Oman must not hide, remove, fade, or replace any permanent country label.
6. Existing click, keyboard focus, tooltip, page navigation, filters, and `invalidateSize()` compatibility must remain functional.
7. The map must remain fully local at runtime with no OSM, CARTO, Azure Maps, Mapbox, Google Maps, geocoding, tile, or external GeoJSON requests.

---

## Required inspection before editing

Inspect these files in the current repository:

- `Config.gs`.
- `DashboardService.gs`.
- `DataService.gs`.
- `JavaScript.html`.
- `MapData.html`.
- `Styles.html`.
- `Overview.html`.
- `Index.html`.

Trace the complete data path:

```text
DimCountry → buildCountryMap() → buildOverviewPayload() → overview.mapPins → MapRenderer.updatePins() → SAU SVG path
```

Confirm the actual country values returned by `DimCountry`, the actual country-code field, the actual GeoJSON property names, and the existing filter option values. Do not guess between `KSA` and `Saudi Arabia`.

---

## Backend fix: never drop Saudi Arabia because of an alias

Implement one centralized, reusable country normalization strategy. Do not scatter one-off `if` statements across unrelated files.

The normalization must support at least:

```javascript
KSA              → SAU
Saudi Arabia     → SAU
SaudiArabia      → SAU, only if the actual data uses this form
SAU              → SAU
```

For coordinate lookup, support the repository’s existing `KSA` key while preserving the original display name returned by the data model. For example, use a centralized mapping equivalent to:

```javascript
const MAP_COUNTRY_ALIASES = {
  KSA: 'KSA',
  'Saudi Arabia': 'KSA',
  SAU: 'KSA'
};

const coordinateKey = MAP_COUNTRY_ALIASES[c.name] || c.name;
const coords = CONFIG.MAP_COORDINATES[coordinateKey];
```

Adapt the exact implementation to the project’s existing conventions. Do not change the business country name merely to make the lookup pass.

Prefer extending each map pin with a stable code when the code is available:

```javascript
{
  countryName: c.name,
  countryCode: normalizedIso3OrExistingCountryCode,
  headCount: mapAcc[c.name] || 0,
  lat: coords.lat,
  lng: coords.lng
}
```

Do not hard-code screenshot headcounts or create mock data. Keep the existing active-employee aggregation and existing filter semantics unchanged.

Add a safe development warning/assertion for this case: if a configured target country has a positive aggregated headcount but cannot produce a map pin, report the country name, normalized code, and failed coordinate/geometry lookup. Do not silently remove Saudi Arabia.

---

## Frontend fix: canonical code and active fill

In `JavaScript.html`, make the frontend resolve a pin using its stable country code first when available, then fall back to the alias map:

```javascript
var iso3 = normalizeIso3(pin.countryCode) || NAME_TO_ISO3[pin.countryName];
```

Adapt this to the actual payload and do not break existing pins.

Verify that the actual Saudi path has a stable identifier equivalent to:

```html
<path data-iso3="SAU" ...>
```

When the Saudi pin has a positive headcount, the final rendering pass must apply the active color directly to that exact path:

```javascript
var saudiPath = _pathEls.SAU;
var isSaudiActive = Number(_activeData.SAU || 0) > 0;

if (!saudiPath) {
  throw new Error('Required Saudi Arabia path SAU is missing');
}

var saudiFill = isSaudiActive ? '#b38126' : FILL_CONTEXT;
saudiPath.setAttribute('fill', saudiFill);
saudiPath.style.fill = saudiFill;
```

Ensure that the general active-fill loop and this Saudi-specific safeguard do not disagree. The Saudi path must not remain in `FILL_CONTEXT` when its headcount is positive.

Check the effective rendered style, not only the attribute assigned immediately before the check:

```javascript
var computedFill = window.getComputedStyle(saudiPath).fill;
```

Accept browser RGB serialization when comparing the color, but fail or log a clear critical error if the effective fill is still the context color. Do not claim success merely because the `fill` attribute exists.

Verify that hover, focus, tooltip, zoom, pan, rerendering, and label updates cannot reset the Saudi path to the context fill. Hover may change stroke or stroke width, but not the active fill.

---

## Label fix: Saudi Arabia must be visible and readable

The visible label must be exactly:

```text
Saudi Arabia
```

Keep the label in a dedicated SVG label layer rendered after the path layer. The permanent label must not be removed or hidden by any hover/focus handler.

The label pill width must be calculated from the rendered text or assigned a sufficient dedicated width. Do not use a fixed 56px width that clips `Saudi Arabia`. Use measured text width plus horizontal padding, or a suitable minimum width of approximately 105–125 SVG units depending on the current viewBox scale. Center the text inside the pill.

Place the label inside or immediately beside the Saudi Arabia polygon around its visual center, approximately near longitude `45` and latitude `24`, then tune against the actual geometry. It must not be placed on UAE or Oman, outside the map, behind another label, or at an unreadable size.

Use the display label `Saudi Arabia` while preserving the application’s internal filter value. If the existing dropdown uses `KSA`, clicking the Saudi polygon must pass `KSA` to the existing filter system, not raw `SAU`, unless the current filter architecture explicitly expects `SAU`.

---

## Hover regression fix

Keep these SVG layers separate and in this order:

```text
_mapGroup
  ├── _pathLayer
  └── _labelLayer
```

If hover brings a path to the front, re-append it only inside `_pathLayer`. Never append it to `_mapGroup` and never append it after `_labelLayer`.

Inspect every hover/focus/leave handler and CSS rule. None may set the permanent label layer or label elements to:

- `display: none`.
- `visibility: hidden`.
- `opacity: 0`.
- Empty text.
- A lower stacking order that places labels behind the hovered path.

Test this exact sequence in the actual browser:

1. Hover Egypt.
2. Move to Saudi Arabia.
3. Move to UAE.
4. Move to Oman.
5. Move outside the map.
6. Focus the countries with `Tab`.
7. Activate Saudi Arabia with `Enter` and `Space`.

All six permanent labels must remain visible and readable throughout the sequence, and Saudi Arabia must remain filled with `#b38126` whenever its headcount is positive.

---

## Scope restrictions

Do not:

- Rebuild the map from scratch.
- Replace the local SVG/GeoJSON architecture.
- Reintroduce Leaflet or any external map provider.
- Modify KPI cards, tables, nationalization calculations, hiring charts, authentication, or Google Sheets business logic unnecessarily.
- Hard-code headcount values.
- Change the business meaning of the existing map filter behavior.
- Hide the defect with `!important` without identifying the underlying cascade or lifecycle issue.
- Report visual or offline success without actually testing it.

Only change the files required for the alias/data integration and the map rendering bug. Preserve the existing `.gs` and `.html` architecture.

---

## Acceptance criteria

The fix is complete only when all of the following are true:

- A real `Saudi Arabia` or `KSA` record with positive headcount produces a map pin.
- That pin resolves to `SAU`.
- The `SAU` GeoJSON feature exists and renders.
- The `SAU` SVG path receives effective fill `#b38126`.
- The Saudi label reads exactly `Saudi Arabia` and is fully readable.
- All six target countries remain visible with the required active fill when their headcount is positive.
- Hovering or focusing Middle East countries never hides any permanent label.
- Hover/focus/tooltip/rerendering does not reset the Saudi fill.
- Clicking the Saudi polygon uses the existing dashboard filter value correctly.
- `MapRenderer.map.invalidateSize()` remains safe.
- Existing dashboard KPI, tables, filters, navigation, and charts continue to work.
- No map-related external network request is made.
- There are no map-related console errors.

---

## Required verification report

After making the fix, report:

1. Exact files changed.
2. The actual country name and code values found in the repository.
3. The exact alias/normalization solution used.
4. Confirmation that Saudi Arabia reaches `mapPins` and `_activeData.SAU`.
5. Confirmation of the effective rendered fill for the `SAU` path.
6. Confirmation that the label reads `Saudi Arabia` and is readable.
7. Hover/focus test results proving labels remain visible.
8. Click/filter compatibility results.
9. Network verification showing no external map requests.
10. Any test limitations. Do not fabricate browser, offline, network, or licensing results.

Implement the smallest correct fix that makes Saudi Arabia behave exactly like the other active target countries while preserving the existing local Power BI-style map.
