'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function LeadsList() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/dashboard/leads?limit=${limit}&skip=${(page - 1) * limit}${statusFilter ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && leads.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading leads...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>All Leads</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded border"
            style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="contacted">Contacted</option>
            <option value="booked">Booked</option>
            <option value="lost">Lost</option>
          </select>
          <p className="text-sm flex items-center" style={{ color: 'var(--muted)' }}>Total: {total}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Service Need
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Timing / Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Qualified At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {leads.map((lead) => (
              <tr key={lead._id} className="hover:opacity-80">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{lead.name || 'Unknown'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.email || 'No email'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{lead.phone || 'No phone'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.serviceNeed || 'Not specified'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{lead.timing || 'Not specified'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{lead.budget || 'No budget'}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      lead.status === 'qualified'
                        ? 'bg-green-500/20 text-green-500'
                        : lead.status === 'booked'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {format(new Date(lead.qualifiedAt || lead.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
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

