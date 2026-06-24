import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueue } from '../context/QueueContext.jsx';
import RoleHeader from '../components/RoleHeader.jsx';
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  PieChart as PieChartIcon,
  Stethoscope,
  Timer,
  CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export default function OwnerPage() {
  const { clinicId } = useParams();
  const {
    completedCount,
    totalWaiting,
    skippedCount,
    etaSummary,
    clinic,
    fetchQueueSnapshot
  } = useQueue();

  // Summary Metrics
  const [summary, setSummary] = useState({
    completedToday: 0,
    currentlyWaiting: 0,
    skippedToday: 0,
    averageConsultationTime: 0,
    averageWaitTime: 0
  });

  // Chart Datasets
  const [hourlyData, setHourlyData] = useState([]);
  const [visitTypeData, setVisitTypeData] = useState([]);
  const [consultationTrend, setConsultationTrend] = useState([]);
  const [docPerformance, setDocPerformance] = useState({
    averageConsultationTime: 0,
    longestConsultation: 0,
    fastestConsultation: 0
  });

  const [loading, setLoading] = useState(true);

  // Fetch all analytics stats
  const fetchAnalytics = async () => {
    try {
      const endpoints = [
        `/api/analytics/${clinicId}/daily`,
        `/api/analytics/${clinicId}/hourly`,
        `/api/analytics/${clinicId}/visit-types`,
        `/api/analytics/${clinicId}/consultation-trend`,
        `/api/analytics/${clinicId}/doctor-performance`
      ];

      const [resDaily, resHourly, resTypes, resTrend, resPerf] = await Promise.all(
        endpoints.map(url => fetch(url).then(r => r.json()))
      );

      if (resDaily.status === 'success') setSummary(resDaily.data);
      if (resHourly.status === 'success') setHourlyData(resHourly.data);
      if (resTypes.status === 'success') setVisitTypeData(resTypes.data);
      if (resTrend.status === 'success') setConsultationTrend(resTrend.data);
      if (resPerf.status === 'success') setDocPerformance(resPerf.data);

    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueSnapshot(clinicId);
  }, [clinicId, fetchQueueSnapshot]);

  useEffect(() => {
    fetchAnalytics();
  }, [clinicId, completedCount, totalWaiting, skippedCount]);

  // Premium neon colors for Pie Chart
  const COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#ef4444'];

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }} className="pulse-glow">📊</span>
          <p style={{ color: 'var(--text-secondary)' }}>Loading analytics dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }} className="page-enter">
      <RoleHeader roleName="Analytics" roleIcon={BarChart3} clinicName={clinic?.clinicName || 'Operational Analytics'} clinicId={clinicId} />

      <div className="container" style={{ marginTop: '2rem', paddingBottom: '5rem' }}>
        
        {/* Grid: 4 Summary Metric Cards */}
        <div className="grid-cols-12 animate-fade-in-up" style={{ marginBottom: '2.5rem' }}>
          
          {/* Metric 1 */}
          <div className="col-span-3 glass-card glow-card-emerald" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ color: 'var(--color-safe)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <CheckCircle size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Served Today</span>
            <strong style={{ fontSize: '2.8rem', color: 'var(--color-safe)', display: 'block', marginTop: '0.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {summary.completedToday}
            </strong>
          </div>

          {/* Metric 2 */}
          <div className="col-span-3 glass-card glow-card-indigo" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ color: 'var(--color-enter)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <Users size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Currently Waiting</span>
            <strong style={{ fontSize: '2.8rem', color: 'var(--color-enter)', display: 'block', marginTop: '0.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {summary.currentlyWaiting}
            </strong>
          </div>

          {/* Metric 3 */}
          <div className="col-span-3 glass-card glow-card-indigo" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ color: 'var(--accent-secondary)', background: 'rgba(168, 85, 247, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <Timer size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Avg Consult Time</span>
            <strong style={{ fontSize: '2.6rem', color: 'var(--accent-secondary)', display: 'block', marginTop: '0.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {summary.averageConsultationTime || etaSummary.averageConsultationTime} <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>min</span>
            </strong>
          </div>

          {/* Metric 4 */}
          <div className="col-span-3 glass-card glow-card-amber" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ color: 'var(--color-returning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <Clock size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Avg Patient Wait</span>
            <strong style={{ fontSize: '2.6rem', color: 'var(--color-returning)', display: 'block', marginTop: '0.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {summary.averageWaitTime} <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>min</span>
            </strong>
          </div>

        </div>

        {/* Charts Grid */}
        <div className="grid-cols-12 animate-fade-in-up stagger-1" style={{ marginBottom: '2.5rem' }}>
          
          {/* Patients served per hour (Bar chart) */}
          <div className="col-span-8 glass-card" style={{ minHeight: '400px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--color-enter)" /> Patients Served Per Hour Today
            </h3>
            {hourlyData.length === 0 || hourlyData.every(d => d.patients === 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <BarChart3 size={32} />
                </div>
                <p>No consultation records generated today yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 35, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#ffffff' }} />
                  <Bar dataKey="patients" fill="url(#barGlow)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Breakdown of visit types (Pie chart) */}
          <div className="col-span-4 glass-card" style={{ minHeight: '400px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChartIcon size={18} color="var(--color-nearby)" /> Visit Types Distribution
            </h3>
            {visitTypeData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <PieChartIcon size={32} />
                </div>
                <p>No registrations logged today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={visitTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {visitTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(10, 15, 35, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#ffffff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem', width: '100%', fontSize: '0.8rem' }}>
                  {visitTypeData.map((d, index) => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></span>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.name}</span>
                      </div>
                      <strong style={{ color: '#ffffff' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="grid-cols-12 animate-fade-in-up stagger-2">
          
          {/* Duration History Line Trend */}
          <div className="col-span-8 glass-card" style={{ minHeight: '340px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-secondary)" /> Consultation Duration History (Last 15 patients)
            </h3>
            {consultationTrend.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <Clock size={32} />
                </div>
                <p>Waiting for completed consultations.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={consultationTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="tokenNumber" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} unit=" m" tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 35, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#ffffff' }} />
                  <Line type="monotone" dataKey="duration" stroke="var(--accent-secondary)" strokeWidth={3} dot={{ stroke: 'var(--accent-secondary)', strokeWidth: 2, r: 4, fill: '#0a0f1d' }} activeDot={{ r: 7, stroke: 'var(--accent-secondary)', strokeWidth: 2, fill: '#ffffff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Doctor Performance Summary */}
          <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={18} color="var(--color-safe)" /> Doctor Performance Metrics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Fastest consultation time</span>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-safe)', margin: '0.1rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                    {docPerformance.fastestConsultation || '--'} mins
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Longest consultation time</span>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-next)', margin: '0.1rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                    {docPerformance.longestConsultation || '--'} mins
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Moving Average duration</span>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-enter)', margin: '0.1rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                    {docPerformance.averageConsultationTime || etaSummary.averageConsultationTime} mins
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
