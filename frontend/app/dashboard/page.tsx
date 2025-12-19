'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardStats from '../components/dashboard/DashboardStats';
import ConversationsList from '../components/dashboard/ConversationsList';
import LeadsList from '../components/dashboard/LeadsList';
import TicketsList from '../components/dashboard/TicketsList';
import PaymentsList from '../components/dashboard/PaymentsList';
import BookingsList from '../components/dashboard/BookingsList';
import ConversationDetail from '../components/dashboard/ConversationDetail';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

type TabType = 'overview' | 'conversations' | 'leads' | 'tickets' | 'payments' | 'bookings';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // Verify token with backend
    const verifyAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        
        if (data.success && data.valid) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          // Token is invalid or expired
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          router.push('/login');
        }
      } catch (error) {
        // Network error - might be temporary backend issue
        console.error('Auth verification error:', error);
        // Check if token exists - if yes, allow access but token will be verified on next API call
        // If backend is down, we don't want to lock out the user
        const hasToken = localStorage.getItem('admin_token');
        if (hasToken) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          router.push('/login');
        }
      }
    };

    verifyAuth();
  }, [router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--emerald)' }}></div>
          <p style={{ color: 'var(--muted)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (selectedSessionId) {
    return (
      <ConversationDetail
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-sm py-2" style={{ background: 'var(--glass)', borderColor: 'var(--line)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="WebChatSales Logo" 
                width={56} 
                height={56}
                className="object-contain"
              />
              <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>WebChatSales Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  router.push('/login');
                }}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Logout
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Back to Site
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'conversations', label: 'Conversations' },
              { id: 'leads', label: 'Leads' },
              { id: 'tickets', label: 'Support Tickets' },
              { id: 'payments', label: 'Payments' },
              { id: 'bookings', label: 'Bookings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={
                  activeTab === tab.id
                    ? { borderColor: 'var(--emerald)', color: 'var(--emerald)' }
                    : { borderColor: 'transparent', color: 'var(--muted)' }
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <DashboardStats onViewConversation={(sessionId) => {
            setSelectedSessionId(sessionId);
            setActiveTab('conversations');
          }} />
        )}
        {activeTab === 'conversations' && (
          <ConversationsList onViewConversation={setSelectedSessionId} />
        )}
        {activeTab === 'leads' && <LeadsList />}
        {activeTab === 'tickets' && <TicketsList />}
        {activeTab === 'payments' && <PaymentsList />}
        {activeTab === 'bookings' && <BookingsList />}
      </main>
    </div>
  );
}

