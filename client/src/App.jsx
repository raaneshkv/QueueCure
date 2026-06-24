import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

// Providers
import { SocketProvider } from './context/SocketContext.jsx';
import { QueueProvider } from './context/QueueContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import ClinicPage from './pages/ClinicPage.jsx';
import PatientPage from './pages/PatientPage.jsx';
import DisplayPage from './pages/DisplayPage.jsx';
import OwnerPage from './pages/OwnerPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

// Error boundary — prevents blank screens on render crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: '1rem',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', padding: '2rem', textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.75rem',
              background: 'var(--gradient-ocean)', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            ← Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SocketProvider>
          <QueueProvider>
            <LanguageProvider>
              <Toaster
                position="top-right"
                theme="dark"
                richColors
                toastOptions={{
                  style: {
                    background: 'rgba(10, 15, 35, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-body)',
                  },
                }}
              />

              {/* Ambient Background Orbs */}
              <div className="ambient-orb ambient-orb-1" />
              <div className="ambient-orb ambient-orb-2" />
              <div className="ambient-orb ambient-orb-3" />

              <Routes>
                {/* Landing — Role Selection Portal */}
                <Route path="/" element={<LandingPage />} />

                {/* Each role page manages its own header (RoleHeader) */}
                <Route path="/clinic/:clinicId" element={<ClinicPage />} />
                <Route path="/patient/:clinicId/:tokenId" element={<PatientPage />} />
                <Route path="/display/:clinicId" element={<DisplayPage />} />
                <Route path="/owner/:clinicId" element={<OwnerPage />} />
                <Route path="/settings/:clinicId" element={<SettingsPage />} />
              </Routes>
            </LanguageProvider>
          </QueueProvider>
        </SocketProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
