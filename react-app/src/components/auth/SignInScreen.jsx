import { useState } from 'react';
import { useAuth } from '../../state/AuthContext.jsx';

export default function SignInScreen() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <div style={wrap}>
        <div style={card}>
          <h1 style={title}>Ramji<span style={{ color: 'var(--accent)' }}>.</span> <em style={{ fontSize: '0.7em', opacity: 0.65 }}>dresses</em></h1>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
            Cloud sync is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e2) {
      setErr(e2.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={card}>
        <h1 style={title}>
          Ramji<span style={{ color: 'var(--accent)' }}>.</span> <em style={{ fontSize: '0.7em', opacity: 0.65 }}>dresses</em>
        </h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
          Staff sign in
        </div>
        <label style={label}>Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <label style={label}>Password</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />
        {err && <div style={errBox}>{err}</div>}
        <button type="submit" className="btn primary" disabled={busy} style={{ width: '100%', padding: 14, marginTop: 14, fontSize: 13 }}>
          {busy ? 'Signing in…' : 'SIGN IN'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
          Accounts are created by the shop admin in the Supabase dashboard.
        </p>
      </form>
    </div>
  );
}

const wrap = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, background: 'var(--bg)',
};
const card = {
  width: '100%', maxWidth: 360, background: 'var(--paper)',
  border: '1px solid var(--line)', borderRadius: 12, padding: 22,
};
const title = { margin: '0 0 14px', fontSize: 24 };
const label = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase',
  marginTop: 10, marginBottom: 4,
};
const input = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const errBox = {
  marginTop: 12, padding: '8px 10px', fontSize: 12, lineHeight: 1.4,
  background: 'rgba(196,69,28,0.08)', border: '1px solid rgba(196,69,28,0.3)',
  borderRadius: 8, color: 'var(--bad, #c4451c)',
};
