import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../context/QueueContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { Clock, Users, Activity, Wifi, Monitor, ChevronRight, Armchair, Folder, QrCode } from 'lucide-react';

export default function DisplayPage() {
  const { clinicId } = useParams();
  const {
    clinic,
    activeToken,
    waitingTokens,
    etaSummary,
    fetchQueueSnapshot
  } = useQueue();
  const { isConnected, isReconnecting } = useSocket();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load and refresh snapshot
  useEffect(() => {
    fetchQueueSnapshot(clinicId);

    // Auto-refresh snapshot every 20 seconds as fallback in case socket disconnects
    const fallback = setInterval(() => {
      fetchQueueSnapshot(clinicId);
    }, 20000);

    return () => clearInterval(fallback);
  }, [clinicId, fetchQueueSnapshot]);

  // Formatted clock details
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <>
      {/* Offline Reconnect Banner */}
      {isReconnecting && (
        <div style={{ background: 'var(--rose-gradient)', color: '#fff', textAlign: 'center', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 100, position: 'sticky', top: 0, boxShadow: '0 4px 15px rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <Wifi size={16} className="pulse-glow" /> Reconnecting to live updates...
        </div>
      )}
      {!isReconnecting && isConnected && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-safe)', textAlign: 'center', padding: '0.35rem', fontSize: '0.75rem', zIndex: 100, borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-safe)' }} className="pulse-glow" /> Real-time Synced
        </div>
      )}

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        padding: '3rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        color: '#ffffff',
        position: 'relative'
      }}>
      {/* Premium Ambient Background */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34, 211, 238, 0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(80px)' }} className="animate-float" />
      <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(80px)', animationDelay: '3s' }} className="animate-float" />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(100px)', transform: 'translate(-50%, -50%)' }} className="animate-breathe" />

      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        paddingBottom: '2rem',
        marginBottom: '2.5rem',
        zIndex: 10
      }} className="animate-fade-in-up">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Monitor size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700 }}>Public Display Board</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{clinic?.clinicName || 'QueueCure Clinic'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} />
            Attending: <strong style={{ color: 'var(--text-primary)' }}>{clinic?.doctorName}</strong>
          </p>
        </div>

        {/* Real-time Clock Widget */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-primary)' }}>{timeString}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{dateString}</div>
          </div>

          <div className="divider-vertical" style={{ height: '50px' }} />

          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Queue Status</span>
            {clinic?.queueStatus === 'paused' ? (
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-next)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <span className="pulse-glow" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-next)' }} />
                PAUSED — {clinic.pauseReason}
              </span>
            ) : (
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-safe)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <span className="pulse-neon" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-safe)' }} />
                ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Callboard & Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '3rem', flex: 1, zIndex: 10 }}>

        {/* Left Side: Now Serving Callboard */}
        <div className="glass-card animate-fade-in-up stagger-1" style={{
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'rgba(5, 8, 22, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '5px', textTransform: 'uppercase' }}>Now Serving</span>

          {activeToken ? (
            <div style={{ marginTop: '2.5rem', width: '100%' }}>
              <div style={{
                background: 'var(--gradient-ocean)',
                borderRadius: 'var(--radius-xl)',
                padding: '3rem 6rem',
                display: 'inline-block',
                boxShadow: '0 20px 60px rgba(34, 211, 238, 0.25), 0 0 100px rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Shimmer overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
                  animation: 'shimmer 3s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
                <span className="text-3d-cyan font-mono" style={{ fontSize: 'clamp(6rem, 12vw, 13rem)', fontWeight: 900, color: '#ffffff', lineHeight: 0.95 }}>{activeToken.tokenNumber}</span>
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '3rem', color: 'var(--text-primary)' }}>Please enter the consultation room</h3>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Patient: <strong style={{ color: 'var(--text-primary)' }}>{activeToken.patientName}</strong>
              </p>
            </div>
          ) : (
            <div style={{ padding: '5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <Armchair size={80} color="var(--text-ghost)" strokeWidth={1} />
              <h3 style={{ fontSize: '2.2rem', color: 'var(--text-muted)', fontWeight: 800 }}>Queue Idle</h3>
              <p style={{ color: 'var(--text-ghost)', fontSize: '1.2rem', maxWidth: '380px' }}>Waiting for the next patient token to be called.</p>
            </div>
          )}
        </div>

        {/* Right Side: Next Up list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in-up stagger-2">

          {/* Waiting List Board */}
          <div className="glass-card" style={{
            background: 'rgba(5, 8, 22, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            padding: '2rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} />
              Next Up in Queue
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {waitingTokens.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-ghost)' }}>
                  <Folder size={40} strokeWidth={1} />
                  <p style={{ fontSize: '1.1rem' }}>No patients waiting.</p>
                </div>
              ) : (
                waitingTokens.slice(0, 4).map((token, idx) => (
                  <div key={token._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: idx === 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.015)',
                    border: idx === 0 ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                    padding: '1.25rem 1.75rem',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: idx === 0 ? '0 8px 25px rgba(99, 102, 241, 0.08)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }} className="table-row-enter">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <span className={`font-mono ${idx === 0 ? 'text-3d-indigo' : ''}`} style={{
                        fontSize: '2.2rem',
                        fontWeight: 900,
                        color: idx === 0 ? 'var(--accent-violet)' : 'var(--text-primary)',
                      }}>{token.tokenNumber}</span>
                      <div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Token {token.tokenNumber}</span>
                        {idx === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--color-returning)', display: 'block', fontWeight: 800, letterSpacing: '1px', marginTop: '0.1rem', textTransform: 'uppercase' }}>Prepare for visit</span>}
                      </div>
                    </div>
                    <span className="font-mono" style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: idx === 0 ? 'var(--color-returning)' : 'var(--text-muted)',
                    }}>
                      ~{token.estimatedWait}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(5, 8, 22, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Avg Consultation</span>
              </div>
              <strong className="font-mono" style={{ fontSize: '2.5rem', color: 'var(--accent-cyan)', display: 'block', fontWeight: 900 }}>
                {etaSummary?.averageConsultationTime || 8} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>min</span>
              </strong>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(5, 8, 22, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Activity size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Queue Load</span>
              </div>
              <strong className="font-mono" style={{
                fontSize: '2rem',
                color: etaSummary?.loadLevel === 'LIGHT' ? 'var(--color-safe)' : etaSummary?.loadLevel === 'MODERATE' ? 'var(--color-nearby)' : 'var(--color-returning)',
                display: 'block',
                fontWeight: 900,
              }}>
                {etaSummary?.loadLevel || 'LIGHT'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: '1.5rem',
        marginTop: '2rem',
        fontSize: '1rem',
        color: 'var(--text-ghost)',
        zIndex: 10,
      }} className="animate-fade-in-up stagger-3">
        <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QrCode size={18} />
          Track live on your mobile — scan QR at reception
        </span>
        <span style={{ fontWeight: 600, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wifi size={14} />
          QueueCure SmartReturn
        </span>
      </div>
    </div>
  </>);
}
