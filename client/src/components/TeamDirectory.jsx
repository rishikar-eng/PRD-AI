import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

/**
 * Per-teammate card: shows aggregate stats; clicking expands to show
 * recent PRDs and pending input-request details.
 */
function MemberCard({ member, expanded, onToggle, onViewProject }) {
  const initials = (member.user_name || member.user_email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const pendingCount = member.pendingRequests?.length || 0;

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899, #fb923c 60%, #facc15)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {member.user_name}
            </h3>
            {pendingCount > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: 'rgba(251, 146, 60, 0.15)',
                  color: 'var(--orange)',
                  border: '1px solid rgba(251, 146, 60, 0.4)',
                  padding: '1px 8px',
                  borderRadius: '999px',
                }}
              >
                {pendingCount} PENDING
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
            {member.role}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {member.domain}
          </div>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          {expanded ? '▾' : '▸'}
        </div>
      </div>

      {/* Stat row */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <span><strong style={{ color: 'var(--text-primary)' }}>{member.prdCount}</strong> PRDs</span>
        <span>·</span>
        <span><strong style={{ color: 'var(--orange)' }}>{pendingCount}</strong> pending</span>
        <span>·</span>
        <span><strong style={{ color: 'var(--text-primary)' }}>{member.respondedCount + member.incorporatedCount}</strong> handled</span>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
          {/* Pending requests */}
          {pendingCount > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--orange)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}
              >
                Pending Input Requests
              </div>
              {member.pendingRequests.map((r) => (
                <div
                  key={r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (r.prd_id && onViewProject) onViewProject(r.prd_id);
                  }}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(251, 146, 60, 0.05)',
                    border: '1px solid rgba(251, 146, 60, 0.2)',
                    borderRadius: 'var(--radius-xs)',
                    marginBottom: '8px',
                    cursor: r.prd_id ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (r.prd_id) e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.5)'; }}
                  onMouseLeave={(e) => { if (r.prd_id) e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.2)'; }}
                  title={r.prd_id ? 'Open the PRD this request is on' : ''}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    On <strong style={{ color: 'var(--text-primary)' }}>{r.projects?.title || 'Untitled PRD'}</strong>
                    {' · '}{new Date(r.created_at).toLocaleDateString()}
                    {r.prd_id && <span style={{ marginLeft: '8px', color: 'var(--orange)', fontSize: '10px', fontWeight: 700 }}>OPEN ↗</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {r.question}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PRDs */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              {member.prdCount > 0 ? 'Recent PRDs' : 'PRDs'}
            </div>
            {member.prds.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                No PRDs created yet.
              </div>
            ) : (
              member.prds.map((p) => (
                <div
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewProject) onViewProject(p.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    marginBottom: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title="Open this PRD (read-only)"
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{stageLabel(p.stage)} · {new Date(p.updated_at).toLocaleDateString()}</span>
                    <span style={{ color: 'var(--teal)', fontSize: '10px', fontWeight: 700 }}>OPEN ↗</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Expertise areas */}
          {member.suggested_stages?.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Suggested for
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {member.suggested_stages.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '999px',
                      background: 'rgba(94, 234, 212, 0.08)',
                      color: 'var(--teal)',
                      border: '1px solid rgba(94, 234, 212, 0.2)',
                    }}
                  >
                    {formatStageName(s)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stageLabel(stage) {
  const labels = { 0: 'Draft', 1: 'Intake', 1.5: 'Metric', 2: 'Generating', 5: 'Review', 6: 'Complete', 6.5: 'External' };
  return labels[stage] || 'Draft';
}

function formatStageName(slug) {
  const names = {
    idea_capture: 'Idea Capture',
    intake: 'Intake',
    writer: 'PRD Generation',
    qc: 'QC',
    success_metric: 'Success Metric',
    delivery_reality: 'Delivery',
    technical_feasibility: 'Technical',
    business_value: 'Business',
    security: 'Security',
    debate: 'Debate',
    owner_review: 'Review',
    external_review: 'External',
  };
  return names[slug] || slug;
}

export default function TeamDirectory({ onViewProject }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/team/directory`, { credentials: 'include' });
        if (!r.ok) throw new Error('Failed to load directory');
        const data = await r.json();
        setMembers(data);
      } catch (e) {
        console.error('Team directory load error:', e);
        setError('Could not load team directory.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPending = members.reduce((sum, m) => sum + (m.pendingRequests?.length || 0), 0);
  const totalPrds = members.reduce((sum, m) => sum + m.prdCount, 0);

  if (loading) {
    return (
      <div className="section fade-in" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <div className="typing-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  return (
    <div className="section fade-in" style={{ paddingTop: '100px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
          Team <span className="gradient-text">Directory</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          {members.length} teammates · {totalPrds} PRDs generated · {totalPending} pending requests
        </p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '24px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
        {members.map((m) => (
          <MemberCard
            key={m.user_email}
            member={m}
            expanded={expanded === m.user_email}
            onToggle={() => setExpanded(expanded === m.user_email ? null : m.user_email)}
            onViewProject={onViewProject}
          />
        ))}
      </div>
    </div>
  );
}
