import React, { useState } from 'react';
import PRDPickerModal from './PRDPickerModal';

const ROLES = ['CEO / Founder', 'Product', 'Tech Lead', 'R&D'];
const INPUT_MODES = ['oneline', 'notes', 'upload'];
const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB — beyond this the file won't fit in the model context anyway

export default function EntryMode({ onNext }) {
  const [selectedMode, setSelectedMode] = useState('oneline');
  const [selectedRole, setSelectedRole] = useState('');
  const [input, setInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [contextPrdIds, setContextPrdIds] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

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

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setInput(event.target.result);
    };
    reader.readAsText(file);
  };

  const canProceed = () => {
    return selectedRole && input.trim().length >= 10;
  };

  const handleNext = () => {
    if (canProceed()) {
      onNext({
        role: selectedRole,
        input: input.trim(),
        inputMode: selectedMode,
        contextPrdIds,
      });
    }
  };

  return (
    <div className="section fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Start with an <span className="gradient-text">Idea</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.7 }}>
          Enter your feature idea in any format. The AI will interview you to fill in the gaps.
        </p>
      </div>

      {/* Entry Mode Selection */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Entry Mode
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`chip ${selectedMode === 'oneline' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('oneline')}
          >
            One-liner
          </button>
          <button
            className={`chip ${selectedMode === 'notes' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('notes')}
          >
            Rough notes
          </button>
          <button
            className={`chip ${selectedMode === 'upload' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('upload')}
          >
            Upload file
          </button>
        </div>

        {/* Input Area */}
        {selectedMode === 'oneline' && (
          <input
            type="text"
            placeholder="e.g. Auto-generate AD scripts from silence gaps in video timelines..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ fontSize: '15px' }}
          />
        )}

        {selectedMode === 'notes' && (
          <textarea
            placeholder="Paste email threads, rough briefs, scattered notes — anything. The AI will parse it."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ minHeight: '180px', fontSize: '14px' }}
          />
        )}

        {selectedMode === 'upload' && (
          <div>
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="btn-secondary"
              style={{ display: 'inline-block', cursor: 'pointer', marginBottom: '12px' }}
            >
              Choose .txt or .md file
            </label>
            {fileName && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Loaded: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fileName}</span>
              </div>
            )}
            {input && (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ minHeight: '180px', fontSize: '14px' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Role Selection */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Your Role
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ROLES.map((role) => (
            <button
              key={role}
              className={`chip ${selectedRole === role ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Past-PRD context picker */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Reference past PRDs <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Selected PRDs are included as context for the writer and specialists — useful when this feature builds on or relates to past work.
            </div>
            {contextPrdIds.length > 0 && (
              <div style={{
                marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '4px 10px', borderRadius: '999px',
                background: 'rgba(94, 234, 212, 0.08)',
                border: '1px solid rgba(94, 234, 212, 0.25)',
                fontSize: '12px', fontWeight: 600, color: 'var(--teal)',
              }}>
                {contextPrdIds.length} PRD{contextPrdIds.length === 1 ? '' : 's'} selected
              </div>
            )}
          </div>
          <button
            className="btn-secondary"
            onClick={() => setPickerOpen(true)}
            style={{ flexShrink: 0, fontSize: '13px' }}
          >
            {contextPrdIds.length > 0 ? 'Edit selection' : 'Choose PRDs'}
          </button>
        </div>
      </div>

      {/* Next Button */}
      <div style={{ textAlign: 'right' }}>
        <button
          className="btn-primary"
          disabled={!canProceed()}
          onClick={handleNext}
        >
          Begin AI Intake →
        </button>
      </div>

      {pickerOpen && (
        <PRDPickerModal
          initialSelectedIds={contextPrdIds}
          onClose={() => setPickerOpen(false)}
          onSave={(ids) => setContextPrdIds(ids)}
        />
      )}
    </div>
  );
}
