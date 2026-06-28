import { useBill } from '../state/BillContext.jsx';
import { useUI } from '../state/UIContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import DataManagerModal from './shared/DataManagerModal.jsx';

const SYNC_LABEL = {
  idle: { text: '·', color: 'var(--muted)' },
  syncing: { text: '↻ syncing', color: 'var(--muted)' },
  synced: { text: '✓ synced', color: '#16a34a' },
  offline: { text: '⚠ offline', color: '#b45309' },
  error: { text: '⚠ sync error', color: '#c4451c' },
};

export default function TopBar() {
  const { syncStatus, pendingCount } = useBill();
  const { showModal } = useUI();
  const { user, signOut } = useAuth();

  const openDataMgr = () => {
    showModal({
      title: 'Rate Data',
      hideOk: true,
      body: <DataManagerModal />,
    });
  };

  const sync = SYNC_LABEL[syncStatus] || SYNC_LABEL.idle;
  const syncText = pendingCount > 0 ? `⚠ ${pendingCount} unsaved` : sync.text;
  const syncColor = pendingCount > 0 ? '#c4451c' : sync.color;

  const onSignOut = async () => {
    if (!window.confirm('Sign out?')) return;
    await signOut();
  };

  return (
    <header className="topbar">
      <h1>Sahib<span className="dot">.</span> <em style={{ fontSize: '0.7em', opacity: 0.65 }}>traders</em></h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          title={user?.email ? `Signed in as ${user.email}` : ''}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
            color: syncColor,
          }}
        >
          {syncText}
        </span>
        <button
          aria-label="Update rate sheet"
          title="Upload Excel / CSV"
          onClick={openDataMgr}
          style={{
            background: 'var(--paper)', border: '1px solid var(--line)',
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, color: 'var(--ink-soft)',
            flexShrink: 0, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
        <button
          aria-label="Sign out"
          title={user?.email ? `Sign out (${user.email})` : 'Sign out'}
          onClick={onSignOut}
          style={{
            background: 'var(--accent)', border: 'none',
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            color: 'white', fontWeight: 700, fontSize: 13,
            fontFamily: 'var(--font-display, inherit)',
            flexShrink: 0, WebkitTapHighlightColor: 'transparent',
          }}
        >
          {(user?.email?.[0] || '?').toUpperCase()}
        </button>
      </div>
    </header>
  );
}
