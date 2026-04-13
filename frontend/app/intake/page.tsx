'use client';

import Link from 'next/link';
import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const serviceOptions = [
  'Lead Qualification',
  'Appointment Booking',
  'After-Hours Support',
  'Pricing Questions',
  'FAQ Automation',
  'SMS Follow-up',
];

type IntakeFormState = {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  companyWebsite: string;
  industry: string;
  servicesOffered: string[];
  businessHours: string;
  timezone: string;
  bookingLink: string;
  notes: string;
};

const initialForm: IntakeFormState = {
  businessName: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  companyWebsite: '',
  industry: '',
  servicesOffered: [],
  businessHours: '',
  timezone: '',
  bookingLink: '',
  notes: '',
};

export default function IntakePage() {
  const [form, setForm] = useState<IntakeFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<null | {
    clientId: string;
    clientSlug: string;
    intakeId: string;
    widgetKey: string;
    widgetLink: string;
    widgetEmbedScript: string;
    isNewClient: boolean;
  }>(null);

  const onFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const onServiceToggle = (service: string) => {
    setForm((prev) => {
      const exists = prev.servicesOffered.includes(service);
      return {
        ...prev,
        servicesOffered: exists
          ? prev.servicesOffered.filter((s) => s !== service)
          : [...prev.servicesOffered, service],
      };
    });
    setError('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(null);

    if (!form.servicesOffered.length) {
      setError('Please choose at least one service.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/intake/self-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Unable to submit intake form');
      }

      setSuccess({
        clientId: result.clientId,
        clientSlug: result.clientSlug,
        intakeId: result.intakeId,
        widgetKey: result.widgetKey || '',
        widgetLink: result.widgetLink || '',
        widgetEmbedScript: result.widgetEmbedScript || '',
        isNewClient: result.isNewClient,
      });
      setForm(initialForm);
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong while submitting your form.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen py-14 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto border rounded-lg p-6 sm:p-8" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Client Intake Form
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Tell us about your business so we can self-onboard your account.
          </p>
        </div>

        {success && (
          <div className="mb-5 p-3 rounded border text-sm" style={{ borderColor: 'var(--emerald)', color: 'var(--ink)' }}>
            Intake saved and linked to client successfully. {success.isNewClient ? 'New client created.' : 'Existing client updated.'}
            <div className="mt-1" style={{ color: 'var(--muted)' }}>
              Client ID: {success.clientId} | Intake ID: {success.intakeId}
            </div>
            {success.widgetKey ? (
              <>
                <div className="mt-1" style={{ color: 'var(--muted)' }}>
                  Widget key: {success.widgetKey}
                </div>
                <div className="mt-1">
                  <a
                    href={success.widgetLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--emerald)', textDecoration: 'underline' }}
                  >
                    Open widget link
                  </a>
                </div>
                <div className="mt-2 text-xs break-all" style={{ color: 'var(--muted)' }}>
                  Embed snippet: {success.widgetEmbedScript}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm" style={{ color: '#f59e0b' }}>
                Widget link is not ready yet. Restart backend and submit again.
              </div>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <input name="businessName" value={form.businessName} onChange={onFieldChange} placeholder="Business name" required className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="ownerName" value={form.ownerName} onChange={onFieldChange} placeholder="Owner / admin name" required className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={onFieldChange} placeholder="Owner email" required className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="ownerPhone" value={form.ownerPhone} onChange={onFieldChange} placeholder="Owner phone (optional)" className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="companyWebsite" type="url" value={form.companyWebsite} onChange={onFieldChange} placeholder="Company website (optional)" className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="industry" value={form.industry} onChange={onFieldChange} placeholder="Industry (optional)" className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--ink)' }}>
              Services you want Abby to handle
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {serviceOptions.map((service) => (
                <label key={service} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={form.servicesOffered.includes(service)}
                    onChange={() => onServiceToggle(service)}
                    style={{ accentColor: 'var(--emerald)' }}
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          <input name="businessHours" value={form.businessHours} onChange={onFieldChange} placeholder="Business hours (e.g. Mon-Fri 9am-6pm)" required className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="timezone" value={form.timezone} onChange={onFieldChange} placeholder="Timezone (e.g. America/New_York)" required className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <input name="bookingLink" type="url" value={form.bookingLink} onChange={onFieldChange} placeholder="Booking link (optional)" className="w-full px-4 py-3 border rounded" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <textarea name="notes" value={form.notes} onChange={onFieldChange} placeholder="Anything else we should know? (optional)" rows={4} className="w-full px-4 py-3 border rounded resize-none" style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />

          {error && (
            <div className="p-3 rounded border text-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-3 px-5 text-black font-medium rounded bg-gradient-emerald disabled:opacity-60">
            {isSubmitting ? 'Saving intake...' : 'Submit Intake'}
          </button>
        </form>

        <div className="mt-6 text-sm">
          <Link href="/" style={{ color: 'var(--muted)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
