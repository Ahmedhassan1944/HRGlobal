# Implementation Prompt — Corporate-Safe Power BI Azure Maps–Style Workforce Map

## Role and objective

You are a senior Google Apps Script engineer, vanilla JavaScript engineer, geospatial visualization engineer, and enterprise dashboard UX specialist working inside **Google Antigravity IDE**.

This repository is an existing **EDECS HR Workforce & Nationalization Dashboard** implemented with **Google Apps Script, Google Sheets, HTML Service, vanilla JavaScript, and CSS embedded in HTML files**. Your task is to replace only the current external Leaflet tile-and-bubble map with a professional, reusable, locally rendered map that visually resembles the **Azure Map visual in the Power BI reference screenshot**.

The business requirement is not to connect to Azure Maps. The requirement is to reproduce the visual language and useful interactions of the Power BI map while ensuring that the application works inside a corporate network where external map APIs, tile servers, CDNs, and internet access may be blocked.

> **Target result:** Power BI Azure Maps–style appearance + real local country geometry + single bronze fill `#b38126` for all highlighted countries + existing dashboard data and filter integration + zero external map requests at runtime.

Do not redesign the dashboard and do not replace the existing application architecture. Inspect the repository first, then make the smallest safe change that satisfies the requirements below.

## Execution protocol

Before editing, write a short plan based on the actual repository. Then inspect the relevant files, review the proposed changes, validate the implementation where possible, inspect the final diff, and report the exact files changed. Do not fabricate test results, network observations, dataset licenses, or successful offline behavior. If a browser/offline test cannot be performed in the current environment, state that limitation and provide the precise manual verification steps instead.

The deliverable is an implemented working change, not a conceptual design. Keep the scope limited to the map replacement and its necessary integration. Never replace working dashboard features merely to simplify the implementation.

---

## 1. Repository facts that must be respected

Before writing code, inspect the complete repository and confirm the implementation points below. Do not assume that the project is React, Vite, TypeScript, or a conventional npm web application.

| Area | Current repository implementation | Required treatment |
|---|---|---|
| Platform | Google Apps Script + Google Sheets + HTML Service | Preserve this platform and its file conventions. |
| Client code | Vanilla JavaScript embedded in `JavaScript.html` | Extend or replace the map block using the existing style and lifecycle. |
| Main page | `Index.html` includes HTML fragments and external libraries | Remove the Leaflet CSS/script used only by the old map. Do not break unrelated libraries unless verified safe. |
| Map host | `Overview.html` contains one map host with `id="map"` inside the existing map card | Keep the existing host or make only a minimal, justified markup adjustment. |
| Map renderer | `JavaScript.html` defines `MapRenderer.init()` and `MapRenderer.updatePins()` | Preserve the public integration expected by the rest of the dashboard, or update every call site consistently. |
| Current map library | Leaflet 1.9.4 loaded from cdnjs | Remove the map’s Leaflet dependency and all Leaflet-specific rendering code. |
| Current tile source | CARTO dark tiles with OpenStreetMap/CARTO attribution | Remove the tile layer, attribution, tile URLs, and related runtime requests. |
| Current visual encoding | `L.circleMarker` bubbles sized using headcount | Replace bubbles as the primary encoding with country polygon highlighting. |
| Backend payload | `DashboardService.gs` returns `overview.mapPins` containing `countryName`, `headCount`, `lat`, `lng`, and `color` | Preserve the existing server response unless a change is genuinely required. Prefer adapting the client to the existing payload. If the payload is extended, keep backward compatibility and document it. |
| Existing data path | `Code.gs` calls dashboard payload builders; overview rendering passes `result.overview.mapPins` to the map | Preserve the current data-fetch and render flow. |
| Existing filters | Country and Department filters are controlled by `AppState` and `OverviewCtrl`; overview data is re-rendered without a full page reload | Reuse the existing filtered state/data flow. Do not create a second unrelated filter system. |
| Configuration | `Config.gs` defines `CONFIG.COUNTRIES`, `CONFIG.CHART_COLORS`, and centroid coordinates under `CONFIG.MAP_COORDINATES` | Keep the six-country dashboard order. The old centroid coordinates may be retained only for compatibility; they must no longer be the primary geometry. |
| Styling | `Styles.html` uses a dark corporate design system and has map/Leaflet-specific rules | Reuse the existing tokens and replace only obsolete Leaflet rules with local-map rules. |

The repository currently contains only `.gs` and `.html` application files. Follow that constraint unless Google Apps Script requires a different local asset representation. Do not introduce React, JSX, TSX, TypeScript, Node runtime code, a build pipeline, or a package manifest.

---

## 2. Reference visual analysis

Use the supplied Power BI screenshot as the visual reference. The reference is a dark enterprise HR dashboard with the map occupying a large panel on the right. Its main visual message is workforce distribution by country.

The reference map has the following verified characteristics:

- A near-black map background.
- Dark charcoal surrounding countries with low contrast.
- Visible but restrained country borders.
- Six highlighted countries: Egypt, Saudi Arabia/KSA, UAE, Oman, Tanzania, and Angola.
- All highlighted country polygons use one consistent muted bronze/gold fill. For this implementation the exact required filled color is **`#b38126`**. Do not use a different fill per country.
- Highlighted country boundaries are clear and may use a subtle gold outline or a slightly brighter state outline.
- Each highlighted country has a compact dark-teal rounded label with white text.
- The visual is clean and similar to Power BI’s Azure Maps styling, but it is not required to use the Azure Maps product or service.
- The preferred geographic framing is Middle East plus Africa, not a full-world view in which the six countries become too small.
- The reference uses country polygons and labels as the main encoding, not large colored bubbles.

The current web screenshot shows the problem to solve: a Leaflet map with external CARTO/OSM tiles, a broad world viewport, zoom controls, muted basemap labels, circular markers, and the visible attribution `Leaflet | © OpenStreetMap contributors © CARTO`. The current implementation also uses different bubble colors. The new local map must remove those dependencies and must not reproduce the attribution associated with the external tile service.

## Visual fidelity gate — do not accept a small map strip

The supplied post-development screenshot is useful as a failure reference. It is not close enough to the Power BI composition even though it uses local polygons: the geography is compressed into a small horizontal band near the top of a very wide map area, most of the panel is empty black space, the target countries are too small, and the UAE/Oman labels are barely readable. Do not report visual success while this condition remains.

The goal is **visual equivalence to the Power BI map composition**, not a generic map placed inside the old full-width container. Preserve geographic proportions; never stretch country polygons to fill a wide rectangle. Instead, make the map composition intentional:

- The map visual should occupy a controlled panel or internal viewport with an aspect ratio close to the Power BI map panel, approximately square or between `0.85:1` and `1.15:1` (width:height). It must not remain a panoramic `3:1`-style strip.
- If the existing map card is too wide, make the smallest layout adjustment necessary to place the map in a right-side/controlled panel similar to the Power BI reference. Do not redesign the complete dashboard.
- Use a deliberate Middle East + Africa projection frame rather than fitting a broad world bounding box into the full browser width. The six target countries must be centered and large enough to be immediately recognizable.
- The visual hierarchy should place Egypt in the upper-left area of the focus, Saudi Arabia in the upper-middle/right, UAE and Oman close together on the Arabian Peninsula, Tanzania in East Africa, and Angola in south-west/central Africa. Europe and far Asia must not dominate the viewport.
- The map geometry should fill most of the panel height and width. There must be no large unused black region below or beside a thin strip of geography.
- Use `preserveAspectRatio="xMidYMid meet"` or an equivalent proportional strategy with a purpose-built `viewBox`. If a wide parent remains unavoidable, use a controlled map sub-container or adjust the card dimensions; do not use `preserveAspectRatio="none"` to distort countries.
- Country labels must remain readable at normal desktop size. Use a sensible minimum label font size, compact badges, and tuned anchor/offset values; UAE, Oman, and Saudi Arabia labels must not overlap or collapse into tiny unreadable marks.
- Position local zoom controls inside the controlled map viewport in a way that resembles the Power BI panel, without allowing controls to cause the geographic content to shrink excessively.

Use the Power BI screenshot as the visual acceptance reference and compare the rendered result at the actual map-container size, not only at an arbitrary full-page browser screenshot. A result with correct colors but a tiny top strip, excessive empty space, or unreadable labels is a failed visual match and requires another iteration.

---

## 3. Non-negotiable corporate-network and security requirements

The map must be **100% local-first at runtime** after the application HTML and local assets have loaded. It must render correctly if the browser cannot reach the public internet.

Do not use or call any of the following for map rendering:

- OpenStreetMap tile servers.
- CARTO tile servers.
- Mapbox tiles or APIs.
- Google Maps APIs.
- Azure Maps APIs or Azure Maps tiles.
- Bing Maps APIs.
- ArcGIS Online tiles.
- Any external raster tile endpoint.
- Any external vector tile endpoint.
- Geocoding or reverse-geocoding services.
- Remote CDN JavaScript, CSS, fonts, or GeoJSON for the map.
- A remote API called only to obtain country boundaries or labels.

Do not merely replace CARTO with another online provider. The geometry and map renderer must be bundled with the project. The browser Network panel must show **no map-related network request** during initial rendering, filter changes, hover, click, zoom, or pan.

If the existing application loads fonts or Chart.js remotely, keep the scope focused on the map, but make sure the new map itself does not introduce another remote dependency. Do not claim the whole application is offline-safe unless all unrelated external resources have also been verified.

---

## 4. Required technical solution

Implement a **local vector country map**. The preferred approach is:

1. Bundle a legitimate, appropriately licensed, simplified country-boundary dataset locally.
2. Render it with inline SVG or another renderer that has no remote tile dependency.
3. Use a local geographic projection, preferably a fit-to-bounds equirectangular or D3-geo projection if D3 is already locally bundled. Do not load D3 from a CDN.
4. Keep geometry reasonably simplified so that the Google Apps Script HTML Service page remains lightweight.
5. Preserve actual country shapes. Do not draw approximate hand-made polygons.
6. Render non-target context countries in dark charcoal and the six target countries in `#b38126`.
7. Render labels as local SVG/HTML overlays, not as external basemap labels.

Because this is Google Apps Script, choose an asset format compatible with the repository. A practical option is a new HTML include such as `MapData.html` containing a minified local GeoJSON object or a JavaScript constant. Another acceptable option is a local `.html` fragment containing the required geometry. Do not add a runtime fetch for a `.json` file unless you verify that the Apps Script deployment serves it reliably and without an external request.

Use a stable geographic identifier. Prefer ISO Alpha-3 codes:

| Dashboard value | ISO Alpha-3 |
|---|---|
| Egypt | `EGY` |
| KSA / Saudi Arabia | `SAU` |
| UAE / United Arab Emirates | `ARE` |
| Oman | `OMN` |
| Tanzania | `TZA` |
| Angola | `AGO` |

Create one explicit normalization/mapping layer because the repository uses `KSA` in `CONFIG.COUNTRIES`, while a geographic dataset may use `Saudi Arabia`, `SAU`, or another property name. Do not rely on fragile display-name matching alone. Handle common aliases such as `KSA`, `Saudi Arabia`, `UAE`, and `United Arab Emirates` without changing the business data.

### Mandatory KSA / Saudi Arabia correction

**Saudi Arabia/KSA is a required target country and must not be omitted.** The geographic feature for Saudi Arabia must resolve to ISO Alpha-3 code `SAU`, and its polygon must receive the same active fill used by the other target countries: exactly `#b38126`.

Implement and verify the following explicitly:

- Resolve `KSA`, `Saudi Arabia`, and `SAU` to one canonical code: `SAU`.
- Resolve the GeoJSON feature using the dataset’s actual property, such as `ISO_A3`, `ADM0_A3`, `iso_a3`, `id`, or the feature name. Inspect the real `MapData.html` data instead of assuming a property name.
- Confirm that the Saudi Arabia feature exists and resolves to `SAU`. If it is missing, malformed, or resolves to `-99`, fix the local data/mapping or report the exact issue; do not silently skip it.
- Add an explicit assertion or development check that the `SAU` feature exists before declaring the map complete.
- When `mapPins` contains `KSA` or `Saudi Arabia` with a positive headcount, the `SAU` polygon must visibly receive `fill="#b38126"` or the equivalent inline style. It must not remain in the context-country color.
- Render the label exactly as **`Saudi Arabia`** to match the Power BI reference, even if the internal dashboard value remains `KSA`.
- Place the label inside or immediately beside the center of the Saudi Arabia polygon, approximately around longitude `45` and latitude `24`, then tune it against the actual geometry. It must not be placed on UAE/Oman, hidden behind another label, pushed off the map, or rendered as a tiny unreadable mark.
- Test KSA separately from the other five countries: verify polygon fill, border, label text, label visibility, tooltip, click, and keyboard focus.

The final visual acceptance check must explicitly include: **Egypt, Saudi Arabia/KSA, UAE, Oman, Tanzania, and Angola are all visibly filled with `#b38126`, and all six labels are visible and readable.**

---

## 5. Existing data integration

The map must remain data-driven. Do not hard-code the example headcounts from the screenshots and do not create mock employees.

The current backend aggregates active employees by country in `DashboardService.gs` and sends `overview.mapPins` to the client. The new map should derive its highlighted state and displayed values from the real payload supplied by the existing application.

The component should conceptually support a contract equivalent to:

```javascript
{
  countryCode: 'EGY',
  countryName: 'Egypt',
  headCount: 1142
}
```

However, adapt this to the actual repository contract rather than forcing a backend rewrite. If the current payload supplies only `countryName`, resolve it through the explicit country normalization map. If it supplies `countryCode`, prefer that code. The business values, active-employee calculation, sorting, and filter semantics must remain owned by the existing application data path.

Do not use the old per-country `CONFIG.CHART_COLORS` for polygon fill. For the map polygon fill, every active/highlighted target country must use:

```text
#b38126
```

You may use separate colors only for non-fill states such as hover outline, selected outline, text, or a subtle inactive appearance. The six countries must not have six different polygon fill colors.

The map must stay synchronized with the existing overview render lifecycle and must call its update method whenever the overview payload is re-rendered. Do not duplicate employee aggregation or create a second filter store in the browser. The current `DashboardService.gs` comment says that `mapPins` represent all active employees and are intentionally unfiltered by department, even though the main overview tables use the selected filters. Preserve that existing business behavior unless the product owner explicitly requests a semantic change. If you intentionally change the map to use filtered counts, change the server payload and all related documentation coherently; do not silently mix filtered table values with unfiltered map values. State the final filter semantics clearly in the implementation report.

---

## 6. Required map behavior and visual states

The map must render the complete local base geometry first. Non-target countries should remain visible as dark context. Target countries with a positive headcount should use `#b38126`. Countries with zero or missing headcount should not appear as active highlighted countries unless the existing dashboard explicitly requires that behavior.

Use a compact state model:

| State | Suggested treatment |
|---|---|
| Context country | `#17191d` to `#24272d` fill, low-contrast border |
| Active target country | Fill exactly `#b38126`, restrained gold/bronze outline |
| Hovered country | Keep the required fill and add a brighter outline or subtle glow; do not change the design to neon colors |
| Selected country | Keep the required fill and show a clear accessible outline/state |
| Unknown country code | Log a development warning and skip safely; never crash the dashboard |
| No map data | Show the local geography with no active highlights and a professional empty-state hint if appropriate |

Do not make bubbles the primary visualization. If a small headcount indicator is retained, it must be optional and subordinate to polygon highlighting; do not recreate the current bubble map.

---

## 7. Labels and tooltip content

Show labels for the six target countries in the Power BI-like style:

- Dark teal rounded rectangle.
- White, compact, readable text.
- No excessive shadow.
- No dependency on basemap label tiles.
- Use `UAE` or the existing dashboard display name consistently with the reference, while retaining the full country name in tooltip/accessibility text if useful.

Suggested labels are `Egypt`, `Saudi Arabia` or `KSA`, `UAE`, `Oman`, `Tanzania`, and `Angola`. Place them using local label anchors/offsets, not only raw polygon centroids, because Saudi Arabia, UAE, and Oman are spatially close and labels can overlap.

Create a local configuration object similar to:

```javascript
var MAP_LABEL_OFFSETS = {
  EGY: { x: 0, y: 0 },
  SAU: { x: 0, y: 0 },
  ARE: { x: 0, y: 0 },
  OMN: { x: 0, y: 0 },
  TZA: { x: 0, y: 0 },
  AGO: { x: 0, y: 0 }
};
```

Tune the anchors visually against the supplied reference. Labels must remain readable and must not overlap at the default viewport.

On hover, show an accessible local tooltip containing the country name, formatted headcount, and optionally its share of the relevant total. Calculate any percentage from actual supplied data; never use a fake percentage. The tooltip must not be the only way to access important information.

On click, communicate selection to the existing dashboard architecture. If the repository already has a suitable filter callback, use it. Otherwise provide a clean callback such as `onCountrySelect(countryCode)` and integrate it without creating a conflicting state store. Keyboard users should be able to focus and activate interactive country regions where practical.

---

## 8. Viewport, zoom, pan, and responsiveness

The default viewport must focus on **North/East Africa and the Middle East**, with Egypt, the Arabian Peninsula, Tanzania, and Angola prominent enough to resemble the Power BI screenshot. Do not initialize at a full-world scale like the current screenshot.

Local interactions are preferred:

- Zoom in and out locally.
- Pan locally if implemented.
- Never request tiles or geometry during interaction.
- Do not add Leaflet merely to obtain zoom controls.
- SVG transforms, pointer events, and lightweight local controls are acceptable.

Keep the existing map host and responsive dashboard card behavior. The current CSS uses a desktop map panel and a smaller mobile height; preserve that responsive intent. Use SVG `viewBox`, `preserveAspectRatio`, CSS sizing, and/or `ResizeObserver`. Do not hard-code the screenshot dimensions `1379 × 784` or `1868 × 533`.

The existing page-routing code calls `MapRenderer.map.invalidateSize()` when switching pages. Either preserve a compatible `MapRenderer.map` object with a no-op or real `invalidateSize()` method, or update that call site safely so navigation does not throw an error. The existing application must continue to load, navigate, filter, refresh, and render all other visuals.

---

## 11. Files and code changes

Do not create a `src/` tree or framework-style component structure for this repository. The implementation must follow the existing Apps Script HTML-include architecture described below.

Work with the repository’s existing `.gs` and `.html` architecture. The likely change areas are:

| File | Expected action |
|---|---|
| `Index.html` | Remove Leaflet CSS/script used by the old map. Keep unrelated dependencies unless verified otherwise. Include any new local map-data fragment through Apps Script `include()` if needed. |
| `Overview.html` | Keep the `#map` host and existing card/header; make only minimal semantic/accessibility adjustments if necessary. |
| `JavaScript.html` | Replace the Leaflet-based `MapRenderer` implementation, preserve lifecycle integration, and consume `overview.mapPins` safely. |
| `Styles.html` | Remove or neutralize Leaflet-specific selectors and add local SVG, label, tooltip, control, focus, and responsive styles using existing design tokens. |
| `Config.gs` | Add only necessary map constants, country-code aliases, local geometry configuration, or fill color. Do not break existing chart colors used elsewhere. |
| `DashboardService.gs` | Prefer no change. Change only if a stable country-code field is required and the existing payload cannot support mapping safely. |
| New local map asset | If necessary, add a compatible `.html` local data fragment containing legitimate simplified country geometry and required license information. |

Do not rewrite KPI cards, tables, nationalization cards, hiring charts, authentication, Google Sheets loading, caching, or unrelated business logic. Do not remove a library until you have confirmed it is not used elsewhere.

Avoid unsafe `innerHTML` for untrusted country names and values. Reuse existing escaping helpers such as `_escHtml` or equivalent. Format numbers consistently with the existing `_formatNumber` helper.

---

## 10. Licensing and geographic data quality

Use a legitimate country-boundary dataset with a license compatible with this internal application. Prefer a simplified Natural Earth-style or equivalent country dataset that contains actual polygons for the Middle East and Africa and enough surrounding context for the visual framing.

Do not invent polygons, trace the screenshot, or use a static screenshot as the map. Preserve any required attribution in project documentation or an unobtrusive local information area. Do not show the old OSM/CARTO tile attribution when those services are no longer used.

If a full-world dataset is unnecessarily large, use a reasonably simplified world/context dataset or a carefully scoped Middle East and Africa dataset, provided the six target countries and surrounding geography remain professional and geographically correct.

---

## 11. Implementation procedure

Follow this order and report what you found before making changes:

### Step 1 — Inspect

Inspect all relevant files, especially `Index.html`, `Overview.html`, `JavaScript.html`, `Styles.html`, `Config.gs`, `DashboardService.gs`, `DataService.gs`, and `Code.gs`. Identify the current map lifecycle, host element, payload shape, filter behavior, and CSS hooks.

### Step 2 — Diagnose dependencies

Search the repository for `Leaflet`, `L.`, `tileLayer`, `cartocdn`, `openstreetmap`, `mapbox`, `azure`, `lat`, `lng`, `mapPins`, and related references. Distinguish map-specific external requests from unrelated dashboard resources.

### Step 3 — Add local geometry

Select and bundle an appropriately licensed simplified local geographic dataset. Verify that all six target ISO codes can be resolved. If the dataset’s properties differ, implement an explicit normalization layer.

### Step 4 — Implement renderer

Replace tile/bubble rendering with local polygon rendering. Implement base geography, highlighted states, labels, hover, tooltip, selection, and responsive sizing. Keep the renderer reusable and isolated.

### Step 5 — Integrate existing data and state

Connect the renderer to the actual `overview.mapPins`/existing state flow. Preserve page initialization, overview re-rendering, filter changes, page switching, and error handling.

### Step 6 — Match the reference

Tune the background, country contrast, borders, `#b38126` fill, label color/shape, viewport, spacing, and map-card integration until the result clearly belongs to the same design language as the Power BI screenshot.

### Step 7 — Clean up

Remove obsolete Leaflet initialization, tile URLs, OSM/CARTO attribution, marker management, and Leaflet-only CSS. Remove only dependencies proven unused elsewhere.

### Step 8 — Verify

Run the existing project checks or tests where available. Confirm there are no syntax errors, no console errors, no broken page navigation, and no regressions in filters, KPI cards, tables, and charts.

---

## 12. Corporate/offline verification protocol

Perform an artificial restricted-network test after implementation. With external network access disabled or map domains blocked, confirm all of the following:

1. The dashboard loads as far as the existing unrelated resources allow.
2. The map host renders local geometry.
3. Egypt, KSA/Saudi Arabia, UAE, Oman, Tanzania, and Angola resolve correctly, including an explicit `SAU` feature assertion.
4. Active countries use fill exactly `#b38126`; separately verify that the Saudi Arabia/KSA polygon is not left in the context-country color.
5. The `Saudi Arabia` label is visible, readable, and attached to the correct `SAU` polygon.
6. Non-target countries remain dark context.
7. Labels render locally.
8. Headcount comes from the real application payload.
9. Hover tooltip works without a network request.
10. Click/selection works through existing state/callbacks.
11. Local zoom/pan works if implemented.
12. Page switching and `invalidateSize` compatibility do not throw errors.
13. Resizing the browser preserves a readable map.
14. DevTools Network shows no requests to OSM, CARTO, Azure Maps, Mapbox, Google Maps, ArcGIS, geocoding services, external GeoJSON, or any other map endpoint.
15. The browser console contains no map-related errors or failed tile requests.

Do not declare success based only on visual appearance. Include the actual network verification result and list any unrelated external resource that remains outside the map scope.

---

## 13. Acceptance criteria

The implementation is complete only when all applicable criteria below are satisfied:

### Visual fidelity

- The map has a near-black/dark charcoal background.
- Middle East and Africa are the dominant geographic focus.
- Surrounding countries are dark and visually subordinate.
- The six target countries use real polygons and the same fill `#b38126`.
- Borders are visible but restrained.
- Labels use compact dark-teal rounded badges with white text.
- The map composition is centered, enlarged, and uses a controlled aspect ratio close to the Power BI map panel; it is not a tiny horizontal strip in a wide empty rectangle.
- The six countries are recognizable at a glance, and UAE/Oman/Saudi Arabia labels remain readable and non-overlapping.
- The Saudi Arabia/KSA polygon is visibly filled with exactly `#b38126`, and its label reads `Saudi Arabia`, is visible, and is positioned inside or immediately beside the correct polygon.
- The map uses its available panel area effectively without distorting geographic geometry.
- The map looks substantially closer to the Power BI reference than both the current Leaflet screenshot and the post-development small-strip screenshot.
- Polygon highlighting, not bubbles, is the primary visualization.
- The existing EDECS dashboard card and dark corporate design language are preserved.

### Data and behavior

- No screenshot, fake map, hand-drawn approximation, or hard-coded business headcount is used.
- Country matching uses stable ISO codes or an explicit robust alias map.
- Real existing application data drives active states and displayed headcount.
- Existing filter/state behavior is preserved or intentionally integrated without duplicate aggregation logic.
- Hover, tooltip, click/selection, and keyboard focus work appropriately.
- Zero, missing, and unknown data cases are handled without crashes.

### Corporate safety

- No runtime Leaflet tile layer remains.
- No OSM/CARTO tile request remains.
- No Azure Maps runtime dependency exists.
- No external map tile, geocoding, or geometry request exists.
- The local map requires no external CDN resource.
- The map continues to render with internet access unavailable.

### Engineering quality

- The solution follows Google Apps Script HTML Service constraints.
- No React, TypeScript, Node, Vite, package manifest, or unsupported application architecture is introduced.
- Existing dashboard features remain functional.
- `MapRenderer` integration and page switching remain safe.
- Local geometry is reasonably optimized.
- Map-specific code is isolated, readable, and documented.
- No console errors or broken map requests remain.
- Desktop, laptop, and smaller responsive layouts remain usable.

---

## 14. Required final report from the IDE

After implementation, provide a concise engineering report containing:

1. Files changed and why.
2. The local geographic dataset used, its source/license, and how it is bundled.
3. The final map data contract and country-code normalization logic.
4. Confirmation that all highlighted polygon fills use `#b38126`.
5. Confirmation that existing Apps Script data, filters, page navigation, and dashboard visuals were preserved.
6. External map dependencies and tile/API calls removed.
7. Any unrelated external resources that remain in the application and were intentionally left untouched.
8. Offline/restricted-network test steps and observed results.
9. Any assumptions, limitations, or follow-up recommendations.

Do not implement a generic online map. Implement a local, data-driven, Power BI Azure Maps–style workforce distribution map that is safe to open within the company network.
