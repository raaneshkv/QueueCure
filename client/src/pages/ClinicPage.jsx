import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../context/QueueContext.jsx';
import { getSmartReturnDetails } from '../utils/smartReturn.js';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import RoleHeader from '../components/RoleHeader.jsx';
import {
  ClipboardList,
  Users,
  CheckCircle,
  Clock,
  SkipForward,
  UserPlus,
  Search,
  X,
  QrCode,
  Send,
  Link2,
  Pause,
  Play,
  Undo2,
  Phone,
  AlertTriangle,
  Filter,
  Stethoscope,
  Hash,
  Building2,
  Megaphone,
  Armchair,
  Trash2
} from 'lucide-react';

export default function ClinicPage() {
  const { clinicId } = useParams();
  const {
    clinic,
    activeToken,
    waitingTokens,
    completedCount,
    skippedCount,
    totalWaiting,
    etaSummary,
    events,
    fetchQueueSnapshot,
    addPatient,
    callNext,
    completeCurrent,
    skipToken,
    rejoinToken,
    cancelToken,
    pauseQueue,
    resumeQueue,
    undoLastAction
  } = useQueue();

  // Form State
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [visitType, setVisitType] = useState('general');
  const [priorityReason, setPriorityReason] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  
  // Modals & Interactivity State
  const [showQrModal, setShowQrModal] = useState(null); // stores token object for QR
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('Doctor Break');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isActionDisabled, setIsActionDisabled] = useState(false); // Call next double-click prevention
  
  // Timer State for active consultation
  const [elapsedTime, setElapsedTime] = useState('00:00');
  
  const nameInputRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchQueueSnapshot(clinicId);
  }, [clinicId, fetchQueueSnapshot]);

  // Handle active consultation timer
  useEffect(() => {
    let interval = null;
    if (activeToken && activeToken.calledAt) {
      const updateTimer = () => {
        const diffMs = new Date() - new Date(activeToken.calledAt);
        const diffSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(diffSecs / 60).toString().padStart(2, '0');
        const secs = (diffSecs % 60).toString().padStart(2, '0');
        setElapsedTime(`${mins}:${secs}`);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00');
    }
    return () => clearInterval(interval);
  }, [activeToken]);

  // Handle live search
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/queue/${clinicId}/search?q=${searchQuery}`);
        const data = await res.json();
        if (data.status === 'success') {
          setSearchResults(data.data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, clinicId]);

  // Add Patient Form Submit
  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (visitType === 'emergency' && !priorityReason.trim()) {
      toast.error('Priority reason is required for emergencies');
      return;
    }

    setIsSubmitLoading(true);
    try {
      // Check for duplicates by phone in current waiting tokens
      if (phone && waitingTokens.some(t => t.phone === phone && t.status === 'waiting')) {
        const confirmAdd = window.confirm(`A patient with phone number ${phone} is already waiting. Add anyway?`);
        if (!confirmAdd) {
          setIsSubmitLoading(false);
          return;
        }
      }

      await addPatient(clinicId, {
        patientName,
        phone,
        visitType,
        priorityReason: visitType === 'emergency' ? priorityReason : '',
      });

      // Clear form & auto-focus back to Name field
      setPatientName('');
      setPhone('');
      setVisitType('general');
      setPriorityReason('');
      if (nameInputRef.current) nameInputRef.current.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Safe Call Next (with double click protection)
  const handleCallNextSafe = async () => {
    if (isActionDisabled) return;
    setIsActionDisabled(true);
    
    try {
      await callNext(clinicId);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsActionDisabled(false), 1200); // 1.2s cooldown
    }
  };

  // Pause Dialog Trigger
  const handlePauseQueueConfirm = async () => {
    await pauseQueue(clinicId, pauseReason);
    setShowPauseModal(false);
  };

  // Helper: Get Patient URL
  const getPatientUrl = (tokenId) => {
    return `${window.location.origin}/patient/${clinicId}/${tokenId}`;
  };

  // Share via WhatsApp deep-link
  const shareWhatsApp = (token) => {
    const message = `🏥 Sri Care Clinic Token Alert!\n\nToken Number: ${token.tokenNumber}\nStatus: ${token.status}\n\nTrack your live wait time here:\n${getPatientUrl(token._id)}`;
    const url = `https://wa.me/91${token.phone || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const copyPatientLink = (tokenId) => {
    navigator.clipboard.writeText(getPatientUrl(tokenId));
    toast.success('Live tracker link copied to clipboard!');
  };

  // Determine grid render source
  const activeGridList = searchQuery ? searchResults : waitingTokens;
  const filteredGridList = statusFilter === 'all' 
    ? activeGridList 
    : activeGridList.filter(t => t.status === statusFilter || (statusFilter === 'emergency' && t.visitType === 'emergency'));

  return (
    <div style={{ minHeight: '100vh' }} className="page-enter">
      <RoleHeader roleName="Clinic Console" roleIcon={ClipboardList} clinicName={clinic?.clinicName} clinicId={clinicId} />
      
      <div className="container" style={{ paddingBottom: '5rem', marginTop: '2rem' }}>
        
        {/* Clinic Header Banner */}
        <div className="glass-card animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gradient-ocean)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
            }}>
              <Building2 size={24} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Active Clinic Session</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.1rem 0', letterSpacing: '-0.03em' }}>{clinic?.clinicName || 'Sri Care Clinic'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Primary Physician: <strong style={{ color: '#ffffff' }}>{clinic?.doctorName}</strong></p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            {/* Pause Status Indicator */}
            {clinic?.queueStatus === 'paused' ? (
              <div className="pulse-glow" style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--color-next)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-next)' }}></span>
                <span style={{ color: 'var(--color-next)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAUSED: {clinic.pauseReason}</span>
              </div>
            ) : (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--color-safe)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-safe)' }}></span>
                <span style={{ color: 'var(--color-safe)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE RUNNING</span>
              </div>
            )}

            {/* Queue Load Badge */}
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Queue Load</span>
              <span style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: etaSummary.loadLevel === 'LIGHT' ? 'var(--color-safe)' : etaSummary.loadLevel === 'MODERATE' ? 'var(--color-nearby)' : 'var(--color-returning)'
              }}>
                {etaSummary.loadLevel} ({totalWaiting} Waiting)
              </span>
            </div>
          </div>
        </div>

        {/* STATS METRIC ROW */}
        <div className="grid-cols-12 animate-fade-in-up stagger-1" style={{ marginBottom: '2.5rem' }}>
          <div className="col-span-3 glass-card glow-card-indigo" style={{ padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ color: 'var(--color-enter)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <Users size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Waiting Count</span>
              <strong style={{ fontSize: '2.2rem', color: 'var(--color-enter)', fontFamily: 'var(--font-mono)' }}>{totalWaiting}</strong>
            </div>
          </div>
          <div className="col-span-3 glass-card glow-card-emerald" style={{ padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ color: 'var(--color-safe)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Served Today</span>
              <strong style={{ fontSize: '2.2rem', color: 'var(--color-safe)', fontFamily: 'var(--font-mono)' }}>{completedCount}</strong>
            </div>
          </div>
          <div className="col-span-3 glass-card glow-card-amber" style={{ padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ color: 'var(--color-nearby)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <Clock size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Avg Consultation</span>
              <strong style={{ fontSize: '2.2rem', color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
                {etaSummary.averageConsultationTime} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>min</span>
              </strong>
            </div>
          </div>
          <div className="col-span-3 glass-card glow-card-cyan" style={{ padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ color: 'var(--color-returning)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <SkipForward size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Skipped Today</span>
              <strong style={{ fontSize: '2.2rem', color: 'var(--color-returning)', fontFamily: 'var(--font-mono)' }}>{skippedCount}</strong>
            </div>
          </div>
        </div>

        <div className="grid-cols-12">
          {/* LEFT COLUMN: Controls, active patient, add form */}
          <div className="col-span-4 animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Active Serving Card */}
            <div className="glass-card" style={{ border: activeToken ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--glass-border)', background: activeToken ? 'radial-gradient(circle at top, rgba(99, 102, 241, 0.08) 0%, var(--glass-bg) 100%)' : 'var(--glass-bg)' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Stethoscope size={18} color="var(--color-enter)" /> Currently Serving</span>
                {activeToken && <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>In Room</span>}
              </h3>
              
              {activeToken ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div className="pulse-glow" style={{ background: 'var(--accent-gradient)', borderRadius: 'var(--radius-md)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{activeToken.tokenNumber}</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>{activeToken.patientName}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Visit Type: <strong style={{ textTransform: 'capitalize', color: 'var(--color-enter)' }}>{activeToken.visitType}</strong></p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Consultation Timer:</span>
                    <strong style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--color-safe)', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>{elapsedTime}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => completeCurrent(clinicId)} className="btn btn-success" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={16} /> Complete
                    </button>
                    <button onClick={() => skipToken(clinicId, activeToken._id)} className="btn btn-secondary" style={{ flex: 1, border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--color-next)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <SkipForward size={16} /> Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '50%' }}>
                    <Armchair size={42} />
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Consultation room is currently empty.</p>
                  <button onClick={handleCallNextSafe} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isActionDisabled || totalWaiting === 0}>
                    <Megaphone size={16} /> Call Next Patient
                  </button>
                </div>
              )}
            </div>
   
            {/* Queue Controls */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 700 }}>Queue Controls</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activeToken === null && totalWaiting > 0 && (
                  <button onClick={handleCallNextSafe} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isActionDisabled}>
                    <Megaphone size={16} /> Call Next Patient
                  </button>
                )}
                
                {clinic?.queueStatus === 'paused' ? (
                  <button onClick={() => resumeQueue(clinicId)} className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-safe)', borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Play size={16} /> Resume Queue
                  </button>
                ) : (
                  <button onClick={() => setShowPauseModal(true)} className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-returning)', borderColor: 'rgba(249, 115, 22, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Pause size={16} /> Pause / Break
                  </button>
                )}

                <button onClick={() => undoLastAction(clinicId)} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Undo2 size={16} /> Undo Last Action
                </button>
              </div>
            </div>

            {/* Add Patient Fast Form */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={18} color="var(--color-enter)" /> Add Patient</h3>
              <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Patient Name *</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Ramesh Kumar"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Visit Type</label>
                  <select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                    <option value="general">General Consultation (1.0x)</option>
                    <option value="followup">Follow-up (0.75x)</option>
                    <option value="report">Report Review (0.5x)</option>
                    <option value="vaccination">Vaccination (0.4x)</option>
                    <option value="emergency">Emergency Priority (Queue Jump)</option>
                  </select>
                </div>

                {visitType === 'emergency' && (
                  <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertTriangle size={14} color="var(--color-next)" /> Priority Reason *
                    </label>

                    {/* Common Emergency Symptoms Quick-Select */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      {[
                        'Chest Pain',
                        'Asthma/Severe Breathlessness',
                        'High Fever',
                        'Bleeding/Trauma',
                        'Fainting/Loss of Consciousness',
                        'Severe Abdominal Pain'
                      ].map((symptom) => (
                        <button
                          key={symptom}
                          type="button"
                          onClick={() => setPriorityReason(symptom)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.72rem',
                            background: priorityReason === symptom ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                            color: priorityReason === symptom ? 'var(--color-next)' : 'var(--text-secondary)',
                            border: priorityReason === symptom ? '1px solid var(--color-next)' : '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Or type custom emergency reason..."
                      value={priorityReason}
                      onChange={(e) => setPriorityReason(e.target.value)}
                      required
                      style={{ borderColor: 'var(--color-next)' }}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isSubmitLoading}>
                  <UserPlus size={16} /> {isSubmitLoading ? 'Registering...' : 'Add Patient'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Waiting list, search, filters */}
          <div className="col-span-8 animate-fade-in-up stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* List Search & Filters Toolbar */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search patient name, token number, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
                <div style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Search size={16} />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="btn btn-secondary" style={{ minHeight: 'auto', padding: '0 1rem' }}>
                    Clear
                  </button>
                )}
              </div>
              
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '100%' }}>
                {['all', 'waiting', 'skipped', 'completed', 'emergency'].map(filterVal => (
                  <button
                    key={filterVal}
                    onClick={() => setStatusFilter(filterVal)}
                    className={`btn ${statusFilter === filterVal ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      height: '38px',
                      minHeight: '38px',
                      padding: '0 1rem',
                      fontSize: '0.8rem',
                      textTransform: 'capitalize',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    {filterVal === 'emergency' && <AlertTriangle size={14} />}
                    {filterVal === 'completed' && <CheckCircle size={14} />}
                    {filterVal === 'waiting' && <Clock size={14} />}
                    {filterVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Queue List Registry Table */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={18} color="var(--color-enter)" /> Live Patient Registry</h3>
              {filteredGridList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
                    <Search size={42} />
                  </div>
                  <p style={{ fontWeight: 500 }}>No matching patients found in queue.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>
                        <th style={{ padding: '1rem 0.75rem' }}>Token</th>
                        <th style={{ padding: '1rem 0.75rem' }}>Patient Details</th>
                        <th style={{ padding: '1rem 0.75rem' }}>Visit Type</th>
                        <th style={{ padding: '1rem 0.75rem' }}>Estimated Wait</th>
                        <th style={{ padding: '1rem 0.75rem' }}>Status</th>
                        <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGridList.map((token) => {
                        return (
                          <tr key={token._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background var(--transition-fast)' }} className="table-row-enter">
                            <td style={{ padding: '1.25rem 0.75rem' }}>
                              <div className="pulse-glow" style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.05)', width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                                {token.tokenNumber}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 0.75rem' }}>
                              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#ffffff', letterSpacing: '-0.01em' }}>{token.patientName}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={10} /> {token.phone || 'No phone'}</span>
                            </td>
                            <td style={{ padding: '1.25rem 0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {token.visitType === 'emergency' ? (
                                  <>
                                    <span style={{ color: 'var(--color-next)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={14} /> {token.priorityReason}</span>
                                  </>
                                ) : (
                                  token.visitType
                                )}
                              </span>
                            </td>
                            <td style={{ padding: '1.25rem 0.75rem' }}>
                              {token.status === 'waiting' ? (
                                <strong style={{ fontSize: '0.9rem', color: 'var(--color-returning)', fontFamily: 'var(--font-mono)' }}>{token.estimatedWait} mins</strong>
                              ) : token.status === 'active' ? (
                                <span style={{ color: 'var(--color-enter)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Stethoscope size={14} /> Serving</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>--</span>
                              )}
                            </td>
                            <td style={{ padding: '1.25rem 0.75rem' }}>
                              <span className={`badge badge-${token.status}`}>{token.status}</span>
                            </td>
                            <td style={{ padding: '1.25rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                {token.status === 'waiting' && (
                                  <>
                                    <button onClick={() => skipToken(clinicId, token._id)} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Skip Turn">
                                      <SkipForward size={12} /> Skip
                                    </button>
                                    <button onClick={() => cancelToken(clinicId, token._id)} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Cancel Token">
                                      <Trash2 size={12} /> Cancel
                                    </button>
                                  </>
                                )}

                                {token.status === 'skipped' && (
                                  <button onClick={() => rejoinToken(clinicId, token._id, 'next')} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--color-safe)', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Rejoin Next">
                                    <Undo2 size={12} /> Rejoin
                                  </button>
                                )}

                                {/* Sharing tools */}
                                <button onClick={() => copyPatientLink(token._id)} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Copy Live Track Link">
                                  <Link2 size={12} /> Link
                                </button>
                                
                                {token.phone && (
                                  <button onClick={() => shareWhatsApp(token)} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', color: '#25D366', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Send via WhatsApp">
                                    <Send size={12} /> WA
                                  </button>
                                )}
                                
                                <button onClick={() => setShowQrModal(token)} className="btn btn-secondary" style={{ height: '34px', minHeight: 'auto', padding: '0 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Show QR Code">
                                  <QrCode size={12} /> QR
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODALS */}
        
        {/* 1. Pause Reason Dialog Modal */}
        {showPauseModal && (
          <div className="modal-overlay">
            <div className="modal-card animate-slide-up" style={{ border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}><Pause size={20} color="var(--color-returning)" /> Pause Queue</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                Set a temporary queue pause state. Waiting patients will instantly see this reason on their trackers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                <select value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}>
                  <option value="Doctor Break">Doctor Break</option>
                  <option value="Attending Ward Emergency">Attending Ward Emergency</option>
                  <option value="System Maintenance">System Maintenance</option>
                  <option value="Lunch Break">Lunch Break</option>
                </select>
                <input
                  type="text"
                  placeholder="Or type custom reason..."
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPauseModal(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handlePauseQueueConfirm} className="btn btn-primary" style={{ background: 'var(--gold-gradient)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Pause size={16} /> Pause Queue</button>
              </div>
            </div>
          </div>
        )}

        {/* 2. QR Code Patient Sharing Modal */}
        {showQrModal && (
          <div className="modal-overlay">
            <div className="modal-card animate-slide-up" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}><QrCode size={20} color="var(--color-enter)" /> Token {showQrModal.tokenNumber} live tracking</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
                Patient: <strong style={{ color: '#fff' }}>{showQrModal.patientName}</strong><br />
                Scan QR to track queue status on mobile.
              </p>
              
              <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                <QRCode value={getPatientUrl(showQrModal._id)} size={200} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button onClick={() => copyPatientLink(showQrModal._id)} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Link2 size={16} /> Copy Live Link
                </button>
                <button onClick={() => setShowQrModal(null)} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <X size={16} /> Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
