import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AdminLayout } from '@/layouts/AdminLayout';
import { usersApi, leadsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Search, User, Mail, X, MoreHorizontal, Ban } from 'lucide-react';
import { useState } from 'react';
import type { User as UserType, Lead } from '@/types';

export function AdminAgents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  return (
    <AdminLayout>
      <PageHeader title="Agents" subtitle="Manage your sales team" />

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
