import React from 'react';

const STAGES = [
  'Idea Capture',
  'AI Intake',
  'Writer Agent',
  'QC Agent',
  'Debate Agent',
  'Owner Review'
];

export default function StageIndicator({ currentStage }) {
  return (
    <div className="stage-indicator">
      {STAGES.map((stage, index) => (
        <React.Fragment key={index}>
          <div
            className={`stage-dot ${index < currentStage ? 'complete' : ''} ${index === currentStage ? 'active' : ''}`}
            title={stage}
          />
          {index < STAGES.length - 1 && (
            <div className={`stage-line ${index < currentStage ? 'complete' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
