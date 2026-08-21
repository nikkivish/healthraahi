import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  listAiSessions,
  createAiSession,
  getAiSession,
  sendAiMessage,
  listAnalyzableDocuments,
  analyzeAiDocument,
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

const ANALYSIS_ACTIONS = [
  { key: 'analyze', label: 'Analyze this report' },
  { key: 'abnormal', label: 'Explain abnormal values' },
  { key: 'summarize', label: 'Summarize report' },
  { key: 'questions', label: 'What should I discuss with my doctor?' },
];

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

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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

  const [showDocPanel, setShowDocPanel] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analyzingAction, setAnalyzingAction] = useState(null);

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
    setShowDocPanel(false);
    setSelectedDoc(null);
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

  const handleToggleDocPanel = async () => {
    if (showDocPanel) {
      setShowDocPanel(false);
      setSelectedDoc(null);
      return;
    }

    setShowDocPanel(true);
    setSelectedDoc(null);
    setDocsError('');
    setDocuments([]);

    setDocsLoading(true);
    try {
      const res = await listAnalyzableDocuments(token, isDoctor ? user?.workerId : undefined);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      setDocsError(err.message || 'Failed to load documents.');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
  };

  const handleAnalyzeAction = async (action) => {
    if (!selectedDoc || analyzingAction) return;

    const actionLabel = ANALYSIS_ACTIONS.find((a) => a.key === action)?.label || action;
    setAnalyzingAction(action);
    setShowDocPanel(false);

    const userMsg = `📄 ${actionLabel}: ${selectedDoc.fileName}`;
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);
    setError('');

    try {
      const res = await analyzeAiDocument(
        token,
        selectedDoc.id,
        action,
        isDoctor ? user?.workerId : undefined
      );

      const result = res.data;
      let reply = result.analysis || 'No analysis could be generated for this document.';

      if (result.imageNote) {
        reply += `\n\nℹ️ ${result.imageNote}`;
      }

      reply += '\n\n⚕️ This is AI-generated information for reference only. Please consult a healthcare professional for medical advice.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err.status === 401) {
        setError('Your session expired. Please log in again.');
      } else if (!navigator.onLine) {
        setError('You are offline. Please check your connection.');
      } else {
        setError(err.message || 'Failed to analyze document. Please try again.');
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not analyze this document. Please try again later.' },
      ]);
    } finally {
      setIsTyping(false);
      setAnalyzingAction(null);
      setSelectedDoc(null);
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

            {showDocPanel && (
              <div className="chatbot-doc-panel">
                {selectedDoc ? (
                  <div className="chatbot-doc-actions">
                    <div className="chatbot-doc-actions-header">
                      <span className="chatbot-doc-actions-title">{selectedDoc.fileName}</span>
                      <button
                        className="chatbot-doc-back"
                        type="button"
                        onClick={() => setSelectedDoc(null)}
                      >
                        ← Back
                      </button>
                    </div>
                    <div className="chatbot-doc-actions-list">
                      {ANALYSIS_ACTIONS.map((action) => (
                        <button
                          key={action.key}
                          className="chatbot-doc-action-btn"
                          type="button"
                          onClick={() => handleAnalyzeAction(action.key)}
                          disabled={!!analyzingAction}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="chatbot-doc-list">
                    <div className="chatbot-doc-list-header">
                      <span className="chatbot-doc-list-title">
                        {isDoctor ? 'Select a report to analyze' : 'Your uploaded reports'}
                      </span>
                      <button
                        className="chatbot-doc-close"
                        type="button"
                        onClick={() => { setShowDocPanel(false); setSelectedDoc(null); }}
                      >
                        ✕
                      </button>
                    </div>
                    {docsLoading && (
                      <div className="chatbot-doc-loading">
                        <TypingIndicator />
                        <span>Loading documents...</span>
                      </div>
                    )}
                    {!docsLoading && docsError && (
                      <div className="chatbot-doc-error">{docsError}</div>
                    )}
                    {!docsLoading && !docsError && documents.length === 0 && (
                      <div className="chatbot-doc-empty">
                        No PDF or image reports found. Upload a medical report to analyze it.
                      </div>
                    )}
                    {!docsLoading && !docsError && documents.length > 0 && (
                      <div className="chatbot-doc-items">
                        {documents.map((doc) => (
                          <button
                            key={doc.id}
                            className="chatbot-doc-item"
                            type="button"
                            onClick={() => handleSelectDoc(doc)}
                          >
                            <div className="chatbot-doc-item-info">
                              <span className="chatbot-doc-item-name">{doc.fileName}</span>
                              <span className="chatbot-doc-item-meta">
                                {doc.documentType ? `${doc.documentType.replace(/_/g, ' ').toLowerCase()} · ` : ''}
                                {formatFileSize(doc.fileSize)}
                              </span>
                            </div>
                            <span className="chatbot-doc-item-arrow">›</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && messages.length > 0 && (
              <div className="chatbot-error-inline">{error}</div>
            )}

            {!isLoading && !showDocPanel && messages.length <= 2 && (
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
              <button
                className="chatbot-doc-toggle"
                type="button"
                aria-label="Analyze a report"
                onClick={handleToggleDocPanel}
                disabled={isTyping || isLoading}
                title="Analyze a medical report"
              >
                📄
              </button>
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
