import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function RespondToInputRequest({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [inputRequest, setInputRequest] = useState(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInputRequest();
  }, [requestId]);

  const fetchInputRequest = async () => {
    try {
      const res = await fetch(`${API_URL}/api/input-requests/${requestId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load input request');
      }

      setInputRequest(data);

      // Pre-fill response if already responded
      if (data.response) {
        setResponse(data.response);
        setSubmitted(data.status === 'responded' || data.status === 'incorporated');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!response.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/input-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit response');
      }

      setSubmitted(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '32px',
      }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Request Not Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '32px',
      }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Response Submitted
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Your input has been recorded. {inputRequest.requested_by} will be notified.
          </p>
          <div style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Your response:
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {response}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '80px 32px 32px',
    }}>
      {/* Simple Branding Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '14px 32px',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
      }}>
        <div style={{
          fontSize: '19px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f472b6 0%, #fb923c 40%, #4ade80 70%, #5eead4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Rian
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Request Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'rgba(251, 146, 60, 0.1)',
            border: '1px solid rgba(251, 146, 60, 0.3)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--orange)',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            INPUT REQUEST
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            {inputRequest.requested_by} needs your input
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            PRD: {inputRequest.projects.title} • {formatStageName(inputRequest.stage)}
          </p>
        </div>

        {/* Question Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
            Question:
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {inputRequest.question}
          </p>
        </div>

        {/* Current Draft (if available) */}
        {inputRequest.stage_draft && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
              Current Draft:
            </h2>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}>
              {inputRequest.stage_draft}
            </div>
          </div>
        )}

        {/* Response Input */}
        <div className="card">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
            Your Response:
          </h2>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your expertise, insights, or concerns..."
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              resize: 'vertical',
              marginBottom: '16px',
            }}
          />
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!response.trim() || submitting}
            style={{ width: '100%' }}
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(94, 234, 212, 0.05)',
          border: '1px solid rgba(94, 234, 212, 0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--teal)' }}>💡 Tip:</strong> Be specific and actionable.
          Your input will help shape the PRD before implementation begins.
        </div>
      </div>
    </div>
  );
}

// Helper function to format stage names
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
