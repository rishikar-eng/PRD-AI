import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';

/**
 * SPEC: Dashboard Component
 * Purpose: Display list of user's saved PRD projects with resume/delete actions
 * Inputs: { onNewProject, onResumeProject } callbacks
 * Outputs: Renders project list UI
 * Side effects: Fetches projects from /api/projects on mount
 * Error states: Shows error message if fetch fails
 */
export default function Dashboard({ onNewProject, onResumeProject }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load projects');

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError('Could not load projects. Please refresh the page.');
      console.error('Load projects error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}``, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Delete failed');

      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      alert('Failed to delete project');
      console.error('Delete error:', err);
    }
  };

  const getStageLabel = (stage) => {
    const labels = {
      0: 'Draft',
      1: 'Intake',
      2: 'Generating',
      5: 'In Review',
      6: 'Complete',
    };
    return labels[stage] || 'Draft';
  };

  const getStageColor = (stage) => {
    const colors = {
      0: 'var(--border)',
      1: 'var(--orange)',
      2: 'var(--teal)',
      5: 'var(--pink)',
      6: 'var(--green-bright)',
    };
    return colors[stage] || 'var(--border)';
  };

  if (isLoading) {
    return (
      <div className="section fade-in" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="section fade-in" style={{ paddingTop: '100px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '8px' }}>
            Your <span className="gradient-text">PRDs</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <button className="btn-primary" onClick={onNewProject}>
          + New PRD
        </button>
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

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            No PRDs yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Create your first PRD to get started
          </p>
          <button className="btn-secondary" onClick={onNewProject}>
            Create PRD
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {projects.map((project) => (
            <div
              key={project.id}
              className="card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '24px',
              }}
              onClick={() => onResumeProject(project.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                    {project.title}
                  </h3>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: `1px solid ${getStageColor(project.stage)}`,
                    color: getStageColor(project.stage),
                  }}>
                    {getStageLabel(project.stage)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResumeProject(project.id);
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--pink)';
                    e.currentTarget.style.color = 'var(--pink)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
