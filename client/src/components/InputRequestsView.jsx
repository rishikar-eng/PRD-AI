import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function InputRequestsView({ prdId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (prdId) {
      fetchInputRequests();
    }
  }, [prdId]);

  const fetchInputRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/input-requests/prd/${prdId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load input requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncorporate = async (requestId) => {
    if (!confirm('This will mark the input as incorporated and notify the responder. The AI will use this input when regenerating. Continue?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/input-requests/${requestId}/incorporate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to incorporate input');
      }

      // Refresh the list
      fetchInputRequests();
      alert('Input marked as incorporated! The responder has been notified via Teams.');
    } catch (error) {
      alert('Failed to incorporate input. Please try again.');
      console.error(error);
    }
  };

  if (!prdId) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        No active PRD. Save your session first to request input.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>💬</div>
        <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
          No input requests yet. Click "Request Input" to ask team members for their expertise.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {requests.map(request => (
        <div
          key={request.id}
          className="card"
          style={{ marginBottom: '16px' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                {request.requested_from}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {formatStageName(request.stage)} • {new Date(request.created_at).toLocaleDateString()}
              </div>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {/* Question */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              Your question:
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {request.question}
            </div>
          </div>

          {/* Response */}
          {request.response && (
            <div style={{
              padding: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Response:
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {request.response}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Responded {new Date(request.responded_at).toLocaleString()}
              </div>
            </div>
          )}

          {/* Actions */}
          {request.status === 'responded' && (
            <button
              className="btn-primary"
              onClick={() => handleIncorporate(request.id)}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              ✓ Incorporate into AI Context
            </button>
          )}

          {request.status === 'incorporated' && (
            <div style={{ fontSize: '12px', color: 'var(--green-bright)' }}>
              ✓ Incorporated • Responder notified
            </div>
          )}

          {request.status === 'pending' && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              ⏳ Awaiting response...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: {
      bg: 'rgba(251, 146, 60, 0.1)',
      border: 'rgba(251, 146, 60, 0.3)',
      color: 'var(--orange)',
      text: 'Pending'
    },
    responded: {
      bg: 'rgba(94, 234, 212, 0.1)',
      border: 'rgba(94, 234, 212, 0.3)',
      color: 'var(--teal)',
      text: 'Responded'
    },
    incorporated: {
      bg: 'rgba(74, 222, 128, 0.1)',
      border: 'rgba(74, 222, 128, 0.3)',
      color: 'var(--green-bright)',
      text: 'Incorporated'
    },
  };

  const style = styles[status] || styles.pending;

  return (
    <div style={{
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: 700,
      borderRadius: 'var(--radius-xs)',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
    }}>
      {style.text}
    </div>
  );
}

function formatStageName(stageSlug) {
  const stageNames = {
    'idea_capture': 'Idea Capture',
    'intake': 'AI Intake',
    'writer': 'PRD Generation',
    'qc': 'Quality Check',
    'success_metric': 'Success Metric',
    'delivery_reality': 'Delivery Reality',
    'technical_feasibility': 'Technical Feasibility',
    'business_value': 'Business Value',
    'security': 'Security',
    'debate': 'Debate & Meta-Review',
    'owner_review': 'Owner Review',
    'external_review': 'External PRD Review'
  };

  return stageNames[stageSlug] || stageSlug;
}
