import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function InputRequestModal({
  prdId,
  stage,
  stageDraft,
  onClose,
  onSuccess
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch team members on mount
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/input-requests/team`, {
        credentials: 'include',
      });
      const data = await response.json();
      setTeamMembers(data);

      // Auto-suggest team member based on stage
      const suggested = data.find(member =>
        member.suggested_stages && member.suggested_stages.includes(stage)
      );
      if (suggested) {
        setSelectedPerson(suggested);
      }
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPerson || !question.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/input-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prdId,
          stage,
          stageDraft,
          requestedFrom: selectedPerson.user_email,
          question: question.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send input request');
      }

      const data = await response.json();
      onSuccess(data.inputRequest);
    } catch (error) {
      alert('Failed to send input request. Please try again.');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    }}>
      <div className="card" style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '24px',
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
              Request Input
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Stage: {formatStageName(stage)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
            Loading team members...
          </div>
        ) : (
          <>
            {/* Team Member Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '12px',
              }}>
                Request input from:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamMembers.map(member => {
                  const isSuggested = member.suggested_stages && member.suggested_stages.includes(stage);
                  return (
                    <div
                      key={member.user_email}
                      onClick={() => setSelectedPerson(member)}
                      style={{
                        padding: '12px 16px',
                        border: `1px solid ${selectedPerson?.user_email === member.user_email ? 'var(--pink)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        background: selectedPerson?.user_email === member.user_email ? 'rgba(244, 114, 182, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPerson?.user_email !== member.user_email) {
                          e.currentTarget.style.borderColor = 'var(--border-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPerson?.user_email !== member.user_email) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                            {member.user_name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {member.role}
                          </div>
                        </div>
                        {isSuggested && (
                          <div className="badge" style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            background: 'rgba(251, 146, 60, 0.1)',
                            color: 'var(--orange)',
                            border: '1px solid rgba(251, 146, 60, 0.2)',
                          }}>
                            Suggested
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {member.domain}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}>
                Your question:
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What specific input do you need? Be clear and concise."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                The current draft will be attached automatically
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!selectedPerson || !question.trim() || sending}
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to format stage names (same as backend)
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
