import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { leadsApi, remindersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Users, CheckCircle, DollarSign, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import type { Lead, CallStatus } from '@/types';

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
            <Skeleton className="w-16 h-8 mt-2" />
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

function getStatusColor(status: CallStatus | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-700';
  if (status === 'ENQUIRY_GENERATED') return 'bg-green-100 text-green-700';
  if (['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(status)) return 'bg-yellow-100 text-yellow-700';
  if (['NOT_INTERESTED', 'BANG', 'WRONG_NO', 'INVALID_NO', 'OUT_OF_SERVICE', 'REPEATED_NO'].includes(status)) return 'bg-red-100 text-red-700';
  if (['RINGING_NO_RESPONSE', 'SWITCH_OFF', 'NOT_REACHABLE', 'BUSY', 'VOICE_MAIL'].includes(status)) return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-700';
}

function getStatusLabel(status: CallStatus | null | undefined): string {
  if (!status) return 'Pending';
  const labels: Record<string, string> = {
    'PENDING': 'Pending',
    'ENQUIRY_GENERATED': 'Enquiry',
    'CALL_BACK': 'Call Back',
    'FUTURE_FOLLOWUP': 'Future',
    'CM_BUSY_CALLBACK': 'Busy',
    'NOT_INTERESTED': 'Not Int.',
    'RNR': 'RNR',
    'SWITCH_OFF': 'Off',
  };
  return labels[status] || status.replace(/_/g, ' ').slice(0, 12);
}

export function AgentDashboard() {
  const { user } = useAuth();

  // Fetch leads - auto-refresh every 60 seconds
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
    refetchInterval: 60000, // 60 seconds
  });

  // Fetch follow-ups for today
  const { data: followups, isLoading: followupsLoading } = useQuery({
    queryKey: ['leads', 'followups'],
    queryFn: () => leadsApi.getFollowups().then(res => res.data.data),
    refetchInterval: 60000, // 60 seconds
  });

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

  const myLeadsToday = leads?.filter((l: Lead) => {
    const created = new Date(l.createdAt);
    return created >= today && l.agentId === user?.userId;
  }).length || 0;

  const myLeadsThisWeek = leads?.filter((l: Lead) => {
    const created = new Date(l.createdAt);
    return created >= weekStart && l.agentId === user?.userId;
  }).length || 0;

  const enquiriesGenerated = leads?.filter((l: Lead) => 
    l.callStatus === 'ENQUIRY_GENERATED' && l.agentId === user?.userId
  ).length || 0;

  const salesClosed = leads?.filter((l: Lead) => 
    l.outcome === 'SALE_CLOSED' && l.agentId === user?.userId
  ).length || 0;

  const followupCount = followups?.length || 0;

  // Recent leads (last 5 assigned to me)
  const recentLeads = leads
    ?.filter((l: Lead) => l.agentId === user?.userId)
    ?.sort((a: Lead, b: Lead) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    ?.slice(0, 5) || [];

  return (
    <AgentLayout>
      <PageHeader 
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's what's happening with your leads"
      />

      {/* Follow-up Alerts */}
      {!followupsLoading && followupCount > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔔</span>
            <span className="font-medium text-amber-800">
              {followupCount} follow-up{followupCount > 1 ? 's' : ''} due today
            </span>
          </div>
          <div className="space-y-2">
            {followups?.slice(0, 3).map((lead: Lead) => (
              <div key={lead.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{lead.customer?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{lead.phone || 'No phone'}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            ))}
            {followupCount > 3 && (
              <p className="text-sm text-amber-700 text-center">
                +{followupCount - 3} more follow-ups
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="My Leads Today"
          value={myLeadsToday}
          icon={Users}
          isLoading={leadsLoading}
        />
        <StatCard
          title="My Leads This Week"
          value={myLeadsThisWeek}
          icon={Users}
          isLoading={leadsLoading}
        />
        <StatCard
          title="Enquiries Generated"
          value={enquiriesGenerated}
          icon={CheckCircle}
          isLoading={leadsLoading}
        />
        <StatCard
          title="Sales Closed"
          value={salesClosed}
          icon={DollarSign}
          isLoading={leadsLoading}
        />
      </div>

      {/* Recent Leads */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Leads</h3>
          <Link to="/agent/calls" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {leadsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentLeads.length > 0 ? (
          <div className="divide-y">
            {recentLeads.map((lead: Lead) => (
              <div key={lead.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{lead.customer?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    Assigned {new Date(lead.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(lead.callStatus)}`}>
                  {getStatusLabel(lead.callStatus)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No leads assigned yet
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
