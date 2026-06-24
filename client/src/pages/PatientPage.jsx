import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getSmartReturnDetails } from '../utils/smartReturn.js';
import { addMinutes, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Activity,
  Globe,
  Wifi,
  Volume2,
  BellRing,
  ClipboardList
} from 'lucide-react';

export default function PatientPage() {
  const { clinicId, tokenId } = useParams();
  const { socket, isConnected, isReconnecting } = useSocket();
  const { lang, setLang, t } = useLanguage();

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);

  // Fetch token status (REST fallback / initial load)
  const fetchTokenStatus = async () => {
    try {
      const res = await fetch(`/api/queue/${clinicId}/token/${tokenId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setToken(data.data);
        setError(null);
      } else {
        throw new Error(data.message || 'Token not found');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch timeline events
  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/queue/${clinicId}/events?role=patient`);
      const data = await res.json();
      if (data.status === 'success') {
        setTimelineEvents(data.data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchTokenStatus();
    fetchEvents();
  }, [clinicId, tokenId]);

  // Join Room & Listen for Updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join_clinic', clinicId);

    // Refresh token state when queue updates
    const handleQueueUpdated = (snapshot) => {
      console.log('Socket update received on patient screen');
      fetchTokenStatus();
      fetchEvents();
    };

    socket.on('queue_updated', handleQueueUpdated);

    return () => {
      socket.off('queue_updated', handleQueueUpdated);
    };
  }, [socket, isConnected, clinicId, tokenId]);

  // Browser Notifications Request & Trigger
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Trigger notification on smart return milestones
  useEffect(() => {
    if (!token) return;
    
    const notifyUser = (message) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(token.clinicName || 'QueueCure SmartReturn', {
          body: message,
          icon: '🏥'
        });
      }
      toast.info(message);
    };

    if (token.tokensAhead === 2 && token.status === 'waiting') {
      notifyUser('Only 2 tokens ahead of you! Please start returning to the clinic.');
    } else if (token.tokensAhead === 1 && token.status === 'waiting') {
      notifyUser('You are next in line! Please stand near the consultation door.');
    } else if (token.status === 'active') {
      notifyUser('It is your turn! Please enter the consultation room.');
    }
  }, [token?.tokensAhead, token?.status]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1.25rem' }} className="pulse-glow">🏥</span>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t('refreshing')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="glass-card animate-scale-in" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h2 style={{ marginBottom: '0.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>{error}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>If you think this is a mistake, please check your receipt or consult the clinic receptionist.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
        <div className="glass-card animate-scale-in" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h2 style={{ marginBottom: '0.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Token Data Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>No token data was found for this tracking session.</p>
        </div>
      </div>
    );
  }

  const smartDetails = getSmartReturnDetails(token.tokensAhead, token.status);
  
  // Calculate return by time
  const estimatedWaitMin = token && typeof token.estimatedWait === 'number' && !isNaN(token.estimatedWait) ? token.estimatedWait : 0;
  const returnByTime = token?.status === 'waiting' 
    ? format(addMinutes(new Date(), estimatedWaitMin), 'hh:mm a')
    : '--';

  // SVG circular progress details
  const radius = 90;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const maxTokens = Math.max(5, (token.tokensAhead || 0) + 1);
  const progressPercent = token.status === 'active' ? 100 : Math.max(10, Math.min(100, ((maxTokens - (token.tokensAhead || 0)) / maxTokens) * 100));
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.12) 0%, var(--bg-primary) 85%)',
      paddingBottom: '5rem',
      position: 'relative'
    }} className="page-enter">
      
      {/* Offline Reconnect Banner */}
      {isReconnecting && (
        <div style={{ background: 'var(--rose-gradient)', color: '#fff', textAlign: 'center', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 100, position: 'sticky', top: 0, boxShadow: '0 4px 15px rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <Wifi size={16} className="pulse-glow" /> {t('reconnecting')}
        </div>
      )}
      {!isReconnecting && isConnected && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-safe)', textAlign: 'center', padding: '0.35rem', fontSize: '0.75rem', zIndex: 100, borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-safe)' }} className="pulse-glow" /> {t('synced')}
        </div>
      )}

      <div className="container" style={{ maxWidth: '480px', marginTop: '2rem' }}>
        
        {/* Header / Brand */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="animate-fade-in-up">
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>{token.clinicName}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consulting: <strong style={{ color: '#ffffff' }}>{token.doctorName}</strong></p>
          </div>

          {/* Lang Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', gap: '0.2rem' }}>
            <button
              onClick={() => setLang('en')}
              className="btn"
              style={{
                height: '26px', minHeight: 'auto', padding: '0 0.6rem', fontSize: '0.7rem',
                background: lang === 'en' ? 'var(--accent-gradient)' : 'transparent',
                color: lang === 'en' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                boxShadow: lang === 'en' ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none'
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ta')}
              className="btn"
              style={{
                height: '26px', minHeight: 'auto', padding: '0 0.6rem', fontSize: '0.7rem',
                background: lang === 'ta' ? 'var(--accent-gradient)' : 'transparent',
                color: lang === 'ta' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 'bold',
                borderRadius: '4px',
                border: 'none',
                boxShadow: lang === 'ta' ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none'
              }}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* 3D Circular Progress Card */}
        <div className="glass-card animate-fade-in-up stagger-1" style={{ 
          textAlign: 'center', 
          padding: '2.5rem 1.5rem', 
          marginBottom: '1.5rem', 
          border: `1px solid ${smartDetails.colorHex}4D`, 
          background: `radial-gradient(circle at top, ${smartDetails.bgGlow} 0%, var(--glass-bg) 100%)`,
          boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 25px ${smartDetails.colorHex}1A`
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>{t('yourToken')}</span>
          
          {/* Progress Ring with Inside Extruded Token Number */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg height={radius * 2} width={radius * 2} style={{ filter: `drop-shadow(0 0 12px ${smartDetails.colorHex}44)` }}>
                <circle
                  stroke="rgba(255, 255, 255, 0.03)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                <circle
                  stroke={smartDetails.colorVar}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset }}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="progress-ring__circle"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="text-3d-indigo" style={{ fontSize: '3.6rem', fontWeight: 900, color: '#ffffff', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{token.tokenNumber}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginTop: '0.2rem' }}>Ticket ID</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <span>{t('currentlySeeing')}:</span>
            <strong style={{ color: 'var(--color-enter)', fontSize: '1rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>Token {token.activeTokenNumber || '--'}</strong>
          </div>
        </div>

        {/* SmartReturn Advice Banner */}
        <div className="glass-card animate-fade-in-up stagger-2" style={{ 
          padding: '1.5rem', 
          marginBottom: '1.5rem', 
          borderLeft: `4px solid ${smartDetails.colorVar}`, 
          background: `linear-gradient(90deg, ${smartDetails.bgGlow} 0%, rgba(17, 24, 44, 0.4) 100%)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }} role="alert">
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2.5rem', filter: `drop-shadow(0 0 10px ${smartDetails.colorVar})`, display: 'inline-flex' }}>{smartDetails.icon}</span>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>{t('status')}</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0.1rem 0 0.3rem 0', letterSpacing: '-0.01em' }}>{t(smartDetails.statusKey)}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{smartDetails.description}</p>
            </div>
          </div>
        </div>

        {/* Wait Metrics Grid */}
        {token.status === 'waiting' && (
          <div className="grid-cols-12 animate-fade-in-up stagger-3" style={{ marginBottom: '1.5rem' }}>
            <div className="col-span-6 glass-card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(15,21,36,0.45)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><Users size={12} /> {t('tokensAhead')}</span>
              <strong style={{ fontSize: '2.2rem', color: 'var(--color-enter)', fontFamily: 'var(--font-mono)' }}>{token.tokensAhead}</strong>
            </div>

            <div className="col-span-6 glass-card" style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(15,21,36,0.45)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}><Clock size={12} /> {t('estimatedWait')}</span>
              <strong style={{ fontSize: '2rem', color: 'var(--color-returning)', fontFamily: 'var(--font-mono)' }}>~{token.estimatedWait} <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>min</span></strong>
            </div>

            <div className="col-span-12 glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16} color="var(--accent-secondary)" /> {t('returnBy')}:</span>
              <strong style={{ fontSize: '1.3rem', color: '#ffffff', textShadow: '0 0 10px rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>{returnByTime}</strong>
            </div>
          </div>
        )}

        {/* Public Timeline Section */}
        <div className="glass-card animate-fade-in-up stagger-4">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="var(--color-enter)" /> {t('timeline')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {timelineEvents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>Waiting for clinic updates...</p>
            ) : (
              timelineEvents.map((evt, idx) => (
                <div key={evt._id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                  <span style={{ lineHeight: '1.4' }}>• {evt.message}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    {evt.createdAt ? format(new Date(evt.createdAt), 'hh:mm a') : '--:--'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
