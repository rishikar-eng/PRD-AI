import React, { useState } from 'react';
import { API_URL } from '../config';
import AgentPipelineV2 from './AgentPipelineV2';

const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB — beyond this the file won't fit in the model context anyway

export default function ExternalPRDReview({ originalPRD, onComplete, onBack }) {
  const [uploadedPRD, setUploadedPRD] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showAgentPipeline, setShowAgentPipeline] = useState(false);
  const [pipelineData, setPipelineData] = useState(null);
  const [isGeneratingClaudeContext, setIsGeneratingClaudeContext] = useState(false);
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isTextFile = file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md');
    if (!isTextFile) {
      alert('Please upload a .txt or .md file');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(2);
      alert(`File is ${sizeMb} MB. Maximum allowed is 1 MB.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setUploadedPRD(content);
      setShowComparison(true);
    };
    reader.readAsText(file);
  };

  const handleStartReview = () => {
    setShowComparison(false);
    setShowAgentPipeline(true);
  };

  const handlePipelineComplete = (data) => {
    setPipelineData(data);
  };

  const handleGenerateClaudeContext = async () => {
    setIsGeneratingClaudeContext(true);
    try {
      const response = await fetch(`${API_URL}/api/agents/generate-claude-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          originalPRD,
          externalPRD: uploadedPRD,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate claude.md');

      const data = await response.json();

      // Download claude.md
      const blob = new Blob([data.claudeContext], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claude_${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Generate claude.md error:', error);
      alert('Failed to generate claude.md');
    } finally {
      setIsGeneratingClaudeContext(false);
    }
  };

  const handleClaudeCodeHandoff = async () => {
    setIsGeneratingHandoff(true);
    try {
      // Extract feature name from PRD or use default
      const featureNameMatch = uploadedPRD?.match(/^#\s+(.+)$/m);
      const featureName = featureNameMatch ? featureNameMatch[1] : 'Feature';

      const response = await fetch(`${API_URL}/api/handoff/claude-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          originalPRD,
          externalPRD: uploadedPRD,
          agentFeedback: pipelineData?.agentFeedback || {},
          featureName
        }),
      });

      if (!response.ok) throw new Error('Failed to generate Claude Code handoff bundle');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claude_code_handoff_${featureName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Claude Code handoff error:', error);
      alert('Failed to generate Claude Code handoff bundle');
    } finally {
      setIsGeneratingHandoff(false);
    }
  };

  // File upload view
  if (!uploadedPRD) {
    return (
      <div className="section fade-in" style={{ maxWidth: '600px' }}>
        <button
          className="btn-secondary"
          onClick={onBack}
          style={{ marginBottom: '24px' }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>
          Upload <span className="gradient-text">External PRD</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
          Upload a PRD that you've refined with Claude or another tool. We'll compare it with your original PRD and run it through our specialist agents.
        </p>

        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <input
            type="file"
            accept=".md,.txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="external-prd-upload"
          />
          <label
            htmlFor="external-prd-upload"
            className="btn-primary"
            style={{ cursor: 'pointer' }}
          >
            Choose File (.md or .txt)
          </label>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px' }}>
            Select your refined PRD file
          </p>
        </div>
      </div>
    );
  }

  // Side-by-side comparison view
  if (showComparison) {
    return (
      <div className="section fade-in" style={{ maxWidth: '1400px' }}>
        <button
          className="btn-secondary"
          onClick={() => {
            setUploadedPRD(null);
            setShowComparison(false);
          }}
          style={{ marginBottom: '24px' }}
        >
          ← Upload Different File
        </button>

        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', textAlign: 'center' }}>
          PRD <span className="gradient-text">Comparison</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>
          Review the changes between your original PRD and the external version.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {/* Original PRD */}
          <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              Original PRD (Our Pipeline)
            </h2>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              maxHeight: '600px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}>
              {originalPRD}
            </div>
          </div>

          {/* External PRD */}
          <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              External PRD (Claude/Other)
            </h2>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              maxHeight: '600px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}>
              {uploadedPRD}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-primary"
            onClick={handleStartReview}
          >
            Start Agent Review
          </button>
        </div>
      </div>
    );
  }

  // Agent pipeline view
  if (showAgentPipeline && !pipelineData) {
    return (
      <AgentPipelineV2
        structuredData={{}}
        onComplete={handlePipelineComplete}
        externalPRDMode={true}
        externalPRD={uploadedPRD}
        originalPRD={originalPRD}
      />
    );
  }

  // Final review screen with all details
  return (
    <div className="section fade-in" style={{ maxWidth: '1200px' }}>
      <button
        className="btn-secondary"
        onClick={onBack}
        style={{ marginBottom: '24px' }}
      >
        ← Back to PRD
      </button>

      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', textAlign: 'center' }}>
        External PRD <span className="gradient-text">Review Summary</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>
        All specialist agents have reviewed your external PRD. Review the feedback below before generating the implementation context.
      </p>

      {/* External PRD Display */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
          External PRD (Uploaded)
        </h2>
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
          {uploadedPRD}
        </div>
      </div>

      {/* Agent Feedback Sections */}
      {pipelineData?.agentFeedback && Object.keys(pipelineData.agentFeedback).filter(key => key !== 'debate').map(agentKey => {
        const agent = pipelineData.agentFeedback[agentKey];
        const agentLabels = {
          deliveryReality: 'Delivery Reality',
          technicalFeasibility: 'Technical Feasibility',
          businessValue: 'Business Value',
          security: 'Security',
        };

        if (!agent.complete) return null;

        return (
          <div key={agentKey} className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
              {agentLabels[agentKey]} Agent
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {agent.comments?.length || 0} concern{(agent.comments?.length || 0) !== 1 ? 's' : ''}
            </div>
            {agent.comments?.slice(0, 5).map((comment, idx) => (
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
            {agent.comments && agent.comments.length > 5 && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                ... and {agent.comments.length - 5} more concerns
              </div>
            )}
          </div>
        );
      })}

      {/* Debate Agent */}
      {pipelineData?.agentFeedback?.debate?.complete && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            Debate Agent (Meta-Layer)
          </h2>
          {pipelineData.agentFeedback.debate.escalated && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251, 146, 60, 0.1)',
              border: '1px solid rgba(251, 146, 60, 0.3)',
              marginBottom: '16px',
            }}>
              <div className="badge badge-escalated" style={{ marginBottom: '8px' }}>ESCALATED</div>
              <div style={{ fontSize: '13px' }}>
                {pipelineData.agentFeedback.debate.escalationReason}
              </div>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {pipelineData.agentFeedback.debate.comments?.length || 0} meta-level concern{(pipelineData.agentFeedback.debate.comments?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Generate Buttons */}
      <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '12px' }}>
          <button
            className="btn-primary"
            onClick={handleGenerateClaudeContext}
            disabled={isGeneratingClaudeContext || isGeneratingHandoff}
            style={{ fontSize: '16px', padding: '14px 32px' }}
          >
            {isGeneratingClaudeContext ? 'Generating...' : 'Generate Claude Context (.md)'}
          </button>
          <button
            className="btn-primary"
            onClick={handleClaudeCodeHandoff}
            disabled={isGeneratingClaudeContext || isGeneratingHandoff}
            style={{ fontSize: '16px', padding: '14px 32px' }}
          >
            {isGeneratingHandoff ? 'Generating...' : 'Claude Code Handoff'}
          </button>
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Download just the CLAUDE.md file, or get the full handoff bundle (PRD + CLAUDE.md + theme reference)
        </p>
      </div>
    </div>
  );
}
