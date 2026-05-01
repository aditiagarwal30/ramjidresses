import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const UIContext = createContext(null);

/**
 * Manages app-level transient UI:
 *   - active tab ('lookup' | 'bill' | 'history')
 *   - modal stack (one at a time)
 *   - bottom-sheet picker (one at a time)
 *   - toast
 */
export function UIProvider({ children }) {
  const [tab, setTab] = useState('lookup');

  // toast
  const [toast, setToast] = useState({ msg: '', show: false });
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg, ms = 1500) => {
    setToast({ msg, show: true });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, ms);
  }, []);

  // modal: caller provides a render function or { title, body, ... } config
  // We use config-style for rich modals (matches the original API).
  const [modal, setModal] = useState(null);
  const showModal = useCallback((cfg) => setModal(cfg), []);
  const hideModal = useCallback(() => setModal(null), []);

  // bottom-sheet picker
  const [sheet, setSheet] = useState(null);
  const openSearchSheet = useCallback((cfg) => setSheet(cfg), []);
  const closeSearchSheet = useCallback(() => setSheet(null), []);

  const value = useMemo(
    () => ({
      tab, setTab,
      toast, showToast,
      modal, showModal, hideModal,
      sheet, openSearchSheet, closeSearchSheet,
    }),
    [tab, toast, modal, sheet, showToast, showModal, hideModal, openSearchSheet, closeSearchSheet]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
