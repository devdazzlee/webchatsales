'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useChatbot } from './ChatbotContext';

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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Throttled scroll function - only scrolls if user is near bottom
  const scrollToBottom = (force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Check if user is near bottom (within 100px) or force scroll
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (force || isNearBottom) {
      // Use scrollTop for smoother performance than scrollIntoView
      container.scrollTop = container.scrollHeight;
    }
  };

  // Throttle scroll updates during streaming
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttledScroll = useCallback(() => {
    if (scrollTimeoutRef.current) return;
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom();
      scrollTimeoutRef.current = null;
    }, 100); // Throttle to every 100ms
  }, []);

  // Only scroll when new messages are added (not on every update)
  useEffect(() => {
    // Scroll immediately when new message is added
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length]); // Only depend on length, not content

  // Scroll to bottom when streaming completes
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      // Final scroll when streaming is done
      setTimeout(() => scrollToBottom(true), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
        // Auto-send greeting message
        // CLIENT REQUIREMENT (Jan 2026): Short messages, same flow everywhere
        const greetingMessage: Message = {
          id: '1',
          text: 'Hi, I\'m Abby with WebChatSales — welcome.\n\nWhat can I help you with today?',
          sender: 'abby',
          timestamp: new Date(),
        };
        setMessages([greetingMessage]);
        
        // Save the greeting message to backend (as assistant message)
        try {
          await fetch(`${API_BASE_URL}/api/chat/save-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: data.sessionId,
              message: greetingMessage.text,
              role: 'assistant',
            }),
          });
        } catch (error) {
          console.error('Error saving greeting message:', error);
        }
      }
      } catch (error: any) {
        console.error('Failed to initialize conversation:', error);
        const isConnectionError = error instanceof TypeError && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('ERR_CONNECTION_REFUSED') ||
           error.message.includes('NetworkError'));
        
        setMessages([
          {
            id: '1',
            text: isConnectionError
              ? 'Hi, I\'m Abby with WebChatSales.\n\nI can\'t connect to the server right now.\n\nPlease check if the backend is running.'
              : 'Hi, I\'m Abby with WebChatSales — welcome.\n\nWhat can I help you with today?',
            sender: 'abby',
            timestamp: new Date(),
          },
        ]);
        if (isConnectionError) {
          setConnectionError('Backend server is not running');
        }
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputValue.trim();
    if (!messageText || isLoading) return;
    
    // If sessionId is not ready, initialize conversation first
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        if (data.success && data.sessionId) {
          currentSessionId = data.sessionId;
          setSessionId(data.sessionId);
          
          // Set initial greeting message if no messages exist
          if (messages.length === 0) {
            const greetingMessage: Message = {
              id: '1',
              text: 'Hi, I\'m Abby with WebChatSales — welcome.\n\nWhat can I help you with today?',
              sender: 'abby',
              timestamp: new Date(),
            };
            setMessages([greetingMessage]);
          }
        } else {
          console.error('Failed to initialize session');
          return;
        }
      } catch (error: any) {
        console.error('Error initializing conversation:', error);
        setConnectionError('Unable to connect to the server. Please make sure the backend is running.');
        setIsLoading(false);
        // Show error message to user
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: 'Sorry, I\'m having trouble connecting to the server. Please make sure the backend is running on http://localhost:9000',
            sender: 'abby',
            timestamp: new Date(),
          },
        ]);
        return;
      }
    }

    // Add user message immediately to UI
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

    // Declare timeoutId outside try block so it's accessible in catch
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: messageText,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[Chatbot] HTTP error ${response.status}:`, errorText);
        throw new Error(`Failed to send message: ${response.status} ${errorText.substring(0, 100)}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body - server may not support streaming');
      }

      // Create assistant message when first chunk arrives
      let assistantMessageId: string | null = null;
      let accumulatedText = '';
      let hasReceivedChunk = false;
      let isDoneProcessed = false; // Prevent processing done event multiple times

      // FIX FOR BLACK SCREEN: Set a shorter initial timeout
      // If no chunk arrives within 10 seconds, show error
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        const timeoutDuration = hasReceivedChunk ? 30000 : 10000; // 10s initial, 30s after first chunk
        timeoutId = setTimeout(() => {
          console.warn(`Stream timeout - no chunks received for ${timeoutDuration/1000} seconds`);
          setIsStreaming(false);
          setIsLoading(false);
          
          // If no chunks received at all, show error message
          if (!hasReceivedChunk) {
            const errorId = (Date.now() + 1).toString();
            setMessages((prev) => [
              ...prev,
              {
                id: errorId,
                text: 'Sorry, I\'m taking too long to respond. Please try again.',
                sender: 'abby',
                timestamp: new Date(),
              },
            ]);
          }
        }, timeoutDuration);
      };

      resetTimeout();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        resetTimeout(); // Reset timeout on each chunk

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
                hasReceivedChunk = true;
                accumulatedText += data.chunk;
                
                // Create message on first chunk - keep it simple during streaming
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
                  // Throttle updates using requestAnimationFrame for smoother performance
                  requestAnimationFrame(() => {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, text: accumulatedText }
                          : msg
                      )
                    );
                    // Scroll after update
                    throttledScroll();
                  });
                }
              }
              if (data.done && !isDoneProcessed) {
                isDoneProcessed = true; // Mark as processed to prevent duplicate handling
                if (timeoutId) clearTimeout(timeoutId);
                
                // Finalize the message - keep it as one message, don't split
                if (accumulatedText.trim() && assistantMessageId) {
                  setMessages((prev) => {
                    // Ensure we don't create duplicates
                    const existingIndex = prev.findIndex(msg => msg.id === assistantMessageId);
                    if (existingIndex >= 0) {
                      // Update existing message - preserve line breaks but keep as single message
                      return prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, text: accumulatedText.trim() }
                          : msg
                      );
                    } else {
                      // Message doesn't exist, add it (shouldn't happen, but safety check)
                      return [...prev, {
                        id: assistantMessageId!,
                        text: accumulatedText.trim(),
                        sender: 'abby' as const,
                        timestamp: new Date(),
                      }];
                    }
                  });
                }
                
                setIsStreaming(false);
                setIsLoading(false);
                // Auto-focus input when streaming completes
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 150);
              }
            } catch (parseError) {
              // Skip malformed JSON
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      // Clear timeout and ensure both states are cleared when stream completes
      if (timeoutId) clearTimeout(timeoutId);
      setIsStreaming(false);
      setIsLoading(false);
      
      // Auto-focus input after response completes
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    } catch (error: unknown) {
      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted by user');
        setIsStreaming(false);
        setIsLoading(false);
        return;
      }
      
      console.error('Error sending message:', error);
      
      // Check if it's a connection error
      const isConnectionError = error instanceof TypeError && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('ERR_CONNECTION_REFUSED') ||
         error.message.includes('NetworkError') ||
         error.message.includes('Network request failed'));
      
      // Check if we already created an assistant message (partial response)
      const lastAbbyMessage = messages.filter(msg => msg.sender === 'abby').pop();
      const hasAssistantMessage = lastAbbyMessage && 
        lastAbbyMessage.timestamp.getTime() > Date.now() - 10000; // Created in last 10 seconds
      
      // Only add error message if no assistant message was created
      if (!hasAssistantMessage) {
        const errorMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: errorMessageId,
            text: isConnectionError 
              ? 'Sorry, I\'m unable to connect to the server right now. Please check your connection and try again.'
              : 'Sorry, I encountered an error. Please try again.',
            sender: 'abby',
            timestamp: new Date(),
          },
        ]);
        if (isConnectionError) {
          setConnectionError('Connection error');
        }
      }
      
      setIsStreaming(false);
      setIsLoading(false);
    } finally {
      // Fallback: ensure states are cleared even if something goes wrong
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Quick questions appropriate for demo mode (explaining WebChatSales, not qualifying leads)
  const quickQuestions = [
    'What does WebChatSales do?',
    'How does Abby work?',
    'What features does WebChatSales offer?',
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
                
                // Create message on first chunk - keep it simple during streaming
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
                  // Throttle updates using requestAnimationFrame for smoother performance
                  requestAnimationFrame(() => {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, text: accumulatedText }
                          : msg
                      )
                    );
                    // Scroll after update
                    throttledScroll();
                  });
                }
              }
              if (data.done) {
                // Finalize the message - keep it as one message, don't split
                if (accumulatedText.trim() && assistantMessageId) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, text: accumulatedText.trim() }
                        : msg
                    )
                  );
                }
                
                setIsStreaming(false);
                setIsLoading(false);
              }
            } catch {}
          }
        }
      }
      
      // Ensure both states are cleared when stream completes
      setIsStreaming(false);
      setIsLoading(false);
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
      setIsStreaming(false);
      setIsLoading(false);
    } finally {
      // Fallback: ensure states are cleared even if something goes wrong
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
          className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-lg transition-all z-50 hover:scale-105"
          style={{
            background: 'transparent',
            border: '2px solid var(--emerald)',
            color: 'var(--emerald)',
          }}
          aria-label="Chat with Abby"
        >
          {/* Chat Bubble Icon from Lucide */}
          <MessageCircle className="w-6 h-6" style={{ color: 'var(--emerald)' }} />
          {/* Text */}
          <span className="font-medium text-base" style={{ color: 'var(--emerald)' }}>
            Chat with Abby
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-96 h-[600px] max-h-[calc(100vh-3rem)] border rounded-lg shadow-2xl flex flex-col z-50" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
          {/* Chat Header */}
          <div className="p-4 rounded-t-lg flex items-center justify-between bg-gradient-emerald">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg)' }}>
                <Image 
                  src="/logo.png" 
                  alt="WebChatSales Logo" 
                  width={56} 
                  height={56}
                  className="object-contain"
                />
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
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" 
            style={{ 
              background: 'var(--bg)',
            }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                {/* Animated Chat Icon */}
                <div className="relative">
                  <div className="animate-pulse">
                    <svg 
                      className="w-16 h-16" 
                      style={{ color: 'var(--emerald)' }}
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
                  </div>
                  {/* Pulsing ring effect */}
                  <div 
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ 
                      background: 'var(--emerald)',
                      animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }}
                  ></div>
                </div>
                {/* Loading text with dots animation */}
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--emerald)', fontWeight: '500' }}>Chat with Abby</span>
                  <div className="flex gap-1">
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ 
                        background: 'var(--emerald)',
                        animationDelay: '0ms',
                        animationDuration: '1.4s'
                      }}
                    ></span>
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ 
                        background: 'var(--emerald)',
                        animationDelay: '200ms',
                        animationDuration: '1.4s'
                      }}
                    ></span>
                    <span 
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ 
                        background: 'var(--emerald)',
                        animationDelay: '400ms',
                        animationDuration: '1.4s'
                      }}
                    ></span>
                  </div>
                </div>
              </div>
            ) : (
              messages
                .filter((message) => message.text && message.text.trim().length > 0) // Only show messages with actual content
                .filter((message, index, self) => 
                  // Deduplicate: keep only first occurrence of each unique id+text combination
                  index === self.findIndex(m => m.id === message.id && m.text === message.text)
                )
                .map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-gradient-emerald'
                          : ''
                      }`}
                      style={message.sender === 'user' ? { 
                        color: 'black',
                        // Force all child text to be black for user messages
                      } : { background: 'var(--panel)', color: 'var(--ink)' }}
                    >
                      <div 
                        className="text-sm prose prose-sm max-w-none dark:prose-invert" 
                        style={{ 
                          '--tw-prose-bullets': message.sender === 'user' ? 'black' : 'var(--emerald)',
                          '--tw-prose-counters': message.sender === 'user' ? 'black' : 'var(--emerald)',
                          '--tw-prose-body': message.sender === 'user' ? 'black' : 'var(--ink)',
                          '--tw-prose-links': message.sender === 'user' ? 'rgba(0, 0, 0, 0.9)' : 'var(--emerald)',
                          color: message.sender === 'user' ? 'black' : 'inherit',
                        } as React.CSSProperties}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Style headers
                            h1: ({ ...props }) => (
                              <h1 className="text-xl font-bold mb-2 mt-3" style={{ color: message.sender === 'user' ? 'black' : 'var(--emerald)' }} {...props} />
                            ),
                            h2: ({ ...props }) => (
                              <h2 className="text-lg font-bold mb-2 mt-3" style={{ color: message.sender === 'user' ? 'black' : 'var(--emerald)' }} {...props} />
                            ),
                            h3: ({ ...props }) => (
                              <h3 className="text-base font-bold mb-2 mt-2" style={{ color: message.sender === 'user' ? 'black' : 'var(--emerald)' }} {...props} />
                            ),
                            // Style links - use dark color for user messages, emerald for assistant
                            a: ({ ...props }) => (
                              <a
                                className="underline"
                                style={{ 
                                  color: message.sender === 'user' ? 'rgba(0, 0, 0, 0.9)' : 'var(--emerald)',
                                  fontWeight: message.sender === 'user' ? '500' : 'normal'
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              />
                            ),
                            // Style tables
                            table: ({ ...props }) => (
                              <div className="overflow-x-auto my-3">
                                <table className="min-w-full border-collapse" style={{ borderColor: 'var(--line)' }} {...props} />
                              </div>
                            ),
                            thead: ({ ...props }) => (
                              <thead style={{ background: 'var(--panel)' }} {...props} />
                            ),
                            th: ({ ...props }) => (
                              <th
                                className="px-3 py-2 text-left font-semibold border"
                                style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
                                {...props}
                              />
                            ),
                            td: ({ ...props }) => (
                              <td
                                className="px-3 py-2 border"
                                style={{ borderColor: 'var(--line)' }}
                                {...props}
                              />
                            ),
                            // Style lists
                            ul: ({ ...props }) => (
                              <ul className="list-disc mb-2 space-y-1 ml-4" style={{ listStylePosition: 'outside' }} {...props} />
                            ),
                            ol: ({ ...props }) => (
                              <ol className="list-decimal mb-2 space-y-1 ml-4" style={{ listStylePosition: 'outside' }} {...props} />
                            ),
                            // Style code blocks
                            code: ({ className, ...props }: { className?: string; children?: React.ReactNode }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-gray-100 px-1 rounded text-sm" style={{ background: 'var(--panel)' }} {...props} />
                              ) : (
                                <code className="block bg-gray-100 p-2 rounded text-sm overflow-x-auto" style={{ background: 'var(--panel)' }} {...props} />
                              );
                            },
                            // Style horizontal rules
                            hr: ({ ...props }) => (
                              <hr className="my-3" style={{ borderColor: 'var(--line)' }} {...props} />
                            ),
                            // Style bold text
                            strong: ({ ...props }) => (
                              <strong style={{ color: message.sender === 'user' ? 'black' : 'var(--emerald)', fontWeight: 'bold' }} {...props} />
                            ),
                            // Style list items
                            li: ({ ...props }) => (
                              <li 
                                className="pl-2" 
                                style={{ 
                                  color: message.sender === 'user' ? 'black' : 'var(--ink)', 
                                  display: 'list-item' 
                                }} 
                                {...props} 
                              />
                            ),
                            // Style paragraphs - ensure text color is set correctly
                            p: ({ ...props }) => (
                              <p 
                                className="mb-2" 
                                style={{ color: message.sender === 'user' ? 'black' : 'inherit' }}
                                {...props} 
                              />
                            ),
                            // Style text/span elements to ensure proper color
                            text: (props: any) => {
                              // Filter out SVG-specific props that aren't compatible with HTML span
                              const { ref, node, ...htmlProps } = props;
                              // Only spread HTML-compatible props
                              return (
                                <span 
                                  style={{ color: message.sender === 'user' ? 'black' : 'inherit' }}
                                  {...(htmlProps as React.HTMLAttributes<HTMLSpanElement>)} 
                                />
                              );
                            },
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
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
            <div className="px-4 py-2 border-t flex-shrink-0" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
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
          <form onSubmit={handleSendMessage} className="p-4 border-t flex-shrink-0" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border-2 rounded-lg disabled:opacity-50"
                style={{ 
                  background: '#0f1f18', 
                  borderColor: '#1a4a3a', 
                  color: '#e9fff6',
                  outline: 'none',
                  fontSize: '14px',
                  minHeight: '44px',
                  fontWeight: '400'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--emerald)';
                  e.target.style.background = '#0f1f18';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 153, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#1a4a3a';
                  e.target.style.background = '#0f1f18';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
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