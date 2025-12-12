'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function TicketsList() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/dashboard/tickets?limit=${limit}&skip=${(page - 1) * limit}${statusFilter ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setTickets(data.tickets);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && tickets.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading tickets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Support Tickets</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded border"
            style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <p className="text-sm flex items-center" style={{ color: 'var(--muted)' }}>Total: {total}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Ticket ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Sentiment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Opened At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'var(--muted)' }}>
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket._id} className="hover:opacity-80">
                  <td className="px-6 py-4">
                    <p className="text-sm font-mono font-medium" style={{ color: 'var(--ink)' }}>{ticket.ticketId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{ticket.userName || 'Unknown'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{ticket.userEmail || 'No email'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        ticket.priority === 'urgent'
                          ? 'bg-red-500/20 text-red-500'
                          : ticket.priority === 'high'
                          ? 'bg-orange-500/20 text-orange-500'
                          : ticket.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        ticket.sentiment === 'very_negative'
                          ? 'bg-red-500/20 text-red-500'
                          : ticket.sentiment === 'negative'
                          ? 'bg-orange-500/20 text-orange-500'
                          : ticket.sentiment === 'positive'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {ticket.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        ticket.status === 'open'
                          ? 'bg-blue-500/20 text-blue-500'
                          : ticket.status === 'resolved'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {format(new Date(ticket.openedAt || ticket.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="px-3 py-1.5 text-xs rounded transition-colors bg-gradient-emerald text-black hover:opacity-90"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
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

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--panel)', color: 'var(--ink)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Ticket Details</h3>
                  <p className="text-sm font-mono" style={{ color: 'var(--muted)' }}>{selectedTicket.ticketId}</p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-2xl leading-none hover:opacity-70"
                  style={{ color: 'var(--muted)' }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>User Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Name</p>
                    <p style={{ color: 'var(--ink)' }}>{selectedTicket.userName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Email</p>
                    <p style={{ color: 'var(--ink)' }}>{selectedTicket.userEmail || 'Not provided'}</p>
                  </div>
                  {selectedTicket.userPhone && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Phone</p>
                      <p style={{ color: 'var(--ink)' }}>{selectedTicket.userPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Information */}
              <div>
                <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Ticket Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Status</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        selectedTicket.status === 'open'
                          ? 'bg-blue-500/20 text-blue-500'
                          : selectedTicket.status === 'resolved'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Priority</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                        selectedTicket.priority === 'urgent'
                          ? 'bg-red-500/20 text-red-500'
                          : selectedTicket.priority === 'high'
                          ? 'bg-orange-500/20 text-orange-500'
                          : selectedTicket.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Sentiment</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        selectedTicket.sentiment === 'very_negative'
                          ? 'bg-red-500/20 text-red-500'
                          : selectedTicket.sentiment === 'negative'
                          ? 'bg-orange-500/20 text-orange-500'
                          : selectedTicket.sentiment === 'positive'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {selectedTicket.sentiment}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Opened At</p>
                    <p style={{ color: 'var(--ink)' }}>
                      {format(new Date(selectedTicket.openedAt || selectedTicket.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {selectedTicket.resolvedAt && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Resolved At</p>
                      <p style={{ color: 'var(--ink)' }}>
                        {format(new Date(selectedTicket.resolvedAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {selectedTicket.summary && (
                <div>
                  <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Summary</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{selectedTicket.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {selectedTicket.transcript && (
                <div>
                  <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Full Transcript</h4>
                  <div className="p-4 rounded border" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
                    <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--ink)' }}>
                      {selectedTicket.transcript}
                    </pre>
                  </div>
                </div>
              )}

              {/* IDs */}
              <div>
                <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>References</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--muted)' }}>Session ID: </span>
                    <span className="font-mono" style={{ color: 'var(--ink)' }}>{selectedTicket.sessionId}</span>
                  </div>
                  {selectedTicket.conversationId && (
                    <div>
                      <span className="font-medium" style={{ color: 'var(--muted)' }}>Conversation ID: </span>
                      <span className="font-mono" style={{ color: 'var(--ink)' }}>{selectedTicket.conversationId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

