# Prompt(12) — Exactly 6 Visible Rows, Total Count Only, and Conditional Internal Scrolling

## Task mode

This is a **code-change request** for the existing Google Apps Script HTML Service project `Ahmedhassan1944/HRGlobal`. Inspect the current repository and latest committed implementation, then apply the necessary changes in the actual project files. Do not return analysis, pseudocode, or a plan without changing the code. After implementation, review the diff and report exactly what changed and what was verified.

The previous implementation produced these incorrect results:

1. The table viewport shows only **5 visible rows**, although the requirement is exactly **6 visible rows**.
2. The header badges show values such as `6 of 16 shown` and `6 of 25 shown`, but the requirement is to display the **total count only**.
3. A scrollbar was added to all three tables, including Country, even when the table has exactly six rows and does not need scrolling.

Correct all three issues without changing the dashboard’s business calculations or unrelated pages.

## Required final behavior

The Overview page contains these three existing tables:

```text
#country-table-body
#dept-table-body
#nat-table-body
```

The final behavior must be exactly:

| Table | Data loaded | Rows visible initially | Scrollbar |
|---|---:|---:|---|
| Country Headcount | All current filtered country rows | 6 or fewer if fewer exist | No scrollbar when total rows ≤ 6 |
| Department Headcount | All current filtered department rows | 6 | Internal scrollbar only when total rows > 6 |
| Top Nationalities | All current filtered nationality rows | 6 | Internal scrollbar only when total rows > 6 |

This means **six rows visible at one time**, not six rows total. All remaining Department and Nationality rows must remain accessible through the table’s internal scrollbar.

## 1. Make the viewport show exactly six rows

Inspect the current table CSS and rendering code. The visible data area currently shows five rows, so correct the actual height calculation rather than merely changing a comment or a count.

Define a single clear row-height constant or CSS variable and calculate the data viewport from six complete row heights. Account for the existing table header, borders, padding, and box sizing. For example, use an approach equivalent to:

```css
--overview-data-row-height: 46px;
--overview-visible-row-count: 6;
```

and set the scrollable data viewport to the height required for six complete rows. Use the actual row height found in the current project; do not blindly use these example values if they do not match the rendered design.

Verify visually and through DOM measurements that the first six data rows are fully visible without clipping. The sixth row must not be partially hidden behind the card boundary or below the viewport.

Do not reduce the row font size or compress the content unnaturally just to force six rows into the card. Preserve readable text and the current visual style.

## 2. Render the complete data arrays

The renderer must keep all current sorted and filtered rows in the DOM so that users can scroll to them. Do not use `slice(0, 6)` as the final rendering behavior, and do not use CSS to permanently hide rows after row 6.

The renderer should:

1. Receive the complete sorted/filtered array.
2. Render every valid row in the existing table body.
3. Preserve the existing rank sequence, so rows after the sixth continue as 7, 8, 9, and so on.
4. Show the first six rows at the initial scroll position.
5. Reset the relevant table scroll position to `0` after every filter update and Reset action.
6. Avoid mutating the source arrays.

Use the existing rendering function and table IDs. Do not create duplicate tables or a second rendering system.

## 3. Remove the Top-15 restriction from Nationalities

Inspect the actual source of the Nationalities limit, including `DashboardService.gs`, `DataService.gs`, and the Overview rendering path. Remove any hard-coded limit such as:

```text
Top 15
slice(0, 15)
limit = 15
```

The Overview Nationalities table must receive all distinct nationalities available after the current filters, in the existing sort order. The user must be able to scroll beyond nationality 15 and reach every available nationality.

Do not limit the backend response to six or fifteen. Keep the full data available to the table and other consumers. Do not invent records or change headcount calculations.

Update the Nationalities table title or static markup if it still says `Top 15`. It must no longer falsely imply that the table contains only 15 records.

## 4. Show the total count only in each header badge

The user wants the header badge to show the **total number of records only**, not the visible row count and not a phrase such as `6 of 16 shown`.

The final header badge values must follow this rule:

- Country with six records → `6`
- Department with sixteen records → `16`
- Nationalities with twenty-five records → `25`
- After filters → the total number of records in the current filtered result
- Empty result → `0`

Do not display:

```text
6 of 16 shown
Top 6 of 25
6 shown of 25
```

The badge must not be confused with the number of visible rows. In the existing `OverviewCtrl._renderTable(...)`, set the count element to the full current array length, not the number of rows currently visible:

```javascript
countEl.textContent = String(rows.length);
```

Use the actual project’s formatting helper if appropriate, but preserve the number-only output. The final count must update correctly after Country filters, Department filters, combined filters, Reset, empty results, and repeated filter changes.

The initial static text in `Overview.html` for the Nationalities count must not remain `Top 15`; initialize it to `0` or let the existing renderer populate it.

## 5. Conditional scrollbar behavior

The scrollbar must exist only when a table has more than six data rows.

Implement the table body behavior as follows:

- When `rows.length > 6`, the table data area uses `overflow-y: auto` and users can scroll vertically through all rows.
- When `rows.length <= 6`, the table data area uses `overflow-y: hidden` or another reliable equivalent so no scrollbar is shown.
- Do not use `::-webkit-scrollbar { display: none; }` for all tables, because this would hide the scrollbar users need for Department and Nationalities.
- Do not force a scrollbar with `overflow-y: scroll` on every table.
- Do not add a page-level scrollbar to solve this problem.
- Do not create more than one vertical scroll container per table.

A class-based approach is acceptable, for example:

```javascript
bodyEl.classList.toggle('is-scrollable', rows.length > 6);
bodyEl.style.overflowY = rows.length > 6 ? 'auto' : 'hidden';
bodyEl.scrollTop = 0;
```

Use the project’s existing structure and class names where possible. Make sure the table remains equal in height whether scrolling is enabled or not.

For a table with exactly six rows, such as the current Country table, the card must have the same height as the other cards but must not display a scrollbar track or thumb. For Department and Nationalities with more than six rows, the scrollbar must be visible and usable inside the card.

## 6. Empty, loading, and filtered states

Preserve the existing states and keep cards aligned:

- Loading skeletons must fit within the six-row card height.
- Fewer than six rows must leave reserved empty space without fake rows or fake ranks.
- Empty results must keep the existing `No Data Found` state and must not show a misleading scrollbar.
- Server errors must keep the existing error behavior.
- Filters and Reset must update the complete arrays, update the number-only total badge, apply conditional scrolling, and reset `scrollTop` to zero.
- Repeated updates must not append duplicate rows or duplicate scroll containers.

## 7. Prevent clipping and browser layout problems

Ensure the following remain true in Chrome, Edge, Brave, and Firefox:

- all six initial rows are completely visible;
- the sixth row is not clipped;
- names and Head Count values remain readable;
- the Head Count column remains visible;
- Department and Nationalities can scroll to their final row;
- Country does not show an unnecessary scrollbar;
- no horizontal page overflow is introduced;
- no nested vertical scrollbars are introduced;
- the three cards remain equal in height;
- sticky headers, if used, remain aligned with their columns;
- the table does not switch to a fragile structure that misaligns `thead` and `tbody`.

## 8. Preserve unrelated application behavior

Do not change:

- KPI calculations;
- Country or Department filter semantics;
- map rendering, local GeoJSON, KSA/SAU mapping, active fill `#b38126`, labels, hover, tooltip, or click behavior;
- Nationalization cards;
- Hiring chart and its controls;
- navigation;
- Google Apps Script server contracts, except the directly related removal of the Nationalities Top-15 restriction;
- any unrelated page layout.

Do not add pagination, “View More,” accordions, or an additional data source. The required interaction is a native internal scrollbar that exposes every loaded row.

## Required implementation review

Before editing, identify:

1. Why the current viewport displays five rows instead of six.
2. Where the Nationalities Top-15 limit is applied.
3. Where the current `6 of N shown` badge text is created.
4. Which element currently receives the scrollbar.

After editing, review the full diff and confirm:

1. The current filtered arrays are rendered in full.
2. The viewport displays exactly six complete rows initially.
3. Only tables with more than six rows have a visible internal scrollbar.
4. Country with six rows has no scrollbar.
5. Nationalities is no longer limited to 15.
6. Header badges show numbers only: total records, not visible rows.
7. Scroll positions reset after filtering and Reset.
8. Empty/loading/error states remain correct.
9. No unrelated business logic or page behavior changed.

## Acceptance criteria

The implementation is accepted only when all of the following are true:

1. Exactly six complete data rows are visible initially whenever at least six rows exist.
2. All rows after row 6 remain accessible through internal scrolling.
3. Country with exactly six rows has no scrollbar.
4. Department and Nationalities show a usable scrollbar only when their total rows exceed six.
5. The Nationalities table exposes all available nationalities, not just Top 15.
6. Header badges show the total number only, such as `6`, `16`, or `25`.
7. No badge contains `of`, `shown`, or `Top 6` as part of the count output.
8. Rankings remain correct while scrolling.
9. Filters, Reset, loading, empty, and error states remain correct.
10. All table content and the Head Count column remain readable without clipping.
11. The three table cards remain equal in height at desktop widths and stack safely on smaller screens.
12. No duplicate tables, nested scrollbars, page overflow, or unrelated regressions are introduced.
13. The final response lists the exact files changed, the reason the previous five-row viewport occurred, the source of the previous Top-15 limit, the conditional scrollbar logic, the number-only count behavior, and the tests actually performed.

Do not claim completion without applying the actual code/CSS changes. Do not solve the problem by hiding the scrollbar, deleting rows after row 6, or changing the badge to a misleading value.
