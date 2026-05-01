import { useEffect, useMemo, useRef, useState } from 'react';
import { useUI } from '../../state/UIContext.jsx';
import { norm, escapeHtml } from '../../lib/utils.js';

/**
 * Bottom-sheet picker. Sheet config:
 *   {
 *     title, placeholder,
 *     options: [{ value, label, sub?, aside?: ReactNode|string }],
 *     onPick: (option) => void,   -- sheet auto-closes after onPick
 *   }
 */
export default function SearchSheet() {
  const { sheet, closeSearchSheet } = useUI();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setQ('');
    if (sheet) {
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [sheet]);

  const filtered = useMemo(() => {
    if (!sheet) return [];
    const Q = q.trim().toUpperCase();
    if (!Q) return sheet.options;
    return sheet.options
      .map((o) => {
        const lblU = norm(o.label);
        const valU = norm(o.value);
        let score = -1;
        if (lblU.startsWith(Q) || valU.startsWith(Q)) score = 0;
        else if (lblU.includes(Q) || valU.includes(Q)) score = 1;
        else if (o.sub && norm(o.sub).includes(Q)) score = 2;
        return { o, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.o);
  }, [sheet, q]);

  if (!sheet) return null;

  const onBgClick = (e) => {
    if (e.target === e.currentTarget) closeSearchSheet();
  };
  const pick = (opt) => {
    sheet.onPick(opt);
    closeSearchSheet();
  };

  return (
    <div className="search-sheet show" onClick={onBgClick}>
      <div className="search-sheet-inner">
        <div className="ss-header">
          <span className="ss-title">{sheet.title || 'Search'}</span>
          <button className="ss-close" onClick={closeSearchSheet} aria-label="close">×</button>
        </div>
        <div className="ss-search-wrap">
          <span className="ss-search-icon">⌕</span>
          <input
            ref={inputRef}
            className="ss-search"
            type="text"
            placeholder={sheet.placeholder || 'Type to search…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="search"
          />
        </div>
        <ul className="ss-list">
          {filtered.length === 0 ? (
            <li className="ss-empty">no matches</li>
          ) : (
            filtered.map((o, i) => (
              <li
                className="ss-item"
                key={i}
                onClick={() => pick(o)}
              >
                <div className="ss-item-main">
                  <div
                    className="ss-item-name"
                    dangerouslySetInnerHTML={{ __html: highlight(o.label, q) }}
                  />
                  {o.sub && (
                    <div
                      className="ss-item-sub"
                      dangerouslySetInnerHTML={{ __html: highlight(o.sub, q) }}
                    />
                  )}
                </div>
                {o.aside && (
                  <div
                    className="ss-item-aside"
                    dangerouslySetInnerHTML={{ __html: typeof o.aside === 'string' ? o.aside : '' }}
                  />
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function highlight(text, q) {
  if (!q) return escapeHtml(String(text));
  const t = String(text);
  const tU = t.toUpperCase();
  const qU = q.trim().toUpperCase();
  const idx = tU.indexOf(qU);
  if (idx < 0) return escapeHtml(t);
  return (
    escapeHtml(t.slice(0, idx)) +
    '<mark>' + escapeHtml(t.slice(idx, idx + qU.length)) + '</mark>' +
    escapeHtml(t.slice(idx + qU.length))
  );
}
