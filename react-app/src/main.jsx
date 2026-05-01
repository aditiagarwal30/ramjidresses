import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { RatesProvider } from './state/RatesContext.jsx';
import { BillProvider } from './state/BillContext.jsx';
import { UIProvider } from './state/UIContext.jsx';
import { AuthProvider, useAuth } from './state/AuthContext.jsx';
import SignInScreen from './components/auth/SignInScreen.jsx';
import './index.css';

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
        LOADING…
      </div>
    );
  }
  if (!user) return <SignInScreen />;
  return (
    <RatesProvider>
      <BillProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </BillProvider>
    </RatesProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </React.StrictMode>
);
