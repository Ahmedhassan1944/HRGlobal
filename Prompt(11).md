# Prompt(11) — Show All Department and Nationality Data with a Six-Row Internal Scroll Window

## Task mode

This is a **code-change request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. Inspect the latest repository state and the latest committed implementation first, then implement the requested change in the actual project files. Do not provide analysis, pseudocode, or a suggested plan without applying the necessary code/CSS changes. After implementation, review the diff and report the exact files changed and the verification performed.

The screenshot after the previous Prompt(9) implementation shows that the six visible rows and equal-height cards are correct, but the Department and Top Nationalities tables have no internal scrollbar. In addition, the Nationalities data is still limited to Top 15. Both behaviors must be corrected.

## Exact business and UI requirement

The Overview page has three table cards:

- Country Headcount: `#country-table-body`
- Department Headcount: `#dept-table-body`
- Top Nationalities: `#nat-table-body`

The requirement is:

> Load and retain all available rows in the underlying filtered data, but display only a six-row-high window at a time inside each table card. Users must be able to scroll vertically inside the Department and Nationalities table areas to see all available rows. The three cards must remain equal in height.

This means **six visible rows at a time**, not six total records in the data source.

## 1. Remove the Nationalities Top-15 data limit

Inspect the current backend data construction, especially `DashboardService.gs`, `DataService.gs`, and the code that creates the Overview `nationalities`/`natTable` array.

Remove or bypass any hard-coded Top-15 limit for the Overview Nationalities table. The Overview table must receive **all distinct nationalities available after the current filters**, sorted using the existing business sort order (normally descending headcount, with the existing tie-break behavior preserved).

Do not invent records and do not alter headcount calculations. Do not remove data that other dashboard features need. If the same backend response feeds other components, preserve compatibility by adding a clearly named full-data field or by retaining the existing field and removing only the unintended display limit after verifying all consumers.

The resulting table must be able to show every available nationality, not only the first 15. If there are 15, 30, or more nationalities, the user must be able to reach all of them through the table’s internal scrollbar.

Update the visible title/count wording only as needed to avoid a false claim that the table is limited to Top 15. Prefer a truthful, concise label such as `Nationalities` with a count, or `Nationalities — 6 of N shown`, consistent with the existing visual design.

## 2. Render all rows, but show six rows at a time

Inspect the current `OverviewCtrl._renderTable(...)` implementation in `JavaScript.html`. The previous `slice(0, 6)` approach must not be used as the only implementation, because it permanently removes the rows that the user needs to scroll to.

Change the rendering logic so that:

1. It renders the complete sorted and filtered source array into the existing table body.
2. It preserves the existing rank values across the complete array. If the sixth visible row is rank 6, scrolling down must continue with rank 7, rank 8, and so on.
3. It keeps the first six rows visible initially.
4. It limits the viewport height to exactly the space for approximately six normal data rows plus the existing table header.
5. It enables a vertical scrollbar inside the table body when the rendered data contains more than six rows.
6. It does not create fake records, fake ranks, or fake headcounts.

Do not use CSS to delete or permanently hide rows beyond row 6. All valid rows must remain available in the scrollable table DOM.

Use the existing table body IDs and do not create duplicate tables:

```text
#country-table-body
#dept-table-body
#nat-table-body
```

For the current data, Country has six countries and may not need a scrollbar. Department and Nationalities must scroll when their complete filtered arrays contain more than six rows.

## 3. Equal-height cards and one internal scrollbar

Keep the three Overview table cards equal in height in the existing desktop three-column layout. The card height must include:

- the card header;
- the table column header;
- a scroll viewport showing six standard data-row heights;
- existing padding and borders.

Use a robust layout after inspecting the current CSS. The expected behavior is one internal vertical scroll container for the table data area, not a page-level scrollbar and not multiple nested vertical scrollbars.

The scroll container must:

- use `overflow-y: auto` or an equivalent conditional scroll behavior;
- use `overflow-x: hidden` only if it does not clip meaningful text or the Head Count column;
- have a stable height/min-height based on six row heights;
- show the scrollbar for Department and Nationalities when they contain more than six rows;
- avoid a visible scrollbar for a table that contains six or fewer rows where the browser allows it;
- remain usable in Chrome, Edge, Brave, and Firefox.

If the browser displays a scrollbar track even when the content fits, that is acceptable only if no content is clipped and the three cards remain aligned. Do not remove the scrollbar with `::-webkit-scrollbar { display:none; }`, because users must be able to discover and use the complete data.

If a sticky table header is needed, implement it without breaking column alignment. Do not switch the table to a fragile `display:block` structure unless the column widths remain correctly aligned across `thead` and `tbody` in all supported browsers.

## 4. Count badges must be truthful

Keep the distinction between total available records and visible rows:

- visible rows at once: maximum 6;
- total available rows: all rows in the current filtered dataset.

Do not display `Top 6 of 16` for a Department table unless “Top” is a deliberate existing business meaning. Prefer `6 of 16` or another unambiguous format. For Nationalities, do not continue to display `Top 6 of 15` if the backend now provides all nationalities; use a truthful format such as `6 of 28` or `All · 6 shown of 28`, consistent with the current UI.

The count must update correctly after Country and Department filters, reset, empty results, and repeated filter changes. The count must represent the current filtered dataset, not stale data from the previous render.

## 5. Preserve all existing behavior

Do not break or redesign:

- Overview KPI and headcount calculations;
- Country and Department filters;
- combined filters and Reset;
- map rendering, local GeoJSON, KSA/SAU mapping, `#b38126`, labels, hover, tooltip, and click behavior;
- Nationalization cards;
- Hiring chart and its granularity controls;
- navigation and page lifecycle;
- Google Apps Script server calls and existing data contracts unless a directly related compatibility change is necessary.

Do not introduce pagination, “View More,” accordions, or a second data source. The required interaction is a native internal vertical scrollbar that exposes all loaded rows.

## 6. Required state and interaction checks

Verify the following states for all three tables:

1. Initial loading skeleton fits the equal-height card.
2. Unfiltered data shows the first six rows initially.
3. Department scroll reaches every department beyond row 6.
4. Nationalities scroll reaches every nationality beyond row 15 and beyond row 6.
5. Country remains correct with its six available countries.
6. Country filter updates all three tables and resets the scroll position to the top.
7. Department filter updates all three tables and resets the scroll position to the top.
8. Combined filters update all three tables and reset the scroll position.
9. Reset restores the full unfiltered datasets and scrolls each table to the top.
10. Empty results show the existing `No Data Found` state without leaving a broken scrollbar or unequal card height.
11. Server errors preserve the current error behavior.
12. Repeated filter changes do not append duplicate rows or duplicate scroll containers.
13. Scrolling does not alter the map, KPI, or chart unexpectedly.
14. Long department or nationality names remain readable and do not hide the Head Count column.

## 7. Required implementation review

Before editing, identify the exact current source of the Top-15 limit and the exact current renderer/CSS responsible for the missing scrollbar.

After editing:

- review the full diff;
- confirm the Nationalities backend/display limit is no longer 15;
- confirm the renderer inserts all current filtered rows;
- confirm no more than six rows are visible within the fixed table viewport at one time;
- confirm Department and Nationalities have a usable internal vertical scrollbar when their data exceeds six rows;
- confirm there is only one scroll container per table;
- confirm the three card heights are equal;
- confirm the count badges are truthful;
- confirm no unrelated application files or logic changed.

Do not claim that all nationalities are available unless the source array and scroll behavior were actually verified. Do not claim browser compatibility without testing or explicitly documenting the unavailable browsers.

## Acceptance criteria

The change is complete only when:

1. The Overview Nationalities table receives and retains all available filtered nationalities, not only Top 15.
2. Department and Nationalities show the first six rows initially and expose all remaining rows through an internal vertical scrollbar.
3. Country, Department, and Nationalities cards remain equal in height.
4. No valid row is deleted, permanently hidden, duplicated, or replaced with fake data.
5. Rank numbers continue correctly while scrolling.
6. Count badges distinguish visible rows from total filtered records.
7. Filters and Reset update the complete data arrays and return scroll positions to the top.
8. Empty, loading, and error states remain correct.
9. No horizontal page overflow or clipped Head Count column appears.
10. Existing map, KSA/SAU, hover, tooltip, KPI, chart, navigation, and server behavior remain intact.
11. The implementation works in Firefox, Chrome, Edge, and Brave, or any unavailable browser is explicitly reported as unverified.
12. The final response lists the exact files changed, the previous Top-15 source, the new all-data behavior, the scroll-container strategy, count-badge behavior, and the tests actually performed.

Do not solve this by simply applying `slice(0, 6)`. The correct solution is: **full data loaded and rendered, six rows visible at a time, internal scrolling for the remaining rows, and equal-height cards**.
