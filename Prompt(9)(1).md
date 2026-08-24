# Prompt(9) — Enforce a Six-Row Maximum and Equal Overview Table Heights

## Task mode — implement the change, do not only analyze

This is a **code-change request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. After inspecting the repository, implement the requested change in the actual project files. Do not respond with analysis only, a suggested plan, pseudocode, or a code snippet that is not applied. Do not wait for another approval after the inspection phase.

If a repository constraint prevents a safe implementation, identify the exact blocker and the relevant file/line instead of pretending that the change was completed. Otherwise, make the smallest safe code and CSS changes, then review the diff and verify the result.

## Repository baseline

Review the current committed implementation before editing. The relevant existing files are primarily:

- `Overview.html`
- `JavaScript.html`
- `Styles.html`

The existing Overview table bodies are:

```text
#country-table-body
#dept-table-body
#nat-table-body
```

The current table rendering is handled by the existing Overview table rendering function in `JavaScript.html` (currently `_renderTable(...)`). Preserve the project’s current Google Apps Script architecture, server functions, data contracts, filters, map, charts, navigation, and page behavior.

## Objective

On the Overview page, display a maximum of **6 actual data rows** in each of these three tables:

1. Country Headcount
2. Department Headcount
3. Top Nationalities

The purpose is to make the three table cards visually equal and prevent Department and Nationalities from becoming taller than Country when they contain more records.

The visible rows must be the first six rows from the existing sorted and filtered arrays. Do not change the existing sort order, ranking, headcount calculation, filtering logic, or server-side business data merely to achieve this visual limit.

## Required implementation

### A. Limit only the rendered rows

Inspect the current `_renderTable(...)` implementation in `JavaScript.html`. At the rendering boundary, create a new display array without mutating the source array:

```javascript
var visibleRows = (rows || []).slice(0, 6);
```

Render `visibleRows` only. The loop that creates `<tr>` elements must iterate over `visibleRows`, never over the full `rows` array.

This must apply consistently to all three existing table body IDs. Do not create a second table-rendering path. Do not duplicate any table in `Overview.html`. Do not hide extra rows with CSS after rendering; the DOM must contain no more than six actual data rows per table.

### B. Preserve the existing count-badge meaning

The visible row limit must not silently change the meaning of the existing table count badges. The current UI uses badges such as `6`, `16`, and `15`; inspect the code and preserve the established meaning as the total available record count if that is how it currently works.

Do not replace a total count with `6` merely because only six rows are visible. If a concise clarification is needed, use an unambiguous format such as `6 shown of 16` or `Top 6 of 15`, but do not make unnecessary visual changes to the header badges. The final report must state exactly what the count badges mean after the change.

The visible table body may contain a maximum of six rows, while the underlying filtered array and the total count remain intact for the rest of the dashboard.

### C. Make all three table cards equal in height

Update only the necessary table/card sizing rules in `Styles.html` so that the three Overview table cards have the same height in the normal desktop three-column layout.

The common height must account for:

- the card header;
- the table column header;
- six standard data-row heights;
- existing card padding and borders.

Use a robust layout that does not depend on accidental content height. A stable `min-height` or an equivalent flex/grid approach is acceptable after inspecting the existing CSS. Do not use a height that clips text, hides the Head Count column, or creates an unnecessary scrollbar.

When a table has fewer than six rows, preserve the same card height with empty reserved space or another non-data layout technique. Do **not** create fake data records, fake ranks, fake headcounts, or misleading zero rows. When the result is empty, preserve the existing meaningful `No Data Found` state while keeping the card aligned with its neighbors.

### D. Prevent content from being hidden

Ensure the final table layout does not hide or clip any meaningful content. In particular:

- the full `Head Count` header and values must remain visible;
- country, department, and nationality names must remain readable;
- long names may wrap safely when necessary;
- `overflow: hidden`, `white-space`, `text-overflow`, or fixed dimensions must not conceal text;
- no horizontal page scrollbar should appear;
- no vertical scrollbar should appear merely because the table is limited to six rows;
- the three table cards must remain aligned and equal in height.

Use `min-width: 0` on grid/flex children where necessary. Do not make one card wider or taller than the other two.

### E. Preserve all existing behavior

The six-row display limit must continue to work after every existing Overview render and filter update. Verify it for:

- initial loading skeleton;
- unfiltered data;
- Country filter;
- Department filter;
- combined Country and Department filters;
- Reset filters;
- an empty result;
- a server error;
- repeated filter changes.

Do not modify `DashboardService.gs` or `DataService.gs` merely to return six records. Keep the full data arrays available to existing KPI, map, filter, and other dashboard logic. Do not modify map rendering, KSA/SAU behavior, Nationalization cards, Hiring chart behavior, or page navigation.

## Required implementation checks

After editing, inspect the actual diff and confirm:

1. The renderer produces no more than six actual `<tr>` data rows in each of the three table bodies.
2. The first six existing sorted/filtered rows are the ones displayed.
3. The source arrays are not mutated.
4. The three cards use the same height strategy.
5. Fewer than six rows do not produce fake records.
6. Empty, loading, and error states still work.
7. Count badges retain a truthful meaning.
8. No table text or Head Count column is clipped.
9. No unrelated application files or business logic were changed.
10. No map, chart, filter, or navigation regression was introduced.

Use the existing selectors and IDs. Do not introduce a second rendering system, a pagination control, an accordion, or a “View More” feature; the requirement is simply that the Overview tables display at most six rows.

## Browser and responsive verification

Verify the result at a normal desktop width where the three tables appear in one row. Also check tablet and mobile widths:

- Desktop: three equal-height table cards in the existing three-column layout.
- Tablet: cards remain readable and do not clip columns or create page overflow.
- Mobile: cards stack safely and preserve readable names and headcounts.

If browser execution is unavailable, perform the strongest available static verification and clearly state that visual verification remains pending. Do not claim a screenshot or browser test that was not actually performed.

## Acceptance criteria

The task is complete only when all of the following are true:

1. Country, Department, and Top Nationalities each display at most six real data rows.
2. Rows 1–6 preserve the existing sort order and rankings.
3. The three table cards have equal visual height on desktop.
4. Tables with fewer than six rows remain aligned without fake records.
5. Empty, loading, filtered, reset, and error states remain correct.
6. Count badges do not falsely claim that only six records exist when more records are available.
7. All table names, headers, and headcounts remain readable.
8. No unnecessary horizontal or vertical scrollbar is introduced.
9. Existing KPI, filters, map, charts, server calls, navigation, and other pages behave as before.
10. The final response lists the files changed, describes the exact six-row implementation, states the count-badge behavior, and reports the verification actually performed.

Do not rewrite unrelated code. Do not change the server’s business data limit. Do not claim completion without applying the necessary repository changes or explicitly reporting the blocker.
