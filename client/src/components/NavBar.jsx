import React from 'react';

export default function NavBar() {
  return (
    <nav className="nav">
      <div className="nav-left">
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
