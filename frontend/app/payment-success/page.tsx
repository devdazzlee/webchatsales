'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Check payment status from URL params
    const paymentStatus = searchParams.get('status');
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    
    if (paymentStatus === 'success' || paymentStatus === 'COMPLETED') {
      setStatus('success');
    } else if (paymentStatus === 'failed' || paymentStatus === 'FAILED') {
      setStatus('error');
    } else {
      // Default to success if no status param
      setStatus('success');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="max-w-md w-full">
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--emerald)' }}></div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Processing Payment...</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-emerald">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Payment Successful!</h2>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                Thank you for your payment. Your account has been activated and you can now start using WebChatSales!
              </p>
              {email && (
                <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
                  A confirmation email has been sent to <span className="font-semibold" style={{ color: 'var(--ink)' }}>{email}</span>.
                </p>
              )}
              {!email && (
                <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
                  A confirmation email has been sent to your email address.
                </p>
              )}
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 rounded font-medium transition-colors bg-gradient-emerald text-black hover:opacity-90"
              >
                Return to Home
              </button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <svg className="w-8 h-8" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Payment Failed</h2>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                We're sorry, but your payment could not be processed. Please try again or contact support.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 rounded font-medium transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Return to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <div className="max-w-md w-full">
          <div className="border rounded-lg p-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--emerald)' }}></div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Loading...</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Please wait while we process your payment.</p>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

