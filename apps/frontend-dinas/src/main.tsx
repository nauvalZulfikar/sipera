import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminLoginPage } from './pages/AdminLoginPage.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { useUser } from './lib/auth-store.js';

function App() {
  const { user } = useUser();
  return user ? <AdminDashboard /> : <AdminLoginPage />;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
