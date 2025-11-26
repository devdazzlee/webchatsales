'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatbot } from './ChatbotContext';

// Function to parse markdown and render as React elements
const parseMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    // Handle empty lines
    if (line.trim() === '') {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }
    
    // Handle numbered lists (e.g., "1. Item")
    if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+\.\s)(.*)/);
      if (match) {
        const [, number, content] = match;
        const parts = parseInlineMarkdown(content);
        elements.push(
          <div key={`line-${lineIndex}`} className="flex items-start gap-2 mb-1">
            <span className="flex-shrink-0" style={{ color: 'var(--emerald)' }}>{number}</span>
            <span>{parts}</span>
          </div>
        );
        return;
      }
    }
    
    // Handle regular lines with inline markdown
    const parts = parseInlineMarkdown(line);
    elements.push(
      <div key={`line-${lineIndex}`} className="mb-1">
        {parts}
      </div>
    );
  });
  
  return <>{elements}</>;
};

// Function to parse inline markdown (bold, italic, etc.)
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Regex to match **bold** text
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  let keyIndex = 0;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyIndex++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    
    // Add the bold text
    parts.push(
      <strong key={`bold-${keyIndex++}`} style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>
        {match[1]}
      </strong>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${keyIndex++}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  // If no markdown found, return original text
  if (parts.length === 0) {
    return [<span key="plain">{text}</span>];
  }
  
  return parts;
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'abby';
  timestamp: Date;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function Chatbot() {
  const { isOpen, openChatbot, closeChatbot } = useChatbot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Initialize conversation when chatbot opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initializeConversation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        // Add welcome message
        setMessages([
          {
            id: '1',
            text: 'Hello! I\'m Abby, your AI sales assistant. How can I help you today?',
            sender: 'abby',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m Abby. I\'m ready to help, but there was an issue connecting. Please try again.',
          sender: 'abby',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputValue.trim();
    if (!messageText || isLoading || !sessionId) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: messageText,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Create assistant message when first chunk arrives
      let assistantMessageId: string | null = null;
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.chunk) {
                accumulatedText += data.chunk;
                
                // Create message on first chunk
                if (!assistantMessageId) {
                  assistantMessageId = (Date.now() + 1).toString();
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId!,
                      text: accumulatedText,
                      sender: 'abby',
                      timestamp: new Date(),
                    },
                  ]);
                } else {
                  // Update existing message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, text: accumulatedText }
                        : msg
                    )
                  );
                }
              }
              if (data.done) {
                setIsStreaming(false);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', error);
        // Add error message if no assistant message was created yet
        const errorMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: errorMessageId,
            text: 'Sorry, I encountered an error. Please try again.',
            sender: 'abby',
            timestamp: new Date(),
          },
        ]);
      }
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const quickQuestions = [
    'What can Abby do for my business?',
    'How does pricing work?',
    'Can I try Abby on my website?',
  ];

  const handleQuickQuestion = async (question: string) => {
    setInputValue(question);
    // Trigger send after a brief delay to ensure input is set
    setTimeout(() => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const form = inputRef.current?.form;
      if (form) {
        form.dispatchEvent(event);
      }
    }, 100);
  };

  // Listen for quick question events from Hero component
  useEffect(() => {
    const handleQuickQuestion = (event: CustomEvent) => {
      const question = event.detail as string;
      if (isOpen && sessionId) {
        handleQuickQuestionInternal(question);
      } else if (isOpen) {
        // Wait for session to initialize
        setTimeout(() => {
          if (sessionId) {
            handleQuickQuestionInternal(question);
          }
        }, 1000);
      }
    };

    window.addEventListener('quick-question', handleQuickQuestion as EventListener);
    return () => {
      window.removeEventListener('quick-question', handleQuickQuestion as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  const handleQuickQuestionInternal = async (question: string) => {
    if (!sessionId) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    // Will create message when first chunk arrives
    let assistantMessageId: string | null = null;
    let accumulatedText = '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: question,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                accumulatedText += data.chunk;
                
                // Create message on first chunk
                if (!assistantMessageId) {
                  assistantMessageId = (Date.now() + 1).toString();
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId!,
                      text: accumulatedText,
                      sender: 'abby',
                      timestamp: new Date(),
                    },
                  ]);
                } else {
                  // Update existing message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, text: accumulatedText }
                        : msg
                    )
                  );
                }
              }
              if (data.done) setIsStreaming(false);
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Add error message if no assistant message was created yet
      const errorMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'abby',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={openChatbot}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors z-50 animate-pulse sm:w-16 sm:h-16 bg-gradient-emerald hover:opacity-90"
          aria-label="Chat with Abby"
        >
          <svg
            className="w-6 h-6 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-96 h-[600px] max-h-[calc(100vh-3rem)] border rounded-lg shadow-2xl flex flex-col z-50" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
          {/* Chat Header */}
          <div className="p-4 rounded-t-lg flex items-center justify-between bg-gradient-emerald">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <span className="font-bold text-lg" style={{ color: 'var(--emerald)' }}>A</span>
              </div>
              <div>
                <h3 className="font-bold text-black">Abby</h3>
                <p className="text-xs text-black/70">
                  {isStreaming ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <button
              onClick={closeChatbot}
              className="text-black hover:text-black/70 transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'var(--bg)' }}>
            {messages.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                <p>Loading...</p>
              </div>
            ) : (
              messages
                .filter((message) => message.text && message.text.trim()) // Only show messages with content
                .map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-gradient-emerald text-black'
                          : ''
                      }`}
                      style={message.sender === 'user' ? {} : { background: 'var(--panel)', color: 'var(--ink)' }}
                    >
                      <div className="text-sm">{parseMarkdown(message.text)}</div>
                      {message.sender === 'user' && (
                        <p className="text-xs mt-1 text-black/70">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
            {/* Typing Indicator - Only show when streaming and waiting for first chunk */}
            {isStreaming && (() => {
              // Get messages with content
              const messagesWithContent = messages.filter(m => m.text && m.text.trim());
              const lastMessage = messagesWithContent[messagesWithContent.length - 1];
              // Show typing indicator only if last message is from user (waiting for Abby's response)
              return lastMessage && lastMessage.sender === 'user';
            })() && (
              <div className="flex justify-start">
                <div className="rounded-lg p-3" style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: 'var(--emerald)' }}></span>
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: 'var(--emerald)' }}></span>
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: 'var(--emerald)' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 py-2 border-t" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Quick questions:</p>
              <div className="flex flex-col gap-2">
                {quickQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(question)}
                    className="text-left text-xs px-3 py-2 border rounded transition-colors"
                    style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--emerald)';
                      e.currentTarget.style.color = 'var(--emerald)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading || !sessionId}
                className="flex-1 px-4 py-2 border rounded disabled:opacity-50"
                style={{ 
                  background: 'var(--bg)', 
                  borderColor: 'var(--line)', 
                  color: 'var(--ink)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || !sessionId}
                className="px-4 py-2 text-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-emerald hover:opacity-90"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}