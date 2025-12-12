'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [plan, setPlan] = useState<{
    name: string;
    tier: string;
    price: string;
    planType: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  });

  useEffect(() => {
    // Get plan info from URL params
    const planName = searchParams.get('plan');
    const planTier = searchParams.get('tier');
    const planPrice = searchParams.get('price');
    const planType = searchParams.get('planType');

    if (planName && planTier && planPrice && planType) {
      setPlan({
        name: decodeURIComponent(planName),
        tier: decodeURIComponent(planTier),
        price: decodeURIComponent(planPrice),
        planType: decodeURIComponent(planType),
      });
    } else {
      // If no plan info, redirect to home
      router.push('/');
    }
  }, [searchParams, router]);

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
    
    if (!plan) return;
    
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

  if (!plan) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center">
            <p style={{ color: 'var(--muted)' }}>Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16 pb-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="mb-4 text-sm hover:opacity-70 transition-opacity flex items-center gap-2"
              style={{ color: 'var(--muted)' }}
            >
              ← Back to Pricing
            </button>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Complete Your Purchase</h1>
            <p className="text-lg" style={{ color: 'var(--muted)' }}>
              {plan.name} - {plan.price}/month
            </p>
          </div>

          {/* Form Card */}
          <div 
            className="rounded-lg shadow-lg p-6 sm:p-8"
            style={{ 
              background: 'var(--panel)', 
              border: '1px solid var(--line)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-4 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                </div>
              )}

              {/* Name Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{
                      borderColor: 'var(--line)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                    }}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label htmlFor="company" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Company Name <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{
                    borderColor: 'var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                  }}
                  placeholder="Acme Inc."
                />
              </div>

              {/* Plan Summary */}
              <div className="p-5 rounded border" style={{ borderColor: 'var(--line)', background: 'rgba(0, 255, 153, 0.05)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--muted)' }}>Plan:</span>
                    <span style={{ color: 'var(--ink)' }}>{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>Total:</span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--emerald)' }}>{plan.price}/month</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-3 rounded font-medium transition-colors"
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
                  className="flex-1 px-6 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>

              {/* Security Note */}
              <p className="text-xs text-center pt-4" style={{ color: 'var(--muted)' }}>
                🔒 Secure payment powered by Square
              </p>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

