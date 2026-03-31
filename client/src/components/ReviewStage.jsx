import React, { useState, useRef } from 'react';
import PRDDocument from './PRDDocument';
import CommentPanel from './CommentPanel';
import { API_URL } from '../config';

export default function ReviewStage({ pipelineData, intakeData, onFinalize }) {
  const [comments, setComments] = useState(() => {
    // Combine QC and Debate comments
    const allComments = [
      ...(pipelineData.qcResult?.comments || []),
      ...(pipelineData.debateResult?.comments || []),
    ];
    return allComments;
  });

  const [highlightedSections, setHighlightedSections] = useState([]);
  const [activeTab, setActiveTab] = useState('comments');
  const [shareUrl, setShareUrl] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Local PRD state so it can be updated after regeneration
  const [prdText, setPrdText] = useState(pipelineData.prd);
  const prdAccumulator = useRef('');

  // Local intake messages — starts from passed-in history, grows with continued conversation
  const [localMessages, setLocalMessages] = useState(intakeData?.messages || []);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSendIntakeMessage = async (text) => {
    setLocalMessages(prev => [...prev, { role: 'user', content: text }]);
    setHasNewMessages(true);
    setIsSendingMessage(true);

    try {
      const response = await fetch(`${API_URL}/api/intake/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reply: text }),
      });
      const data = await response.json();

      if (data.complete) {
        setLocalMessages(prev => [...prev, {
          role: 'assistant',
          content: '✓ Got it! Click "Regenerate PRD" to update your document with these changes.',
        }]);
      } else {
        setLocalMessages(prev => [...prev, { role: 'assistant', content: data.question }]);
      }
    } catch (error) {
      setLocalMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRegeneratePRD = async () => {
    setIsRegenerating(true);
    setPrdText('');
    prdAccumulator.current = '';

    try {
      // Step 1: Extract fresh structuredData from updated conversation
      const extractRes = await fetch(`${API_URL}/api/intake/extract`, {
        method: 'POST',
        credentials: 'include',
      });
      const { structuredData } = await extractRes.json();

      // Step 2: Stream new PRD from writer agent
      const writerRes = await fetch(`${API_URL}/api/agents/writer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ structuredData }),
      });

      const reader = writerRes.body.getReader();
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
            const chunk = JSON.parse(line.slice(6));
            if (chunk.content) {
              prdAccumulator.current += chunk.content;
              setPrdText(prdAccumulator.current);
            }
            if (chunk.done) {
              setIsRegenerating(false);
              setHasNewMessages(false);
            }
          }
        }
      }
    } catch (error) {
      setIsRegenerating(false);
      alert('Failed to regenerate PRD. Please try again.');
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/projects/current/share`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to generate share link');
        return;
      }
      setShareUrl(data.shareUrl);
    } catch (error) {
      alert('Failed to generate share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCommentAction = (commentId, action, ownerResponse) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          status: action,
          ownerResponse: ownerResponse || null,
        };
      }
      return comment;
    }));

    // Highlight the section if accepted
    if (action === 'accepted') {
      const comment = comments.find(c => c.id === commentId);
      if (comment && !highlightedSections.includes(comment.section)) {
        setHighlightedSections(prev => [...prev, comment.section]);
      }
    }
  };

  const allActioned = comments.every(c => c.status === 'accepted' || c.status === 'rejected');
  const averageScore = pipelineData.qcResult?.scores?.average || 0;

  // Parse actual section titles from the live PRD text for fuzzy highlight matching
  const prdSections = prdText
    ? prdText.split(/\n## /).slice(1).map(s => s.split('\n')[0].trim())
    : [];

  const handleHighlightSection = (sectionTitle) => {
    setHighlightedSections(prev =>
      prev.includes(sectionTitle)
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  return (
    <div style={{ marginTop: '80px' }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 32px',
        padding: '0 32px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Owner <span className="gradient-text">Review</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '16px' }}>
          Review and action all agent comments to finalize the PRD
        </p>

        {/* Share */}
        <div style={{ marginBottom: '16px' }}>
          {!shareUrl ? (
            <button
              className="btn-secondary"
              onClick={handleShare}
              disabled={shareLoading}
              style={{ fontSize: '13px' }}
            >
              {shareLoading ? 'Generating link...' : 'Share PRD'}
            </button>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(74, 222, 128, 0.05)',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              borderRadius: 'var(--radius-xs)',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shareUrl}
              </span>
              <button
                className="btn-secondary"
                onClick={handleCopyLink}
                style={{ fontSize: '12px', padding: '4px 10px', flexShrink: 0 }}
              >
                {shareCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>

        {/* Score Summary */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-xs)',
            background: `rgba(${averageScore >= 3.5 ? '74, 222, 128' : averageScore >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.1)`,
            border: `1px solid rgba(${averageScore >= 3.5 ? '74, 222, 128' : averageScore >= 2.5 ? '251, 146, 60' : '244, 114, 182'}, 0.3)`,
            color: averageScore >= 3.5 ? 'var(--green-bright)' : averageScore >= 2.5 ? 'var(--orange)' : 'var(--pink)',
            fontSize: '14px',
            fontWeight: 700,
          }}>
            QC Score: {averageScore.toFixed(1)}/5
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border)',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}>
            {comments.length} total comments
          </div>
          {pipelineData.debateResult?.escalated && (
            <div className="badge badge-escalated">
              Debate Escalated
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 32px 80px',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '24px',
        minHeight: 'calc(100vh - 300px)',
      }}>
        {/* Left: PRD Document */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <PRDDocument
            prdText={prdText}
            highlightedSections={highlightedSections}
            isRegenerating={isRegenerating}
          />
        </div>

        {/* Right: Comments Panel */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <CommentPanel
            comments={comments}
            onCommentAction={handleCommentAction}
            intakeData={intakeData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            prdSections={prdSections}
            highlightedSections={highlightedSections}
            onHighlightSection={handleHighlightSection}
            localMessages={localMessages}
            isSendingMessage={isSendingMessage}
            hasNewMessages={hasNewMessages}
            isRegenerating={isRegenerating}
            onSendMessage={handleSendIntakeMessage}
            onRegeneratePRD={handleRegeneratePRD}
          />
        </div>
      </div>

      {/* Finalize Modal/Button */}
      {allActioned && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 100,
        }}>
          <button
            className="btn-primary"
            onClick={() => onFinalize({ prd: prdText, comments })}
            style={{
              fontSize: '16px',
              padding: '16px 32px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            Finalize PRD →
          </button>
        </div>
      )}
    </div>
  );
}
