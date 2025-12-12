'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function BookingsList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter, dateFromFilter, dateToFilter, searchFilter]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: ((page - 1) * limit).toString(),
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);
      if (searchFilter) params.append('search', searchFilter);
      
      const url = `${API_BASE_URL}/api/dashboard/bookings?${params.toString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setSearchFilter('');
    setPage(1);
  };

  const handleViewBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/book/${bookingId}`, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setSelectedBooking(data.booking);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  if (isLoading && bookings.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading bookings...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Booking Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600"
                  style={{ color: 'var(--muted)' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>User Name</label>
                  <p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{selectedBooking.userName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Status</label>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        selectedBooking.status === 'scheduled' || selectedBooking.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-500'
                          : selectedBooking.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Email</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedBooking.userEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Phone</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedBooking.userPhone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Time Slot</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                    {format(new Date(selectedBooking.timeSlot), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="mt-1 text-sm font-medium" style={{ color: 'var(--emerald)' }}>
                    {format(new Date(selectedBooking.timeSlot), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Booked At</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                    {format(new Date(selectedBooking.bookedAt || selectedBooking.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Notes</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedBooking.notes}</p>
                </div>
              )}
              {selectedBooking.schedulingLink && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Scheduling Link</label>
                  <a
                    href={selectedBooking.schedulingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm block break-all" 
                    style={{ color: 'var(--emerald)' }}
                  >
                    {selectedBooking.schedulingLink}
                  </a>
                </div>
              )}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Booking ID</label>
                <p className="mt-1 text-sm font-mono" style={{ color: 'var(--ink)' }}>{selectedBooking._id}</p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Session ID</label>
                <p className="mt-1 text-sm font-mono" style={{ color: 'var(--ink)' }}>{selectedBooking.sessionId}</p>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'var(--line)' }}>
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>All Bookings</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm rounded border transition-colors"
            style={{ 
              background: showFilters ? 'var(--emerald)' : 'var(--bg)', 
              borderColor: 'var(--line)', 
              color: showFilters ? 'black' : 'var(--ink)' 
            }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <p className="text-sm flex items-center" style={{ color: 'var(--muted)' }}>Total: {total}</p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded border"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Date From</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => {
                  setDateFromFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded border"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Date To</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => {
                  setDateToFilter(e.target.value);
                  setPage(1);
                }}
                min={dateFromFilter}
                className="w-full px-3 py-2 text-sm rounded border"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* Search Filter */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Search (Name/Email)</label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm rounded border"
                style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter || dateFromFilter || dateToFilter || searchFilter) && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <table className="w-full">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Time Slot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Booked At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {bookings.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--muted)' }}>
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking._id} className="hover:opacity-80">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{booking.userName || 'Unknown'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {format(new Date(booking.timeSlot), 'MMM d, yyyy h:mm a')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{booking.userEmail || 'No email'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{booking.userPhone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        booking.status === 'scheduled' || booking.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-500'
                          : booking.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {format(new Date(booking.bookedAt || booking.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewBooking(booking._id)}
                      className="px-3 py-1 text-xs font-medium rounded transition-colors"
                      style={{ 
                        background: 'var(--emerald)', 
                        color: 'black',
                        border: 'none'
                      }}
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
    </div>
  );
}

