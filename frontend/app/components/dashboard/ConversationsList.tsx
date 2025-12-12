'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface ConversationsListProps {
  onViewConversation: (sessionId: string) => void;
}

export default function ConversationsList({ onViewConversation }: ConversationsListProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchConversations();
  }, [page]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/conversations?limit=${limit}&skip=${(page - 1) * limit}`, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && conversations.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading conversations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>All Conversations</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Total: {total}</p>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Session ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Last Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {conversations.map((conv) => (
              <tr key={conv._id} className="hover:opacity-80">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-mono" style={{ color: 'var(--ink)' }}>{conv.sessionId.substring(0, 20)}...</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{conv.userName || 'Anonymous'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{conv.userEmail || 'No email'}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{conv.messages?.length || 0}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      conv.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {conv.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {format(new Date(conv.lastMessageAt || conv.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onViewConversation(conv.sessionId)}
                    className="px-3 py-1 text-sm rounded transition-colors bg-gradient-emerald text-black hover:opacity-90"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 text-sm rounded transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          Previous
        </button>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Page {page} of {Math.ceil(total / limit)}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= Math.ceil(total / limit)}
          className="px-4 py-2 text-sm rounded transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

