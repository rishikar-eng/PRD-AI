import React from 'react';

export default function PRDDocument({ prdText, highlightedSections = [], isRegenerating = false }) {
  // Parse PRD into sections
  const sections = (prdText || '').split(/\n## /).filter(Boolean);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Regenerating overlay */}
      {isRegenerating && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(10, 10, 15, 0.7)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}>
          <div className="typing-dots"><span></span><span></span><span></span></div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Regenerating PRD...</div>
        </div>
      )}
      <div style={{
        padding: '24px 24px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Generated PRD
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => {
              navigator.clipboard.writeText(prdText);
            }}
          >
            Copy
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => {
              const blob = new Blob([prdText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `PRD_${Date.now()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {sections.map((section, index) => {
          const [title, ...content] = section.split('\n');
          const sectionTitle = title.replace(/^## /, '').trim();
          const isHighlighted = highlightedSections.includes(sectionTitle);

          return (
            <div
              key={index}
              style={{
                marginBottom: '32px',
                padding: isHighlighted ? '16px' : '0',
                background: isHighlighted ? 'rgba(251, 146, 60, 0.08)' : 'transparent',
                borderRadius: isHighlighted ? 'var(--radius-sm)' : '0',
                border: isHighlighted ? '1px solid rgba(251, 146, 60, 0.2)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: 700,
                marginBottom: '12px',
                color: 'var(--text-primary)',
              }}>
                {sectionTitle}
              </h3>
              <div style={{
                fontSize: '13px',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {content.join('\n').trim()}
              </div>
            </div>
          );
        })}

        {sections.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
          }}>
            No PRD content
          </div>
        )}
      </div>
    </div>
  );
}
