import React from 'react';
import NavBar from './NavBar';
import PRDDocument from './PRDDocument';

export default function ShareView({ data, onClose }) {
  if (data.error) {
    return (
      <>
        <NavBar />
        <div style={{ maxWidth: '600px', margin: '140px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'rgba(244, 114, 182, 0.1)',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}>
            ✕
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Link Not Found</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
            {data.error}
          </p>
          <button className="btn-primary" onClick={onClose}>
            Go to Dashboard
          </button>
        </div>
      </>
    );
  }

  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <>
      <NavBar />
      <div style={{ marginTop: '80px', maxWidth: '1000px', margin: '80px auto 0', padding: '0 32px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', paddingTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Shared PRD
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>
                {data.featureName || data.title}
              </h1>
              {formattedDate && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Created {formattedDate}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '13px' }}
                onClick={() => navigator.clipboard.writeText(data.prd)}
              >
                Copy PRD
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '13px' }}
                onClick={() => {
                  const blob = new Blob([data.prd], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `PRD_${data.featureName || 'shared'}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
              <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={onClose}>
                My Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* PRD Content */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <PRDDocument prdText={data.prd} highlightedSections={[]} />
        </div>
      </div>
    </>
  );
}
