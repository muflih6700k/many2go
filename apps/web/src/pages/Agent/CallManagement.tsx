import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { leadsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
 Search, 
 X, 
 Phone, 
 Calendar,
 Clock,
 FileText,
 Activity,
 User,
 ChevronRight,
 Save,
 MessageSquare,
 CheckCircle,
 FileEdit,
 Flag,
 ListChecks
} from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Lead, LeadActivity } from '@/types';

// Extended Lead type for call management
interface CallLead extends Lead {
 callStatus: CallStatus;
 followUpDate?: string;
 callDate?: string;
 followUpNotes?: string;
 // Pink Sheet fields
 cmNumber?: string;
 destination?: string;
 travelMonth?: string;
 travelDate?: string;
 returnDate?: string;
 daysPlanned?: number;
 adults?: number;
 kids?: number;
 kidsAge?: string;
 mealsplan?: string;
 hotelCategory?: string;
 budget?: number;
 travelFrom?: string;
 passportStatus?: string;
 lastVacation?: string;
 remarks?: string;
 // Progress fields
 whatsappCreated?: boolean;
 itineraryShared?: boolean;
 flightCostsSent?: boolean;
 quoteSent?: boolean;
 outcome?: ProgressOutcome;
 // Tag
 tag?: 'HOT' | 'WARM' | 'COLD';
}

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

type ProgressOutcome = 'SALE_CLOSED' | 'PROLONGED' | 'DISBANDED';

type FilterTab = 'ALL' | 'FOLLOW_UP' | 'INTERESTED' | 'CLOSED' | 'HOT';

type DetailTab = 'STATUS' | 'PINK_SHEET' | 'PROGRESS' | 'HISTORY';

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

const PROGRESS_OUTCOMES: { value: ProgressOutcome; label: string }[] = [
  { value: 'SALE_CLOSED', label: 'Sale Closed' },
  { value: 'PROLONGED', label: 'Prolonged' },
  { value: 'DISBANDED', label: 'Disbanded' },
];

const PASSPORT_STATUSES = [
  'Valid',
  'Applying',
  'Not Applied',
  'Expired',
];

const HOTEL_CATEGORIES = [
  '2 Star',
  '3 Star',
  '4 Star',
  '5 Star',
  'Standard',
  'Luxury',
];

const MEALS_PLANS = [
  'Room Only',
  'Breakfast Only',
  'Half Board',
  'Full Board',
  'All Inclusive',
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function getStatusColor(status: CallStatus): string {
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

function getStatusLabel(status: CallStatus): string {
const found = CALL_STATUSES.find(s => s.value === status);
 return found?.label || status.replace(/_/g, ' ');
}

function timeAgo(date: string): string {
 const now = new Date();
 const then = new Date(date);
 const diffMs = now.getTime() - then.getTime();
 const diffSecs = Math.floor(diffMs / 1000);
 const diffMins = Math.floor(diffSecs / 60);
 const diffHours = Math.floor(diffMins / 60);
 const diffDays = Math.floor(diffHours / 24);

 if (diffSecs < 60) return 'Just now';
 if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
 if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
 if (diffDays === 1) return 'Yesterday';
 if (diffDays < 7) return `${diffDays} days ago`;
 return then.toLocaleDateString();
}

function getActivityIcon(action: string) {
 if (action === 'CALL_STATUS_CHANGED') return <Phone className="w-5 h-5 text-blue-600" />;
 if (action === 'FOLLOW_UP_SCHEDULED') return <Calendar className="w-5 h-5 text-yellow-600" />;
 if (action === 'ENQUIRY_UPDATED') return <FileEdit className="w-5 h-5 text-purple-600" />;
 if (action === 'CHECKLIST_UPDATED') return <ListChecks className="w-5 h-5 text-green-600" />;
 if (action === 'OUTCOME_SET') return <Flag className="w-5 h-5 text-red-600" />;
 return <Activity className="w-5 h-5 text-gray-600" />;
}

function getActivityColor(action: string): string {
 if (action === 'CALL_STATUS_CHANGED') return 'bg-blue-100 text-blue-600';
 if (action === 'FOLLOW_UP_SCHEDULED') return 'bg-yellow-100 text-yellow-600';
 if (action === 'ENQUIRY_UPDATED') return 'bg-purple-100 text-purple-600';
 if (action === 'CHECKLIST_UPDATED') return 'bg-green-100 text-green-600';
 if (action === 'OUTCOME_SET') return 'bg-red-100 text-red-600';
 return 'bg-gray-100 text-gray-600';
}

function ActivityTimelineItem({ activity }: { activity: LeadActivity }) {
 return (
 <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
 <div className="flex-shrink-0">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
 {getActivityIcon(activity.action)}
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900">{activity.details}</p>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-sm text-gray-500">{activity.agent?.name || 'Unknown'}</span>
 <span className="text-gray-300">•</span>
 <span className="text-sm text-gray-500" title={new Date(activity.createdAt).toLocaleString()}>
 {timeAgo(activity.createdAt)}
 </span>
 </div>
 </div>
 </div>
 );
}

function TagBadge({ tag }: { tag?: 'HOT' | 'WARM' | 'COLD' }) {
 if (!tag) return null;
 
 const colors: Record<string, string> = {
 'HOT': 'bg-red-100 text-red-700 border-red-200',
 'WARM': 'bg-amber-100 text-amber-700 border-amber-200',
 'COLD': 'bg-blue-100 text-blue-700 border-blue-200',
 };
 
 const icons: Record<string, string> = {
 'HOT': '🔴',
 'WARM': '🟡',
 'COLD': '🔵',
 };

 return (
 <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[tag]}`}>
 <span className="mr-0.5">{icons[tag]}</span>
 {tag}
 </span>
 );
}

function StatusBadge({ status }: { status: CallStatus }) {
 return (
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
 {getStatusLabel(status)}
 </span>
 );
}

export function CallManagement() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
 const [selectedLead, setSelectedLead] = useState<CallLead | null>(null);
 const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('STATUS');
 
 // Fetch activities when a lead is selected
 const { data: activities } = useQuery({
 queryKey: ['lead-activities', selectedLead?.id],
 queryFn: () => selectedLead?.id ? leadsApi.getActivities(selectedLead.id).then(res => res.data.data) : [],
 enabled: !!selectedLead?.id && activeDetailTab === 'HISTORY',
 });
  
  // Form states
  const [callStatus, setCallStatus] = useState<CallStatus>('PENDING');
  const [callDate, setCallDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  
  // Pink Sheet form states
  const [pinkSheet, setPinkSheet] = useState({
    cmNumber: '',
    destination: '',
    travelMonth: '',
    travelDate: '',
    returnDate: '',
    daysPlanned: '',
    adults: '',
    kids: '',
    kidsAge: '',
    mealsplan: '',
    hotelCategory: '',
    budget: '',
    travelFrom: '',
    passportStatus: '',
    lastVacation: '',
    remarks: '',
  });
  
  // Progress form states
  const [progress, setProgress] = useState({
    whatsappCreated: false,
    itineraryShared: false,
    flightCostsSent: false,
    quoteSent: false,
    outcome: '' as ProgressOutcome | '',
  });

  const { data: leads, isLoading } = useQuery<CallLead[]>({
    queryKey: ['leads', 'calls'],
    queryFn: () => leadsApi.getAll().then(res => res.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CallLead> }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'calls'] });
      toast.success('Lead updated successfully');
    },
    onError: () => {
      toast.error('Failed to update lead');
    },
  });

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    let filtered = leads;
    
// Apply filter tabs
 switch (activeFilter) {
 case 'FOLLOW_UP':
 filtered = filtered.filter(l => 
 ['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(l.callStatus)
 );
 break;
 case 'INTERESTED':
 filtered = filtered.filter(l => 
 ['ENQUIRY_GENERATED'].includes(l.callStatus)
 );
 break;
 case 'CLOSED':
 filtered = filtered.filter(l => 
 ['NOT_INTERESTED', 'BANG', 'SALE_CLOSED'].includes(l.callStatus) || l.outcome === 'SALE_CLOSED'
 );
 break;
 case 'HOT':
 filtered = filtered.filter(l => l.tag === 'HOT');
 break;
 default:
 break;
 }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.name?.toLowerCase().includes(query) ||
        l.phone?.toLowerCase().includes(query) ||
        l.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [leads, activeFilter, searchQuery]);

  const handleSelectLead = (lead: CallLead) => {
    setSelectedLead(lead);
    setActiveDetailTab('STATUS');
    
    // Initialize form states
    setCallStatus(lead.callStatus || 'PENDING');
    setCallDate(lead.callDate ? lead.callDate.split('T')[0] : '');
    setCallTime(lead.callDate ? lead.callDate.split('T')[1]?.substring(0, 5) : '');
    setFollowUpDate(lead.followUpDate ? lead.followUpDate.split('T')[0] : '');
    setFollowUpTime(lead.followUpDate ? lead.followUpDate.split('T')[1]?.substring(0, 5) : '');
    setFollowUpNotes(lead.followUpNotes || '');
    
    setPinkSheet({
      cmNumber: lead.cmNumber || '',
      destination: lead.destination || '',
      travelMonth: lead.travelMonth || '',
      travelDate: lead.travelDate ? lead.travelDate.split('T')[0] : '',
      returnDate: lead.returnDate ? lead.returnDate.split('T')[0] : '',
      daysPlanned: lead.daysPlanned?.toString() || '',
      adults: lead.adults?.toString() || '',
      kids: lead.kids?.toString() || '',
      kidsAge: lead.kidsAge || '',
      mealsplan: lead.mealsplan || '',
      hotelCategory: lead.hotelCategory || '',
      budget: lead.budget?.toString() || '',
      travelFrom: lead.travelFrom || '',
      passportStatus: lead.passportStatus || '',
      lastVacation: lead.lastVacation || '',
      remarks: lead.remarks || '',
    });
    
    setProgress({
      whatsappCreated: lead.whatsappCreated || false,
      itineraryShared: lead.itineraryShared || false,
      flightCostsSent: lead.flightCostsSent || false,
      quoteSent: lead.quoteSent || false,
      outcome: lead.outcome || '',
    });
  };

  const handleSaveStatus = () => {
    if (!selectedLead) return;
    
    const updateData: Partial<CallLead> = {
      callStatus,
      followUpNotes,
    };
    
    if (callDate && callTime) {
      updateData.callDate = new Date(`${callDate}T${callTime}`).toISOString();
    }
    
    // Only include follow-up date for certain statuses
    if (['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(callStatus)) {
      if (followUpDate && followUpTime) {
        updateData.followUpDate = new Date(`${followUpDate}T${followUpTime}`).toISOString();
      }
    } else {
      updateData.followUpDate = undefined;
    }
    
    updateMutation.mutate({ id: selectedLead.id, data: updateData });
  };

  const handleSavePinkSheet = () => {
    if (!selectedLead) return;
    
    const updateData: Partial<CallLead> = {
      cmNumber: pinkSheet.cmNumber || undefined,
      destination: pinkSheet.destination || undefined,
      travelMonth: pinkSheet.travelMonth || undefined,
      travelDate: pinkSheet.travelDate ? new Date(pinkSheet.travelDate).toISOString() : undefined,
      returnDate: pinkSheet.returnDate ? new Date(pinkSheet.returnDate).toISOString() : undefined,
      daysPlanned: pinkSheet.daysPlanned ? parseInt(pinkSheet.daysPlanned) : undefined,
      adults: pinkSheet.adults ? parseInt(pinkSheet.adults) : undefined,
      kids: pinkSheet.kids ? parseInt(pinkSheet.kids) : undefined,
      kidsAge: pinkSheet.kidsAge || undefined,
      mealsplan: pinkSheet.mealsplan || undefined,
      hotelCategory: pinkSheet.hotelCategory || undefined,
      budget: pinkSheet.budget ? parseFloat(pinkSheet.budget) : undefined,
      travelFrom: pinkSheet.travelFrom || undefined,
      passportStatus: pinkSheet.passportStatus || undefined,
      lastVacation: pinkSheet.lastVacation || undefined,
      remarks: pinkSheet.remarks || undefined,
    };
    
    updateMutation.mutate({ id: selectedLead.id, data: updateData });
  };

  const handleSaveProgress = () => {
    if (!selectedLead) return;
    
    const updateData: Partial<CallLead> = {
      whatsappCreated: progress.whatsappCreated,
      itineraryShared: progress.itineraryShared,
      flightCostsSent: progress.flightCostsSent,
      quoteSent: progress.quoteSent,
      outcome: progress.outcome || undefined,
    };
    
    updateMutation.mutate({ id: selectedLead.id, data: updateData });
  };

  const showFollowUpFields = ['CALL_BACK', 'FUTURE_FOLLOWUP', 'CM_BUSY_CALLBACK'].includes(callStatus);
  const showPinkSheetTab = callStatus === 'ENQUIRY_GENERATED';

  return (
    <AgentLayout>
      <PageHeader 
        title="Call Management"
        subtitle="Manage and track your sales calls and follow-ups"
      />

      <div className="flex gap-6 h-[calc(100vh-180px)] min-h-[500px]">
        {/* LEFT PANEL (35%) - Lead List */}
        <div className="w-[35%] flex flex-col gap-4">
          {/* Filter Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['ALL', 'FOLLOW_UP', 'INTERESTED', 'CLOSED', 'HOT'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeFilter === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
{tab === 'ALL' ? 'All' : 
 tab === 'FOLLOW_UP' ? 'Follow Up' :
 tab === 'INTERESTED' ? 'Interested' : 
 tab === 'HOT' ? '🔥 Hot' : 'Closed'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="input pl-9 py-2 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lead Count */}
          <p className="text-xs text-gray-500">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} found
          </p>

          {/* Lead Cards */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="card p-3 space-y-2">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-24 h-3" />
                  <Skeleton className="w-20 h-3" />
                </div>
              ))
            ) : filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`card p-3 w-full text-left transition-all hover:shadow-md ${
                    selectedLead?.id === lead.id
                      ? 'ring-2 ring-primary-500 bg-primary-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {lead.name || 'Unnamed Lead'}
                        </span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">
                            {lead.phone}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                      selectedLead?.id === lead.id ? 'text-primary-600' : 'text-gray-300'
                    }`} />
                  </div>
                  
<div className="flex items-center justify-between mt-2 pt-2 border-t">
 <div className="flex items-center gap-2">
 <StatusBadge status={lead.callStatus || 'PENDING'} />
 <TagBadge tag={lead.tag} />
 </div>
 <span className="text-xs text-gray-400">
                      {lead.callDate 
                        ? new Date(lead.callDate).toLocaleDateString()
                        : lead.updatedAt
                        ? new Date(lead.updatedAt).toLocaleDateString()
                        : 'No date'
                      }
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No leads found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try adjusting your search</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (65%) - Lead Detail */}
        <div className="w-[65%] flex flex-col">
          {!selectedLead ? (
            <div className="card flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <Phone className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a lead to view details</p>
              <p className="text-sm mt-2">Choose a lead from the list to manage their call status</p>
            </div>
          ) : (
            <div className="card flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-700">
                      {selectedLead.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {selectedLead.name || 'Unnamed Lead'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      {selectedLead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedLead.phone}
                        </span>
                      )}
                      {selectedLead.email && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="text-gray-300">|</span>
                          {selectedLead.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={selectedLead.callStatus || 'PENDING'} />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                {(['STATUS', 'PINK_SHEET', 'PROGRESS', 'HISTORY'] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeDetailTab === tab
                        ? 'text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'STATUS' ? 'Call Status' :
                     tab === 'PINK_SHEET' ? 'Pink Sheet' :
                     tab === 'PROGRESS' ? 'Progress' : 'History'}
                    {tab === 'PINK_SHEET' && showPinkSheetTab && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                    {activeDetailTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* CALL STATUS TAB */}
                {activeDetailTab === 'STATUS' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Status Dropdown */}
                      <div>
                        <label className="label flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          Call Status
                        </label>
                        <select
                          value={callStatus}
                          onChange={(e) => setCallStatus(e.target.value as CallStatus)}
                          className="input"
                        >
                          {CALL_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Call Date/Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Call Date
                          </label>
                          <input
                            type="date"
                            value={callDate}
                            onChange={(e) => setCallDate(e.target.value)}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            Call Time
                          </label>
                          <input
                            type="time"
                            value={callTime}
                            onChange={(e) => setCallTime(e.target.value)}
                            className="input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Follow-up Fields (conditional) */}
                    {showFollowUpFields && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                        <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Follow-up Schedule
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-yellow-700">Follow-up Date</label>
                            <input
                              type="date"
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              className="input bg-white"
                            />
                          </div>
                          <div>
                            <label className="label text-yellow-700">Follow-up Time</label>
                            <input
                              type="time"
                              value={followUpTime}
                              onChange={(e) => setFollowUpTime(e.target.value)}
                              className="input bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label text-yellow-700 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Follow-up Notes
                          </label>
                          <textarea
                            value={followUpNotes}
                            onChange={(e) => setFollowUpNotes(e.target.value)}
                            placeholder="Add notes about the follow-up..."
                            className="input min-h-[80px] bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <button
                        onClick={handleSaveStatus}
                        disabled={updateMutation.isPending}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Status'}
                      </button>
                    </div>
                  </div>
                )}

                {/* PINK SHEET TAB */}
                {activeDetailTab === 'PINK_SHEET' && (
                  <div className="space-y-6">
                    {!showPinkSheetTab ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium">Pink Sheet Not Available</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Pink Sheet is only available when call status is "Enquiry Generated"
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* CM Number */}
                          <div>
                            <label className="label">CM Number</label>
                            <input
                              type="text"
                              value={pinkSheet.cmNumber}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, cmNumber: e.target.value })}
                              className="input"
                              placeholder="e.g., CM-001"
                            />
                          </div>

                          {/* Destination */}
                          <div>
                            <label className="label">Destination</label>
                            <input
                              type="text"
                              value={pinkSheet.destination}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, destination: e.target.value })}
                              className="input"
                              placeholder="e.g., Bali, Thailand"
                            />
                          </div>

                          {/* Travel Month */}
                          <div>
                            <label className="label">Travel Month</label>
                            <input
                              type="month"
                              value={pinkSheet.travelMonth}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, travelMonth: e.target.value })}
                              className="input"
                            />
                          </div>

                          {/* Days Planned */}
                          <div>
                            <label className="label">Days Planned</label>
                            <input
                              type="number"
                              value={pinkSheet.daysPlanned}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, daysPlanned: e.target.value })}
                              className="input"
                              placeholder="e.g., 7"
                            />
                          </div>

                          {/* Travel Date */}
                          <div>
                            <label className="label">Travel Date</label>
                            <input
                              type="date"
                              value={pinkSheet.travelDate}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, travelDate: e.target.value })}
                              className="input"
                            />
                          </div>

                          {/* Return Date */}
                          <div>
                            <label className="label">Return Date</label>
                            <input
                              type="date"
                              value={pinkSheet.returnDate}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, returnDate: e.target.value })}
                              className="input"
                            />
                          </div>

                          {/* Adults */}
                          <div>
                            <label className="label">Adults</label>
                            <input
                              type="number"
                              value={pinkSheet.adults}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, adults: e.target.value })}
                              className="input"
                              placeholder="e.g., 2"
                            />
                          </div>

                          {/* Kids */}
                          <div>
                            <label className="label">Kids</label>
                            <input
                              type="number"
                              value={pinkSheet.kids}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, kids: e.target.value })}
                              className="input"
                              placeholder="e.g., 1"
                            />
                          </div>

                          {/* Kids Age */}
                          <div>
                            <label className="label">Kids Age</label>
                            <input
                              type="text"
                              value={pinkSheet.kidsAge}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, kidsAge: e.target.value })}
                              className="input"
                              placeholder="e.g., 5, 7"
                            />
                          </div>

                          {/* Hotel Category */}
                          <div>
                            <label className="label">Hotel Category</label>
                            <select
                              value={pinkSheet.hotelCategory}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, hotelCategory: e.target.value })}
                              className="input"
                            >
                              <option value="">Select category</option>
                              {HOTEL_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          {/* Meals Plan */}
                          <div>
                            <label className="label">Meals Plan</label>
                            <select
                              value={pinkSheet.mealsplan}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, mealsplan: e.target.value })}
                              className="input"
                            >
                              <option value="">Select plan</option>
                              {MEALS_PLANS.map((plan) => (
                                <option key={plan} value={plan}>{plan}</option>
                              ))}
                            </select>
                          </div>

                          {/* Budget */}
                          <div>
                            <label className="label">Budget</label>
                            <input
                              type="number"
                              value={pinkSheet.budget}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, budget: e.target.value })}
                              className="input"
                              placeholder="e.g., 50000"
                            />
                          </div>

                          {/* Travel From */}
                          <div>
                            <label className="label">Travel From</label>
                            <input
                              type="text"
                              value={pinkSheet.travelFrom}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, travelFrom: e.target.value })}
                              className="input"
                              placeholder="e.g., Mumbai"
                            />
                          </div>

                          {/* Passport Status */}
                          <div>
                            <label className="label">Passport Status</label>
                            <select
                              value={pinkSheet.passportStatus}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, passportStatus: e.target.value })}
                              className="input"
                            >
                              <option value="">Select status</option>
                              {PASSPORT_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>

                          {/* Last Vacation */}
                          <div>
                            <label className="label">Last Vacation</label>
                            <input
                              type="text"
                              value={pinkSheet.lastVacation}
                              onChange={(e) => setPinkSheet({ ...pinkSheet, lastVacation: e.target.value })}
                              className="input"
                              placeholder="e.g., Europe 2023"
                            />
                          </div>
                        </div>

                        {/* Remarks */}
                        <div>
                          <label className="label">Remarks</label>
                          <textarea
                            value={pinkSheet.remarks}
                            onChange={(e) => setPinkSheet({ ...pinkSheet, remarks: e.target.value })}
                            className="input min-h-[100px]"
                            placeholder="Additional remarks..."
                          />
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4 border-t">
                          <button
                            onClick={handleSavePinkSheet}
                            disabled={updateMutation.isPending}
                            className="btn-primary flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {updateMutation.isPending ? 'Saving...' : 'Save Pink Sheet'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PROGRESS TAB */}
                {activeDetailTab === 'PROGRESS' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-600" />
                        Progress Checklist
                      </h4>
                      
                      <div className="space-y-3">
                        {[
                          { key: 'whatsappCreated', label: 'WhatsApp Created' },
                          { key: 'itineraryShared', label: 'Itinerary Shared' },
                          { key: 'flightCostsSent', label: 'Flight Costs Sent' },
                          { key: 'quoteSent', label: 'Quote Sent' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={progress[item.key as keyof typeof progress] as boolean}
                              onChange={(e) => setProgress({
                                ...progress,
                                [item.key]: e.target.checked,
                              })}
                              className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <span className="text-gray-700">{item.label}</span>
                            {(progress[item.key as keyof typeof progress] as boolean) && (
                              <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                Done
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Outcome Dropdown */}
                    <div className="pt-4 border-t">
                      <label className="label">Outcome</label>
                      <select
                        value={progress.outcome}
                        onChange={(e) => setProgress({ ...progress, outcome: e.target.value as ProgressOutcome })}
                        className="input"
                      >
                        <option value="">Select outcome</option>
                        {PROGRESS_OUTCOMES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveProgress}
                        disabled={updateMutation.isPending}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Progress'}
                      </button>
                    </div>
                  </div>
                )}

 {/* HISTORY TAB */}
 {activeDetailTab === 'HISTORY' && (
 <div className="space-y-4">
 <h4 className="font-medium text-gray-900 flex items-center gap-2">
 <Clock className="w-4 h-4 text-primary-600" />
 Activity Timeline
 </h4>
 
 <div className="space-y-3 max-h-96 overflow-y-auto">
 {/* Activities from API */}
 {activities?.map((activity: LeadActivity) => (
 <ActivityTimelineItem key={activity.id} activity={activity} />
 ))}

 {/* Show lead creation at the bottom */}
 <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
 <div className="flex-shrink-0">
 <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
 <User className="w-5 h-5 text-gray-600" />
 </div>
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">Lead Created</p>
 <p className="text-sm text-gray-500">
 {timeAgo(selectedLead.createdAt)}
 </p>
 <p className="text-xs text-gray-400 mt-1">
 {new Date(selectedLead.createdAt).toLocaleString()}
 </p>
 </div>
 </div>

 {/* Empty state if no activities */}
 {(!activities || activities.length === 0) && (
 <p className="text-center py-8 text-gray-400">
 No activity yet. Actions will appear here when you update this lead.
 </p>
 )}
 </div>
 </div>
 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  );
}
