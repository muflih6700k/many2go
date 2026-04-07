import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { remindersApi, leadsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Check, Clock, User } from 'lucide-react';
import { useState } from 'react';
import type { Reminder, Lead } from '@/types';

type SortBy = 'dueAt' | 'createdAt';

export function AgentReminders() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ leadId: '', note: '', dueAt: '' });
  const [sortBy, setSortBy] = useState<SortBy>('dueAt');

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll().then(res => res.data.data),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder completed');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Reminder>) => remindersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setIsAddModalOpen(false);
      setNewReminder({ leadId: '', note: '', dueAt: '' });
      toast.success('Reminder created');
    },
  });

  const sortedReminders = reminders?.sort((a: Reminder, b: Reminder) => {
    if (sortBy === 'dueAt') {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) || [];

  const pendingReminders = sortedReminders.filter((r: Reminder) => !r.isDone);
  const completedReminders = sortedReminders.filter((r: Reminder) => r.isDone);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.leadId || !newReminder.note || !newReminder.dueAt) {
      toast.error('Lead, note and due date are required');
      return;
    }
    createMutation.mutate({
      leadId: newReminder.leadId,
      note: newReminder.note,
      dueAt: newReminder.dueAt,
    });
  };

  const formatDueDate = (date: string) => {
    const due = new Date(date);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { text: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
    if (diffHours < 24) return { text: 'Today', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (diffHours < 48) return { text: 'Tomorrow', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: due.toLocaleDateString(), color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  return (
    <AgentLayout>
      <PageHeader title="Reminders" subtitle="Stay on top of your follow-ups">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Reminder
        </button>
      </PageHeader>

      {/* Sort Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSortBy('dueAt')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'dueAt' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Sort by Due Date
        </button>
        <button
          onClick={() => setSortBy('createdAt')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'createdAt' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Sort by Created
        </button>
      </div>

      {/* Pending Reminders */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          Pending ({pendingReminders.length})
        </h3>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 h-20 rounded" />
            <div className="animate-pulse bg-gray-200 h-20 rounded" />
          </div>
        ) : pendingReminders.length > 0 ? (
          <div className="space-y-3">
            {pendingReminders.map((reminder: Reminder) => {
              const dueInfo = formatDueDate(reminder.dueAt);
              return (
                <div key={reminder.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" />
                {reminder.lead?.customer?.name || 'Unknown Lead'}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${dueInfo.bg} ${dueInfo.color}`}>
                {dueInfo.text}
              </span>
            </div>
            {reminder.note && (
              <p className="text-sm text-gray-600 mb-2">{reminder.note}</p>
            )}
            {reminder.lead && (
              <p className="text-xs text-gray-500">
                Lead: {reminder.lead.customer?.name || 'Unknown'}
              </p>
            )}
                    <p className="text-xs text-gray-400">
                      Due {new Date(reminder.dueAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => completeMutation.mutate(reminder.id)}
                    disabled={completeMutation.isPending}
                    className="ml-4 w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-4 h-4 text-gray-400 hover:text-primary-600" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No pending reminders. You're all caught up!</p>
        )}
      </div>

      {/* Completed Reminders */}
      {completedReminders.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Completed ({completedReminders.length})
          </h3>
          <div className="space-y-2">
            {completedReminders.map((reminder: Reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg opacity-60">
                <Check className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 line-through">{reminder.title}</p>
                  <p className="text-xs text-gray-400">
                    Completed on {new Date(reminder.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Reminder</h3>
            <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Lead *</label>
            <select
              value={newReminder.leadId}
              onChange={(e) => setNewReminder({ ...newReminder, leadId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a lead</option>
              {leads?.map((lead: Lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name || lead.email || lead.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Note *</label>
            <textarea
              value={newReminder.note}
              onChange={(e) => setNewReminder({ ...newReminder, note: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Call about Bali quote..."
              required
            />
          </div>
              <div>
                <label className="label">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={newReminder.dueAt}
                  onChange={(e) => setNewReminder({ ...newReminder, dueAt: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary">
                  Create Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}
