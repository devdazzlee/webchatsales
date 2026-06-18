'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const FRONTEND_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000');

type ClientStatus = 'draft' | 'test' | 'live';

type WidgetConfig = {
  agentName?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  position?: string;
  showBranding?: boolean;
};

type BusinessConfig = {
  assistantName?: string;
  assistantRole?: string;
  brandVoice?: string;
  valueProposition?: string;
  qualificationGoal?: string;
  responseRules?: string[];
};

type Client = {
  _id: string;
  name: string;
  slug: string;
  widgetKey: string;
  ownerEmail: string;
  ownerName?: string;
  ownerPhone?: string;
  companyWebsite?: string;
  industry?: string;
  notificationEmail?: string;
  emailNotificationsEnabled?: boolean;
  schedulingLink?: string;
  businessHours?: string;
  timezone?: string;
  allowedDomains?: string[];
  status?: ClientStatus;
  isPlatformTenant?: boolean;
  isActive?: boolean;
  plan?: string;
  widgetConfig?: WidgetConfig;
  businessConfig?: BusinessConfig;
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  name: '',
  ownerEmail: '',
  ownerName: '',
  ownerPhone: '',
  companyWebsite: '',
  industry: '',
  notificationEmail: '',
  emailNotificationsEnabled: true,
  schedulingLink: '',
  businessHours: '',
  timezone: '',
  allowedDomains: '',
  status: 'draft' as ClientStatus,
  plan: 'trial',
  widgetAgentName: 'Abby',
  widgetWelcomeMessage: 'Hi! How can I help you today?',
  widgetPrimaryColor: '#22c55e',
  widgetPosition: 'bottom-right',
  assistantName: 'Abby',
  assistantRole: 'AI sales assistant',
  brandVoice: '',
  valueProposition: '',
  qualificationGoal: '',
  responseRules: '',
};

const statusColors: Record<ClientStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  test: 'bg-amber-500/20 text-amber-400',
  live: 'bg-emerald-500/20 text-emerald-500',
};

const statusLabels: Record<ClientStatus, string> = {
  draft: 'Draft — hidden from public',
  test: 'Test — widget active for testing',
  live: 'Live — active on client site',
};

function clientToForm(client: Client) {
  return {
    name: client.name || '',
    ownerEmail: client.ownerEmail || '',
    ownerName: client.ownerName || '',
    ownerPhone: client.ownerPhone || '',
    companyWebsite: client.companyWebsite || '',
    industry: client.industry || '',
    notificationEmail: client.notificationEmail || client.ownerEmail || '',
    emailNotificationsEnabled: client.emailNotificationsEnabled !== false,
    schedulingLink: client.schedulingLink || '',
    businessHours: client.businessHours || '',
    timezone: client.timezone || '',
    allowedDomains: (client.allowedDomains || []).join(', '),
    status: (client.status || 'draft') as ClientStatus,
    plan: client.plan || 'trial',
    widgetAgentName: client.widgetConfig?.agentName || 'Abby',
    widgetWelcomeMessage: client.widgetConfig?.welcomeMessage || 'Hi! How can I help you today?',
    widgetPrimaryColor: client.widgetConfig?.primaryColor || '#22c55e',
    widgetPosition: client.widgetConfig?.position || 'bottom-right',
    assistantName: client.businessConfig?.assistantName || 'Abby',
    assistantRole: client.businessConfig?.assistantRole || 'AI sales assistant',
    brandVoice: client.businessConfig?.brandVoice || '',
    valueProposition: client.businessConfig?.valueProposition || '',
    qualificationGoal: client.businessConfig?.qualificationGoal || '',
    responseRules: (client.businessConfig?.responseRules || []).join('\n'),
  };
}

function formToPayload(form: typeof emptyForm) {
  const allowedDomains = form.allowedDomains
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  const responseRules = form.responseRules
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

  return {
    name: form.name.trim(),
    ownerEmail: form.ownerEmail.trim(),
    ownerName: form.ownerName.trim() || undefined,
    ownerPhone: form.ownerPhone.trim() || undefined,
    companyWebsite: form.companyWebsite.trim() || undefined,
    industry: form.industry.trim() || undefined,
    notificationEmail: form.notificationEmail.trim() || form.ownerEmail.trim(),
    emailNotificationsEnabled: form.emailNotificationsEnabled,
    schedulingLink: form.schedulingLink.trim() || undefined,
    businessHours: form.businessHours.trim() || undefined,
    timezone: form.timezone.trim() || undefined,
    allowedDomains,
    status: form.status,
    plan: form.plan,
    widgetConfig: {
      agentName: form.widgetAgentName.trim() || 'Abby',
      welcomeMessage: form.widgetWelcomeMessage.trim() || 'Hi! How can I help you today?',
      primaryColor: form.widgetPrimaryColor.trim() || '#22c55e',
      position: form.widgetPosition.trim() || 'bottom-right',
    },
    businessConfig: {
      assistantName: form.assistantName.trim() || 'Abby',
      assistantRole: form.assistantRole.trim() || 'AI sales assistant',
      brandVoice: form.brandVoice.trim(),
      valueProposition: form.valueProposition.trim(),
      qualificationGoal: form.qualificationGoal.trim(),
      responseRules,
    },
  };
}

export default function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [statusFilter]);

  const fetchClients = async () => {
    setIsLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/api/tenants?limit=200${statusFilter ? `&status=${statusFilter}` : ''}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (handleAuthError(response)) return;

      const data = await response.json();
      if (data.success) {
        setClients(data.clients || []);
        setTotal(data.total || 0);
      } else {
        setError(data.message || 'Failed to load clients');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedClient(null);
    setMode('create');
    setError('');
    setSuccess('');
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setForm(clientToForm(client));
    setMode('edit');
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setMode('list');
    setSelectedClient(null);
    setForm(emptyForm);
    setError('');
  };

  const onFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = formToPayload(form);
      const url = mode === 'create'
        ? `${API_BASE_URL}/api/tenants`
        : `${API_BASE_URL}/api/tenants/${selectedClient?._id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (handleAuthError(response)) return;

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to save client');
      }

      setSuccess(mode === 'create' ? 'Client created successfully.' : 'Client updated successfully.');
      await fetchClients();
      if (mode === 'create' && data.client) {
        openEdit(data.client);
      } else if (mode === 'edit' && data.client) {
        setSelectedClient(data.client);
        setForm(clientToForm(data.client));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotateWidgetKey = async () => {
    if (!selectedClient || !confirm('Rotate widget key? The old embed code will stop working.')) return;
    setError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${selectedClient._id}/rotate-widget-key`,
        { method: 'POST', headers: getAuthHeaders() },
      );
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (data.success) {
        setSuccess('Widget key rotated.');
        await fetchClients();
        setSelectedClient((prev) => prev ? { ...prev, widgetKey: data.widgetKey } : prev);
      }
    } catch (err) {
      setError('Failed to rotate widget key');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedClient) return;
    const action = selectedClient.isActive === false ? 'reactivate' : 'deactivate';
    if (!confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} this client?`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${selectedClient._id}/${action}`,
        { method: 'POST', headers: getAuthHeaders() },
      );
      if (handleAuthError(response)) return;
      const data = await response.json();
      if (data.success) {
        setSuccess(`Client ${action}d.`);
        await fetchClients();
        setSelectedClient(data.client);
      }
    } catch (err) {
      setError(`Failed to ${action} client`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label} copied to clipboard.`);
  };

  const filteredClients = [...clients]
    .sort((a, b) => {
      if (a.isPlatformTenant !== b.isPlatformTenant) {
        return Number(b.isPlatformTenant) - Number(a.isPlatformTenant);
      }
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })
    .filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.ownerEmail.toLowerCase().includes(q) ||
      (c.ownerName || '').toLowerCase().includes(q)
    );
  });

  const inputClass = 'w-full px-3 py-2 border rounded text-sm';
  const inputStyle = { borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' };
  const labelClass = 'block text-xs font-medium mb-1';
  const labelStyle = { color: 'var(--muted)' };

  if (mode === 'create' || mode === 'edit') {
    const isPlatform = selectedClient?.isPlatformTenant === true;
    const widgetLink = selectedClient
      ? `${FRONTEND_URL}/widget?widgetKey=${encodeURIComponent(selectedClient.widgetKey)}`
      : '';
    const embedScript = selectedClient
      ? `<script src="${FRONTEND_URL}/abby-widget.js" data-widget-key="${selectedClient.widgetKey}"></script>`
      : '';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <button onClick={closeForm} className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
              ← Back to clients
            </button>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              {mode === 'create'
                ? 'Add New Client'
                : isPlatform
                  ? 'WebChatSales Platform Site'
                  : `Edit: ${selectedClient?.name}`}
            </h2>
            {isPlatform && (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Powers Abby on webchatsales.com — always live, not subject to Draft/Test/Live.
              </p>
            )}
          </div>
          {mode === 'edit' && selectedClient && !isPlatform && (
            <div className="flex gap-2">
              <button
                onClick={handleToggleActive}
                className="px-3 py-2 text-sm rounded border"
                style={{ borderColor: 'var(--line)', color: selectedClient.isActive === false ? 'var(--emerald)' : '#ef4444' }}
              >
                {selectedClient.isActive === false ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded border text-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded border text-sm" style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Status — hidden for platform tenant */}
          {isPlatform ? (
            <section className="border rounded-lg p-4" style={{ borderColor: 'var(--emerald)', background: 'rgba(0, 255, 153, 0.04)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Platform Site</h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Always <strong style={{ color: 'var(--emerald)' }}>Live</strong> on webchatsales.com and localhost.
                Contractor Draft/Test/Live rules do not apply here.
              </p>
            </section>
          ) : (
          <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Deployment Status</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {(['draft', 'test', 'live'] as ClientStatus[]).map((s) => (
                <label
                  key={s}
                  className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer"
                  style={{
                    borderColor: form.status === s ? 'var(--emerald)' : 'var(--line)',
                    background: form.status === s ? 'rgba(0, 255, 153, 0.06)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={onFieldChange}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium capitalize" style={{ color: 'var(--ink)' }}>{s}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{statusLabels[s]}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
          )}

          {/* Business Info */}
          <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Business Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Business name *</label>
                <input name="name" value={form.name} onChange={onFieldChange} required className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Owner email *</label>
                <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={onFieldChange} required className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Owner name</label>
                <input name="ownerName" value={form.ownerName} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Owner phone</label>
                <input name="ownerPhone" value={form.ownerPhone} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Company website</label>
                <input name="companyWebsite" value={form.companyWebsite} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Industry</label>
                <input name="industry" value={form.industry} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Business hours</label>
                <input name="businessHours" value={form.businessHours} onChange={onFieldChange} placeholder="Mon-Fri 9am-6pm" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Timezone</label>
                <input name="timezone" value={form.timezone} onChange={onFieldChange} placeholder="America/New_York" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Booking / scheduling link</label>
                <input name="schedulingLink" value={form.schedulingLink} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Allowed domains (comma-separated)</label>
                <input name="allowedDomains" value={form.allowedDomains} onChange={onFieldChange} placeholder="example.com, www.example.com" className={inputClass} style={inputStyle} />
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Email Notifications</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Notification email (receives chat alerts)</label>
                <input name="notificationEmail" type="email" value={form.notificationEmail} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="emailNotificationsEnabled"
                    checked={form.emailNotificationsEnabled}
                    onChange={onFieldChange}
                  />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>Send chat & lead email alerts</span>
                </label>
              </div>
            </div>
          </section>

          {/* Widget Config */}
          <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Widget Appearance</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Agent name</label>
                <input name="widgetAgentName" value={form.widgetAgentName} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Primary color</label>
                <input name="widgetPrimaryColor" value={form.widgetPrimaryColor} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle}>Welcome message</label>
                <input name="widgetWelcomeMessage" value={form.widgetWelcomeMessage} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Position</label>
                <select name="widgetPosition" value={form.widgetPosition} onChange={onFieldChange} className={inputClass} style={inputStyle}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </div>
            </div>
          </section>

          {/* Abby Prompts */}
          <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Abby Configuration & Prompts</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Assistant name</label>
                <input name="assistantName" value={form.assistantName} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Assistant role</label>
                <input name="assistantRole" value={form.assistantRole} onChange={onFieldChange} className={inputClass} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle}>Brand voice</label>
                <textarea name="brandVoice" value={form.brandVoice} onChange={onFieldChange} rows={2} className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle}>Value proposition</label>
                <textarea name="valueProposition" value={form.valueProposition} onChange={onFieldChange} rows={2} className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle}>Qualification goal</label>
                <textarea name="qualificationGoal" value={form.qualificationGoal} onChange={onFieldChange} rows={2} className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} style={labelStyle}>Response rules (one per line)</label>
                <textarea name="responseRules" value={form.responseRules} onChange={onFieldChange} rows={4} className={`${inputClass} resize-none`} style={inputStyle} placeholder="Keep responses under 15 words&#10;Always ask for email before pricing" />
              </div>
            </div>
          </section>

          {/* Widget embed (contractor clients only) */}
          {mode === 'edit' && selectedClient && !isPlatform && (
            <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Widget Embed Code</h3>
                <button
                  type="button"
                  onClick={handleRotateWidgetKey}
                  className="text-xs px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                >
                  Rotate key
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--muted)' }}>Widget key:</span>
                  <code className="text-xs break-all" style={{ color: 'var(--ink)' }}>{selectedClient.widgetKey}</code>
                  <button type="button" onClick={() => copyToClipboard(selectedClient.widgetKey, 'Widget key')} className="text-xs underline" style={{ color: 'var(--emerald)' }}>Copy</button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--muted)' }}>Preview link:</span>
                  <a href={widgetLink} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--emerald)' }}>Open widget</a>
                  <button type="button" onClick={() => copyToClipboard(widgetLink, 'Widget link')} className="text-xs underline" style={{ color: 'var(--emerald)' }}>Copy</button>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Embed snippet:</span>
                  <pre className="mt-1 p-2 rounded text-xs overflow-x-auto" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>{embedScript}</pre>
                  <button type="button" onClick={() => copyToClipboard(embedScript, 'Embed snippet')} className="text-xs underline mt-1" style={{ color: 'var(--emerald)' }}>Copy embed code</button>
                </div>
              </div>
            </section>
          )}

          {mode === 'edit' && selectedClient && isPlatform && (
            <section className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Site Widget Key</h3>
              <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                Used automatically by webchatsales.com. Managed in code — not rotated from here.
              </p>
              <code className="text-xs break-all block p-2 rounded" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
                {selectedClient.widgetKey}
              </code>
            </section>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-black font-medium rounded bg-gradient-emerald disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create Client' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-6 py-2.5 text-sm rounded border"
              style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="dashboard-section-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--ink)' }}>Client Management</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Add, edit, and control client accounts — no coding required.
          </p>
        </div>
        <div className="dashboard-toolbar">
          <button
            onClick={() => fetchClients()}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded border"
            style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium text-black rounded bg-gradient-emerald"
          >
            + Add New Client
          </button>
        </div>
      </div>

      <div className="dashboard-toolbar w-full">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="px-3 py-2 text-sm border rounded flex-1 min-w-0"
          style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded"
          style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="test">Test</option>
          <option value="live">Live</option>
        </select>
        <span className="text-sm flex items-center" style={{ color: 'var(--muted)' }}>Total: {total}</span>
      </div>

      {error && (
        <div className="p-3 rounded border text-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}>{error}</div>
      )}

      {isLoading ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 border rounded-lg" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          No clients found. Click &quot;Add New Client&quot; to get started.
        </div>
      ) : (
        <div className="dashboard-table-shell" style={{ maxHeight: '70vh' }}>
        <div className="dashboard-table-scroll" style={{ maxHeight: '70vh' }}>
          <table className="dashboard-table" style={{ minWidth: '720px' }}>
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Business</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Notifications</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const status = (client.status || 'draft') as ClientStatus;
                const isPlatform = client.isPlatformTenant === true;
                return (
                  <tr key={client._id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink)' }}>
                        {client.name}
                        {isPlatform && (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                            Platform
                          </span>
                        )}
                      </div>
                      {client.companyWebsite && (
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{client.companyWebsite}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div style={{ color: 'var(--ink)' }}>{client.ownerName || '—'}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{client.ownerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isPlatform ? (
                        <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-500">
                          always live
                        </span>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded capitalize ${statusColors[status]}`}>
                          {status}
                        </span>
                      )}
                      {client.isActive === false && (
                        <span className="ml-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {client.emailNotificationsEnabled === false ? 'Off' : (client.notificationEmail || client.ownerEmail)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {client.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(client)}
                        className="text-sm px-3 py-1 rounded border"
                        style={{ borderColor: 'var(--line)', color: 'var(--emerald)' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
