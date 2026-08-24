# Prompt(10) — Cross-Browser Country Flags and Reliable Map Hover Tooltip

You are working on the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. The current GitHub baseline is the latest committed implementation `b1c49e8 — fixed project 11:55 23/8/2026 PM`. Review that repository and the current `JavaScript.html`, `Styles.html`, `Nationalization.html`, `MapData.html`, and relevant server/config files before changing anything.

The application is used as an internal company dashboard. Do not redesign the dashboard, change business calculations, change Google Apps Script data contracts, or replace the local SVG/GeoJSON map architecture. Make only the targeted cross-browser fixes described below.

## Observed cross-browser defects

The dashboard behaves correctly in Firefox but has differences in Brave, Google Chrome, and Microsoft Edge:

1. Country flag icons in the Nationalization cards do not look consistent across browsers.
2. The map hover details tooltip can remain visible after the pointer has moved away from a country and is currently over empty map space. The tooltip must disappear immediately when the pointer is no longer over a target country.

Treat both issues as real compatibility defects, not as acceptable browser differences.

## Part A — Replace platform-dependent flag emoji

The current `_countryFlag(countryName)` function returns Unicode regional-indicator emoji. This is platform/font dependent and is the reason the flags can render differently between Firefox and Chromium-based browsers.

Replace the platform-dependent emoji output with deterministic, self-contained flag rendering. Use one of these approaches, in this order of preference:

1. A small inline SVG flag component generated locally by JavaScript; or
2. Local, bundled SVG flag assets included in the project.

Do not use regional-indicator emoji, Unicode flag characters, remote image URLs, external flag libraries, CSS emoji content, external fonts, or a CDN. The flags must render consistently when the corporate network blocks external resources.

Create a canonical country-code mapping for the six dashboard countries:

```text
Egypt        → EG
Saudi Arabia → SA
KSA          → SA
UAE          → AE
Oman         → OM
Tanzania     → TZ
Angola       → AO
```

The display name may remain `Saudi Arabia`, while `KSA` remains a supported data/filter alias. Do not confuse the KSA alias with the visual country code `SA`.

The local SVG flags must have:

- a stable `viewBox`, such as `0 0 24 16`;
- explicit fills and strokes;
- `preserveAspectRatio="none"` only inside the small flag icon itself if needed, never on the geographic map;
- a consistent rendered size, for example approximately 24×16 CSS pixels;
- `display:block` or equivalent alignment so baseline differences do not vary by browser;
- `aria-hidden="true"` if the country name is already present immediately beside it, or an accessible name if the icon is used independently;
- no dependency on an installed emoji font.

The flag renderer must safely escape country names and must fall back to a deterministic neutral local SVG/world icon for unknown countries. It must not fall back to a Unicode emoji.

Keep the existing card country names and data unchanged. The visual flag is an icon only; it must not become the source of truth for the country name.

## Part B — Fix map hover state and tooltip lifecycle

The current implementation uses `mouseenter`/`mouseleave` on SVG country paths and re-appends a hovered path into `_pathLayer`. This can produce browser-specific hover lifecycle behavior and stale tooltip state. Refactor the hover behavior so that it is deterministic across Firefox, Chrome, Edge, and Brave.

### Required hover architecture

1. Do not reparent, reorder, remove, or recreate a country path during hover. Remove the `_pathLayer.appendChild(el)` hover behavior. The DOM order must remain stable after initialization.

2. Prefer standard Pointer Events (`pointerover`, `pointermove`, `pointerout`, `pointerenter`, `pointerleave`) with a single consistent strategy. Do not mix competing mouse and pointer handlers that can show duplicate tooltips or hide/show them out of order.

3. Use delegated handling on the SVG or map host where practical, or use stable per-path pointer handlers. When using `pointerout`, inspect `event.relatedTarget` so that moving between child elements or between a country path and its own descendants does not incorrectly clear and immediately recreate the tooltip.

4. Add a reliable map-level exit guard. When the pointer leaves the SVG/map host entirely, immediately clear the hover state and hide the tooltip. When the pointer moves inside the SVG but is over empty map space or a non-target context-country path, immediately clear the hover state and hide the tooltip.

5. On every pointer movement over the map, determine the actual element under the pointer. If it is not a target country path, the tooltip must be hidden. Use `document.elementFromPoint(event.clientX, event.clientY)` or an equivalent robust hit-test where needed. Do not assume that a path-level leave event always fires after a DOM or SVG state change.

6. When the pointer moves from one target country to another, clear the previous hover state and show only the tooltip for the new country. There must never be more than one active hover country or one visible tooltip.

7. `_hideTooltip()` must be idempotent and must fully clear state. It should set the tooltip to hidden, set `aria-hidden="true"`, remove or clear stale content, and reset the internal hovered element/code. `_showTooltip()` must remove the hidden state and set `aria-hidden="false"` only while a valid target country is under the pointer.

8. Keep `.map-tooltip { pointer-events: none; }` so the tooltip cannot capture the pointer or prevent the map from receiving leave/move events.

9. Keep the permanent country labels in their separate `labelLayer`. Hover may change a country stroke or show a tooltip, but must never hide, remove, reparent, or recreate permanent labels.

10. Ensure focus/keyboard interaction remains accessible. Focus may show the country details while the path is focused, but blur and Escape must clear transient tooltip state. Pointer hover and keyboard focus must not fight each other or leave a stale tooltip after the pointer leaves the map.

### Required behavior matrix

| Pointer state | Expected result |
|---|---|
| Pointer enters Egypt, Saudi Arabia, UAE, Oman, Tanzania, or Angola | Show only that country’s tooltip and hover stroke. Permanent labels remain visible. |
| Pointer moves within the same country | Keep the same tooltip and update its position if necessary. Do not flicker. |
| Pointer moves from one target country to another | Hide/replace the previous tooltip and show only the new country’s tooltip. |
| Pointer moves from a target country to empty map space | Hide the tooltip immediately. |
| Pointer moves from a target country to a context/background country | Hide the target tooltip immediately unless that context country is intentionally interactive. |
| Pointer leaves the SVG/map host | Hide the tooltip immediately and clear hover state. |
| Pointer leaves and re-enters the same country | A fresh tooltip may show only after re-entry. |
| Keyboard focus enters a target country | Show the accessible focus state without hiding permanent labels. |
| Keyboard blur or Escape | Clear transient tooltip state and restore the non-hover visual state. |

## Preserve existing map and dashboard behavior

Do not alter the local GeoJSON geometry, map viewport, country coordinates, KSA/SAU mapping, `#b38126` active fill, selected/dimmed filter behavior, table data, KPI calculations, page navigation, or Google Apps Script server calls. Do not reintroduce Leaflet, CARTO, OSM tiles, Azure Maps, Mapbox, Google Maps, or any external map dependency.

Do not re-enable map zoom if the current release is intended to be fixed-frame. Do not change map layout or card layout as part of this task.

## Verification requirements

Review the latest implementation before changing it. After the change, review the diff and ensure that only the flag rendering and map hover/tooltip lifecycle are modified, plus directly related CSS or accessibility attributes.

Perform or document real cross-browser verification in the following browsers:

- Firefox;
- Google Chrome;
- Microsoft Edge;
- Brave.

At minimum, verify these scenarios in every available browser:

1. Open the Nationalization page and compare all six flags at the same zoom and viewport. Confirm that each flag is a deterministic local SVG or local asset and does not depend on emoji fonts.
2. Hover Egypt, Saudi Arabia, UAE, Oman, Tanzania, and Angola.
3. Move from each country to nearby empty map space and confirm that the tooltip disappears immediately.
4. Move from each country to a context/background country and confirm that the tooltip disappears immediately.
5. Move rapidly between two target countries and confirm that only the current country’s tooltip is visible.
6. Leave the map through every edge and corner and confirm that no tooltip remains.
7. Move over permanent labels and empty areas and confirm that no stale tooltip appears.
8. Verify that all permanent labels remain visible during hover, pointer movement, focus, and blur.
9. Verify that the KSA/Saudi Arabia path and label remain correct and that the active fill remains exactly `#b38126` when active.
10. Repeat navigation between Overview and Nationalization and confirm that no duplicate listeners, stale tooltips, or broken flags appear.

Do not claim cross-browser success without actually testing the browsers. If a browser cannot be tested in the current environment, state that limitation explicitly and provide the exact manual test steps.

## Acceptance criteria

The change is accepted only when:

1. The six country icons render consistently without Unicode flag emoji or external resources.
2. The tooltip is visible only while the pointer is over a valid target country or while an intentional keyboard focus state is active.
3. The tooltip is hidden immediately over empty map space, context geography, and outside the map.
4. No stale tooltip survives a pointer exit, fast pointer movement, page navigation, filter refresh, or map rerender.
5. No path is reparented or reordered during hover.
6. Permanent labels remain visible in all hover/focus states.
7. KSA/Saudi Arabia mapping, active fill `#b38126`, click filtering, and existing dashboard behavior remain intact.
8. The implementation works consistently in Firefox, Chrome, Edge, and Brave, or any untestable browser is clearly reported as unverified.
9. No external flag, map, tile, or font dependency is introduced.
10. The final report lists changed files, root causes, browser coverage, manual limitations, and any remaining risks.

Do not rewrite unrelated code. Do not solve the tooltip problem by simply increasing a timeout or leaving the tooltip visible longer. Do not solve the flag problem by choosing a different emoji. The goal is deterministic local rendering and deterministic pointer-state cleanup across browsers.
