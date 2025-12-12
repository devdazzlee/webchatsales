'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function PaymentsList() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/dashboard/payments?limit=${limit}&skip=${(page - 1) * limit}${statusFilter ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && payments.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading payments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>All Payments</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded border"
            style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <p className="text-sm flex items-center" style={{ color: 'var(--muted)' }}>Total: {total}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Payment ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Plan Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Paid At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {payments.map((payment) => (
              <tr key={payment._id} className="hover:opacity-80">
                <td className="px-6 py-4">
                  <p className="text-sm font-mono" style={{ color: 'var(--ink)' }}>{payment.squarePaymentId.substring(0, 20)}...</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{payment.userName || 'Unknown'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{payment.userEmail || 'No email'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    ${payment.amount.toFixed(2)} {payment.currency}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>{payment.planType || 'N/A'}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      payment.status === 'completed'
                        ? 'bg-green-500/20 text-green-500'
                        : payment.status === 'failed'
                        ? 'bg-red-500/20 text-red-500'
                        : payment.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {payment.paidAt ? format(new Date(payment.paidAt), 'MMM d, yyyy HH:mm') : 'N/A'}
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

