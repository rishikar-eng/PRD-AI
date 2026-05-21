import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import PRDDocument from './PRDDocument';

/**
 * Read-only view of any teammate's PRD. Opened from the Team Directory when
 * the user clicks a PRD or input-request row. Owner sees their own PRDs the
 * same way for consistency.
 */
export default function ProjectViewer({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(`${API_URL}/api/projects/${projectId}/view`, { credentials: 'include' });
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(d.error || 'Failed to load PRD');
        } else {
          setData(d);
        }
      } catch (e) {
        if (!cancelled) setError('Could not load PRD.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const formattedDate = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const stageLabel = ({
    0: 'Draft',
    1: 'In Intake',
    1.5: 'Success Metric',
    2: 'Generating',
    5: 'In Review',
    6: 'Complete',
    6.5: 'External Review',
  })[data?.stage] || 'Draft';

  return (
    <div style={{ marginTop: '80px', maxWidth: '1000px', margin: '80px auto 0', padding: '0 32px 80px' }}>
      <div style={{ paddingTop: '32px', marginBottom: '24px' }}>
        <button
          className="btn-secondary"
          onClick={onClose}
          style={{ fontSize: '13px', marginBottom: '20px' }}
        >
          ← Back to Team Directory
        </button>

        {loading && (
          <div className="typing-dots"><span></span><span></span><span></span></div>
        )}

        {error && !loading && (
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>
          </div>
        )}

        {data && !loading && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              PRD · {stageLabel}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              {data.featureName || data.title}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Owner: <span style={{ color: 'var(--text-primary)' }}>{data.owner}</span>
              {formattedDate && <> · Updated {formattedDate}</>}
            </div>
          </div>
        )}
      </div>

      {data && !loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {data.prd ? (
            <PRDDocument prdText={data.prd} highlightedSections={[]} />
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No PRD content has been generated for this project yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
