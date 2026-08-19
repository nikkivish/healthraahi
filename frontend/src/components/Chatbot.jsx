import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  listAiSessions,
  createAiSession,
  getAiSession,
  sendAiMessage,
} from '../api';

const ROLE_CONFIG = {
  WORKER: {
    title: 'HealthRaahi AI Assistant',
    placeholder: 'Type your health question...',
    quickQuestions: [
      'Explain my medical record',
      'What does this medical term mean?',
      'Explain my prescription',
    ],
    welcome:
      "Welcome to HealthRaahi AI Assistant! I can help you understand your medical records, prescriptions, and health terms. How can I help you today?",
  },
  DOCTOR: {
    title: 'Clinical AI Assistant',
    placeholder: 'Ask a clinical question...',
    quickQuestions: [
      'Summarize recent records',
      'Explain abnormal values',
      'Summarize prescriptions',
      'Suggest follow-up questions',
    ],
    welcome:
      "Welcome to Clinical AI Assistant! I can help you review clinical information, understand lab values, and draft follow-up questions. How can I assist you today?",
  },
};

const DISCLAIMER = 'Responses are for informational assistance only and do not constitute medical advice.';

function TypingIndicator() {
  return (
    <div className="chatbot-typing">
      <span className="chatbot-typing-dot" />
      <span className="chatbot-typing-dot" />
      <span className="chatbot-typing-dot" />
    </div>
  );
}

export default function Chatbot() {
  const { token, user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const config = useMemo(() => ROLE_CONFIG[isDoctor ? 'DOCTOR' : 'WORKER'], [isDoctor]);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasLoaded = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !token || hasLoaded.current) return;

    let cancelled = false;

    const loadSession = async () => {
      setIsLoading(true);
      setError('');

      try {
        const listRes = await listAiSessions(token);
        const sessions = listRes.data?.sessions || [];

        if (cancelled) return;

        if (sessions.length > 0) {
          const latest = sessions[0];
          setSessionId(latest.id);
          setMessages(latest.messages || []);
        } else {
          const createRes = await createAiSession(token);
          if (cancelled) return;

          const newSession = createRes.data?.session;
          setSessionId(newSession?.id || null);
          setMessages([
            { role: 'assistant', content: config.welcome },
          ]);
        }
      } catch (err) {
        if (cancelled) return;

        if (err.status === 401) {
          setError('Please log in to use the AI Assistant.');
        } else {
          setError(err.message || 'Failed to load chat session.');
        }
        setMessages([
          { role: 'assistant', content: config.welcome },
        ]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSession();

    return () => { cancelled = true; };
  }, [isOpen, token]);

  const handleOpen = () => {
    hasLoaded.current = false;
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    hasLoaded.current = false;
  };

  const handleSend = async (text) => {
    const content = (text || input).trim();
    if (!content || isTyping) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setIsTyping(true);
    setError('');

    let currentSessionId = sessionId;

    try {
      if (!currentSessionId) {
        const createRes = await createAiSession(token);
        currentSessionId = createRes.data?.session?.id || null;
        setSessionId(currentSessionId);

        if (!currentSessionId) {
          throw new Error('Failed to create chat session.');
        }
      }

      const res = await sendAiMessage(token, currentSessionId, content);
      const updatedSession = res.data?.session;

      if (updatedSession?.messages) {
        setMessages(updatedSession.messages);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I received an empty response. Please try again.' },
        ]);
      }
    } catch (err) {
      if (err.status === 401) {
        setError('Your session expired. Please log in again.');
      } else if (!navigator.onLine) {
        setError('You are offline. Please check your connection.');
      } else {
        setError(err.message || 'Failed to send message. Please try again.');
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user || !token) return null;

  return (
    <>
      {!isOpen && (
        <button
          className="chatbot-fab"
          type="button"
          aria-label="Open AI Health Assistant"
          onClick={handleOpen}
        >
          <span className="chatbot-fab-icon">✦</span>
          <span className="chatbot-fab-label">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-overlay">
          <div className="chatbot-panel">
            <div className="chatbot-header">
              <div className="chatbot-header-left">
                <span className="chatbot-header-icon">✦</span>
                <span className="chatbot-header-title">{config.title}</span>
              </div>
              <button
                className="chatbot-close"
                type="button"
                aria-label="Close chat"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>

            <div className="chatbot-messages">
              {isLoading && (
                <div className="chatbot-loading">
                  <TypingIndicator />
                  <span>Loading conversation...</span>
                </div>
              )}

              {!isLoading && error && !messages.length && (
                <div className="chatbot-error-banner">{error}</div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chatbot-bubble chatbot-bubble--${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="chatbot-avatar">✦</span>
                  )}
                  <div className="chatbot-bubble-text">{msg.content}</div>
                </div>
              ))}

              {isTyping && (
                <div className="chatbot-bubble chatbot-bubble--assistant">
                  <span className="chatbot-avatar">✦</span>
                  <TypingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {error && messages.length > 0 && (
              <div className="chatbot-error-inline">{error}</div>
            )}

            {!isLoading && messages.length <= 2 && (
              <div className="chatbot-quick">
                <div className="chatbot-quick-label">Quick questions</div>
                <div className="chatbot-quick-list">
                  {config.quickQuestions.map((q) => (
                    <button
                      key={q}
                      className="chatbot-quick-btn"
                      type="button"
                      onClick={() => handleSend(q)}
                      disabled={isTyping}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chatbot-input-bar">
              <input
                ref={inputRef}
                className="chatbot-input"
                type="text"
                placeholder={config.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping || isLoading}
              />
              <button
                className="chatbot-send"
                type="button"
                aria-label="Send message"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping || isLoading}
              >
                ➤
              </button>
            </div>
            <div className="chatbot-disclaimer">{DISCLAIMER}</div>
          </div>
        </div>
      )}
    </>
  );
}
