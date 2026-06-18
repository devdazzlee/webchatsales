'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

type IntakeSubmission = {
  _id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  companyWebsite?: string;
  industry?: string;
  servicesOffered: string[];
  businessHours: string;
  timezone: string;
  bookingLink?: string;
  widgetKey?: string;
  widgetLink?: string;
  widgetEmbedScript?: string;
  notes?: string;
  isNewClient: boolean;
  createdAt: string;
  clientId?: {
    _id: string;
    name: string;
    slug: string;
    ownerEmail: string;
  };
};

export default function IntakeSubmissionsList() {
  const [rows, setRows] = useState<IntakeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchIntakeSubmissions();
  }, []);

  const fetchIntakeSubmissions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/intake-submissions?limit=200`, {
        headers: getAuthHeaders(),
      });

      if (handleAuthError(response)) return;

      const data = await response.json();
      if (data.success) {
        setRows(data.submissions || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching intake submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && rows.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading intake submissions...</div>;
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="dashboard-section-header">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--ink)' }}>Intake Submissions</h2>
        <p className="text-sm shrink-0" style={{ color: 'var(--muted)' }}>Total: {total}</p>
      </div>

      <div className="space-y-3">
        {rows.map((submission) => (
          <div
            key={submission._id}
            className="border rounded-lg p-3 sm:p-4 min-w-0 overflow-hidden"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {submission.businessName}
              </h3>
              <span
                className={`px-2 py-1 text-xs rounded ${submission.isNewClient ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-400'}`}
              >
                {submission.isNewClient ? 'New client created' : 'Existing client updated'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
              <p style={{ color: 'var(--muted)' }}>Owner: <span style={{ color: 'var(--ink)' }}>{submission.ownerName}</span></p>
              <p style={{ color: 'var(--muted)' }}>Email: <span style={{ color: 'var(--ink)' }}>{submission.ownerEmail}</span></p>
              <p style={{ color: 'var(--muted)' }}>Phone: <span style={{ color: 'var(--ink)' }}>{submission.ownerPhone || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Industry: <span style={{ color: 'var(--ink)' }}>{submission.industry || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Hours: <span style={{ color: 'var(--ink)' }}>{submission.businessHours}</span></p>
              <p style={{ color: 'var(--muted)' }}>Timezone: <span style={{ color: 'var(--ink)' }}>{submission.timezone}</span></p>
              <p style={{ color: 'var(--muted)' }}>Website: <span style={{ color: 'var(--ink)' }}>{submission.companyWebsite || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Booking: <span style={{ color: 'var(--ink)' }}>{submission.bookingLink || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Widget Key: <span style={{ color: 'var(--ink)' }}>{submission.widgetKey || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>
                Widget Link:{' '}
                {submission.widgetLink ? (
                  <a href={submission.widgetLink} target="_blank" rel="noreferrer" style={{ color: 'var(--emerald)' }}>
                    Open widget
                  </a>
                ) : (
                  <span style={{ color: 'var(--ink)' }}>N/A</span>
                )}
              </p>
            </div>

            <div className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Services: <span style={{ color: 'var(--ink)' }}>{submission.servicesOffered.join(', ')}</span>
            </div>

            {submission.notes ? (
              <div className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                Notes: <span style={{ color: 'var(--ink)' }}>{submission.notes}</span>
              </div>
            ) : null}

            {submission.widgetEmbedScript ? (
              <div className="mt-2 text-xs break-all" style={{ color: 'var(--muted)' }}>
                Embed snippet: {submission.widgetEmbedScript}
              </div>
            ) : null}

            <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Linked client: {submission.clientId?.name || 'Unknown'} ({submission.clientId?.slug || 'n/a'}) · Submitted {format(new Date(submission.createdAt), 'MMM d, yyyy HH:mm')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
