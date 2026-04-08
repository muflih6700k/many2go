/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { leadsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Phone, Mail, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { Lead, LeadStatus } from '@/types';

const columns: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'NEW', title: 'New', color: 'bg-gray-100' },
  { id: 'CONTACTED', title: 'Contacted', color: 'bg-blue-100' },
  { id: 'QUOTED', title: 'Quoted', color: 'bg-yellow-100' },
  { id: 'BOOKED', title: 'Booked', color: 'bg-green-100' },
  { id: 'CLOSED', title: 'Closed', color: 'bg-gray-200' },
];

interface LeadCardProps {
  lead: Lead;
  index: number;
}

function LeadCard({ lead, index }: LeadCardProps) {
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white p-4 rounded-lg shadow-sm border mb-3 cursor-pointer
            hover:shadow-md transition-shadow
            ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}
          `}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm">{lead.name}</h4>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1 text-xs text-gray-500 mb-3">
            {lead.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{lead.phone}</span>
              </div>
            )}
          </div>
          
          {lead.notes && (
            <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded">
              {lead.notes}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-xs text-gray-400">
              {new Date(lead.createdAt).toLocaleDateString()}
            </span>
            {lead.assignedAgentId && (
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700">A</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export function LeadsKanban() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', notes: '' });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsAddModalOpen(false);
      setNewLead({ name: '', email: '', phone: '', notes: '' });
      toast.success('Lead created');
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as LeadStatus;
    updateMutation.mutate({ id: draggableId, data: { status: newStatus } });
    toast.success(`Lead moved to ${newStatus.toLowerCase()}`);
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name) {
      toast.error('Name is required');
      return;
    }
    createMutation.mutate({
      ...newLead,
      status: 'NEW',
    });
  };

  const leadsByColumn = (status: LeadStatus) => 
    leads?.filter((l: Lead) => l.status === status) || [];

  if (isLoading) {
    return (
      <AgentLayout>
        <PageHeader title="Leads" subtitle="Manage and track your sales pipeline" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 h-96">
              <div className="animate-pulse bg-gray-200 h-8 rounded mb-4" />
              <div className="space-y-3">
                <div className="animate-pulse bg-white h-24 rounded" />
                <div className="animate-pulse bg-white h-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <PageHeader title="Leads" subtitle="Manage and track your sales pipeline">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </PageHeader>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-8">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.color} px-3 py-2 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{column.title}</span>
                  <span className="bg-white/80 px-2 py-0.5 rounded-full text-xs font-medium">
                    {leadsByColumn(column.id).length}
                  </span>
                </div>
              </div>
              
              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      flex-1 bg-gray-50 p-3 rounded-b-lg min-h-[400px]
                      ${snapshot.isDraggingOver ? 'bg-primary-50' : ''}
                    `}
                  >
                    {leadsByColumn(column.id).map((lead: Lead, index: number) => (
                      <LeadCard key={lead.id} lead={lead} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="input"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="input"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary">
                  Create Lead
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
