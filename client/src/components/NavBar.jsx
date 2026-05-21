import React from 'react';

export default function NavBar({ onHome, showHome = false }) {
  return (
    <nav className="nav">
      <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showHome && (
          <button
            onClick={onHome}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            title="Back to Dashboard (your current PRD is auto-saved)"
          >
            ← Dashboard
          </button>
        )}
        <span className="nav-logo-text gradient-text">Rian</span>
        <span className="nav-badge">PRD Pipeline</span>
      </div>
      <div className="nav-right">
        <a href="https://www.rian.io" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px' }}>
          rian.io
        </a>
      </div>
    </nav>
  );
}
