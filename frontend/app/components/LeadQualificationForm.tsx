'use client';

import { useState } from 'react';

interface LeadQualificationFormProps {
  sessionId: string;
  onSubmit: (data: {
    name: string;
    serviceNeed: string;
    timing: string;
    budget: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export default function LeadQualificationForm({ sessionId, onSubmit, onCancel }: LeadQualificationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    serviceNeed: '',
    timing: '',
    budget: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.serviceNeed.trim()) {
      setError('Service need is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg" style={{ background: 'var(--panel)', borderColor: 'var(--emerald)' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--emerald)' }}>
        Let's get to know you better!
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Name <span style={{ color: 'var(--emerald)' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2"
            style={{
              background: 'var(--bg)',
              borderColor: error && !formData.name.trim() ? '#ef4444' : 'var(--line)',
              color: 'var(--ink)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={(e) => e.target.style.borderColor = error && !formData.name.trim() ? '#ef4444' : 'var(--line)'}
            placeholder="Your full name"
          />
        </div>

        {/* Service Need */}
        <div>
          <label htmlFor="serviceNeed" className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Service need / Reason for visiting <span style={{ color: 'var(--emerald)' }}>*</span>
          </label>
          <textarea
            id="serviceNeed"
            name="serviceNeed"
            value={formData.serviceNeed}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 resize-none"
            style={{
              background: 'var(--bg)',
              borderColor: error && !formData.serviceNeed.trim() ? '#ef4444' : 'var(--line)',
              color: 'var(--ink)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={(e) => e.target.style.borderColor = error && !formData.serviceNeed.trim() ? '#ef4444' : 'var(--line)'}
            placeholder="What can we help you with?"
          />
        </div>

        {/* Timing */}
        <div>
          <label htmlFor="timing" className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Timing (When you want to start)
          </label>
          <input
            type="text"
            id="timing"
            name="timing"
            value={formData.timing}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
            placeholder="e.g., ASAP, Next month, Q2 2024"
          />
        </div>

        {/* Budget */}
        <div>
          <label htmlFor="budget" className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Budget
          </label>
          <input
            type="text"
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2"
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
            placeholder="e.g., $500-1000, $1000-5000"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs p-2 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim() || !formData.serviceNeed.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-black rounded transition-opacity disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-emerald hover:opacity-90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--muted)',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.borderColor = 'var(--emerald)';
                  e.currentTarget.style.color = 'var(--emerald)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
