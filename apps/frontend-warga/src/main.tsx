import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { WizardPage } from './pages/WizardPage.js';
import { PublicMapPage } from './pages/PublicMapPage.js';
import { useUser } from './lib/auth-store.js';
import { I18nProvider, useI18n, LanguageSwitcher } from './lib/i18n.js';

type View = 'dashboard' | 'wizard' | 'public-map' | 'login';

function App() {
  const { user } = useUser();
  const { t } = useI18n();
  const initialView: View =
    typeof window !== 'undefined' && window.location.pathname === '/peta-publik'
      ? 'public-map'
      : 'dashboard';
  const [view, setView] = useState<View>(initialView);

  // Floating language switcher (always visible)
  const langFab = (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 200 }}>
      <LanguageSwitcher />
    </div>
  );

  // Public map: accessible tanpa login
  if (view === 'public-map')
    return (
      <>
        {langFab}
        <PublicMapPage onClose={() => setView(user ? 'dashboard' : 'login')} />
      </>
    );

  if (!user) {
    return (
      <div>
        {langFab}
        <LoginPage />
        <div style={{ position: 'fixed', bottom: 16, right: 16 }}>
          <button
            onClick={() => setView('public-map')}
            style={{
              padding: '10px 20px',
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              color: '#1e3a8a',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {t('public_map.button')}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'wizard')
    return (
      <>
        {langFab}
        <WizardPage onDone={() => setView('dashboard')} />
      </>
    );
  return (
    <>
      {langFab}
      <DashboardPage />
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </React.StrictMode>,
  );
}
