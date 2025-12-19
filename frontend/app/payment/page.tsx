'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const SQUARE_APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || 'sandbox-sq0idb-EzWSCphEv3i3RqREob8OpQ';
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'LWHJ1BYBBQMF0';

function PaymentContent() {
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
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'US',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.addressLine1.trim()) {
      setError('Billing address is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.postalCode.trim()) {
      setError('Postal code is required');
      return false;
    }
    return true;
  };

  const handlePaymentToken = async (token: any, buyer: any) => {
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
      
      // Process payment with tokenized card
      const response = await fetch(`${API_BASE_URL}/api/payment/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: token.token,
          amount: amount,
          planType: plan.planType,
          sessionId: sessionId,
          userEmail: formData.email,
          userName: `${formData.firstName} ${formData.lastName}`,
          billingContact: {
            givenName: formData.firstName,
            familyName: formData.lastName,
            email: formData.email,
            address: {
              addressLine1: formData.addressLine1,
              addressLine2: formData.addressLine2 || undefined,
              city: formData.city,
              state: formData.state || undefined,
              postalCode: formData.postalCode,
              countryCode: formData.countryCode,
            },
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to success page with email
        const emailParam = encodeURIComponent(formData.email);
        router.push(`/payment-success?paymentId=${data.paymentId}&status=${data.status}&email=${emailParam}`);
      } else {
        throw new Error(data.error || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Payment processing failed. Please try again or contact support.');
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-emerald text-black text-sm font-bold">1</div>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Customer Info</span>
              </div>
              <div className="w-12 h-0.5" style={{ background: 'var(--line)' }}></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>2</div>
                <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Payment</span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="mb-6 text-sm hover:opacity-70 transition-opacity inline-flex items-center gap-2"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Pricing
            </button>
            <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--ink)' }}>Complete Your Purchase</h1>
            <p className="text-lg" style={{ color: 'var(--muted)' }}>
              Secure checkout powered by Square
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div 
                className="rounded-xl shadow-lg p-6 sm:p-8"
                style={{ 
                  background: 'var(--panel)', 
                  border: '1px solid var(--line)',
                }}
              >
                <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--line)' }}>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Contact Information</h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>We'll use this to send your receipt and updates</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Name Fields Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        style={{
                          borderColor: 'var(--line)',
                          background: 'var(--bg)',
                          color: 'var(--ink)',
                        }}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                    <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                    <label htmlFor="phone" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                    <label htmlFor="company" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                      Company Name <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      style={{
                        borderColor: 'var(--line)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                      }}
                      placeholder="Acme Inc."
                    />
                  </div>

                  {/* Billing Address */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Billing Address</h3>
                    
                    <div className="mb-4">
                      <label htmlFor="addressLine1" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                        Street Address *
                      </label>
                      <input
                        type="text"
                        id="addressLine1"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        style={{
                          borderColor: 'var(--line)',
                          background: 'var(--bg)',
                          color: 'var(--ink)',
                        }}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="addressLine2" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                        Apartment, suite, etc. <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="addressLine2"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        style={{
                          borderColor: 'var(--line)',
                          background: 'var(--bg)',
                          color: 'var(--ink)',
                        }}
                        placeholder="Apt 4B"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="city" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                          City *
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{
                            borderColor: 'var(--line)',
                            background: 'var(--bg)',
                            color: 'var(--ink)',
                          }}
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{
                            borderColor: 'var(--line)',
                            background: 'var(--bg)',
                            color: 'var(--ink)',
                          }}
                          placeholder="NY"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{
                            borderColor: 'var(--line)',
                            background: 'var(--bg)',
                            color: 'var(--ink)',
                          }}
                          placeholder="10001"
                        />
                      </div>
                      <div>
                        <label htmlFor="countryCode" className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                          Country *
                        </label>
                        <select
                          id="countryCode"
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          style={{
                            borderColor: 'var(--line)',
                            background: 'var(--bg)',
                            color: 'var(--ink)',
                          }}
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Payment Form */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Payment Information</h3>
                    <PaymentForm
                      applicationId={SQUARE_APPLICATION_ID}
                      locationId={SQUARE_LOCATION_ID}
                      cardTokenizeResponseReceived={handlePaymentToken}
                      createVerificationDetails={() => ({
                        amount: plan.price.replace(/[$,]/g, ''),
                        billingContact: {
                          addressLines: [
                            formData.addressLine1,
                            formData.addressLine2,
                          ].filter(Boolean),
                          familyName: formData.lastName,
                          givenName: formData.firstName,
                          countryCode: formData.countryCode,
                          city: formData.city,
                          postalCode: formData.postalCode,
                        },
                        currencyCode: 'USD',
                        intent: 'CHARGE',
                      })}
                    >
                      <CreditCard />
                    </PaymentForm>
                  </div>

                  {/* Security Badges */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>SSL Encrypted</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Secure Payment</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>🔒</span>
                        <span>Powered by Square</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div 
                  className="rounded-xl shadow-lg p-6 border"
                  style={{ 
                    background: 'var(--panel)', 
                    borderColor: 'var(--line)',
                  }}
                >
                  <h3 className="text-xl font-bold mb-6 pb-4 border-b" style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}>
                    Order Summary
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-emerald text-black font-bold text-lg">
                        A
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{plan.name}</h4>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>{plan.tier} Plan</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                      <span style={{ color: 'var(--ink)' }}>{plan.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--muted)' }}>Billing Cycle</span>
                      <span style={{ color: 'var(--ink)' }}>Monthly</span>
                    </div>
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Total</span>
                        <span className="text-2xl font-bold" style={{ color: 'var(--emerald)' }}>{plan.price}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>per month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
          <div className="max-w-md w-full">
            <div className="border rounded-lg p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--emerald)' }}></div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Loading...</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Please wait while we load the payment page.</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    }>
      <PaymentContent />
    </Suspense>
  );
}
