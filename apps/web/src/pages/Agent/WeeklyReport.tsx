import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { leadsApi } from '@/lib/api';
import { Search, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Lead, CallStatus } from '@/types';

function getStatusLabel(status: CallStatus | null | undefined): string {
  if (!status) return 'Pending';
  const labels: Record<string, string> = {
    'PENDING': 'Pending',
    'ENQUIRY_GENERATED': 'Enquiry',
    'CALL_BACK': 'Call Back',
    'FUTURE_FOLLOWUP': 'Future',
    'CM_BUSY_CALLBACK': 'Busy',
    'NOT_INTERESTED': 'Not Int.',
    'BANG': 'Bang',
    'WRONG_NO': 'Wrong No',
    'INVALID_NO': 'Invalid',
    'OUT_OF_SERVICE': 'OOS',
    'REPEATED_NO': 'Repeated',
    'RINGING_NO_RESPONSE': 'RNR',
    'SWITCH_OFF': 'Off',
    'NOT_REACHABLE': 'Unreachable',
    'BUSY': 'Busy',
    'VOICE_MAIL': 'Voice',
  };
  return labels[status] || status.replace(/_/g, ' ').slice(0, 12);
}

function getStatusColor(status: CallStatus | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-700';
  if (status === 'ENQUIRY_GENERATED') return 'bg-green-100 text-green-700';
  if (['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(status)) return 'bg-yellow-100 text-yellow-700';
  if (['NOT_INTERESTED', 'BANG', 'WRONG_NO', 'INVALID_NO', 'OUT_OF_SERVICE', 'REPEATED_NO'].includes(status)) return 'bg-red-100 text-red-700';
  if (['RINGING_NO_RESPONSE', 'SWITCH_OFF', 'NOT_REACHABLE', 'BUSY', 'VOICE_MAIL'].includes(status)) return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-700';
}

export function WeeklyReport() {
  const [search, setSearch] = useState('');
  const [weekFilter, setWeekFilter] = useState<'THIS_WEEK' | 'LAST_WEEK'>('THIS_WEEK');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) setIsAuthReady(true);
  }, []);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', 'weekly'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
    enabled: isAuthReady,
  });

  // Filter by week
  const getWeekDates = (week: 'THIS_WEEK' | 'LAST_WEEK') => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - dayOfWeek;
    const sunday = new Date(now);
    sunday.setDate(diff);
    sunday.setHours(0, 0, 0, 0);

    if (week === 'LAST_WEEK') {
      sunday.setDate(sunday.getDate() - 7);
    }

    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    return { start: sunday, end: saturday };
  };

  const { start: weekStart, end: weekEnd } = getWeekDates(weekFilter);

  const filteredLeads = leads?.filter((lead: Lead) => {
    const created = new Date(lead.createdAt);
    const inWeek = created >= weekStart && created <= weekEnd;
    const matchesSearch =
      (lead.customer?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.phone || '').includes(search);
    return inWeek && matchesSearch;
  });

  return (
    <AgentLayout>
      <PageHeader title="Weekly Report" subtitle="Your leads activity this week" />

      {/* Week Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setWeekFilter('THIS_WEEK')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            weekFilter === 'THIS_WEEK'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setWeekFilter('LAST_WEEK')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            weekFilter === 'LAST_WEEK'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last Week
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="input pl-10 w-full"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-12 rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Dest.</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">WA</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Itin</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Flights</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Quote</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads?.map((lead: Lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {lead.customer?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs ${getStatusColor(lead.callStatus)}`}>
                        {getStatusLabel(lead.callStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.destination?.slice(0, 12) || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {lead.whatsappCreated ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.itineraryShared ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.flightCostsSent ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.quoteSent ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.outcome ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          lead.outcome === 'SALE_CLOSED' 
                            ? 'bg-green-100 text-green-700'
                            : lead.outcome === 'DISBANDED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-ylow-700'
                        }`}>
                          {lead.outcome === 'SALE_CLOSED' ? 'Closed' : lead.outcome === 'DISBANDED' ? 'Lost' : 'Prolonged'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeads?.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No leads found for this week
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredLeads?.length || 0} leads for {weekFilter === 'THIS_WEEK' ? 'this week' : 'last week'}
      </div>
    </AgentLayout>
  );
}
