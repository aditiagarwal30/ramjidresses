import { useUI } from '../state/UIContext.jsx';
import { useBill } from '../state/BillContext.jsx';

const TABS = [
  { id: 'lookup', icon: '⌕', label: 'LOOKUP' },
  { id: 'bill', icon: '₹', label: 'BILL' },
  { id: 'history', icon: '≡', label: 'HISTORY' },
];

export default function TabBar() {
  const { tab, setTab } = useUI();
  const { state } = useBill();

  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={'tab' + (tab === t.id ? ' active' : '')}
          onClick={() => setTab(t.id)}
        >
          <span className="icon">{t.icon}</span>
          {t.label}
          {t.id === 'bill' && state.lines.length > 0 && (
            <span className="badge">{state.lines.length}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
