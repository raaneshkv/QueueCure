import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, Copy } from 'lucide-react';
import { toast } from 'sonner';

/**
 * RoleHeader — Premium minimal top bar for each role page.
 * Shows a glowing role badge, clinic name, and a sleek back button.
 */
export default function RoleHeader({ roleName, roleIcon: RoleIcon, clinicName, clinicId }) {
  return (
    <header className="role-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" className="back-button">
          <ArrowLeft size={16} />
          <span>Exit</span>
        </Link>

        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gradient-ocean)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
          }}>
            {RoleIcon ? <RoleIcon size={16} color="#fff" /> : <Activity size={16} color="#fff" />}
          </div>
          <div>
            <h1 style={{
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              margin: 0,
            }}>
              {clinicName || 'QueueCure'}
            </h1>
            <span className="badge badge-role" style={{ marginTop: '2px' }}>
              {roleName}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {clinicId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {clinicId}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(clinicId);
                toast.success('Clinic ID copied to clipboard!');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.25rem'
              }}
              title="Copy Clinic ID"
            >
              <Copy size={12} />
            </button>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.75rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--color-safe)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-safe)',
            animation: 'pulseGlow 2s infinite',
          }} />
          Live
        </div>
      </div>
    </header>
  );
}
