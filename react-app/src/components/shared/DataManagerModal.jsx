import { useRef, useState } from 'react';
import { useRates } from '../../state/RatesContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { readSheetFromFile, parseRateRows } from '../../lib/excel.js';
import { fmt } from '../../lib/utils.js';

/**
 * Three sub-screens:
 *   - 'home': show source/active counts + pick file / reset buttons
 *   - 'fatal': fatal parse error message
 *   - 'preview': preview parsed rows + REPLACE ALL action
 */
export default function DataManagerModal() {
  const { rates, meta, idx, mergeNewRates } = useRates();
  const { showToast, hideModal } = useUI();
  const [screen, setScreen] = useState({ kind: 'home' });
  const fileRef = useRef(null);

  const onFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const { json, headers } = await readSheetFromFile(file);
      if (!json.length) { showToast('Sheet is empty'); return; }
      const parsed = parseRateRows(json);
      if (parsed.fatal) {
        setScreen({ kind: 'fatal', message: parsed.fatal, headers });
        return;
      }
      if (parsed.rows.length === 0) { showToast('No valid rows found'); return; }
      setScreen({ kind: 'preview', parsed, fileName: file.name });
    } catch (err) {
      console.error('upload error', err);
      showToast('Could not read file');
    } finally {
      e.target.value = '';
    }
  };

  if (screen.kind === 'fatal') {
    return (
      <>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--bad)', margin: '0 0 8px' }}>
          {screen.message}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>
          Need columns: <strong>brand</strong>, <strong>size</strong>, <strong>rate</strong> (article optional).
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>
          Found: {screen.headers.join(' · ')}
        </p>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => setScreen({ kind: 'home' })} style={{ flex: 1 }}>BACK</button>
        </div>
      </>
    );
  }

  if (screen.kind === 'preview') {
    const { parsed, fileName } = screen;
    const sample = parsed.rows.slice(0, 6);

    const existingKeys = new Set(rates.map((r) => `${r.brand}|${r.article || ''}|${r.size}`));
    let willUpdate = 0;
    let willAdd = 0;
    for (const r of parsed.rows) {
      const k = `${r.brand}|${r.article || ''}|${r.size}`;
      if (existingKeys.has(k)) willUpdate++;
      else willAdd++;
    }

    const onMerge = async () => {
      const { okLocal, okRemote, added, updated } = await mergeNewRates(parsed.rows, fileName);
      if (!okLocal) showToast('Saved in memory (storage limit)');
      else if (!okRemote) showToast(`✓ ${added} added · ${updated} updated · ⚠ cloud sync failed`);
      else showToast(`✓ ${added} added · ${updated} updated · synced`);
      hideModal();
    };
    return (
      <>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <Card big={parsed.brands.size} label="brands" />
          <Card big={parsed.rows.length} label="items" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <Card big={willAdd} label="new" />
          <Card big={willUpdate} label="updated" />
        </div>
        {parsed.errors.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '9px 11px', marginBottom: 12, fontSize: 12, color: '#92400e', lineHeight: 1.4 }}>
            ⚠ {parsed.errors.length} row{parsed.errors.length > 1 ? 's' : ''} skipped (missing brand, size, or rate)
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
          Sample (first {sample.length})
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: '11.5px', overflow: 'hidden', marginBottom: 12 }}>
          {sample.map((r, i) => (
            <div
              key={i}
              style={{
                padding: '8px 10px',
                ...(i ? { borderTop: '1px dotted var(--line-soft)' } : {}),
                display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {r.brand}{r.article ? ' / ' + r.article : ''} · sz {r.size}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                ₹{Math.round(r.rate)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, background: 'rgba(196,69,28,0.06)', border: '1px solid rgba(196,69,28,0.25)', padding: '10px 11px', borderRadius: 8, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent)' }}>Add &amp; update</strong>: {willAdd} new item{willAdd === 1 ? '' : 's'} added, {willUpdate} existing item{willUpdate === 1 ? '' : 's'} updated. Other current items are kept.
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => setScreen({ kind: 'home' })}>BACK</button>
          <button
            className="btn"
            onClick={onMerge}
            style={{ flex: 1, background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)', fontWeight: 700 }}
          >
            ADD &amp; UPDATE
          </button>
        </div>
      </>
    );
  }

  // home screen
  const isCustom = !!meta;

  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 12px' }}>
        Upload an Excel or CSV file to add new items and update existing rates. Current items not in the file are kept.
      </p>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <Row label="Source" value={isCustom ? 'Uploaded sheet' : 'Built-in'} />
        {isCustom && (
          <>
            <Row label="File" value={meta.fileName || '—'} />
            <Row label="Updated" value={meta.date || '—'} />
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0 3px', borderTop: '1px dashed var(--line-soft)', marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Active</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            {idx.brands.length} brands · {rates.length} items
          </span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        Required columns
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg)', border: '1px dashed var(--line)', padding: 10, borderRadius: 8, marginBottom: 8, lineHeight: 1.7 }}>
        <strong>Brand</strong> · <strong>Article</strong> · <strong>Size</strong> · <strong>Rate</strong><br />
        <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
          column names case-insensitive · article can be empty · row 1 = headers
        </span>
      </div>

      <button
        className="btn primary"
        style={{ width: '100%', padding: 14, fontSize: 13 }}
        onClick={() => fileRef.current?.click()}
      >
        CHOOSE EXCEL / CSV FILE
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', gap: 10 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: label === 'Source' ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function Card({ big, label }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--accent)', lineHeight: 1 }}>
        {big}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
