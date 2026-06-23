'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  jobDescription: string;
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
  jobDescription: '',
};

const inputClass =
  'w-full px-4 py-3.5 text-base border rounded-xl transition-colors focus:outline-none';
const inputStyle = {
  borderColor: 'var(--line)',
  background: 'var(--bg)',
  color: 'var(--ink)',
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--ink)' }}>
        {label}
        {required ? <span style={{ color: 'var(--emerald)' }}> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-5 sm:p-6 space-y-5"
      style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
    >
      <div>
        <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </h2>
        {description ? (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function IntakePage() {
  const [form, setForm] = useState<IntakeFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ emailSent: boolean } | null>(null);

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
      setError('Please choose at least one service for Abby to handle.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = { ...form };
      const optionalFields = ['ownerPhone', 'companyWebsite', 'industry', 'bookingLink', 'notes', 'jobDescription'];
      for (const field of optionalFields) {
        if (!payload[field] || (typeof payload[field] === 'string' && (payload[field] as string).trim() === '')) {
          delete payload[field];
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/intake/self-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Unable to submit your form. Please try again.');
      }

      setSuccess({ emailSent: result.emailSent === true });
      setForm(initialForm);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again in a moment.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen py-8 sm:py-14 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
            <Image src="/logo.png" alt="WebChatSales" width={36} height={36} className="rounded-lg" />
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              WebChatSales
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
            Get started with Abby
          </h1>
          <p className="text-sm sm:text-base leading-relaxed max-w-lg" style={{ color: 'var(--muted)' }}>
            Tell us about your business and our team will configure Abby for you. No technical setup required on your end.
          </p>
        </div>

        {/* Success — no technical details shown to clients */}
        {success ? (
          <div
            className="rounded-2xl border p-8 sm:p-10 text-center"
            style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
              style={{ background: 'rgba(0, 255, 153, 0.1)', border: '1px solid var(--emerald)' }}
            >
              ✓
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
              You&apos;re all set!
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-2 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
              Abby is being configured for your business. We&apos;ll review your details and reach out soon with next steps.
            </p>
            <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
              {success.emailSent
                ? 'A confirmation email has been sent to the address you provided.'
                : 'Our team has your details and will be in touch shortly.'}
            </p>

            <div
              className="mt-8 p-4 rounded-xl text-left text-sm space-y-2 max-w-md mx-auto"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
            >
              <p className="font-medium" style={{ color: 'var(--ink)' }}>What happens next?</p>
              <ul className="space-y-2" style={{ color: 'var(--muted)' }}>
                <li>1. We review your business details</li>
                <li>2. Abby is customized for your services</li>
                <li>3. We contact you when everything is ready to go live</li>
              </ul>
            </div>

            <Link
              href="/"
              className="inline-block mt-8 px-8 py-3.5 text-black font-semibold rounded-xl bg-gradient-emerald hover:opacity-90 transition-opacity"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
            <div
              className="rounded-2xl border p-5 sm:p-8 space-y-6 sm:space-y-8"
              style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
            >
              <SectionCard title="Your business" description="Basic info so we can set up your account.">
                <Field label="Business name" required>
                  <input
                    name="businessName"
                    value={form.businessName}
                    onChange={onFieldChange}
                    placeholder="e.g. Summit Roofing Co."
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Industry">
                  <input
                    name="industry"
                    value={form.industry}
                    onChange={onFieldChange}
                    placeholder="e.g. Roofing, HVAC, Legal"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Company website">
                  <input
                    name="companyWebsite"
                    type="url"
                    value={form.companyWebsite}
                    onChange={onFieldChange}
                    placeholder="https://yourcompany.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Contact details" description="Who should we reach out to?">
                <Field label="Your name" required>
                  <input
                    name="ownerName"
                    value={form.ownerName}
                    onChange={onFieldChange}
                    placeholder="Full name"
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    name="ownerEmail"
                    type="email"
                    value={form.ownerEmail}
                    onChange={onFieldChange}
                    placeholder="you@yourcompany.com"
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    name="ownerPhone"
                    type="tel"
                    value={form.ownerPhone}
                    onChange={onFieldChange}
                    placeholder="(555) 000-0000"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              </SectionCard>

              <SectionCard
                title="What should Abby handle?"
                description="Select everything that applies. You can change this later."
              >
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map((service) => {
                    const isSelected = form.servicesOffered.includes(service);
                    return (
                      <label
                        key={service}
                        className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all active:scale-[0.99]"
                        style={{
                          borderColor: isSelected ? 'var(--emerald)' : 'var(--line)',
                          background: isSelected ? 'rgba(0, 255, 153, 0.06)' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onServiceToggle(service)}
                          className="w-5 h-5 shrink-0"
                          style={{ accentColor: 'var(--emerald)' }}
                        />
                        <span
                          className="text-sm sm:text-base font-medium"
                          style={{ color: isSelected ? 'var(--emerald)' : 'var(--ink)' }}
                        >
                          {service}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <Field label="Job description">
                  <textarea
                    name="jobDescription"
                    value={form.jobDescription}
                    onChange={onFieldChange}
                    rows={3}
                    placeholder="Describe what Abby should help with — e.g. qualify emergency roofing leads, book estimates, answer pricing questions..."
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Hours & scheduling">
                <Field label="Business hours" required>
                  <input
                    name="businessHours"
                    value={form.businessHours}
                    onChange={onFieldChange}
                    placeholder="Mon–Fri 9am–6pm"
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Timezone" required>
                  <input
                    name="timezone"
                    value={form.timezone}
                    onChange={onFieldChange}
                    placeholder="America/New_York"
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Online booking link">
                  <input
                    name="bookingLink"
                    type="url"
                    value={form.bookingLink}
                    onChange={onFieldChange}
                    placeholder="https://calendly.com/your-link"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Anything else we should know?">
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={onFieldChange}
                    placeholder="Special instructions, peak seasons, common customer questions..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </Field>
              </SectionCard>

              {error ? (
                <div
                  className="p-4 rounded-xl border text-sm leading-relaxed"
                  style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.06)' }}
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 text-black text-base font-semibold rounded-xl bg-gradient-emerald disabled:opacity-60 transition-opacity"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & get started'}
              </button>

              <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
                By submitting, you agree to be contacted about your Abby setup. We&apos;ll never share your information.
              </p>
            </div>
          </form>
        )}

        {!success ? (
          <div className="mt-6 text-center sm:text-left">
            <Link
              href="/"
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--muted)' }}
            >
              ← Back to home
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
