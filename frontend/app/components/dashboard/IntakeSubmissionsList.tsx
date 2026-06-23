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
  jobDescription?: string;
  isNewClient: boolean;
  createdAt: string;
  clientId?: {
    _id: string;
    name: string;
    slug: string;
    ownerEmail: string;
    status?: string;
    installVerified?: boolean;
    lastWidgetPingAt?: string;
  };
};

export default function IntakeSubmissionsList({
  onEditClient,
}: {
  onEditClient?: (clientId: string) => void;
}) {
  const [rows, setRows] = useState<IntakeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

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

  const activateForTest = async (clientId: string) => {
    setActionError('');
    setActionMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants/${clientId}/activate-test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to activate for test');
      }
      setActionMessage('Client activated for testing. Share embed code with client.');
      await fetchIntakeSubmissions();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Activation failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setActionMessage('Copied to clipboard.');
  };

  if (isLoading && rows.length === 0) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading intake submissions...</div>;
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="dashboard-section-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--ink)' }}>Intake Submissions</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Review onboarding forms and move clients through test → live deployment.
          </p>
        </div>
        <p className="text-sm shrink-0" style={{ color: 'var(--muted)' }}>Total: {total}</p>
      </div>

      {actionMessage && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)' }}>
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((submission) => {
          const client = submission.clientId;
          const clientStatus = client?.status || 'draft';
          return (
          <div
            key={submission._id}
            className="border rounded-lg p-3 sm:p-4 min-w-0 overflow-hidden"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {submission.businessName}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-1 text-xs rounded capitalize ${clientStatus === 'live' ? 'bg-emerald-500/20 text-emerald-500' : clientStatus === 'test' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}
                >
                  {clientStatus}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded ${submission.isNewClient ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-400'}`}
                >
                  {submission.isNewClient ? 'New client' : 'Updated'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
              <p style={{ color: 'var(--muted)' }}>Owner: <span style={{ color: 'var(--ink)' }}>{submission.ownerName}</span></p>
              <p style={{ color: 'var(--muted)' }}>Email: <span style={{ color: 'var(--ink)' }}>{submission.ownerEmail}</span></p>
              <p style={{ color: 'var(--muted)' }}>Phone: <span style={{ color: 'var(--ink)' }}>{submission.ownerPhone || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Industry: <span style={{ color: 'var(--ink)' }}>{submission.industry || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Hours: <span style={{ color: 'var(--ink)' }}>{submission.businessHours}</span></p>
              <p style={{ color: 'var(--muted)' }}>Timezone: <span style={{ color: 'var(--ink)' }}>{submission.timezone}</span></p>
              <p style={{ color: 'var(--muted)' }}>Website: <span style={{ color: 'var(--ink)' }}>{submission.companyWebsite || 'N/A'}</span></p>
              <p style={{ color: 'var(--muted)' }}>Install: <span style={{ color: client?.installVerified ? 'var(--emerald)' : '#f59e0b' }}>{client?.installVerified ? 'Verified' : 'Pending'}</span></p>
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
              <div className="mt-3 p-2 rounded text-xs" style={{ background: 'var(--bg)' }}>
                <p className="mb-1" style={{ color: 'var(--muted)' }}>Embed snippet:</p>
                <code className="break-all block" style={{ color: 'var(--ink)' }}>{submission.widgetEmbedScript}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(submission.widgetEmbedScript!)}
                  className="text-xs underline mt-2"
                  style={{ color: 'var(--emerald)' }}
                >
                  Copy embed code
                </button>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {client?._id && clientStatus === 'draft' && (
                <button
                  type="button"
                  onClick={() => activateForTest(client._id)}
                  className="px-3 py-1.5 text-sm font-medium text-black rounded bg-gradient-emerald"
                >
                  Activate for Test
                </button>
              )}
              {client?._id && onEditClient && (
                <button
                  type="button"
                  onClick={() => onEditClient(client._id)}
                  className="px-3 py-1.5 text-sm rounded border"
                  style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
                >
                  Open in Clients
                </button>
              )}
              {submission.widgetLink && (
                <a
                  href={submission.widgetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-sm rounded border inline-block"
                  style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                >
                  Preview widget
                </a>
              )}
            </div>

            <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Linked client: {client?.name || 'Unknown'} ({client?.slug || 'n/a'}) · Submitted {format(new Date(submission.createdAt), 'MMM d, yyyy HH:mm')}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
