import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../context/QueueContext.jsx';
import { toast } from 'sonner';
import RoleHeader from '../components/RoleHeader.jsx';
import {
  Settings,
  Save,
  Clock,
  Users,
  Bell,
  Building2,
  Stethoscope,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const { clinicId } = useParams();
  const { clinic, fetchQueueSnapshot } = useQueue();

  const [formData, setFormData] = useState({
    clinicName: '',
    doctorName: '',
    defaultConsultationTime: 8,
    smartReturnThreshold: 2
  });

  const [loading, setLoading] = useState(false);

  // Sync state with Context
  useEffect(() => {
    if (clinic) {
      setFormData({
        clinicName: clinic.clinicName || '',
        doctorName: clinic.doctorName || '',
        defaultConsultationTime: clinic.defaultConsultationTime || 8,
        smartReturnThreshold: clinic.smartReturnThreshold || 2
      });
    } else {
      fetchQueueSnapshot(clinicId);
    }
  }, [clinic, clinicId, fetchQueueSnapshot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/clinic/${clinicId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.status === 'success') {
        toast.success('Clinic configurations updated successfully!');
        fetchQueueSnapshot(clinicId); // Refresh Context state
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (err) {
      toast.error('Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }} className="page-enter">
      <RoleHeader roleName="Settings" roleIcon={Settings} clinicName={clinic?.clinicName || 'Configuration'} clinicId={clinicId} />
      
      <div className="container" style={{ maxWidth: '650px', marginTop: '2rem', paddingBottom: '5rem' }}>
        <div className="glass-card animate-fade-in-up" style={{ padding: '2.5rem', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.6rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
            <Settings size={22} color="var(--color-enter)" /> Clinic Configuration Settings
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <Building2 size={14} /> Clinic Name
              </label>
              <input
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <Stethoscope size={14} /> Doctor Name
              </label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <Clock size={14} /> Default Consultation Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={formData.defaultConsultationTime}
                onChange={(e) => setFormData({ ...formData, defaultConsultationTime: Number(e.target.value) })}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                Used as the fallback duration to calculate wait time before sufficient consultation data has been collected today.
              </p>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <Bell size={14} /> SmartReturn Notification Threshold (Tokens Ahead)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.smartReturnThreshold}
                onChange={(e) => setFormData({ ...formData, smartReturnThreshold: Number(e.target.value) })}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                Sets the number of tokens ahead at which patients receive browser and visual alerts telling them to start returning to the clinic.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.25)' }} disabled={loading}>
              <Save size={18} /> {loading ? 'Saving Configurations...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
