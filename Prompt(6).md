# Google Antigravity Task Prompt — Move the Map to Its Own Full-Width Row

## Role and scope

You are working inside the existing **EDECS HR Workforce & Nationalization Dashboard** built with **Google Apps Script, Google Sheets, HTML Service, vanilla JavaScript, and CSS inside HTML files**.

The current map visual is now acceptable and must be preserved. The only requested change is the **Overview page layout**:

- The three data tables must occupy the first content row with enough horizontal space.
- The map must move to a separate row directly below the three tables.
- The map must occupy the full available width of its own row and have enough vertical space to remain readable.
- Do not rebuild the map, change its geometry, change its colors, change its labels, or change its interactions unless a small layout-related adjustment is strictly required.

Do not redesign the complete dashboard. Do not change business logic, backend calculations, filters, authentication, page navigation, or the existing local SVG map implementation.

---

## Current repository context

Before editing, inspect the latest repository state and the current working tree. The latest reviewed commit is:

```text
0eba8d9 — fix map v6
```

The relevant current structure is:

- `Overview.html` contains `.overview-content-split`.
- Inside it, the table section contains `.data-grid` with three table cards: Country Headcount, Department Headcount, and Top Nationalities.
- The map section contains `.map-card` and the existing map host `<div id="map">`.
- `Styles.html` currently defines:

```css
.overview-content-split {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-xl);
  align-items: stretch;
}
```

- `Styles.html` currently defines the three-table grid as:

```css
.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}
```

This current two-column arrangement causes the tables and map to compete for width. Change the layout only; preserve the content and map behavior.

---

## Required target layout

The desktop Overview content must become a clean two-row structure:

```text
ROW 1 — full available width
┌──────────────────┬──────────────────┬──────────────────┐
│ Country table    │ Department table │ Nationality table│
└──────────────────┴──────────────────┴──────────────────┘

ROW 2 — full available width
┌──────────────────────────────────────────────────────────┐
│                                                          │
│             Workforce Distribution Map                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The filter bar and KPI area above this content must remain unchanged.

On desktop, all three table cards must be in the first row and should use three equal or intelligently balanced columns. Each table must have enough width for its headings and values. Do not squeeze the tables into narrow columns.

The map section must be below the complete table row, not beside it. The map card must span the full content width of the second row. It must not be placed in the same CSS grid column as the tables.

---

## Required HTML structure

Adapt the existing `Overview.html` structure with the smallest safe change. Use a clear layout wrapper, for example:

```html
<div class="overview-content-stack">

  <section class="overview-tables-section" aria-label="Headcount breakdown tables">
    <div class="data-grid">
      <!-- existing Country table card -->
      <!-- existing Department table card -->
      <!-- existing Top Nationalities table card -->
    </div>
  </section>

  <section class="overview-map-section" aria-labelledby="map-title">
    <!-- existing map-card and existing #map host unchanged -->
  </section>

</div>
```

You may keep `.overview-content-split` only if it is renamed or redefined so that it creates vertical rows rather than a tables/map side-by-side layout. Do not leave the old `grid-template-columns: 2fr 1fr` rule active for this content.

Do not duplicate any table, map host, IDs, event handlers, or data-rendering calls. There must remain exactly one element with `id="map"`.

Keep the existing table markup and IDs unchanged, including:

- `country-table-body`.
- `dept-table-body`.
- `nat-table-body`.
- `country-table-count`.
- `dept-table-count`.
- `nat-table-count`.

Keep the existing map markup and IDs unchanged, including:

- `map-title`.
- `map`.

---

## Required CSS layout

Implement the layout in `Styles.html` using the existing design tokens and BEM style. A suitable desktop baseline is:

```css
.overview-content-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: var(--space-xl);
  width: 100%;
  min-width: 0;
}

.overview-tables-section,
.overview-map-section {
  width: 100%;
  min-width: 0;
}

.overview-tables-section .data-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
  width: 100%;
  min-width: 0;
}

.overview-map-section .map-card {
  width: 100%;
  min-width: 0;
}
```

Adapt values to the existing project rather than blindly copying them. The important behavior is:

1. The three table cards form the first row.
2. The map section is the second row.
3. The map card spans the complete content width.
4. No horizontal overflow is introduced.
5. The layout does not make the table cards too narrow.

Use `minmax(0, 1fr)` so long table content cannot unexpectedly force the grid wider than the viewport. Use `min-width: 0` on grid children where necessary.

Do not use fixed pixel widths for the three cards. They must resize with the dashboard container.

---

## Map preservation requirements

The map currently uses a local SVG/GeoJSON renderer and is visually acceptable. Preserve all of the following:

- Local SVG and local GeoJSON architecture.
- Existing `MapRenderer` lifecycle.
- Existing `MapRenderer.updatePins()` calls.
- Existing `MapRenderer.map.invalidateSize()` compatibility.
- Existing `SAU`/KSA mapping and Saudi Arabia behavior.
- Active country fill exactly `#b38126`.
- Existing labels, including `Saudi Arabia`.
- Existing label size and positioning unless the new map width/height makes a small responsive adjustment necessary.
- Existing hover behavior: labels must remain visible during hover/focus.
- Existing tooltip, click, keyboard focus, zoom, and pan behavior.
- No Leaflet, CARTO, OSM, Azure Maps, Mapbox, or external map requests.

Do not alter `JavaScript.html` map rendering logic merely to move the map card. Only modify it if the layout change exposes a real resize or lifecycle issue, and then make the smallest targeted fix.

Because the map will become full-width, do not stretch the geographic shapes horizontally. Keep the map SVG’s geographic aspect ratio intact. Use a controlled map height and `preserveAspectRatio` behavior so the geography remains correct. It is acceptable for the map to use a larger, comfortable panel on the second row, but it must not become a distorted panoramic map.

Suggested desktop map sizing:

```css
#map {
  width: 100%;
  min-height: 520px;
  height: clamp(520px, 60vw, 700px);
}
```

Choose a value compatible with the existing dashboard and screen sizes. Do not blindly use `height: 100%` unless every parent has a definite height. The map must not collapse to zero height.

If the full-width row would make the geographic content look too small because of the fixed `700 × 700` SVG viewBox, adjust only the internal map viewport or map card height while preserving geographic proportions. Do not use `preserveAspectRatio="none"`.

---

## Responsive behavior

Use clear breakpoints based on available width:

### Large desktop

- Three table columns in the first row.
- Full-width map in the second row.
- No horizontal page scroll.
- Table headers and headcount values remain readable.

### Medium screens

When three table cards can no longer maintain a usable width, switch the table row to two columns or one column according to the existing responsive design. The map must remain below the tables.

### Mobile

- Tables stack vertically.
- The map remains below all tables.
- The map retains a practical height, such as `380–480px`, and remains usable.
- No content is clipped horizontally.
- Map controls and labels remain accessible.

Do not use a breakpoint that makes the desktop layout switch too early without checking the available width. The three tables should remain in one row on normal desktop screens.

---

## Data, filter, and lifecycle safety

Do not change any backend or business logic. The following must continue to work exactly as before:

- Country filter.
- Department filter.
- Reset filters.
- KPI updates.
- Country, department, and nationality table updates.
- Existing map update lifecycle.
- Overview page navigation.
- Nationalization page navigation.
- Dashboard loading and error handling.

After moving the map section, verify that there is still exactly one map initialization and that the map is not reinitialized every time the layout changes. If `ResizeObserver`, `invalidateSize`, or a resize handler is already present, preserve it. If needed, trigger a safe local resize/reflow after the map becomes visible, without creating duplicate listeners.

---

## Verification checklist

Before declaring the change complete, verify the actual rendered page:

### Structure

- The first content row contains exactly three table cards.
- The second content row contains exactly one full-width map card.
- The map is below all three tables, never beside them on desktop.
- There is exactly one `id="map"`.

### Visual layout

- Country, Department, and Top Nationalities tables have comfortable width.
- Table headings and headcount values are not clipped.
- The map card spans the available width of the second row.
- The map has enough height and does not collapse.
- The map is not a thin strip.
- Country geometry is not stretched.
- The existing Power BI-style dark map appearance is preserved.
- Saudi Arabia remains visible, labeled `Saudi Arabia`, and filled with `#b38126` when active.

### Interaction

- Country and Department filters still update the tables.
- Existing map data update behavior is unchanged.
- Hovering Egypt, Saudi Arabia, UAE, and Oman does not hide any permanent label.
- Tooltip, click, keyboard focus, zoom, and pan still work.
- Switching between Overview and Nationalization pages does not create errors.
- `MapRenderer.map.invalidateSize()` remains safe.

### Network and code safety

- No map-related external request is introduced.
- No Leaflet/CARTO/OSM dependency is reintroduced.
- No duplicate event listeners or map instances are created.
- No unrelated application files are rewritten.
- No console errors appear.
- Check the final diff and report exactly which files were changed.

---

## Final instruction

Implement only this layout change: **three full-width table columns in the first row, then the existing full-width map in the next row**. Preserve the current map and all dashboard functionality. Do not solve the layout by shrinking the tables or by distorting the map. The final result must give the tables comfortable space and give the map its own spacious row below them.
