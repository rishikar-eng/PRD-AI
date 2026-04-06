import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';

export default function AgentPipelineV2({ structuredData, onComplete, externalPRDMode = false, externalPRD = '', originalPRD = '' }) {
  // V2 Flow: Writer → DR → Tech → Business → Security → Debate
  // External mode: Skip Writer, use externalPRD
  const [currentAgent, setCurrentAgent] = useState(externalPRDMode ? 'deliveryReality' : 'writer');
  const [prdText, setPrdText] = useState(externalPRDMode ? externalPRD : '');
  const [isStreaming, setIsStreaming] = useState(false);

  // Agent feedback state
  const [agentFeedback, setAgentFeedback] = useState({
    deliveryReality: { comments: [], loading: false, complete: false },
    technicalFeasibility: { comments: [], loading: false, complete: false },
    businessValue: { comments: [], loading: false, complete: false },
    security: { comments: [], loading: false, complete: false },
    debate: { comments: [], loading: false, complete: false, escalated: false },
  });

  // Owner response state
  const [ownerResponses, setOwnerResponses] = useState({
    deliveryReality: '',
    technicalFeasibility: '',
    businessValue: '',
    security: '',
  });

  const [currentOwnerResponse, setCurrentOwnerResponse] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [error, setError] = useState('');
  const prdAccumulator = useRef('');

  useEffect(() => {
    if (externalPRDMode) {
      // Skip writer, start with first specialist agent
      runSpecialistAgent('deliveryReality', externalPRD);
    } else if (currentAgent === 'writer') {
      runWriterAgent();
    }
  }, []);

  const runWriterAgent = async () => {
    setIsStreaming(true);
    setError('');
    prdAccumulator.current = '';

    try {
      const response = await fetch(`${API_URL}/api/agents/writer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ structuredData }),
      });

      if (!response.ok) throw new Error('Writer agent failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                prdAccumulator.current += data.content;
                setPrdText(prdAccumulator.current);
              }
              if (data.done) {
                setIsStreaming(false);
                setTimeout(() => {
                  setCurrentAgent('deliveryReality');
                  runSpecialistAgent('deliveryReality', prdAccumulator.current);
                }, 1000);
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Writer error:', err);
      setError('Writer agent failed');
      setIsStreaming(false);
    }
  };

  const runSpecialistAgent = async (agentName, prd) => {
    setAgentFeedback(prev => ({
      ...prev,
      [agentName]: { ...prev[agentName], loading: true },
    }));
    setError('');

    const endpoints = {
      deliveryReality: 'delivery-reality',
      technicalFeasibility: 'technical-feasibility',
      businessValue: 'business-value',
      security: 'security',
    };

    try {
      const response = await fetch(`${API_URL}/api/agents/${endpoints[agentName]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prdText: prd || prdText }),
      });

      if (!response.ok) throw new Error(`${agentName} agent failed`);

      const data = await response.json();
      setAgentFeedback(prev => ({
        ...prev,
        [agentName]: { comments: data.comments || [], loading: false, complete: true },
      }));
    } catch (err) {
      console.error(`${agentName} error:`, err);
      setError(`${agentName} agent failed`);
      setAgentFeedback(prev => ({
        ...prev,
        [agentName]: { ...prev[agentName], loading: false },
      }));
    }
  };

  const handleSubmitOwnerResponse = async (agentName) => {
    setIsSubmittingResponse(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/agents/owner-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          agent: agentName,
          response: currentOwnerResponse,
        }),
      });

      if (!response.ok) throw new Error('Failed to save owner response');

      setOwnerResponses(prev => ({ ...prev, [agentName]: currentOwnerResponse }));
      setCurrentOwnerResponse('');
      setIsSubmittingResponse(false);

      // Move to next agent
      const nextAgent = {
        deliveryReality: 'technicalFeasibility',
        technicalFeasibility: 'businessValue',
        businessValue: 'security',
        security: 'debate',
      }[agentName];

      setTimeout(() => {
        setCurrentAgent(nextAgent);
        if (nextAgent === 'debate') {
          runDebateAgent();
        } else {
          runSpecialistAgent(nextAgent, prdText);
        }
      }, 500);
    } catch (err) {
      console.error('Submit response error:', err);
      setError('Failed to save owner response');
      setIsSubmittingResponse(false);
    }
  };

  const runDebateAgent = async () => {
    setAgentFeedback(prev => ({
      ...prev,
      debate: { ...prev.debate, loading: true },
    }));
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/agents/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Debate agent failed');

      const data = await response.json();
      setAgentFeedback(prev => ({
        ...prev,
        debate: {
          comments: data.comments || [],
          loading: false,
          complete: true,
          escalated: data.escalated || false,
          escalationReason: data.escalationReason || null,
        },
      }));

      // Pipeline complete
      setTimeout(() => {
        onComplete({
          prd: prdText,
          agentFeedback,
          debateResult: data,
        });
      }, 1500);
    } catch (err) {
      console.error('Debate error:', err);
      setError('Debate agent failed');
      setAgentFeedback(prev => ({
        ...prev,
        debate: { ...prev.debate, loading: false },
      }));
    }
  };

  const agentLabels = {
    writer: 'Writer',
    deliveryReality: 'Delivery Reality',
    technicalFeasibility: 'Technical',
    businessValue: 'Business',
    security: 'Security',
    debate: 'Debate',
  };

  const agentOrder = ['writer', 'deliveryReality', 'technicalFeasibility', 'businessValue', 'security', 'debate'];
  const needsOwnerResponse = ['deliveryReality', 'technicalFeasibility', 'businessValue', 'security'];

  const isAgentComplete = (agent) => {
    if (agent === 'writer') return !!prdText;
    return agentFeedback[agent]?.complete;
  };

  const showOwnerResponsePrompt = needsOwnerResponse.includes(currentAgent) &&
                                   agentFeedback[currentAgent]?.complete &&
                                   !ownerResponses[currentAgent];

  return (
    <div className="section fade-in" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Agent <span className="gradient-text">Pipeline V2</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Writer → 4 Specialists → Debate meta-layer
        </p>
      </div>

      {/* Agent Status Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {agentOrder.map(agent => {
          const isActive = currentAgent === agent;
          const isComplete = isAgentComplete(agent);
          const isLoading = agentFeedback[agent]?.loading;

          return (
            <div
              key={agent}
              className={`badge ${isActive ? 'badge-writer' : ''}`}
              style={{
                opacity: isActive || isComplete ? 1 : 0.4,
                fontSize: '13px',
                padding: '6px 14px',
              }}
            >
              {isLoading && (
                <div className="typing-dots" style={{ display: 'inline-flex', transform: 'scale(0.5)', marginRight: '6px' }}>
                  <span></span><span></span><span></span>
                </div>
              )}
              {isActive && !isLoading && '⚡ '}
              {agentLabels[agent]}
              {isComplete && !isLoading && ' ✓'}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{
          marginBottom: '24px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>
        </div>
      )}

      {/* PRD Output */}
      {prdText && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Generated PRD</h2>
            {isStreaming && (
              <div className="typing-dots"><span></span><span></span><span></span></div>
            )}
          </div>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>
            {prdText}
          </div>
        </div>
      )}

      {/* Specialist Agent Feedback */}
      {Object.keys(agentFeedback).filter(a => a !== 'debate' && agentFeedback[a].complete).map(agent => (
        <div key={agent} className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            {agentLabels[agent]} Agent
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {agentFeedback[agent].comments.length} concern{agentFeedback[agent].comments.length !== 1 ? 's' : ''}
          </div>
          {agentFeedback[agent].comments.slice(0, 3).map((comment, idx) => (
            <div key={idx} style={{
              padding: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '8px',
              fontSize: '13px',
              lineHeight: 1.6,
            }}>
              {comment.text}
            </div>
          ))}
          {ownerResponses[agent] && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(74, 222, 128, 0.05)',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green-bright)', marginBottom: '6px' }}>
                YOUR RESPONSE
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {ownerResponses[agent]}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Owner Response Prompt */}
      {showOwnerResponsePrompt && (
        <div className="card" style={{
          marginBottom: '24px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Your Response Required
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            The {agentLabels[currentAgent]} agent has completed its review. How do you respond to these concerns?
          </p>
          <textarea
            value={currentOwnerResponse}
            onChange={(e) => setCurrentOwnerResponse(e.target.value)}
            placeholder="Explain how you'll address these concerns, or why they don't apply..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
          <button
            className="btn-primary"
            onClick={() => handleSubmitOwnerResponse(currentAgent)}
            disabled={!currentOwnerResponse.trim() || isSubmittingResponse}
            style={{
              marginTop: '12px',
              opacity: !currentOwnerResponse.trim() || isSubmittingResponse ? 0.5 : 1,
              cursor: !currentOwnerResponse.trim() || isSubmittingResponse ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmittingResponse ? 'Submitting...' : 'Submit & Continue'}
          </button>
        </div>
      )}

      {/* Debate Results */}
      {agentFeedback.debate.complete && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            Debate Agent (Meta-Layer)
          </h2>
          {agentFeedback.debate.escalated && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.3)',
              marginBottom: '16px',
            }}>
              <div className="badge badge-escalated" style={{ marginBottom: '8px' }}>ESCALATED</div>
              <div style={{ fontSize: '13px' }}>
                {agentFeedback.debate.escalationReason}
              </div>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {agentFeedback.debate.comments.length} meta-level concern{agentFeedback.debate.comments.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
