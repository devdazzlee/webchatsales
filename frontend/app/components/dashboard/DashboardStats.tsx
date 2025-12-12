'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

import { getAuthHeaders, handleAuthError } from '../../utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface DashboardStatsProps {
  onViewConversation: (sessionId: string) => void;
}

export default function DashboardStats({ onViewConversation }: DashboardStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: getAuthHeaders(),
      });
      
      if (handleAuthError(response)) return;
      
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>No data available</div>;
  }

  const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534'];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Conversations"
          value={stats.stats.conversations.total}
          subtitle={`${stats.stats.conversations.active} active`}
          color="var(--emerald)"
        />
        <MetricCard
          title="Total Leads"
          value={stats.stats.leads.total}
          subtitle={`${stats.stats.leads.qualified} qualified`}
          color="var(--emerald)"
        />
        <MetricCard
          title="Support Tickets"
          value={stats.stats.tickets.total}
          subtitle={`${stats.stats.tickets.open} open`}
          color="var(--emerald)"
        />
        <MetricCard
          title="Payments"
          value={stats.stats.payments.completed}
          subtitle={`$${stats.stats.payments.revenue.toFixed(2)} revenue`}
          color="var(--emerald)"
        />
        <MetricCard
          title="Bookings"
          value={stats.stats.bookings.total}
          subtitle={`${stats.stats.bookings.scheduled} scheduled`}
          color="var(--emerald)"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Over Time */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Conversations Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.trends.conversationsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="_id" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <Line type="monotone" dataKey="count" stroke="var(--emerald)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Leads by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.breakdowns.leadsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.breakdowns.leadsByStatus.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Priority */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.breakdowns.ticketsByPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="_id" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <Bar dataKey="count" fill="var(--emerald)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payments by Status */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Payments by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.breakdowns.paymentsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="_id" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <Bar dataKey="count" fill="var(--emerald)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Recent Conversations</h3>
          <div className="space-y-3">
            {stats.recent.conversations.slice(0, 5).map((conv: any) => (
              <div
                key={conv._id}
                onClick={() => onViewConversation(conv.sessionId)}
                className="p-3 border rounded cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{conv.sessionId}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {conv.messages?.length || 0} messages
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {format(new Date(conv.lastMessageAt || conv.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>Recent Leads</h3>
          <div className="space-y-3">
            {stats.recent.leads.slice(0, 5).map((lead: any) => (
              <div
                key={lead._id}
                className="p-3 border rounded"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                      {lead.name || 'Unknown'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {lead.email || 'No email'} • {lead.serviceNeed || 'No service specified'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--emerald)/20', color: 'var(--emerald)' }}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }: { title: string; value: number; subtitle: string; color: string }) {
  return (
    <div className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{title}</p>
      <p className="text-2xl font-bold mb-1" style={{ color }}>{value.toLocaleString()}</p>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{subtitle}</p>
    </div>
  );
}

