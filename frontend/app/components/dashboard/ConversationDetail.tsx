'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface ConversationDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function ConversationDetail({ sessionId, onBack }: ConversationDetailProps) {
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, [sessionId]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/conversation/${sessionId}`, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--emerald)' }}></div>
          <p style={{ color: 'var(--muted)' }}>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--muted)' }}>Conversation not found</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded transition-colors bg-gradient-emerald text-black hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { conversation, lead, ticket, booking, payment } = details;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 text-sm rounded transition-colors"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          ← Back to Dashboard
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Conversation Details</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Session ID</p>
                <p className="text-sm font-mono" style={{ color: 'var(--ink)' }}>{conversation.sessionId}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>User</p>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>{conversation.userName || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Email</p>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>{conversation.userEmail || 'No email'}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Status</p>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    conversation.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                  }`}
                >
                  {conversation.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Messages ({conversation.messages?.length || 0})</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.messages?.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${
                    msg.role === 'user' ? 'bg-gradient-emerald text-black ml-8' : 'bg-gray-800 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium">
                      {msg.role === 'user' ? 'User' : 'Abby'}
                    </span>
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Info */}
            {lead && (
              <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Lead Information</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Name</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Email</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Phone</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Service Need</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.serviceNeed || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Status</p>
                    <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-500">{lead.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Support Ticket */}
            {ticket && (
              <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Support Ticket</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Ticket ID</p>
                    <p className="text-sm font-mono" style={{ color: 'var(--ink)' }}>{ticket.ticketId}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Priority</p>
                    <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-500">{ticket.priority}</span>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Sentiment</p>
                    <span className="px-2 py-1 text-xs rounded bg-orange-500/20 text-orange-500">{ticket.sentiment}</span>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Status</p>
                    <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-500">{ticket.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Booking */}
            {booking && (
              <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Booking</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Time Slot</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {format(new Date(booking.timeSlot), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Status</p>
                    <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-500">{booking.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            {payment && (
              <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Payment</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Amount</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Plan Type</p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{payment.planType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Status</p>
                    <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-500">{payment.status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

