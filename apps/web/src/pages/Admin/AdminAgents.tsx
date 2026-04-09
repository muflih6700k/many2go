import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AdminLayout } from '@/layouts/AdminLayout';
import { usersApi, leadsApi, authApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Search, User, Mail, X, MoreHorizontal, Ban, Plus } from 'lucide-react';
import { useState } from 'react';
import type { User as UserType, Lead } from '@/types';

interface CreateAgentModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

function CreateAgentModal({ isOpen, onClose, onSuccess }: CreateAgentModalProps) {
 const [formData, setFormData] = useState({
 name: '',
 email: '',
 password: '',
 });
 const [isSubmitting, setIsSubmitting] = useState(false);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);

 try {
 await authApi.register({
 ...formData,
 role: 'AGENT',
 });
 toast.success('Agent created successfully');
 setFormData({ name: '', email: '', password: '' });
 onSuccess();
 onClose();
 } catch (error: any) {
 toast.error(error.response?.data?.error?.message || 'Failed to create agent');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
 <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Add New Agent</h2>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="input w-full"
 placeholder="Enter agent name"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
 <input
 type="email"
 required
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="input w-full"
 placeholder="Enter agent email"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
 <input
 type="password"
 required
 minLength={6}
 value={formData.password}
 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
 className="input w-full"
 placeholder="Enter password (min 6 characters)"
 />
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
 {isSubmitting ? 'Creating...' : 'Create Agent'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}

export function AdminAgents() {
 const queryClient = useQueryClient();
 const [search, setSearch] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['users', 'agents'],
    queryFn: () => usersApi.getAll('AGENT').then(res => res.data.data),
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'agents'] });
      toast.success('Agent deactivated');
    },
  });

  const filteredAgents = agents?.filter((agent: UserType) =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.email.toLowerCase().includes(search.toLowerCase())
  );

  const getAgentLeadCount = (agentId: string) =>
    leads?.filter((l: Lead) => l.assignedAgentId === agentId).length || 0;

 const handleAgentCreated = () => {
 queryClient.invalidateQueries({ queryKey: ['users', 'agents'] });
 };

 return (
 <AdminLayout>
 <div className="flex items-center justify-between mb-6">
 <PageHeader title="Agents" subtitle="Manage your sales team" />
 <button
 onClick={() => setIsModalOpen(true)}
 className="btn btn-primary flex items-center gap-2"
 >
 <Plus className="w-4 h-4" />
 Add Agent
 </button>
 </div>

 <CreateAgentModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSuccess={handleAgentCreated}
 />

 {/* Search */}
 <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="input pl-10"
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

      {/* Agents Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Agent List</h3>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgents?.map((agent: UserType) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-primary-700">{agent.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{agent.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getAgentLeadCount(agent.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Deactivate this agent?')) {
                            deactivateMutation.mutate(agent.id);
                          }
                        }}
                        disabled={deactivateMutation.isPending}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        <Ban className="w-4 h-4 inline mr-1" />
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAgents?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No agents found
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
