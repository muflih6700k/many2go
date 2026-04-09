import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AdminLayout } from '@/layouts/AdminLayout';
import { usersApi, bookingsApi, revenueApi, leadsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Users, Calendar, UserCheck } from 'lucide-react';
import type { Booking, User, Lead, CallStatus } from '@/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
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
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['users', 'agents'],
    queryFn: () => usersApi.getAll('AGENT').then(res => res.data.data),
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getAll().then(res => res.data.data),
  });

const { data: revenueStats, isLoading: revenueLoading } = useQuery({
 queryKey: ['revenue', 'stats'],
 queryFn: () => revenueApi.getStats().then(res => res.data.data),
 });

 const { data: allLeads, isLoading: leadsLoading } = useQuery({
 queryKey: ['leads', 'admin'],
 queryFn: () => leadsApi.getAll().then(res => res.data.data),
 });

 const totalRevenue = revenueStats?.thisMonth?.total || 0;
 const totalBookings = bookings?.length || 0;
 const activeAgents = agents?.filter((a: User) => a.role === 'AGENT').length || 0;

 // Calculate call status counts
 const statusCounts = allLeads?.reduce((acc: Record<string, number>, lead: Lead) => {
 const status = lead.callStatus || 'PENDING';
 acc[status] = (acc[status] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const getStatusPillColor = (status: CallStatus): string => {
 if (status === 'ENQUIRY_GENERATED') return 'bg-green-100 text-green-700 border-green-200';
 if (['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(status)) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
 if (['NOT_INTERESTED', 'BANG', 'WRONG_NO', 'INVALID_NO', 'OUT_OF_SERVICE', 'REPEATED_NO'].includes(status)) return 'bg-red-100 text-red-700 border-red-200';
 if (['RINGING_NO_RESPONSE', 'SWITCH_OFF', 'NOT_REACHABLE', 'BUSY', 'VOICE_MAIL'].includes(status)) return 'bg-orange-100 text-orange-700 border-orange-200';
 return 'bg-gray-100 text-gray-700 border-gray-200';
 };

 const getStatusLabel = (status: string): string => {
 const labels: Record<string, string> = {
 'PENDING': 'Pending',
 'RINGING_NO_RESPONSE': 'RNR',
 'SWITCH_OFF': 'Switch Off',
 'ENQUIRY_GENERATED': 'Enquiry',
 'NOT_INTERESTED': 'Not Int.',
 'CALL_BACK': 'Call Back',
 'FUTURE_FOLLOWUP': 'Future',
 };
 return labels[status] || status.replace(/_/g, ' ').slice(0, 12);
 };

  return (
    <AdminLayout>
      <PageHeader 
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle="Platform overview and statistics"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Revenue (This Month)"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          isLoading={revenueLoading}
        />
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          icon={Calendar}
          isLoading={bookingsLoading}
        />
        <StatCard
          title="Active Agents"
          value={activeAgents}
          icon={UserCheck}
          isLoading={agentsLoading}
        />
      </div>

      {/* Agents Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Active Agents</h3>
        </div>
        {agentsLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-14 rounded" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {agents?.slice(0, 5).map((agent: User) => (
              <div key={agent.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary-700">{agent.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.email}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
              </div>
            ))}
            {agents?.length === 0 && (
              <div className="p-8 text-center text-gray-500">No agents found</div>
 )}
 </div>
 )}
 </div>

 {/* Call Status Breakdown */}
 <div className="card p-6 mt-8">
 <h3 className="font-medium text-gray-900 mb-4">Call Status Breakdown</h3>
 {leadsLoading ? (
 <div className="flex gap-2 flex-wrap">
 {[...Array(8)].map((_, i) => (
 <div key={i} className="animate-pulse bg-gray-200 h-8 w-24 rounded-full" />
 ))}
 </div>
 ) : statusCounts && Object.keys(statusCounts).length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {Object.entries(statusCounts)
 .sort((a, b) => b[1] - a[1])
 .map(([status, count]) => (
 <div
 key={status}
 className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusPillColor(status as CallStatus)}`}
 >
 {getStatusLabel(status)}: {count}
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500">No leads found</p>
 )}
 </div>
 </AdminLayout>
 );
}
