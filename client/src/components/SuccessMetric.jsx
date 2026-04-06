import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';

export default function SuccessMetric({ structuredData, onComplete }) {
  const [suggestedMetric, setSuggestedMetric] = useState('');
  const [editedMetric, setEditedMetric] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    generateMetric();
  }, []);

  const generateMetric = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/intake/generate-metric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate success metric');
      }

      const data = await response.json();
      setSuggestedMetric(data.suggestedMetric);
      setEditedMetric(data.suggestedMetric);
    } catch (err) {
      console.error('Generate metric error:', err);
      setError('Failed to generate success metric. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/intake/confirm-metric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ metric: editedMetric }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm metric');
      }

      // Add metric to structured data and proceed
      onComplete({ ...structuredData, successMetric: editedMetric });
    } catch (err) {
      console.error('Confirm metric error:', err);
      setError('Failed to confirm metric. Please try again.');
      setIsConfirming(false);
    }
  };

  return (
    <div className="section fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Success <span className="gradient-text">Metric</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          How will we know if this feature succeeded?
        </p>
      </div>

      {error && (
        <div className="card" style={{
          marginBottom: '24px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            AI-Suggested Success Metric
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Based on your intake conversation, here's a specific, measurable metric. Edit if needed.
          </p>
        </div>

        {isGenerating ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="typing-dots" style={{ marginBottom: '12px' }}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Generating success metric...
            </div>
          </div>
        ) : (
          <>
            <textarea
              value={editedMetric}
              onChange={(e) => setEditedMetric(e.target.value)}
              placeholder="Success metric will appear here..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '16px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
            }}>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={!editedMetric.trim() || isConfirming}
                style={{
                  opacity: !editedMetric.trim() || isConfirming ? 0.5 : 1,
                  cursor: !editedMetric.trim() || isConfirming ? 'not-allowed' : 'pointer',
                }}
              >
                {isConfirming ? (
                  <>
                    <div className="typing-dots" style={{ display: 'inline-flex', transform: 'scale(0.6)', marginRight: '8px' }}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    Confirming...
                  </>
                ) : (
                  'Confirm & Continue'
                )}
              </button>

              <button
                className="btn-secondary"
                onClick={generateMetric}
                disabled={isGenerating || isConfirming}
                style={{
                  opacity: isGenerating || isConfirming ? 0.5 : 1,
                  cursor: isGenerating || isConfirming ? 'not-allowed' : 'pointer',
                }}
              >
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.2)' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--green-bright)' }}>What makes a good success metric?</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Specific & measurable (not vague)</li>
            <li>Time-bound (has a deadline)</li>
            <li>Tied to business impact (time saved, errors reduced, throughput increased)</li>
            <li>Observable in real workflows</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
