import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AdminLayout } from '@/layouts/AdminLayout';
import { leadsApi, usersApi } from '@/lib/api';
import { TrendingUp, Users, Phone, DollarSign, BarChart2, Flame } from 'lucide-react';
import { useMemo } from 'react';
import type { Lead, User } from '@/types';

type CallStatus = 
 | 'PENDING'
 | 'ENQUIRY_GENERATED'
 | 'CALL_BACK'
 | 'FUTURE_FOLLOWUP'
 | 'CM_BUSY_CALLBACK'
 | 'NOT_INTERESTED'
 | 'BANG'
 | 'WRONG_NO'
 | 'INVALID_NO'
 | 'OUT_OF_SERVICE'
 | 'REPEATED_NO'
 | 'RINGING_NO_RESPONSE'
 | 'SWITCH_OFF'
 | 'NOT_REACHABLE'
 | 'BUSY'
 | 'VOICE_MAIL';

function StatusBadge({ status }: { status: string | null }) {
 if (!status) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">PENDING</span>;
 
 const colors: Record<string, string> = {
 'PENDING': 'bg-gray-100 text-gray-600',
 'ENQUIRY_GENERATED': 'bg-green-100 text-green-600',
 'CALL_BACK': 'bg-yellow-100 text-yellow-600',
 'FUTURE_FOLLOWUP': 'bg-blue-100 text-blue-600',
 'CM_BUSY_CALLBACK': 'bg-orange-100 text-orange-600',
 'NOT_INTERESTED': 'bg-red-100 text-red-600',
 'BANG': 'bg-red-100 text-red-600',
 'WRONG_NO': 'bg-red-100 text-red-600',
 'INVALID_NO': 'bg-red-100 text-red-600',
 'OUT_OF_SERVICE': 'bg-red-100 text-red-600',
 'REPEATED_NO': 'bg-red-100 text-red-600',
 'RINGING_NO_RESPONSE': 'bg-orange-100 text-orange-600',
 'SWITCH_OFF': 'bg-orange-100 text-orange-600',
 'NOT_REACHABLE': 'bg-orange-100 text-orange-600',
 'BUSY': 'bg-orange-100 text-orange-600',
 'VOICE_MAIL': 'bg-purple-100 text-purple-600',
 };
 
 const labels: Record<string, string> = {
 'PENDING': 'Pending',
 'ENQUIRY_GENERATED': 'Enquiry',
 'CALL_BACK': 'Call Back',
 'FUTURE_FOLLOWUP': 'Future',
 'CM_BUSY_CALLBACK': 'Busy',
 'NOT_INTERESTED': 'Not Int.',
 'BANG': 'Bang',
 'WRONG_NO': 'Wrong #',
 'INVALID_NO': 'Invalid #',
 'OUT_OF_SERVICE': 'OOS',
 'REPEATED_NO': 'Repeated',
 'RINGING_NO_RESPONSE': 'RNR',
 'SWITCH_OFF': 'Off',
 'NOT_REACHABLE': 'Unreachable',
 'BUSY': 'Busy',
 'VOICE_MAIL': 'Voice',
 };
 
 return (
 <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
 {labels[status] || status.slice(0, 12)}
 </span>
 );
}

export function AdminAnalytics() {
 const { data: leads, isLoading: leadsLoading } = useQuery({
 queryKey: ['leads', 'analytics'],
 queryFn: () => leadsApi.getAll().then(res => res.data.data),
 });

 const { data: agents, isLoading: agentsLoading } = useQuery({
 queryKey: ['users', 'agents'],
 queryFn: () => usersApi.getAll('AGENT').then(res => res.data.data),
 });

 const isLoading = leadsLoading || agentsLoading;

 const stats = useMemo(() => {
 if (!leads) return {
 totalLeadsThisMonth: 0,
 enquiriesGenerated: 0,
 salesClosed: 0,
 conversionRate: 0,
 statusCounts: {} as Record<string, number>,
 sourceCounts: {} as Record<string, number>,
 agentStats: [] as {
 agent: User;
 totalLeads: number;
 enquiries: number;
 salesClosed: number;
 conversionRate: number;
 }[],
 };

 const now = new Date();
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

 // Section 1: Key Metrics
 const totalLeadsThisMonth = leads.filter((l: Lead) => new Date(l.createdAt) >= startOfMonth).length;
 const enquiriesGenerated = leads.filter((l: Lead) => l.callStatus === 'ENQUIRY_GENERATED').length;
 const salesClosed = leads.filter((l: Lead) => l.outcome === 'SALE_CLOSED').length;
 const hotLeads = leads.filter((l: Lead) => l.tag === 'HOT').length;
 const conversionRate = totalLeadsThisMonth > 0 ? Math.round((salesClosed / totalLeadsThisMonth) * 100) : 0;

 // Section 3: Call Status Breakdown
 const statusCounts: Record<string, number> = {};
 leads.forEach((l: Lead) => {
 const status = l.callStatus || 'PENDING';
 statusCounts[status] = (statusCounts[status] || 0) + 1;
 });

 // Section 4: Lead Sources
 const sourceCounts: Record<string, number> = {};
 leads.forEach((l: Lead) => {
 const source = l.source || 'Unknown';
 sourceCounts[source] = (sourceCounts[source] || 0) + 1;
 });

 // Section 2: Agent Leaderboard
 const agentStats = (agents || []).map((agent: User) => {
 const agentLeads = leads.filter((l: Lead) => l.agentId === agent.id);
 const totalLeads = agentLeads.length;
 const enquiries = agentLeads.filter((l: Lead) => l.callStatus === 'ENQUIRY_GENERATED').length;
 const sales = agentLeads.filter((l: Lead) => l.outcome === 'SALE_CLOSED').length;
 const convRate = totalLeads > 0 ? Math.round((sales / totalLeads) * 100) : 0;

 return { agent, totalLeads, enquiries, salesClosed: sales, conversionRate: convRate };
 }).sort((a, b) => b.salesClosed - a.salesClosed);

 return {
 totalLeadsThisMonth,
 enquiriesGenerated,
 salesClosed,
 hotLeads,
 conversionRate,
 statusCounts,
 sourceCounts,
 agentStats,
 };
 }, [leads, agents]);

 return (
 <AdminLayout>
 <PageHeader title="Analytics Dashboard" subtitle="Performance metrics and insights" />

 {isLoading ? (
 <div className="p-8 text-center text-gray-500">
 <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
 Loading analytics...
 </div>
 ) : (
 <div className="space-y-6">
 {/* SECTION 1: KEY METRICS */}
 <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
 <div className="card p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <Users className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <p className="text-sm text-gray-500">This Month Leads</p>
 <p className="text-2xl font-bold text-gray-900">{stats.totalLeadsThisMonth}</p>
 </div>
 </div>
 </div>
 
 <div className="card p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
 <Phone className="w-6 h-6 text-green-600" />
 </div>
 <div>
 <p className="text-sm text-gray-500">Enquiries Generated</p>
 <p className="text-2xl font-bold text-gray-900">{stats.enquiriesGenerated}</p>
 </div>
 </div>
 </div>
 
 <div className="card p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
 <DollarSign className="w-6 h-6 text-primary-600" />
 </div>
 <div>
 <p className="text-sm text-gray-500">Sales Closed</p>
 <p className="text-2xl font-bold text-gray-900">{stats.salesClosed}</p>
 </div>
 </div>
 </div>
 
 <div className="card p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
 <Flame className="w-6 h-6 text-red-600" />
 </div>
 <div>
 <p className="text-sm text-gray-500">Hot Leads</p>
 <p className="text-2xl font-bold text-gray-900">{stats.hotLeads}</p>
 </div>
 </div>
 </div>
 
 <div className="card p-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
 <BarChart2 className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <p className="text-sm text-gray-500">Conversion Rate</p>
 <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
 </div>
 </div>
 </div>
 </div>


 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* SECTION 2: AGENT LEADERBOARD */}
 <div className="card p-0 overflow-hidden">
 <div className="px-6 py-4 border-b flex items-center gap-2">
 <BarChart2 className="w-5 h-5 text-primary-600" />
 <h3 className="font-semibold text-gray-900">Agent Leaderboard</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
 <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
 <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Enq.</th>
 <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sales</th>
 <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Conv%</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {stats.agentStats.map(({ agent, totalLeads, enquiries, salesClosed, conversionRate }) => (
 <tr key={agent.id} className="hover:bg-gray-50">
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
 {agent.name.charAt(0)}
 </div>
 <span className="text-sm font-medium text-gray-900">{agent.name}</span>
 </div>
 </td>
 <td className="px-4 py-3 text-center text-sm text-gray-600">{totalLeads}</td>
 <td className="px-4 py-3 text-center text-sm text-gray-600">{enquiries}</td>
 <td className="px-4 py-3 text-center">
 <span className="text-sm font-medium text-green-600">{salesClosed}</span>
 </td>
 <td className="px-4 py-3 text-right">
 <span className={`text-sm font-medium ${conversionRate >= 20 ? 'text-green-600' : conversionRate >= 10 ? 'text-yellow-600' : 'text-gray-500'}`}>
 {conversionRate}%
 </span>
 </td>
 </tr>
 ))}
 {stats.agentStats.length === 0 && (
 <tr>
 <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
 No agents found
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* SECTION 3: CALL STATUS BREAKDOWN */}
 <div className="card p-0 overflow-hidden">
 <div className="px-6 py-4 border-b flex items-center gap-2">
 <Phone className="w-5 h-5 text-primary-600" />
 <h3 className="font-semibold text-gray-900">Call Status Breakdown</h3>
 </div>
 <div className="p-4">
 <div className="flex flex-wrap gap-2">
 {Object.entries(stats.statusCounts).map(([status, count]) => (
 <div key={status} className="flex items-center gap-2">
 <StatusBadge status={status} />
 <span className="text-sm font-medium text-gray-700">{count}</span>
 </div>
 ))}
 </div>
 {Object.keys(stats.statusCounts).length === 0 && (
 <p className="text-center py-4 text-gray-400">No status data available</p>
 )}
 </div>
 </div>
 </div>

 {/* SECTION 4: LEAD SOURCES */}
 <div className="card p-0 overflow-hidden">
 <div className="px-6 py-4 border-b flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-primary-600" />
 <h3 className="font-semibold text-gray-900">Lead Sources</h3>
 </div>
 <div className="p-6">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {Object.entries(stats.sourceCounts).map(([source, count]) => (
 <div key={source} className="bg-gray-50 rounded-lg p-4 text-center">
 <p className="text-sm text-gray-500 capitalize">{source}</p>
 <p className="text-2xl font-bold text-gray-900">{count}</p>
 </div>
 ))}
 {Object.keys(stats.sourceCounts).length === 0 && (
 <div className="col-span-full text-center py-4 text-gray-400">
 No source data available
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </AdminLayout>
 );
}
