import { useEffect, useMemo, useState } from 'react';
import { useRates } from '../../state/RatesContext.jsx';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { fmt, fmt2, norm } from '../../lib/utils.js';

export default function Picker() {
  const { idx } = useRates();
  const { addLine } = useBill();
  const { showToast, openSearchSheet } = useUI();

  // null means "not picked yet". article === '' means "this brand has no articles".
  const [brand, setBrand] = useState(null);
  const [article, setArticle] = useState(null);
  const [size, setSize] = useState(null);
  const [rate, setRate] = useState(null);
  const [qty, setQty] = useState(1);

  // When rates rebuild (e.g. after Excel upload), drop selections that no longer exist.
  useEffect(() => {
    if (brand && !idx.brandIndex[brand]) reset();
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setBrand(null);
    setArticle(null);
    setSize(null);
    setRate(null);
    setQty(1);
  };

  const softReset = () => {
    setSize(null);
    setRate(null);
    setQty(1);
    if (brand && article !== null) populateSizesAuto(brand, article);
  };

  const populateSizesAuto = (b, a) => {
    const rows = idx.brandIndex[b].filter((r) => norm(r.article) === norm(a));
    if (rows.length === 1) {
      setSize(rows[0].size);
      setRate(rows[0].rate);
    } else {
      setSize(null);
      setRate(null);
    }
  };

  const onPickBrand = () => {
    const options = idx.brands.map((b) => ({
      value: b,
      label: b,
      aside: `<span class="ct">${idx.brandIndex[b].length} items</span>`,
    }));
    openSearchSheet({
      title: 'Select Brand',
      placeholder: 'Type brand name…',
      options,
      onPick: (opt) => selectBrand(opt.value),
    });
  };

  const selectBrand = (b) => {
    setBrand(b);
    setSize(null);
    setRate(null);
    const arts = idx.brandArticles[b];
    if (arts.length === 1 && arts[0] === '') {
      setArticle('');
      populateSizesAuto(b, '');
    } else {
      setArticle(null);
    }
  };

  const onPickArticle = () => {
    if (!brand) return;
    const arts = idx.brandArticles[brand];
    const options = arts.map((a) => ({
      value: a,
      label: a || '(no article)',
      sub: a ? '' : 'items without article code',
    }));
    openSearchSheet({
      title: `Article — ${brand}`,
      placeholder: 'Type article code…',
      options,
      onPick: (opt) => selectArticle(opt.value),
    });
  };

  const selectArticle = (a) => {
    setArticle(a);
    setSize(null);
    setRate(null);
    populateSizesAuto(brand, a);
  };

  const onPickSize = () => {
    if (!brand || article === null) return;
    const rows = idx.brandIndex[brand].filter((r) => norm(r.article) === norm(article));
    const options = rows.map((r) => ({
      value: r.size,
      label: 'Size ' + r.size,
      rate: r.rate,
      aside: `<span class="rs">₹</span>${fmt2(r.rate)}`,
    }));
    openSearchSheet({
      title: `Size — ${brand}${article ? ' / ' + article : ''}`,
      placeholder: 'Type size…',
      options,
      onPick: (opt) => {
        setSize(opt.value);
        setRate(opt.rate);
      },
    });
  };

  const articleArts = brand ? idx.brandArticles[brand] : [];
  const articleAuto = brand && articleArts.length === 1 && articleArts[0] === '';
  const articleDisabled = !brand || articleAuto;
  const sizeDisabled = !brand || article === null;

  const brandLabel = brand || '— search brand —';
  const articleLabel = article === null
    ? (brand ? '— search article —' : '— pick brand first —')
    : (articleAuto ? '(no article)' : article || '(no article)');
  const sizeLabel = size
    ? `${size}  —  ${fmt(rate)}`
    : article === null
      ? '— pick article first —'
      : '— search size —';

  let rateAmt;
  if (rate != null) {
    const q = parseInt(qty, 10) || 1;
    rateAmt = (
      <>
        <span className="rs">₹</span>{fmt2(rate)}
        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13, marginLeft: 6 }}>
          × {q} = {fmt(rate * q)}
        </span>
      </>
    );
  } else if (!brand) rateAmt = '— pick brand to start —';
  else if (article === null) rateAmt = '— pick article —';
  else rateAmt = '— pick size —';

  const canAdd = rate != null;

  const onAdd = () => {
    if (!canAdd) return;
    const q = parseInt(qty, 10) || 1;
    const row = idx.brandIndex[brand].find(
      (r) => norm(r.article) === norm(article) && r.size === size
    );
    if (!row) return;
    addLine(row, q);
    showToast(`Added · ${row.brand}${row.article ? ' ' + row.article : ''} ${row.size ? 'sz ' + row.size : ''} × ${q}`);
    softReset();
  };

  return (
    <div className="picker">
      <div className="picker-title">
        <h2>Add item</h2>
        <span className="reset-link" onClick={reset}>↻ RESET</span>
      </div>

      <PickerRow label="Brand">
        <PTrigger filled={!!brand} disabled={false} onClick={onPickBrand} value={brand} placeholder={brandLabel} />
      </PickerRow>

      <PickerRow label="Article">
        <PTrigger
          filled={article !== null}
          disabled={articleDisabled}
          onClick={onPickArticle}
          value={article !== null ? articleLabel : null}
          placeholder={articleLabel}
        />
      </PickerRow>

      <PickerRow label="Size">
        <PTrigger
          filled={!!size}
          disabled={sizeDisabled}
          onClick={onPickSize}
          value={size ? sizeLabel : null}
          placeholder={sizeLabel}
        />
      </PickerRow>

      <div className="picker-rate-display">
        <span className="lbl">Rate</span>
        <span className={'amt' + (rate == null ? ' muted' : '')}>{rateAmt}</span>
      </div>

      <div className="picker-row">
        <label>Quantity</label>
        <div className="picker-bottom">
          <button
            className="qty-step"
            type="button"
            onClick={() => setQty((q) => Math.max(1, (parseInt(q, 10) || 1) - 1))}
          >
            −
          </button>
          <input
            className="qty-input"
            type="number"
            value={qty}
            min="1"
            inputMode="numeric"
            onChange={(e) => setQty(e.target.value)}
          />
          <button
            className="qty-step"
            type="button"
            onClick={() => setQty((q) => (parseInt(q, 10) || 0) + 1)}
          >
            +
          </button>
          <button className="add-now" disabled={!canAdd} onClick={onAdd}>
            ＋ ADD TO BILL
          </button>
        </div>
      </div>
    </div>
  );
}

function PickerRow({ label, children }) {
  return (
    <div className="picker-row">
      <label>{label}</label>
      {children}
    </div>
  );
}

function PTrigger({ filled, disabled, onClick, value, placeholder }) {
  const cls = ['ptrigger'];
  cls.push(value ? 'filled' : 'empty');
  return (
    <button
      type="button"
      className={cls.join(' ')}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ptrigger-val">{value || placeholder}</span>
      <span className="ptrigger-arrow">⌕</span>
    </button>
  );
}
