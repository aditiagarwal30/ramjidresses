import { useMemo, useState } from 'react';
import { useRates } from '../../state/RatesContext.jsx';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { parseInput, findRow } from '../../lib/parser.js';
import { fmt, fmt2, norm } from '../../lib/utils.js';
import AskQtyModal from '../shared/AskQtyModal.jsx';
import QuickBar from '../bill/QuickBar.jsx';

export default function LookupView({ active }) {
  const { rates, idx } = useRates();
  const { addLine } = useBill();
  const { showModal } = useUI();
  const [q, setQ] = useState('');

  const result = useMemo(() => {
    const trimmed = q.trim();
    if (!trimmed) return { kind: 'home' };
    const r = parseInput(trimmed, idx);
    if (r.kind === 'lookup') return { kind: 'rows', rows: r.rows };
    if (r.kind === 'item') return { kind: 'rows', rows: [r.row] };
    if (r.kind === 'partial') return { kind: 'rows', rows: r.rows, ctx: r.message };
    if (r.kind === 'manual') return { kind: 'manual', qty: r.qty, rate: r.rate };
    // error: try as plain substring across all
    const plain = trimmed.toUpperCase();
    const fuzzy = rates
      .filter((rr) =>
        rr.brand.includes(plain) ||
        norm(rr.article).includes(plain) ||
        norm(rr.size).includes(plain)
      )
      .slice(0, 60);
    return { kind: 'rows', rows: fuzzy };
  }, [q, rates, idx]);

  const askQty = (row) => {
    showModal({
      title: 'Add to bill',
      body: <AskQtyModal row={row} onConfirm={(qty) => addLine(row, qty)} />,
      hideOk: true,
    });
  };

  const onEnter = (e) => {
    if (e.key !== 'Enter') return;
    const r = parseInput(q.trim(), idx);
    if (r.kind === 'item') askQty(r.row);
  };

  const pickBrand = (b) => {
    setQ(b + ' ');
  };

  return (
    <section className={'view' + (active ? ' active' : '')}>
      <div className="searchwrap">
        <span className="search-icon">⌕</span>
        <input
          className="search"
          type="text"
          placeholder="Search brand, article, size…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onEnter}
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="search"
        />
        <button
          className={'search-clear' + (q ? ' show' : '')}
          aria-label="clear"
          onClick={() => setQ('')}
        >
          ×
        </button>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', color: 'var(--muted)',
        textTransform: 'uppercase', margin: '6px 2px 12px',
      }}>
        {idx.brands.length} brands · {rates.length} items
      </div>

      <QuickBar />

      <div className="chips">
        <span className="chip">type "sahil"</span>
        <span className="chip">"jalwa 1704"</span>
        <span className="chip accent">tap result → adds to bill</span>
      </div>

      {result.kind === 'home' && <BrandGrid onPick={pickBrand} />}
      {result.kind === 'rows' && (
        <ResultsGrouped rows={result.rows} ctx={result.ctx} idx={idx} onPick={askQty} />
      )}
      {result.kind === 'manual' && (
        <div className="empty">
          <div className="big">{fmt(result.qty * result.rate)}</div>
          <div>{result.qty} × {fmt(result.rate)} (manual)</div>
        </div>
      )}
    </section>
  );
}

function BrandGrid({ onPick }) {
  const { idx } = useRates();
  return (
    <>
      <div className="section-h">
        <span><em>Brands</em></span>
        <span className="count">{idx.brands.length}</span>
      </div>
      <div className="brand-grid">
        {idx.brands.map((b) => (
          <button key={b} className="brand-tile" onClick={() => onPick(b)}>
            {b}
            <span className="ct">{idx.brandIndex[b].length} items</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ResultsGrouped({ rows, ctx, idx, onPick }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="empty">
        <div className="big">Not in list</div>
        <div>nothing matches that — try a brand or size</div>
      </div>
    );
  }
  const groups = {};
  rows.forEach((r) => {
    const k = r.brand + '|' + r.article;
    if (!groups[k]) groups[k] = { brand: r.brand, article: r.article, rows: [] };
    groups[k].rows.push(r);
  });

  return (
    <>
      <div className="section-h">
        <span><em>{rows.length === 1 ? '1 match' : rows.length + ' matches'}</em></span>
        {ctx && <span className="count">{ctx}</span>}
      </div>
      {Object.values(groups).map((g, gi) => (
        <ul className="results" key={gi}>
          {g.rows.map((r, i) => {
            const matched = findRow(r.brand, r.article, r.size, idx) || r;
            return (
              <li key={i} className="result" onClick={() => onPick(matched)}>
                <div className="result-info">
                  <div className="result-brand">
                    {g.brand}
                    {g.article && (
                      <>
                        {' '}
                        <span style={{ color: 'var(--muted)', fontWeight: 500 }}>/ {g.article}</span>
                      </>
                    )}
                  </div>
                  <div className="result-detail">SIZE {r.size}</div>
                </div>
                <div className="result-rate">
                  <span className="rs">₹</span>{fmt2(r.rate)}
                </div>
              </li>
            );
          })}
        </ul>
      ))}
    </>
  );
}
