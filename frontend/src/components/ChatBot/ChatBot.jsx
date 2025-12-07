import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography, transitions } from '../../utils/designSystem';
import { sendChatMessage } from '../../services/chatService';
import { showToast } from '../../utils/toast';

const ChatBot = ({ inline = false }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(inline); // If inline, start open
  const [isOnHomeTab, setIsOnHomeTab] = useState(false);
  
  // Check if we're on a dashboard route
  const isDashboardRoute = location.pathname.includes('student-dashboard') || 
                          location.pathname.includes('staff-dashboard') ||
                          location.pathname.includes('professor-dashboard') ||
                          location.pathname.includes('ta-dashboard') ||
                          location.pathname.includes('eventoffice-dashboard') ||
                          location.pathname.includes('vendor-dashboard') ||
                          location.pathname.includes('admin-dashboard') ||
                          location.pathname.includes('Student-dashboard') ||
                          location.pathname.includes('StaffDashboard') ||
                          location.pathname.includes('ProfessorDashboard') ||
                          location.pathname.includes('TaDashboard') ||
                          location.pathname.includes('EventOfficeDashboard') ||
                          location.pathname.includes('VendorDashboard');
  
  // Check if we're on the home tab by looking for the inline chat element
  useEffect(() => {
    if (isDashboardRoute) {
      // Check if inline chat is visible (which means we're on home tab)
      const checkHomeTab = () => {
        const inlineChat = document.querySelector('[data-inline-chat="true"]');
        const isHome = inlineChat !== null && inlineChat.offsetParent !== null; // Check if element is visible
        setIsOnHomeTab(isHome);
      };
      
      // Check immediately
      checkHomeTab();
      
      // Check periodically when on dashboard (when tabs switch, DOM changes)
      const interval = setInterval(checkHomeTab, 300);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      setIsOnHomeTab(false);
    }
  }, [isDashboardRoute, location.pathname]);
  
  // Show floating button if:
  // 1. Not inline mode
  // 2. On dashboard route BUT not on home tab (or not on dashboard route at all)
  const shouldShowFloatingButton = !inline && (isDashboardRoute ? !isOnHomeTab : true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! 👋 I'm here to help you. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage.text);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.message || response.text || "I'm sorry, I didn't understand that. Could you please rephrase?",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      showToast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Floating Chat Button - Only show if not inline and not on dashboard home */}
      {shouldShowFloatingButton && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            bottom: spacing['4xl'],
            right: spacing['2xl'],
            width: '60px',
            height: '60px',
            borderRadius: borderRadius.full,
            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
            border: 'none',
            boxShadow: shadows.xl,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: transitions.fast,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = isOpen ? 'rotate(180deg) scale(1.1)' : 'scale(1.1)';
            e.target.style.boxShadow = shadows.accentHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = isOpen ? 'rotate(180deg) scale(1)' : 'scale(1)';
            e.target.style.boxShadow = shadows.xl;
          }}
          aria-label="Open chat"
        >
          {isOpen ? (
            <span style={{ fontSize: '24px', color: colors.white }}>✕</span>
          ) : (
            <span style={{ fontSize: '28px' }}>💬</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: inline ? 'relative' : 'fixed',
            bottom: inline ? 'auto' : '100px',
            right: inline ? 'auto' : spacing['2xl'],
            width: inline ? '100%' : '380px',
            maxWidth: inline ? '100%' : 'calc(100vw - 40px)',
            height: inline ? '400px' : '600px',
            maxHeight: inline ? '400px' : 'calc(100vh - 120px)',
            background: colors.white,
            borderRadius: inline ? borderRadius.xl : borderRadius['3xl'],
            boxShadow: inline ? shadows.sm : shadows.lg,
            display: 'flex',
            flexDirection: 'column',
            zIndex: inline ? 1 : 999,
            overflow: 'hidden',
            border: `1px solid ${colors.gray200}`,
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
              padding: `${spacing.lg} ${spacing.xl}`,
              color: colors.white,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              boxShadow: shadows.md,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.full,
                background: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>
                Chat Assistant
              </div>
              <div style={{ fontSize: typography.fontSize.sm, opacity: 0.9 }}>
                We're here to help
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: spacing.lg,
              background: colors.gray50,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeIn 0.3s ease-in',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: message.sender === 'user' 
                      ? `${borderRadius.xl} ${borderRadius.xl} ${borderRadius.xl} 0`
                      : `0 ${borderRadius.xl} ${borderRadius.xl} ${borderRadius.xl}`,
                    background: message.sender === 'user'
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                      : colors.white,
                    color: message.sender === 'user' ? colors.white : colors.gray800,
                    boxShadow: shadows.sm,
                    wordWrap: 'break-word',
                    fontSize: typography.fontSize.base,
                    lineHeight: typography.lineHeight.relaxed,
                  }}
                >
                  <div>{message.text}</div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      opacity: 0.7,
                      marginTop: spacing.xs,
                      textAlign: 'right',
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <div
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: `0 ${borderRadius.xl} ${borderRadius.xl} ${borderRadius.xl}`,
                    background: colors.white,
                    boxShadow: shadows.sm,
                    display: 'flex',
                    gap: spacing.xs,
                  }}
                >
                  <span style={{ animation: 'bounce 1s infinite' }}>●</span>
                  <span style={{ animation: 'bounce 1s infinite 0.2s' }}>●</span>
                  <span style={{ animation: 'bounce 1s infinite 0.4s' }}>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: spacing.lg,
              background: colors.white,
              borderTop: `1px solid ${colors.gray200}`,
            }}
          >
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: `${spacing.md} ${spacing.lg}`,
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.base,
                  outline: 'none',
                  transition: transitions.fast,
                  background: colors.white,
                  color: colors.gray800,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray300;
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  background: inputMessage.trim() && !isLoading
                    ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`
                    : colors.gray300,
                  color: colors.white,
                  border: 'none',
                  borderRadius: borderRadius.xl,
                  cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  fontSize: typography.fontSize.lg,
                  transition: transitions.fast,
                  boxShadow: inputMessage.trim() && !isLoading ? shadows.md : 'none',
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim() && !isLoading) {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = shadows.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputMessage.trim() && !isLoading) {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = shadows.md;
                  }
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default ChatBot;

