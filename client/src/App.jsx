import React, { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import StageIndicator from './components/StageIndicator';
import Dashboard from './components/Dashboard';
import EntryMode from './components/EntryMode';
import IntakeChat from './components/IntakeChat';
import SuccessMetric from './components/SuccessMetric';
import AgentPipelineV2 from './components/AgentPipelineV2';
import ReviewStage from './components/ReviewStage';
import ShareView from './components/ShareView';
import ExternalPRDReview from './components/ExternalPRDReview';
import RespondToInputRequest from './components/RespondToInputRequest';
import { API_URL } from './config';
import './styles/globals.css';
import './styles/components.css';

export default function App() {
  const [currentStage, setCurrentStage] = useState(null); // null = dashboard, 0-6 = pipeline stages
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [entryData, setEntryData] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [intakeMessages, setIntakeMessages] = useState([]);
  const [pipelineData, setPipelineData] = useState(null);
  const [finalPRD, setFinalPRD] = useState(null);
  const [pendingShareToken, setPendingShareToken] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [externalPRD, setExternalPRD] = useState(null);
  const [externalPipelineData, setExternalPipelineData] = useState(null);
  const [inputRequestId, setInputRequestId] = useState(null);

  // Check authentication status on mount; detect share URLs and input request URLs
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const token = path.split('/share/')[1];
      if (token) setPendingShareToken(token);
    } else if (path.startsWith('/respond/')) {
      const requestId = path.split('/respond/')[1];
      if (requestId) setInputRequestId(requestId);
    }
    checkAuth();
  }, []);

  // Once authenticated, auto-fetch share data if a token is pending
  useEffect(() => {
    if (isAuthenticated && pendingShareToken) {
      fetchShareData(pendingShareToken);
    }
  }, [isAuthenticated, pendingShareToken]);

  const fetchShareData = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/share/${token}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setShareData({ error: data.error || 'Share link not found' });
        return;
      }
      setShareData(data);
    } catch (error) {
      setShareData({ error: 'Failed to load shared PRD' });
    }
  };

  const handleCloseShare = () => {
    setShareData(null);
    setPendingShareToken(null);
    window.history.pushState({}, '', '/');
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (data.status === 1) {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (error) {
      setLoginError('Connection error. Please try again.');
    }
  };

  const handleNewProject = async () => {
    // Reset all state and start new pipeline
    setCurrentStage(0);
    setEntryData(null);
    setStructuredData(null);
    setPipelineData(null);
    setFinalPRD(null);

    // Create project immediately so projectId is available for input requests
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Untitled PRD',
          stage: 0,
          session_data: { stage: 0 },
        }),
      });

      if (response.ok) {
        const project = await response.json();
        console.log('Project created:', project.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleResumeProject = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/restore`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore project');
      }

      const data = await response.json();

      // Restore app state from project session data
      const state = data.sessionData;

      if (!state) {
        throw new Error('No session data in response');
      }

      setCurrentStage(state.stage);
      setEntryData(state.input || null);
      setStructuredData(state.intake?.structuredData || null);
      setIntakeMessages(state.intake?.conversationHistory || []);

      if (state.prd?.v0) {
        setPipelineData({
          prd: state.prd.v0,
          qcResult: state.prd.qcResult || {},
          debateResult: state.prd.debateResult || {},
        });
      }

      if (state.prd?.finalPRD) {
        setFinalPRD({
          prd: state.prd.finalPRD,
          comments: state.prd.allComments || [],
        });
      }

      // Restore external PRD data if available
      if (state.externalPRD?.uploaded) {
        setExternalPRD(state.externalPRD.externalPRD);
        setExternalPipelineData({
          prd: state.externalPRD.externalPRD,
          agentFeedback: state.externalPRD.agentFeedback,
          claudeContext: state.externalPRD.claudeContext,
        });
      }
    } catch (error) {
      console.error('Resume project error:', error);
      alert('Failed to resume project: ' + error.message);
    }
  };

  const handleEntryNext = (data) => {
    setEntryData(data);
    setCurrentStage(1); // Move to IntakeChat
  };

  const handleIntakeComplete = ({ structuredData, messages }) => {
    setStructuredData(structuredData);
    setIntakeMessages(messages);
    setCurrentStage(1.5); // Move to Success Metric stage
  };

  const handleMetricComplete = (updatedStructuredData) => {
    setStructuredData(updatedStructuredData);
    setCurrentStage(2); // Move to Agent Pipeline V2
  };

  const handlePipelineComplete = (data) => {
    setPipelineData(data);
    setCurrentStage(5); // Move to Review Stage
  };

  const handleFinalize = (data) => {
    setFinalPRD(data);
    setCurrentStage(6); // Move to Final Screen
  };

  // Share view - authenticated users viewing a shared PRD
  if (isAuthenticated && shareData) {
    return <ShareView data={shareData} onClose={handleCloseShare} />;
  }

  // Input request response page - NO authentication required (public link)
  if (inputRequestId) {
    return <RespondToInputRequest requestId={inputRequestId} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <>
        <NavBar />
        <main style={{ maxWidth: '420px', margin: '120px auto', padding: '0 24px' }}>
          <div className="card fade-in">
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
              Welcome to <span className="gradient-text">PRD Pipeline</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
              {pendingShareToken ? 'Sign in to view the shared PRD' : 'Sign in with your Rian credentials'}
            </p>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '20px'
              }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
                Sign In
              </button>
            </form>
          </div>
        </main>
        <footer className="footer">
          AI-Powered Media Localization · <a href="mailto:sales@rian.io">sales@rian.io</a> · <a href="https://www.rian.io">www.rian.io</a>
          <br />
          © 2026 Rikaian Technology Pvt. Ltd.
        </footer>
      </>
    );
  }

  // Main app - authenticated
  return (
    <>
      <NavBar />
      {currentStage !== null && <StageIndicator currentStage={currentStage} />}

      {currentStage === null && (
        <Dashboard onNewProject={handleNewProject} onResumeProject={handleResumeProject} />
      )}

      {currentStage === 0 && (
        <EntryMode onNext={handleEntryNext} />
      )}

      {currentStage === 1 && entryData && (
        <IntakeChat entryData={entryData} onComplete={handleIntakeComplete} />
      )}

      {currentStage === 1.5 && structuredData && (
        <SuccessMetric structuredData={structuredData} onComplete={handleMetricComplete} />
      )}

      {currentStage === 2 && structuredData && (
        <AgentPipelineV2 structuredData={structuredData} onComplete={handlePipelineComplete} />
      )}

      {currentStage === 5 && pipelineData && (
        <ReviewStage
          pipelineData={pipelineData}
          intakeData={{ messages: intakeMessages, structuredData }}
          onFinalize={handleFinalize}
        />
      )}

      {currentStage === 6 && finalPRD && (
        <div className="section fade-in" style={{ textAlign: 'center', paddingTop: '80px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}>
            ✓
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px' }}>
            PRD <span className="gradient-text">Complete!</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Your production-ready PRD has been finalized with all agent feedback incorporated.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button
              className="btn-primary"
              onClick={() => {
                navigator.clipboard.writeText(finalPRD.prd);
              }}
            >
              Copy PRD
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                const blob = new Blob([finalPRD.prd], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `PRD_${Date.now()}.md`; // Bug fix: changed from .txt to .md
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                // Go back to dashboard
                setCurrentStage(null);
                setEntryData(null);
                setStructuredData(null);
                setPipelineData(null);
                setFinalPRD(null);
              }}
            >
              Back to Dashboard
            </button>
          </div>

          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
              Prepare Stage 2 Handoff
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto 24px' }}>
              Generate a zip bundle for UI/UX design work. Contains your PRD, Rian theme reference, and a feature-aware Claude prompt. Take this to Claude web to create HTML mockups.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    const featureName = structuredData?.featureName || 'Feature';
                    const response = await fetch(`${API_URL}/api/handoff/stage2`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        prdText: finalPRD.prd,
                        featureName: featureName
                      })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to generate Stage 2 handoff bundle');
                    }

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `stage2_handoff_${featureName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    alert('Failed to generate Stage 2 handoff bundle. Please try again.');
                    console.error('Stage 2 handoff error:', error);
                  }
                }}
              >
                Download Stage 2 Bundle
              </button>
            </div>
          </div>

          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
              Review External PRD
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto 24px' }}>
              Upload a PRD that you've refined with Claude (or another tool) to get specialist agent feedback and generate implementation context.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => setCurrentStage(6.5)}
              >
                Upload External PRD
              </button>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Comment Summary
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <div>
                {finalPRD.comments.filter(c => c.status === 'accepted').length} accepted
              </div>
              <div>·</div>
              <div>
                {finalPRD.comments.filter(c => c.status === 'rejected').length} rejected
              </div>
              <div>·</div>
              <div>
                {finalPRD.comments.length} total comments
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStage === 6.5 && finalPRD && (
        <ExternalPRDReview
          originalPRD={finalPRD.prd}
          onComplete={(data) => {
            setExternalPipelineData(data);
            setCurrentStage(6);
          }}
          onBack={() => setCurrentStage(6)}
        />
      )}

      <footer className="footer">
        AI-Powered Media Localization · <a href="mailto:sales@rian.io">sales@rian.io</a> · <a href="https://www.rian.io">www.rian.io</a>
        <br />
        © 2026 Rikaian Technology Pvt. Ltd.
      </footer>
    </>
  );
}
