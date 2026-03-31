import React, { useState, useEffect, useRef } from 'react';

export default function AgentPipeline({ structuredData, onComplete }) {
  const [currentAgent, setCurrentAgent] = useState('writer'); // writer | qc | debate
  const [prdText, setPrdText] = useState('');
  const [qcResult, setQcResult] = useState(null);
  const [debateResult, setDebateResult] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isQCLoading, setIsQCLoading] = useState(false);
  const [isDebateLoading, setIsDebateLoading] = useState(false);
  const [error, setError] = useState('');
  const prdAccumulator = useRef(''); // Bug fix: use ref to avoid race condition

  useEffect(() => {
    if (currentAgent === 'writer') {
      runWriterAgent();
    }
  }, []);

  const runWriterAgent = async () => {
    setIsStreaming(true);
    setError('');
    prdAccumulator.current = ''; // Reset accumulator

    try {
      const response = await fetch('/api/agents/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ structuredData }),
      });

      if (!response.ok) {
        throw new Error('Writer agent request failed');
      }

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
                prdAccumulator.current += data.content; // Bug fix: accumulate in ref
                setPrdText(prdAccumulator.current);
              }

              if (data.done) {
                setIsStreaming(false);
                // Move to QC after 1 second
                setTimeout(() => {
                  setCurrentAgent('qc');
                  runQCAgent(prdAccumulator.current); // Bug fix: use ref value
                }, 1000);
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Writer agent error:', err);
      setError('Writer agent failed. Please try again.');
      setIsStreaming(false);
    }
  };

  const runQCAgent = async (fullPRD) => {
    setError('');
    setIsQCLoading(true); // Bug fix: add loading state

    try {
      const response = await fetch('/api/agents/qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prdText: fullPRD || prdText }),
      });

      if (!response.ok) {
        throw new Error('QC agent request failed');
      }

      const data = await response.json();
      setQcResult(data);
      setIsQCLoading(false);

      // Move to Debate after 1 second
      setTimeout(() => {
        setCurrentAgent('debate');
        runDebateAgent(fullPRD || prdText, data.scores);
      }, 1000);
    } catch (err) {
      console.error('QC agent error:', err);
      setError('QC agent failed. Please try again.');
      setIsQCLoading(false);
    }
  };

  const runDebateAgent = async (fullPRD, qcScores) => {
    setError('');
    setIsDebateLoading(true); // Bug fix: add loading state

    try {
      const response = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prdText: fullPRD || prdText,
          qcScores: qcScores || qcResult?.scores,
        }),
      });

      if (!response.ok) {
        throw new Error('Debate agent request failed');
      }

      const data = await response.json();
      setDebateResult(data);
      setIsDebateLoading(false);

      // Pipeline complete - move to review
      setTimeout(() => {
        onComplete({
          prd: fullPRD || prdText,
          qcResult: qcResult,
          debateResult: data,
        });
      }, 1500);
    } catch (err) {
      console.error('Debate agent error:', err);
      setError('Debate agent failed. Please try again.');
      setIsDebateLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 3.5) return 'var(--green-bright)';
    if (score >= 2.5) return 'var(--orange)';
    return 'var(--pink)';
  };

  const getScoreLabel = (score) => {
    if (score >= 3.5) return 'Ready for Engineering'; // Bug fix: changed from 'Ready for POC'
    if (score >= 2.5) return 'Needs work';
    return 'Blocked';
  };

  return (
    <div className="section fade-in" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Agent <span className="gradient-text">Pipeline</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Writer → QC → Debate agents running in sequence
        </p>
      </div>

      {/* Agent Status */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <div className={`badge ${currentAgent === 'writer' ? 'badge-writer' : ''}`} style={{
          opacity: currentAgent === 'writer' || prdText ? 1 : 0.4,
        }}>
          {currentAgent === 'writer' && '⚡'} Writer {prdText && '✓'}
        </div>
        <div className={`badge ${currentAgent === 'qc' ? 'badge-qc' : ''}`} style={{
          opacity: currentAgent === 'qc' || qcResult ? 1 : 0.4,
        }}>
          {isQCLoading && <div className="typing-dots" style={{ display: 'inline-flex', transform: 'scale(0.5)', marginRight: '4px' }}><span></span><span></span><span></span></div>}
          {currentAgent === 'qc' && !isQCLoading && '⚡'} QC {qcResult && '✓'}
        </div>
        <div className={`badge ${currentAgent === 'debate' ? 'badge-debate' : ''}`} style={{
          opacity: currentAgent === 'debate' || debateResult ? 1 : 0.4,
        }}>
          {isDebateLoading && <div className="typing-dots" style={{ display: 'inline-flex', transform: 'scale(0.5)', marginRight: '4px' }}><span></span><span></span><span></span></div>}
          {currentAgent === 'debate' && !isDebateLoading && '⚡'} Debate {debateResult && '✓'}
        </div>
      </div>

      {/* Error Message */}
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
              Generated PRD
            </h2>
            {isStreaming && (
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
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
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
          }}>
            {prdText}
          </div>
        </div>
      )}

      {/* QC Results */}
      {qcResult && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            QC Agent Results
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-xs)',
              background: `rgba(${qcResult.scores.average >= 3.5 ? '74, 222, 128' : qcResult.scores.average >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.1)`,
              border: `1px solid rgba(${qcResult.scores.average >= 3.5 ? '74, 222, 128' : qcResult.scores.average >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.3)`,
              color: getScoreColor(qcResult.scores.average),
              fontSize: '14px',
              fontWeight: 700,
            }}>
              {getScoreLabel(qcResult.scores.average)} — {qcResult.scores.average.toFixed(1)}/5
            </div>
            {['clarity', 'feasibility', 'scope', 'testability'].map(dim => (
              <div key={dim} style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}>
                {dim}: {qcResult.scores[dim]}/5
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {qcResult.comments.length} constructive comment{qcResult.comments.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Debate Results */}
      {debateResult && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            Debate Agent Results
          </h2>
          {debateResult.escalated && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.3)',
              marginBottom: '16px',
            }}>
              <div className="badge badge-escalated" style={{ marginBottom: '8px' }}>
                ESCALATED
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {debateResult.escalationReason}
              </div>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {debateResult.comments.length} comment{debateResult.comments.length !== 1 ? 's' : ''} (
            {debateResult.comments.filter(c => c.type === 'adversarial').length} adversarial,
            {' '}{debateResult.comments.filter(c => c.type === 'constructive').length} constructive)
          </div>
        </div>
      )}
    </div>
  );
}
