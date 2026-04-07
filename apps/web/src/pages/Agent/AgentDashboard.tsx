import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { leadsApi, remindersApi, revenueApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users, DollarSign, CheckSquare, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import type { Lead, Reminder } from '@/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection,
  isLoading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {isLoading ? (
            <Skeleton className="w-24 h-8 mt-2" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          )}
        </div>
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
      </div>
      {trend && !isLoading && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${
          trendDirection === 'up' ? 'text-green-600' : 
          trendDirection === 'down' ? 'text-red-600' : 
          'text-gray-500'
        }`}>
          {trendDirection === 'up' && <ArrowUp className="w-4 h-4" />}
          {trendDirection === 'down' && <ArrowDown className="w-4 h-4" />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export function AgentDashboard() {
  const { user } = useAuth();

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll().then(res => res.data.data),
  });

  const { data: revenueStats, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue', 'stats'],
    queryFn: () => revenueApi.getStats().then(res => res.data.data),
  });

  // Calculate stats
  const leadsThisWeek = leads?.filter((l: Lead) => {
    const date = new Date(l.createdAt);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return date >= oneWeekAgo;
  }).length || 0;

  const revenueThisMonth = revenueStats?.thisMonth?.total || 0;
  const pendingFollowUps = reminders?.filter((r: Reminder) => !r.completed).length || 0;

  return (
    <AgentLayout>
      <PageHeader 
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's what's happening with your leads this week"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Leads This Week"
          value={leadsThisWeek}
          icon={Users}
          trend="+12% vs last week"
          trendDirection="up"
          isLoading={leadsLoading}
        />
        <StatCard
          title="Total Leads"
          value={leads?.length || 0}
          icon={Users}
          isLoading={leadsLoading}
        />
        <StatCard
          title="Revenue This Month"
          value={`$${revenueThisMonth.toLocaleString()}`}
          icon={DollarSign}
          trend="On track"
          trendDirection="neutral"
          isLoading={revenueLoading}
        />
        <StatCard
          title="Pending Follow-ups"
          value={pendingFollowUps}
          icon={CheckSquare}
          trend={pendingFollowUps > 0 ? 'Needs attention' : 'All caught up'}
          trendDirection={pendingFollowUps > 0 ? 'down' : 'up'}
          isLoading={remindersLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Leads</h3>
            <a href="/agent/leads" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </a>
          </div>
          {leadsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : leads?.slice(0, 5).map((lead: Lead) => (
            <div key={lead.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-900">{lead.name}</p>
                <p className="text-sm text-gray-500">{lead.email || lead.phone}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                lead.status === 'NEW' ? 'bg-gray-100 text-gray-800' :
                lead.status === 'CONTACTED' ? 'bg-blue-100 text-blue-800' :
                lead.status === 'BOOKED' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {lead.status}
              </span>
            </div>
          ))}
        </div>

        {/* Upcoming Reminders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Reminders</h3>
            <a href="/agent/reminders" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </a>
          </div>
          {remindersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : reminders?.slice(0, 5).map((reminder: Reminder) => (
            <div key={reminder.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className={`font-medium ${reminder.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {reminder.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(reminder.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {reminder.completed && (
                <span className="text-xs text-green-600">Done</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </AgentLayout>
  );
}
