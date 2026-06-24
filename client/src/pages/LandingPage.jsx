import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ClipboardList, Stethoscope, BarChart3, Monitor, Settings, Zap,
  ArrowRight, Plus, KeyRound, X, Sparkles, Clock, QrCode, TrendingUp,
  Shield, Wifi, ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────
  const [createData, setCreateData] = useState({ clinicName: '', doctorName: '', clinicPin: '1234' });
  const [loginQuery, setLoginQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]); // list of clinics when multiple match
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  // ── Load saved clinics ────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('queuecure_my_clinics');
    if (saved) setClinics(JSON.parse(saved));
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createData.clinicName || !createData.doctorName || createData.clinicPin.length !== 4) {
      toast.error('Please fill in all fields correctly (PIN must be 4 digits)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const clinic = data.data;
        toast.success(`Clinic "${clinic.clinicName}" created successfully!`);
        const updated = [...clinics, { id: clinic._id, name: clinic.clinicName, doctor: clinic.doctorName }];
        setClinics(updated);
        localStorage.setItem('queuecure_my_clinics', JSON.stringify(updated));
        navigate(`/clinic/${clinic._id}`);
      } else {
        toast.error(data.message || 'Failed to create clinic');
      }
    } catch (err) {
      toast.error('Network error creating clinic');
    } finally {
      setLoading(false);
    }
  };

  // Navigate directly to a role page using a resolved clinic _id
  const goToRole = (clinicId, targetRole) => {
    const routeMap = {
      clinic: `/clinic/${clinicId}`,
      display: `/display/${clinicId}`,
      owner: `/owner/${clinicId}`,
      settings: `/settings/${clinicId}`,
    };
    if (routeMap[targetRole]) navigate(routeMap[targetRole]);
    else toast.error('Unknown role');
  };

  const handleLoginSubmit = async (e, targetRole) => {
    e.preventDefault();
    const query = loginQuery.trim();
    if (!query) {
      toast.error('Please enter the clinic name');
      return;
    }
    setLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/clinic/lookup?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.status !== 'success' || data.data.length === 0) {
        toast.error('No clinic found with that name. Check the spelling and try again.');
        return;
      }
      if (data.data.length === 1) {
        // Exact single match — go straight in
        goToRole(data.data[0]._id, targetRole);
      } else {
        // Multiple matches — show picker
        setSearchResults(data.data);
      }
    } catch (err) {
      toast.error('Error searching for clinic');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    try {
      const clinicRes = await fetch('/api/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName: 'Sri Care Clinic', doctorName: 'Dr. Ramesh Kumar', clinicPin: '1234' }),
      });
      const clinicData = await clinicRes.json();
      if (clinicData.status !== 'success') throw new Error(clinicData.message || 'Clinic creation failed');

      const clinic = clinicData.data;
      const samplePatients = [
        { patientName: 'Amit Sharma', phone: '9876543210', visitType: 'general' },
        { patientName: 'Priya Patel', phone: '9876543211', visitType: 'followup' },
        { patientName: 'Ravi Teja', phone: '9876543212', visitType: 'report' },
        { patientName: 'Karthik Raja', phone: '9876543213', visitType: 'emergency', priorityReason: 'Chest pain' },
        { patientName: 'Meera Nair', phone: '9876543214', visitType: 'vaccination' },
      ];

      for (const p of samplePatients) {
        await fetch(`/api/queue/${clinic._id}/patient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      }

      toast.success('Demo clinic ready with 5 pre-seeded patients!');
      const updated = [...clinics, { id: clinic._id, name: clinic.clinicName, doctor: clinic.doctorName }];
      setClinics(updated);
      localStorage.setItem('queuecure_my_clinics', JSON.stringify(updated));
      navigate(`/clinic/${clinic._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to initialize demo');
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (panel) => {
    setLoginQuery('');
    setSearchResults([]);
    setActivePanel(panel);
  };

  // ── Role Card Data ────────────────────────────────────────
  const roleCards = [
    {
      id: 'create',
      icon: Plus,
      title: 'Create Clinic',
      desc: 'Register a new clinic session and start issuing digital tokens instantly.',
      accentColor: '#22d3ee',
      gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
    },
    {
      id: 'clinic',
      icon: ClipboardList,
      title: 'Clinic Console',
      desc: 'Queue management, patient registration, token calling, and live controls.',
      accentColor: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    },
    {
      id: 'owner',
      icon: BarChart3,
      title: 'Owner Analytics',
      desc: 'Operational dashboards — hourly trends, visit distribution, and doctor efficiency.',
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    },
    {
      id: 'display',
      icon: Monitor,
      title: 'Public Display',
      desc: 'Full-screen waiting room board for TV/monitor — shows current & next tokens.',
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    },
    {
      id: 'demo',
      icon: Zap,
      title: 'Quick Demo',
      desc: 'Launch a pre-configured clinic with 5 sample patients to explore all features.',
      accentColor: '#f43f5e',
      gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    },
  ];

  // ── Panel config ─────────────────────────────────────────
  const panelLabel = {
    clinic: 'Clinic Console',
    owner: 'Owner Analytics',
    display: 'Public Display Board',
    settings: 'Clinic Settings',
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ═══ HERO SECTION ═══════════════════════════════════ */}
      <div className="container" style={{ maxWidth: '1100px', paddingTop: '4rem', paddingBottom: '1rem' }}>
        <div className="landing-hero animate-fade-in-up">

          {/* Logo */}
          <div className="landing-logo">
            <Sparkles size={36} color="#818cf8" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h1 className="text-gradient" style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            marginBottom: '0.75rem',
            lineHeight: 1.05,
          }}>
            QueueCure
          </h1>

          <p style={{
            fontSize: 'clamp(0.9rem, 2vw, 1.15rem)',
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
            fontWeight: 500,
          }} className="animate-fade-in-up stagger-1">
            Real-time clinic queue intelligence — replace paper tokens, reduce crowding, and predict wait times with precision.
          </p>

          {/* Feature Pills */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }} className="animate-fade-in-up stagger-2">
            <div className="feature-pill">
              <Clock size={14} />
              SmartReturn ETA
            </div>
            <div className="feature-pill">
              <QrCode size={14} />
              QR Live Tracking
            </div>
            <div className="feature-pill">
              <TrendingUp size={14} />
              Practice Analytics
            </div>
            <div className="feature-pill">
              <Wifi size={14} />
              Real-time Sync
            </div>
          </div>
        </div>

        {/* ═══ ROLE SELECTION GRID ═══════════════════════════ */}
        <div style={{ marginTop: '3.5rem' }}>
          <p style={{
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700,
            marginBottom: '1.5rem',
          }} className="animate-fade-in-up stagger-3">
            Select your role to continue
          </p>

          <div className="role-grid animate-fade-in-up stagger-3">
            {roleCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="role-card"
                  style={{
                    '--card-accent': card.gradient,
                    '--card-glow': `0 0 40px ${card.accentColor}15`,
                    '--card-icon-bg': `${card.accentColor}12`,
                    '--card-icon-border': `${card.accentColor}20`,
                    '--card-icon-color': card.accentColor,
                    '--card-icon-glow': `${card.accentColor}30`,
                    animationDelay: `${0.3 + idx * 0.07}s`,
                  }}
                  onClick={() => {
                    if (card.id === 'demo') {
                      handleQuickDemo();
                    } else {
                      openPanel(card.id);
                    }
                  }}
                >
                  <div className="role-card-icon">
                    <Icon size={24} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      marginBottom: '0.35rem',
                      letterSpacing: '-0.01em',
                    }}>
                      {card.title}
                    </h3>
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: 0,
                    }}>
                      {card.desc}
                    </p>
                  </div>
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: card.accentColor,
                    opacity: 0.8,
                  }}>
                    {card.id === 'demo' ? 'Launch instantly' : card.id === 'create' ? 'Get started' : 'Sign in'}
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ SAVED CLINICS ═════════════════════════════════ */}
        {clinics.length > 0 && (
          <div className="glass-card animate-fade-in-up" style={{ marginTop: '3rem', maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Shield size={14} />
              Your Registered Clinics
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {clinics.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    navigate(`/clinic/${c.id}`);
                    toast.info(`Entering: ${c.name}`);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                >
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.name}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.doctor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FOOTER ════════════════════════════════════════ */}
        <div style={{
          textAlign: 'center',
          marginTop: '4rem',
          paddingBottom: '2rem',
          fontSize: '0.75rem',
          color: 'var(--text-ghost)',
          fontWeight: 500,
        }} className="animate-fade-in-up stagger-5">
          <p>Built with precision for modern clinic operations</p>
          <p style={{ marginTop: '0.25rem', opacity: 0.6 }}>QueueCure SmartReturn v3.0</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LOGIN / CREATE PANELS — Slide-up Modals
          ═══════════════════════════════════════════════════════ */}

      {/* CREATE CLINIC PANEL */}
      {activePanel === 'create' && (
        <div className="login-panel" onClick={() => setActivePanel(null)}>
          <div className="login-panel-content" onClick={(e) => e.stopPropagation()}>
            <div className="login-panel-handle" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={20} color="#22d3ee" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create New Clinic</h3>
              </div>
              <button onClick={() => setActivePanel(null)} className="btn btn-ghost" style={{ minHeight: 'auto', padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Clinic Name</label>
                <input type="text" placeholder="Sri Care Clinic" value={createData.clinicName} onChange={(e) => setCreateData({ ...createData, clinicName: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Doctor Name</label>
                <input type="text" placeholder="Dr. Ramesh Kumar" value={createData.doctorName} onChange={(e) => setCreateData({ ...createData, doctorName: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin PIN (4 Digits)</label>
                <input type="text" placeholder="1234" maxLength={4} value={createData.clinicPin} onChange={(e) => setCreateData({ ...createData, clinicPin: e.target.value })} required style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.3em' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                {loading ? 'Creating...' : 'Create Clinic Session'}
                <ChevronRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROLE LOGIN PANELS (Receptionist, Doctor, Owner, Display, Settings) */}
      {activePanel && activePanel !== 'create' && activePanel !== 'demo' && (
        <div className="login-panel" onClick={() => setActivePanel(null)}>
          <div className="login-panel-content" onClick={(e) => e.stopPropagation()}>
            <div className="login-panel-handle" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <KeyRound size={20} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {panelLabel[activePanel] || 'Access Portal'}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Enter clinic credentials to continue
                  </p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="btn btn-ghost" style={{ minHeight: 'auto', padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleLoginSubmit(e, activePanel)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Clinic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Care Clinic"
                  value={loginQuery}
                  onChange={(e) => { setLoginQuery(e.target.value); setSearchResults([]); }}
                  required
                  autoComplete="off"
                />
              </div>

              {/* Multiple match picker */}
              {searchResults.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Multiple clinics found — select one:</p>
                  {searchResults.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => goToRole(c._id, activePanel)}
                      className="btn btn-secondary"
                      style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.7rem 1rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.clinicName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{c.doctorName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem', width: '100%' }} disabled={loading}>
                {loading ? 'Searching...' : `Find & Enter ${panelLabel[activePanel] || 'Dashboard'}`}
                <ChevronRight size={16} />
              </button>
            </form>

            {/* Quick Access: Saved clinics shortcut */}
            {clinics.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Quick access</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {clinics.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goToRole(c.id, activePanel)}
                      className="btn btn-ghost"
                      style={{ minHeight: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderRadius: 'var(--radius-full)' }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
