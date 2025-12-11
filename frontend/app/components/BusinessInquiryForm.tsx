'use client';

import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function BusinessInquiryForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    inquiryTypes: [] as string[],
    otherInquiry: '',
    description: '',
    contactMethod: 'email',
    bestTime: '',
    comments: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData({
      ...formData,
      inquiryTypes: checked
        ? [...formData.inquiryTypes, value]
        : formData.inquiryTypes.filter(type => type !== value)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/email/business-inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          inquiryTypes: [],
          otherInquiry: '',
          description: '',
          contactMethod: 'email',
          bestTime: '',
          comments: ''
        });
        setTimeout(() => setSubmitted(false), 10000);
      } else {
        setError(data.error || 'Failed to submit form. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to submit form. Please check your connection and try again.');
      console.error('Error submitting form:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="border rounded-lg p-8" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
          Business Inquiry Form
        </h2>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-emerald">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Thank You!</h3>
            <p style={{ color: 'var(--muted)' }}>
              Your inquiry has been submitted successfully. We'll get back to you soon!
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
              <label htmlFor="name" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
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
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
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
              <label htmlFor="phone" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
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
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your Company Inc."
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
              <label className="block font-medium mb-3" style={{ color: 'var(--ink)' }}>
                How can we assist you? (Select all that apply) <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {['Lead Qualification', 'Customer Service', 'Product Information', 'Sales Assistance'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={type}
                      checked={formData.inquiryTypes.includes(type)}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4"
                      style={{ accentColor: 'var(--emerald)' }}
                    />
                    <span style={{ color: 'var(--ink)' }}>{type}</span>
                  </label>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    value="Other"
                    checked={formData.inquiryTypes.includes('Other')}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--emerald)' }}
                  />
                  <span style={{ color: 'var(--ink)' }}>Other:</span>
                  <input
                    type="text"
                    name="otherInquiry"
                    value={formData.otherInquiry}
                    onChange={handleChange}
                    placeholder="Please specify"
                    className="flex-1 px-3 py-2 border rounded text-sm"
                    style={{ 
                      background: 'var(--bg)', 
                      borderColor: 'var(--line)', 
                      color: 'var(--ink)' 
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                    disabled={!formData.inquiryTypes.includes('Other')}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Describe your inquiry <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Please provide details about your inquiry..."
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

            <div>
              <label htmlFor="contactMethod" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Preferred Contact Method <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="email"
                    checked={formData.contactMethod === 'email'}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--emerald)' }}
                  />
                  <span style={{ color: 'var(--ink)' }}>Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="phone"
                    checked={formData.contactMethod === 'phone'}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--emerald)' }}
                  />
                  <span style={{ color: 'var(--ink)' }}>Phone</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="bestTime" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Best Time to Contact
              </label>
              <input
                type="text"
                id="bestTime"
                name="bestTime"
                value={formData.bestTime}
                onChange={handleChange}
                placeholder="e.g., Monday-Friday, 9am-5pm EST"
                className="w-full px-4 py-3 border rounded transition-colors"
                style={{ 
                  background: 'var(--bg)', 
                  borderColor: 'var(--line)', 
                  color: 'var(--ink)' 
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </div>

            <div>
              <label htmlFor="comments" className="block font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Additional Comments
              </label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                placeholder="Any additional information you'd like to share..."
                rows={3}
                className="w-full px-4 py-3 border rounded transition-colors resize-none"
                style={{ 
                  background: 'var(--bg)', 
                  borderColor: 'var(--line)', 
                  color: 'var(--ink)' 
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.inquiryTypes.length === 0}
              className="w-full py-3 px-6 text-black font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-emerald hover:opacity-90"
            >
              {isLoading ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


