# EQT Portal GWT & ag-Grid DOM Scraping & Synchronization Guide

This document provides low-level technical specifications for automating and scraping both the GWT-based Old UI and ag-Grid-based New UI of the Markit EQT Trade Blotter.

---

## 1. GWT (Old UI) Input State Synchronization
In Google Web Toolkit (GWT), programmatically changing an input field's `.value` property is insufficient because it bypasses the framework's internal binding events. This results in the framework ignoring the programmatic value when "Apply" is clicked.

To ensure values are properly synchronized with GWT:
1. Locate the input element (e.g., `.dateLabel` or relative XPath input).
2. Set the element's `.value` property directly.
3. Sequentially dispatch standard bubble events:
   - `focus`: Focuses the element, preparing GWT for input.
   - `input`: Notifies GWT of active character entry.
   - `change`: Commits the modified value.
   - `blur`: Simulates user tab-out/defocus, committing state binding.

### JavaScript Implementation
```javascript
async function fillGWTInput(frame, selector, index, value) {
  await frame.evaluate(({ sel, idx, val }) => {
    const inputs = Array.from(document.querySelectorAll(sel));
    const inp = inputs[idx];
    if (inp) {
      inp.value = val;
      inp.dispatchEvent(new Event('focus', { bubbles: true }));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }, { sel: selector, idx: index, val: value });
}
```

---

## 2. GWT Split Grid Table Merging
The Old UI's grid splits standard tabular records into two distinct DOM tables rendered side-by-side. To capture complete records, we must merge these tables row-by-row:

### Left-Side (Frozen Container)
- **Selectors:** `.datafrozenGrid-full tbody tr` or `.frozencontainer tbody tr`
- **Contained Fields:** Status (`Status`), Clearing State (`Clr`), Document Status (`Doc Status`).

### Right-Side (Floating Container)
- **Selectors:** `.datafloatingGrid-full tbody tr`, `.data-grid tbody tr`, or `.tradeBlotter-rightPanel tbody tr`
- **Contained Fields:** Product (`Product`), Direction (`Direction`), Deal ID (`Deal ID`), Trade Date (`Trade Date`), Trade ID (`Trade ID`), etc.

### Merger Strategy
1. Retrieve frozen rows and floating rows.
2. For each row index `rIdx` up to `max(frozen.length, floating.length)`:
   - Fetch the $rIdx$-th row from both containers.
   - Collect cells (`td`) from both rows.
   - Map each cell's text value to its corresponding column header (using coordinate alignment).
   - Combine the key-value mappings into a unified record object.

---

## 3. Horizontal Coordinate Midpoint Clustering
Because the Old UI columns are dynamically sized and separated across multiple DOM containers, cells cannot be matched to headers by simple index indexing. Instead, we use horizontal coordinate midpoint calculation:

$$\text{midpoint} = \frac{\text{rect.left} + \text{rect.right}}{2}$$

### Alignment Algorithm
1. Scrape all header elements (`.tb-header-text`). Capture each header's text and horizontal midpoint coordinate (`mid`).
2. For each cell in a row:
   - Measure the cell's horizontal midpoint (`cell.mid`).
   - Calculate the absolute distance $|\text{cell.mid} - \text{header.mid}|$ to every header.
   - Map the cell to the header with the **minimum absolute distance**, provided the distance is within a **100px tolerance**.
   - Store the value under that header's name.

### Scraping Implementation
```javascript
const oldUIResult = await frame0.evaluate(() => {
  const headerEls = Array.from(document.querySelectorAll('.tb-header-text, .tradeBlotter-rightPanel .tb-header-text'));
  const headers = headerEls.map(el => {
    const rect = el.getBoundingClientRect();
    return { text: el.textContent.trim(), mid: (rect.left + rect.right) / 2 };
  }).filter(h => h.text !== '');

  const frozenRows = Array.from(document.querySelectorAll('.datafrozenGrid-full tbody tr, .frozencontainer tbody tr'));
  const floatingRows = Array.from(document.querySelectorAll('.datafloatingGrid-full tbody tr, .data-grid tbody tr'));

  const numRows = Math.max(frozenRows.length, floatingRows.length);
  const scrapedRows = [];

  for (let rIdx = 0; rIdx < numRows; rIdx++) {
    const fRow = frozenRows[rIdx];
    const flRow = floatingRows[rIdx];

    const fCells = fRow ? Array.from(fRow.querySelectorAll('td')).map(td => {
      const rect = td.getBoundingClientRect();
      return { text: td.textContent.trim(), mid: (rect.left + rect.right) / 2 };
    }) : [];

    const flCells = flRow ? Array.from(flRow.querySelectorAll('td')).map(td => {
      const rect = td.getBoundingClientRect();
      return { text: td.textContent.trim(), mid: (rect.left + rect.right) / 2 };
    }) : [];

    const allCells = [...fCells, ...flCells];
    const rowMap = {};

    allCells.forEach(cell => {
      let closestHeader = null;
      let minDiff = Infinity;
      headers.forEach(header => {
        const diff = Math.abs(cell.mid - header.mid);
        if (diff < minDiff) {
          minDiff = diff;
          closestHeader = header;
        }
      });

      if (closestHeader && minDiff < 100) {
        rowMap[closestHeader.text] = cell.text;
      }
    });

    if (Object.keys(rowMap).length > 0) {
      scrapedRows.push(rowMap);
    }
  }
  return scrapedRows;
});
```

---

## 4. ag-Grid (New UI) Collapsible Filter Cards
In the New UI (PrimeNG), filters are organized inside accordion-style cards (`.filter-card`).
If a card is collapsed, the inputs inside it are either hidden or unrendered.

To robustly populate an input inside a card:
1. Scroll the filter card into view programmatically to avoid floating header overlay collisions.
2. Inspect the computed style of `.card-body` or inspect client heights.
3. If hidden (`display: none` or client height is $0$), click the `.card-header` to expand it.
4. Wait for the toggle transition (usually 500ms to 1500ms) before continuing.

---

## 5. ag-Grid Row/Cell Scraping Strategy
ag-Grid utilizes virtual scrolling, rendering only rows and cells currently in the viewport.
To harvest data robustly:
1. Locate header cells (`.ag-header-cell`). Map their `col-id` attributes to their text labels (`.ag-header-cell-text` or `[ref="eText"]`).
2. Fetch rows (`.ag-row`). For each row:
   - Retrieve its `row-index` attribute.
   - For each cell (`.ag-cell`):
     - Identify its `col-id` attribute.
     - Look up the associated header label using the mapped `col-id`.
     - Extract and trim the text content.
3. Reconstruct the record sorted by the parsed numeric `row-index`.
