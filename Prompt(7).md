# Google Antigravity Task Prompt — Improve Nationalization Card Layout and Prevent Hidden Content

## Role and scope

You are working inside the existing **EDECS HR Workforce & Nationalization Dashboard** built with Google Apps Script, HTML Service, vanilla JavaScript, and CSS inside HTML files.

The latest reviewed commit is:

```text
`a5a86f6` — fix layout of charts
```

The Overview map layout is now acceptable and must not be changed. This task is limited to the **Nationalization & Hiring page**, specifically the nationalization country cards.

The cards currently render correctly in terms of data, but their content is too cramped at desktop width. Some text, percentage labels, variance indicators, and card content are clipped or hidden because the cards are too narrow and some internal flex rows do not wrap. Six country cards are displayed as five cards on the first row and one card on a second row, leaving an unbalanced layout and insufficient width inside each card.

Implement a focused layout and CSS fix so the cards have comfortable space and **no visible content is hidden, clipped, overlapped, or forced outside the card**.

Do not redesign the dashboard, change business calculations, change data values, change card content semantics, or modify the Overview map.

---

## Confirmed current implementation

Inspect the current files before editing:

- `Nationalization.html` contains `#nat-cards-grid.nat-grid`.
- `JavaScript.html` contains `NatCtrl._renderCards()` and `_buildCard()`, which render the existing country-card markup and IDs.
- `Styles.html` contains the current nationalization card rules.
- The current `.nat-grid` rule is based on:

```css
.nat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-lg);
}
```

- `.nat-card` currently has `overflow: hidden`.
- `.nat-card__pct-row` is a flex row that does not explicitly allow wrapping.
- `.nat-card__pct-label` may be forced beside the large percentage and becomes clipped on narrow cards.
- `.nat-card__stats` is a two-column grid.
- The JavaScript card markup must remain data-driven and must continue to use the existing IDs and classes.

Trace the actual rendered markup before modifying CSS. Do not assume that the screenshot alone represents all responsive breakpoints.

---

## Primary objective

Make the six nationalization cards visually comfortable and balanced on desktop:

```text
ROW 1
┌──────────────────┬──────────────────┬──────────────────┐
│ Egypt            │ UAE              │ Oman             │
└──────────────────┴──────────────────┴──────────────────┘

ROW 2
┌──────────────────┬──────────────────┬──────────────────┐
│ Tanzania         │ Angola           │ Saudi Arabia     │
└──────────────────┴──────────────────┴──────────────────┘
```

The exact order must follow the existing data/order logic. Do not reorder countries in JavaScript merely to create this visual arrangement.

On a normal desktop viewport, use a deliberate three-column layout so each card is wider and all content has room. A suitable starting point is:

```css
.nat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(320px, 1fr));
  gap: var(--space-xl);
  align-items: stretch;
}
```

Adapt the minimum width to the actual dashboard content width. The essential requirement is three comfortable columns on desktop, not five narrow columns plus a lonely sixth card.

The cards must have equal visual height per row where practical, but must not use a fixed height that clips content. Let card height be content-driven or use `min-height` only when it does not hide overflow.

---

## Required content-visibility fixes

Every visible card must show all of its existing content completely:

- Country name.
- Country flag/icon.
- Nationalization percentage.
- The full text `Nationalization Rate`.
- Variance badge/value when available.
- `NATIONAL` count.
- `TOTAL ACTIVE` count.
- `TARGET` value.
- `PROGRAM` status.
- The final status pill such as `BELOW TARGET`.

Do not solve clipping by reducing the font to an unreadable size. Do not hide the variance, status, target, program, or percentage label.

The percentage area must be allowed to wrap gracefully. Update the relevant CSS so that the large percentage and its label can occupy multiple lines when necessary:

```css
.nat-card__pct-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-sm);
  min-width: 0;
}

.nat-card__pct-label {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.35;
  min-width: 0;
}
```

If the variance badge is currently inside the same row, allow it to move to the next line cleanly instead of being clipped at the right edge. Preserve readable spacing and alignment.

The long `Saudi Arabia` card and percentage label must receive the same comfortable treatment as the other cards. Do not create a special broken layout that only works for Egypt or UAE.

---

## Overflow and sizing rules

Inspect every relevant width, height, overflow, white-space, and flex rule affecting `.nat-card` and its descendants.

Do not allow important card content to be hidden by:

- `overflow: hidden` on a content container.
- Fixed card height.
- Fixed child width.
- `white-space: nowrap` on long text.
- A flex child that cannot shrink because of missing `min-width: 0`.
- A percentage row that cannot wrap.
- A status or variance pill extending beyond the card boundary.

You may retain `overflow: hidden` on `.nat-card` only if all content remains fully visible and the property is needed for the decorative top border. If it causes clipping, replace it with a safe approach such as `overflow: visible` or move the decorative clipping responsibility to a pseudo-element/container that does not clip the content.

Use:

```css
.nat-card,
.nat-card__header,
.nat-card__pct-row,
.nat-card__stats {
  min-width: 0;
}
```

Allow country names and labels to wrap naturally where necessary. Do not use ellipsis for any of the required card content unless the existing product owner explicitly requests truncation.

Ensure status pills have enough width and can wrap or move to a new line without being cut:

```css
.nat-card__status {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
```

Adapt the exact values to the existing design system and do not introduce horizontal page scrolling.

---

## Card design preservation

Preserve the existing visual language:

- White nationalization cards.
- Existing rounded corners.
- Existing status border colors.
- Existing flag/icon treatment.
- Existing typography hierarchy.
- Existing dark corporate dashboard background.
- Existing percentage and status colors.
- Existing hover elevation behavior.

The task is to give the existing cards more room, not to redesign them. Do not change the formulas, labels, country names, target percentages, or business statuses.

Keep the existing `NatCtrl` rendering logic and data contract. Prefer a CSS-only fix. Modify `Nationalization.html` or `JavaScript.html` only if the current markup itself prevents a correct responsive layout, and then make the smallest safe change.

---

## Responsive behavior

Use breakpoints based on available width:

### Large desktop

- Three columns.
- Six cards displayed as two balanced rows of three.
- No content is clipped.
- No horizontal scrollbar.
- All percentage labels, variance badges, stat values, and status pills are readable.

### Medium desktop/tablet

- Use two columns when three cards would become too narrow.
- Keep all six cards in the same existing data order.
- Allow card height to grow naturally.

### Mobile

- Use one column.
- Cards stack vertically.
- All content remains visible.
- Long labels wrap rather than disappear.
- No horizontal overflow.

A reasonable starting point is:

```css
@media (max-width: 1200px) {
  .nat-grid {
    grid-template-columns: repeat(2, minmax(280px, 1fr));
  }
}

@media (max-width: 700px) {
  .nat-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Use the project’s existing breakpoints if they are more appropriate. Do not make the layout switch to one column prematurely on normal desktop screens.

---

## Do not affect the hiring chart

The page also contains the Hiring Trend chart below the nationalization cards. Preserve:

- `chart-card` layout.
- Hiring chart controls.
- Chart canvas and data.
- Country filter.
- Granularity buttons.
- Existing chart rendering behavior.

After changing `.nat-grid` or `.nat-card`, verify that the chart remains below the cards with normal spacing and is not overlapped by the cards.

---

## Verification procedure

Inspect the actual rendered page at these viewport classes:

1. Normal desktop width where three cards should fit comfortably.
2. Medium width where two cards should be used.
3. Mobile width where one card should be used.

For every viewport, verify:

- All six cards are present.
- No card is unexpectedly hidden.
- No country card is stranded in an awkward layout because of an accidental fixed width.
- `Saudi Arabia` is fully visible.
- `Nationalization Rate` is fully visible on every card.
- The percentage does not overlap the variance badge.
- The variance badge is not cut at the right edge.
- The stats labels and values are fully visible.
- The `BELOW TARGET`/other status pill is fully visible.
- Cards do not overlap each other.
- No page-level horizontal scrollbar is introduced.
- The chart below remains visible and correctly spaced.
- The filter and card data behavior remain unchanged.

Use browser inspection or screenshots to verify the actual visual result. Do not declare success based only on CSS source inspection.

---

## Acceptance criteria

The implementation is complete only when:

- The six nationalization cards use a spacious, balanced desktop layout, preferably three columns by two rows.
- The cards are visibly wider than the current five-column arrangement.
- No required text, statistic, percentage, badge, or status is hidden or clipped.
- The full `Nationalization Rate` label is readable.
- `Saudi Arabia` is fully readable and not treated as a narrow special case.
- Card heights are content-safe and do not crop the bottom status area.
- All content wraps naturally where necessary.
- No horizontal page overflow is introduced.
- Medium and mobile layouts remain usable.
- Hiring chart layout and data remain unchanged.
- Nationalization calculations and data remain unchanged.
- No unrelated dashboard files are rewritten.
- The final diff is reviewed and the exact changed files are reported.

## Final instruction

Implement only the Nationalization & Hiring card-layout improvement. Give the six cards enough horizontal and vertical space so every piece of content is visible, readable, and uncropped. Preserve the current map, business logic, data, filters, and hiring chart.
