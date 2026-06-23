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
import IntakeSubmissionsList from '../components/dashboard/IntakeSubmissionsList';
import ClientsPanel from '../components/dashboard/ClientsPanel';
import { isSuperAdmin } from '../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

type TabType = 'overview' | 'conversations' | 'leads' | 'tickets' | 'payments' | 'bookings' | 'intake' | 'clients';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientsEditId, setClientsEditId] = useState<string | null>(null);

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
          setUserRole(data.user?.role || null);
          if (data.user) {
            localStorage.setItem('admin_user', JSON.stringify(data.user));
          }
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
          setUserRole(isSuperAdmin() ? 'super_admin' : 'client_admin');
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
    <div className="min-h-screen dashboard-page" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-sm py-2" style={{ background: 'var(--glass)', borderColor: 'var(--line)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Image 
                src="/logo.png" 
                alt="WebChatSales Logo" 
                width={56} 
                height={56}
                className="object-contain w-10 h-10 sm:w-14 sm:h-14 shrink-0"
              />
              <span className="font-semibold text-sm sm:text-lg truncate" style={{ color: 'var(--ink)' }}>
                <span className="hidden sm:inline">WebChatSales </span>Dashboard
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => router.push('/')}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Back to Site
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  router.push('/login');
                }}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="dashboard-tabs-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
            <nav className="dashboard-tabs-inner">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'conversations', label: 'Conversations' },
              { id: 'leads', label: 'Leads' },
              { id: 'tickets', label: 'Support Tickets' },
              { id: 'payments', label: 'Payments' },
              { id: 'bookings', label: 'Bookings' },
              { id: 'intake', label: 'Intake' },
              ...(userRole === 'super_admin' ? [{ id: 'clients', label: 'Clients' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`dashboard-tab-btn border-b-2 font-medium transition-colors ${
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
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-w-0">
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
        {activeTab === 'intake' && (
          <IntakeSubmissionsList
            onEditClient={(clientId) => {
              setClientsEditId(clientId);
              setActiveTab('clients');
            }}
          />
        )}
        {activeTab === 'clients' && userRole === 'super_admin' && (
          <ClientsPanel initialEditClientId={clientsEditId} onClearInitialEdit={() => setClientsEditId(null)} />
        )}
      </main>
    </div>
  );
}

