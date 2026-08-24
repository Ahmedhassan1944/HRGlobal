# Prompt(14) — Fix Hiring Trend Initial Render and Chart Sizing

## Task mode

This is a **targeted code-change request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. Inspect the current latest repository implementation first, especially `JavaScript.html`, `Styles.html`, `Overview.html`, and the code that initializes and reloads the Hiring Trend chart.

Apply the necessary changes in the actual project files. Do not return only a diagnosis, pseudocode, or a plan. Keep the implementation minimal and focused on the Hiring Trend initial-render defect. Review the full diff afterward and report the exact files changed and the tests actually performed.

## Observed defect

The Hiring Trend chart is displayed incorrectly when the dashboard is opened for the first time or after a hard refresh. It becomes correctly sized and rendered only after the user clicks a filter, changes a control, or performs another interaction.

The desired behavior is:

> When the Overview page is opened for the first time, the Hiring Trend chart must already be fully rendered, correctly sized, and visually identical to the chart after a user interaction. The user must not click anything to make it correct.

Treat the first-load defect as a real initialization/layout bug, not as acceptable browser behavior.

## 1. Inspect the real initialization order

Trace the complete startup sequence before editing:

1. DOM/content initialization;
2. `Router` initialization and the active Overview page;
3. `OverviewCtrl` initialization;
4. initial `GASClient` data loading;
5. Hiring Trend control initialization;
6. `ChartRenderer` creation/reload/render;
7. page navigation between Overview and Nationalization;
8. any existing `invalidateSize()`, `resize()`, `requestAnimationFrame`, `setTimeout`, or skeleton show/hide logic.

Identify why the first render differs from the later render. Do not assume that adding an arbitrary delay is the complete fix. The implementation must address the actual lifecycle or sizing cause.

## 2. Correct the initial chart lifecycle

Ensure that the initial Hiring Trend render runs only after all of the following are true:

- the Overview page is active and not hidden;
- the chart card and its parent have their final non-zero dimensions;
- the canvas is visible;
- the initial chart data has been received successfully;
- the chart container has completed the relevant layout pass.

A robust approach may use one or more of the following, as appropriate after inspecting the current code:

- `requestAnimationFrame` after the Overview becomes visible;
- a second layout-frame measurement when the container dimensions change;
- `ResizeObserver` on the chart container;
- a visibility check that waits until `clientWidth` and `clientHeight` are greater than zero;
- `document.fonts.ready` only if font loading is proven to affect the chart layout;
- an explicit `chart.resize()` after the card becomes visible;
- the existing Router navigation callback when returning to Overview.

Do not solve the issue by requiring a filter click, country change, period change, or any other user interaction.

Do not add an uncontrolled polling loop. Any observer, listener, or deferred callback must be registered once, cleaned up when appropriate, and must not cause repeated chart renders indefinitely.

## 3. Configure Chart.js responsively and safely

Inspect the existing `ChartRenderer` implementation and preserve its data and visual design. Ensure the chart configuration is appropriate for a responsive card:

```javascript
responsive: true,
maintainAspectRatio: false
```

Use the exact current project conventions if the configuration is already equivalent. The chart must size itself from the visible chart container rather than relying on a canvas width/height captured too early.

The chart container should have a stable layout contract, such as:

- a non-zero `min-height` suitable for the existing card;
- `position: relative` where required by Chart.js;
- a canvas that fills the container without stretching the chart incorrectly;
- no conflicting inline width/height left over from an earlier render;
- no CSS rule that collapses the container while the chart is loading.

Do not use `height: auto` on a canvas if it causes the initial chart height to collapse. Do not use `transform: scale(...)` to fake the correct size. Do not hard-code one viewport width as the solution.

## 4. Manage chart instances without duplication

There must be one active Hiring Trend Chart.js instance for the current chart canvas.

Before recreating a chart, use the current project’s safe lifecycle approach:

- update the existing chart instance when only data/options changed; or
- destroy the existing instance exactly once before creating a replacement.

Do not create duplicate charts, duplicate canvases, or duplicate resize observers after:

- first page load;
- changing Country;
- changing Year/Quarter/Month;
- navigating away from Overview and back;
- pressing Refresh;
- repeated data reloads.

Ensure the loading skeleton and chart visibility transition correctly:

- show the existing skeleton while data is loading;
- render the chart after data and dimensions are ready;
- hide the skeleton only after a valid chart has been rendered;
- restore the existing error behavior if data loading fails.

## 5. Preserve the current data and controls

Do not change:

- hiring trend calculations;
- server-side data contracts;
- Country filter semantics;
- Year, Quarter, or Month controls;
- chart series, labels, colors, tooltip content, or existing granularity behavior;
- Overview KPIs and tables;
- map layout, local GeoJSON, labels, KSA/SAU mapping, `#b38126`, hover, tooltip, or Reset behavior;
- Nationalization cards;
- navigation or authentication behavior.

The only intended change is to make the existing Hiring Trend render correctly and immediately on first load and after visibility/size changes.

## 6. Required state and browser checks

Verify the following without using a workaround click:

1. Hard refresh the application while Overview is the initial page.
2. Open the application in a new browser tab with a clean session if available.
3. Confirm the Hiring Trend chart is correctly sized on the first paint after loading completes.
4. Confirm the chart does not appear collapsed, stretched, clipped, or incorrectly compressed.
5. Confirm the chart is still correct after changing Country.
6. Confirm the chart is still correct after changing Year, Quarter, and Month controls.
7. Confirm the chart is still correct after applying and clearing Overview filters.
8. Navigate to Nationalization and back to Overview; confirm the chart remains correctly sized without requiring a click.
9. Use browser zoom and several viewport widths; confirm the chart resizes correctly.
10. Press Refresh and confirm the chart renders correctly after the new data arrives.
11. Confirm the skeleton is replaced by one valid chart and does not remain over the chart.
12. Confirm no duplicate chart instance, canvas, observer, or event listener is created.
13. Confirm the chart remains correct in Firefox, Chrome, Edge, and Brave, or explicitly document any browser that could not be tested.

If browser automation is unavailable, perform the strongest available static and manual verification and clearly state what could not be verified. Do not claim that the first-load bug is fixed based only on a code inspection.

## Acceptance criteria

The implementation is accepted only when:

1. Hiring Trend is correctly rendered and sized on the first opening of Overview.
2. No user click, filter change, control change, or other interaction is required to correct its appearance.
3. The initial chart uses the final visible container dimensions.
4. `responsive` and `maintainAspectRatio: false` or an equivalent correct sizing strategy are in effect.
5. The chart container has a stable non-zero height and the canvas does not collapse.
6. The chart data, series, controls, labels, colors, and tooltips are unchanged.
7. Navigation, refresh, filter changes, and responsive resizing do not reintroduce the defect.
8. Only one active chart instance and one appropriate resize lifecycle exist.
9. Loading and error states remain correct.
10. No unrelated project files or business logic are changed.
11. The final report identifies the root cause, the lifecycle/sizing fix, the exact files changed, the test scenarios performed, and any unverified browser cases.

Do not solve this by telling users to click something first. Do not solve it with an arbitrary long timeout alone. Do not hide the issue by reducing chart content or changing the business data. The required result is a correct Hiring Trend chart immediately after the initial page load.
