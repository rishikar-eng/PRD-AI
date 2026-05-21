import React, { useEffect, useState, useMemo } from 'react';
import { API_URL } from '../config';

const STAGE_LABELS = {
  0: 'Draft', 1: 'Intake', 1.5: 'Metric', 2: 'Generating', 5: 'Review', 6: 'Complete', 6.5: 'External',
};

/**
 * Modal for picking past PRDs to use as agent context. Used from EntryMode.
 * Selected IDs are returned to the parent via onSave([ids]).
 */
export default function PRDPickerModal({ initialSelectedIds = [], onClose, onSave }) {
  const [allPrds, setAllPrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(initialSelectedIds));

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/projects/all`, { credentials: 'include' });
        if (!r.ok) throw new Error('Failed to load PRDs');
        const data = await r.json();
        setAllPrds(data);
      } catch (e) {
        setError(e.message || 'Could not load PRDs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPrds;
    return allPrds.filter((p) => p.title.toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q));
  }, [search, allPrds]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  const selectedCount = selected.size;
  const tokenWarning = selectedCount >= 5;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px',
      }}
    >
      <div className="card" style={{ maxWidth: '720px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Reference Past PRDs</h2>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '24px', cursor: 'pointer', padding: 0 }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Selected PRDs are included as context for the writer and specialist agents — they'll reference past decisions instead of reinventing them. Skip if nothing here is relevant.
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px 0' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title or owner..."
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
          {loading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="typing-dots"><span></span><span></span><span></span></div>
            </div>
          )}
          {error && (
            <div style={{ padding: '20px 0', color: '#ef4444', fontSize: '13px' }}>{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {allPrds.length === 0 ? 'No PRDs in the database yet.' : 'No PRDs match your filter.'}
            </div>
          )}
          {!loading && !error && filtered.map((p) => {
            const isSelected = selected.has(p.id);
            const stageLabel = STAGE_LABELS[p.stage] || 'Draft';
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  padding: '12px 14px',
                  border: `1px solid ${isSelected ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: '8px',
                  background: isSelected ? 'rgba(94, 234, 212, 0.06)' : 'transparent',
                  cursor: 'pointer',
                  opacity: p.hasContent ? 1 : 0.55,
                  transition: 'all 0.15s',
                }}
                title={p.hasContent ? '' : 'No PRD content yet — generated content is empty.'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--border-hover)'}`,
                    background: isSelected ? 'var(--teal)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontSize: '12px', fontWeight: 800, flexShrink: 0, marginTop: '2px',
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.title || 'Untitled PRD'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', gap: '10px' }}>
                      <span>{p.owner}</span>
                      <span>·</span>
                      <span>{stageLabel}</span>
                      <span>·</span>
                      <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                      {!p.hasContent && <span style={{ color: 'var(--orange)' }}>· empty</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)' }}>
          {tokenWarning && (
            <div style={{
              fontSize: '12px', color: 'var(--orange)', marginBottom: '10px',
              padding: '8px 10px', background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 'var(--radius-xs)',
            }}>
              Heads up — including {selectedCount} PRDs may exceed model context limits and increase per-run cost. Trim to the most relevant.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {selectedCount} selected
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>
                Save ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
