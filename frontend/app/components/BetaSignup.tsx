'use client';

import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function BetaSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    outcomes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Send email via backend
      const response = await fetch(`${API_BASE_URL}/api/email/send-beta-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.fullName,
          company: formData.company,
          outcomes: formData.outcomes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setFormData({ fullName: '', email: '', company: '', outcomes: '' });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        // Don't show technical errors to users - show friendly message
        console.error('Beta signup error:', data.error);
        setError('We couldn\'t process your request right now. Please try again or chat with Abby below!');
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError('We couldn\'t process your request right now. Please try again or chat with Abby below!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Beta Info */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Join the Founding Beta</h2>
            <p className="text-lg mb-8" style={{ color: 'var(--muted)' }}>
              Get priority onboarding, direct input on features, and founder pricing. Limited spots.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl" style={{ color: 'var(--emerald)' }}>★</span>
                <p style={{ color: 'var(--muted)' }}>
                  Designed for growing SMBs and agencies
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl" style={{ color: 'var(--emerald)' }}>⚡</span>
                <p style={{ color: 'var(--muted)' }}>
                  24/7 lead response with Abby
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl" style={{ color: 'var(--emerald)' }}>★</span>
                <p style={{ color: 'var(--muted)' }}>
                  Integrates with your calendar + CRM*
                </p>
              </div>
            </div>
            <p className="text-sm mt-6" style={{ color: 'var(--muted)' }}>
              *Talk to Abby in the chat if you need a specific integration.
            </p>
          </div>

          {/* Right Column - Contact Form */}
          <div className="border rounded-lg p-8" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-emerald">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Request Sent!</h3>
                <p style={{ color: 'var(--muted)' }}>
                  We've sent a confirmation email to <strong>{formData.email}</strong>. 
                  Our team will reach out to you shortly!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="fullName" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full px-4 py-3 border rounded transition-colors"
                    style={{ 
                      background: 'var(--bg)', 
                      borderColor: 'var(--line)', 
                      color: 'var(--ink)' 
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Work Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 border rounded transition-colors"
                    style={{ 
                      background: 'var(--bg)', 
                      borderColor: 'var(--line)', 
                      color: 'var(--ink)' 
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Company name"
                    className="w-full px-4 py-3 border rounded transition-colors"
                    style={{ 
                      background: 'var(--bg)', 
                      borderColor: 'var(--line)', 
                      color: 'var(--ink)' 
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="outcomes" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    What are you hoping Abby will do?
                  </label>
                  <textarea
                    id="outcomes"
                    name="outcomes"
                    value={formData.outcomes}
                    onChange={handleChange}
                    placeholder="Tell us your top outcomes..."
                    rows={4}
                    className="w-full px-4 py-3 border rounded transition-colors resize-none"
                    style={{ 
                      background: 'var(--bg)', 
                      borderColor: 'var(--line)', 
                      color: 'var(--ink)' 
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 text-black font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-emerald hover:opacity-90"
                >
                  {isLoading ? 'Sending...' : 'Request Beta Invite'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
