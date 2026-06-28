# Sahib Traders — React port

Faithful React + Vite port of the original `main.html` single-file app. Same
design, same logic, same localStorage keys (so existing saved bills /
uploaded rates carry over if you serve this from the same origin).

## Run

```bash
cd react-app
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production bundle
```

Requires Node 18+.

## Project layout

```
src/
  main.jsx              entry, mounts providers + <App/>
  App.jsx               composes TopBar / views / TabBar / overlays
  index.css             original CSS, copied verbatim

  data/
    rates.js            embedded RATES table (DEFAULT_RATES)
    shortforms.js       brand-shortform lookup (sah → SAHIL, etc.)

  lib/
    utils.js            fmt, fmt2, norm, normSize, escapeHtml, lev
    indexes.js          buildIndexes(rates) → { brands, brandIndex, brandArticles }
    parser.js           parseInput(): the shorthand parser
    storage.js          localStorage + calcTotals
    receipt.js          buildReceiptText() — 36-col plain-text receipt
    pdf.js              jsPDF receipt + Web Share API + clipboard
    excel.js            SheetJS file parsing + column auto-detect

  state/
    RatesContext.jsx    rates, meta, idx, applyNewRates, resetToDefault
    BillContext.jsx     bill state, totals, history, all CRUD + finalizeBill
    UIContext.jsx       active tab, modal, search-sheet, toast

  components/
    TopBar.jsx          title + meta + data-manager button
    TabBar.jsx          three-tab bottom nav
    views/              one component per tab
    bill/               Picker, BillCard, QuickBar, line-edit / discount /
                        gst / customer-name / done-bill modals
    shared/             Modal, SearchSheet, Toast, AskQtyModal,
                        DataManagerModal
```

## Notes

- All three views are mounted at all times (CSS toggles `display`) so picker
  selections, lookup query, etc. persist across tab switches — matches the
  original.
- Modal API: `showModal({ title, body, onOk?, hideOk?, extraButton? })`.
  `body` is a React node. Modals that need their own action buttons pass
  `hideOk: true` and render their own.
- `jspdf` and `xlsx` are now npm dependencies instead of CDN script tags.
