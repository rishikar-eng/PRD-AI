import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';

export default function IntakeChat({ entryData, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start the intake conversation on mount
  useEffect(() => {
    startIntake();
  }, []);

  const startIntake = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/intake/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(entryData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([{ role: 'assistant', content: data.question }]);
        setSuggestions(data.suggestions || []);
      } else {
        setMessages([{ role: 'assistant', content: 'Error starting intake. Please try again.' }]);
      }
    } catch (error) {
      console.error('Start intake error:', error);
      setMessages([{ role: 'assistant', content: 'Connection error. Please refresh and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReply = async (reply) => {
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: reply }]);
    setUserInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/intake/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reply }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.complete) {
          // Intake complete, move to next stage
          const completionMessage = { role: 'assistant', content: '✓ Perfect! I have everything I need. Moving to PRD generation...' };
          setMessages(prev => {
            const updatedMessages = [...prev, completionMessage];
            setTimeout(() => {
              onComplete({ structuredData: data.structuredData, messages: updatedMessages });
            }, 1500);
            return updatedMessages;
          });
        } else {
          // Continue conversation
          setMessages(prev => [...prev, { role: 'assistant', content: data.question }]);
          setSuggestions(data.suggestions || []);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error processing your response. Please try again.'
        }]);
      }
    } catch (error) {
      console.error('Reply error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && !isLoading) {
      sendReply(userInput.trim());
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!isLoading) {
      sendReply(suggestion);
    }
  };

  return (
    <div className="section fade-in" style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          AI <span className="gradient-text">Intake Interview</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          The AI will ask until it has what it needs to write your PRD.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="card" style={{ marginBottom: '16px', minHeight: '400px', maxHeight: '500px', overflowY: 'auto', padding: '24px' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '20px',
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: '12px',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: msg.role === 'user' ? 'var(--pink)' : 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>

            {/* Message Bubble */}
            <div style={{
              background: msg.role === 'user' ? 'rgba(244, 114, 182, 0.1)' : 'var(--bg-surface)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(244, 114, 182, 0.2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              maxWidth: '75%',
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}>
              🤖
            </div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
            }}>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Quick replies:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="chip"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your answer or click a suggestion above..."
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!userInput.trim() || isLoading}
            style={{ whiteSpace: 'nowrap' }}
          >
            Send →
          </button>
        </div>
      </form>
    </div>
  );
}
