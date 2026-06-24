import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global fetch interceptor to direct /api calls to the backend service in production
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const apiBase = import.meta.env.VITE_API_URL || '';
  if (typeof url === 'string' && url.startsWith('/api') && apiBase) {
    const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    return originalFetch(cleanBase + url, options);
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
