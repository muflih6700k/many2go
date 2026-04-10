import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AdminLayout } from '@/layouts/AdminLayout';
import { leadsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Search, X, Plus, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Lead, CallStatus } from '@/types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LEAD_SOURCES = [
  'WhatsApp',
  'Phone',
  'Instagram',
  'Facebook',
  'Website',
  'Referral',
  'Walk-in',
];

const CALL_STATUSES: { value: CallStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ENQUIRY_GENERATED', label: 'Enquiry Generated' },
  { value: 'CALL_BACK', label: 'Call Back' },
  { value: 'FUTURE_FOLLOWUP', label: 'Future Follow-up' },
  { value: 'CM_BUSY_CALLBACK', label: 'CM Busy - Callback' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'BANG', label: 'Bang' },
  { value: 'WRONG_NO', label: 'Wrong Number' },
  { value: 'INVALID_NO', label: 'Invalid Number' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
  { value: 'REPEATED_NO', label: 'Repeated Number' },
  { value: 'RINGING_NO_RESPONSE', label: 'Ringing - No Response' },
  { value: 'SWITCH_OFF', label: 'Switch Off' },
  { value: 'NOT_REACHABLE', label: 'Not Reachable' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'VOICE_MAIL', label: 'Voice Mail' },
];

function getStatusColor(status: CallStatus | null | undefined): string {
  if (!status) {
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }

  // GREEN = ENQUIRY_GENERATED only
  if (status === 'ENQUIRY_GENERATED') {
    return 'bg-green-100 text-green-700 border-green-200';
  }

  // YELLOW = CALL_BACK, FUTURE_FOLLOWUP, CM_BUSY_CALLBACK
  if (['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(status)) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }

  // RED = NOT_INTERESTED, BANG, WRONG_NO, INVALID_NO, OUT_OF_SERVICE, REPEATED_NO
  if (['NOT_INTERESTED', 'BANG', 'WRONG_NO', 'INVALID_NO', 'OUT_OF_SERVICE', 'REPEATED_NO'].includes(status)) {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  // ORANGE = RINGING_NO_RESPONSE, SWITCH_OFF, NOT_REACHABLE, BUSY, VOICE_MAIL
  if (['RINGING_NO_RESPONSE', 'SWITCH_OFF', 'NOT_REACHABLE', 'BUSY', 'VOICE_MAIL'].includes(status)) {
    return 'bg-orange-100 text-orange-700 border-orange-200';
  }

  // GRAY = PENDING
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function getStatusLabel(status: CallStatus | null | undefined): string {
  if (!status) return 'Pending';
  const found = CALL_STATUSES.find(s => s.value === status);
  return found?.label || status.replace(/_/g, ' ');
}

function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'WhatsApp',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create lead with customer info - backend auto-assigns to least busy agent
      await leadsApi.create({
        customerName: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        source: formData.source,
      });
      toast.success('Lead created and auto-assigned to agent');
      setFormData({ name: '', phone: '', email: '', source: 'WhatsApp' });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Lead</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input w-full"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input w-full"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="input w-full"
            >
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Wait for token to be available
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthReady(true);
    }
  }, []);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
    enabled: isAuthReady,
  });

  const filteredLeads = leads?.filter((lead: Lead) => {
    const matchesSearch =
      (lead.customer?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.phone || '').includes(search);
    const matchesStatus = statusFilter === 'ALL' || lead.callStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleLeadCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast.success('Lead list refreshed');
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Leads" subtitle="View and manage all leads across agents" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn btn-secondary flex items-center gap-2"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      <AddLeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleLeadCreated}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="input pl-10 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CallStatus | 'ALL')}
          className="input sm:w-48"
        >
          <option value="ALL">All Statuses</option>
          {CALL_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">All Leads</h3>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-14 rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
<tr>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Assigned Agent</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tag</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Destination</th>
 <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads?.map((lead: Lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-primary-700">
                            {lead.customer?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {lead.customer?.name || lead.customerName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lead.phone || '-'}</td>
                    <td className="px-6 py-4">
                      {lead.agent ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm text-gray-900">{lead.agent.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Unassigned
                        </span>
                      )}
                    </td>
<td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.callStatus)}`}>
 {getStatusLabel(lead.callStatus)}
 </span>
 </td>
 <td className="px-6 py-4">
 {lead.tag && (
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
 lead.tag === 'HOT' ? 'bg-red-100 text-red-700 border-red-200' :
 lead.tag === 'WARM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
 'bg-blue-100 text-blue-700 border-blue-200'
 }`}>
 {lead.tag === 'HOT' && '🔴 '}{lead.tag === 'WARM' && '🟡 '}{lead.tag === 'COLD' && '🔵 '}
 {lead.tag}
 </span>
 )}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600">{lead.destination || '-'}</td>
 <td className="px-6 py-4 text-sm text-gray-500">
 {new Date(lead.createdAt).toLocaleDateString()}
 </td>
 </tr>
 ))}
 {filteredLeads?.length === 0 && (
 <tr>
 <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {search || statusFilter !== 'ALL' ? 'No leads match your filters' : 'No leads found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
