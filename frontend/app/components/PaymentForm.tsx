'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface PaymentFormProps {
  plan: {
    name: string;
    tier: string;
    price: string;
    planType: string;
  };
  onClose: () => void;
}

export default function PaymentForm({ plan, onClose }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Extract price amount (remove $ and commas)
      const amount = parseFloat(plan.price.replace(/[$,]/g, ''));
      
      // Generate a session ID for this payment
      const sessionId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create payment link with user information
      const response = await fetch(`${API_BASE_URL}/api/payment/create-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          planType: plan.planType,
          sessionId: sessionId,
          userEmail: formData.email,
          userName: `${formData.firstName} ${formData.lastName}`,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.paymentLink) {
        // Redirect to Square checkout
        window.location.href = data.paymentLink;
      } else {
        throw new Error(data.error || 'Failed to create payment link');
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      setError(error.message || 'Failed to create payment link. Please try again or contact support.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div 
        className="relative w-full max-w-md rounded-lg shadow-xl"
        style={{ 
          background: 'var(--panel)', 
          border: '1px solid var(--line)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Complete Your Purchase</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {plan.name} - {plan.price}/month
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              placeholder="John"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              placeholder="Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Company (Optional) */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
              Company Name <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(Optional)</span>
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              placeholder="Acme Inc."
            />
          </div>

          {/* Plan Summary */}
          <div className="p-4 rounded border" style={{ borderColor: 'var(--line)', background: 'rgba(0, 255, 153, 0.05)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium" style={{ color: 'var(--ink)' }}>Plan:</span>
              <span style={{ color: 'var(--ink)' }}>{plan.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: 'var(--ink)' }}>Total:</span>
              <span className="text-xl font-bold" style={{ color: 'var(--emerald)' }}>{plan.price}/month</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded font-medium transition-colors"
              style={{
                border: '1px solid var(--line)',
                color: 'var(--muted)',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Continue to Payment`}
            </button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-center pt-2" style={{ color: 'var(--muted)' }}>
            🔒 Secure payment powered by Square
          </p>
        </form>
      </div>
    </div>
  );
}

