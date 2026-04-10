import { useState, useEffect, useMemo } from 'react';
import { AgentLayout } from '@/layouts/AgentLayout';
import { PageHeader } from '@/components/PageHeader';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Users, Calendar, DollarSign, MapPin, Building2, Flame, FileText, ChevronLeft, ChevronRight, CheckCircle, Calculator } from 'lucide-react';
import { agentsApi, itineraryTemplatesApi } from '@/lib/api';
import type { ItineraryTemplate, User } from '@/types';

interface TripDetails {
 customerName: string;
 customerPhone: string;
 tripId: string;
 startDate: string;
 endDate: string;
 adults: number;
 kids: number;
 // Child breakdown (only if kids > 0)
 kidsUnder5: number;
 kids5to10Sharing: number;
 kids5to10ExtraBed: number;
 kids11plus: number;
 consultantName: string;
 hotelCategory: '3' | '4' | '5';
 // Hotels Section
 dmcCostPerAdult: number;
 usdToInrRate: number;
 // Activities
 activitiesCost: number;
 // Transfers
 transfersCost: number;
 // Other
 visaCost: number;
 travelInsurance: number;
 arrivalVisa: number;
 otherLabel: string;
 otherCost: number;
 // Markup & Taxes
 markupPercent: number;
 gstPercent: number;
 tcsPercent: number;
}

type Step = 1 | 2 | 3;

const generateTripId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `VN-${year}-${random}`;
};

const calculateEndDate = (startDate: string, days: number) => {
  if (!startDate) return '';
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + days - 1);
  return end.toISOString().split('T')[0];
};

export default function ItineraryBuilder() {
 const [step, setStep] = useState<Step>(1);
 const [searchCode, setSearchCode] = useState('');
 const [selectedTemplate, setSelectedTemplate] = useState<ItineraryTemplate | null>(null);

 const [tripDetails, setTripDetails] = useState<TripDetails>({
 customerName: '',
 customerPhone: '',
 tripId: generateTripId(),
 startDate: '',
 endDate: '',
 adults: 2,
 kids: 0,
 // Child breakdown
 kidsUnder5: 0,
 kids5to10Sharing: 0,
 kids5to10ExtraBed: 0,
 kids11plus: 0,
 consultantName: '',
 hotelCategory: '4',
 // Hotels
 dmcCostPerAdult: 650,
 usdToInrRate: 85.50,
 // Activities
 activitiesCost: 0,
 // Transfers
 transfersCost: 0,
 // Other
 visaCost: 0,
 travelInsurance: 0,
 arrivalVisa: 0,
 otherLabel: '',
 otherCost: 0,
 // Markup & Taxes
 markupPercent: 0,
 gstPercent: 5,
 tcsPercent: 5,
 });

  // Fetch templates and agents
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['itinerary-templates'],
    queryFn: itineraryTemplatesApi.getAll,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAgents,
  });

  // Auto-update end date when start date changes
  useEffect(() => {
    if (selectedTemplate && tripDetails.startDate) {
      const endDate = calculateEndDate(tripDetails.startDate, selectedTemplate.days);
      setTripDetails(prev => ({ ...prev, endDate }));
    }
  }, [tripDetails.startDate, selectedTemplate]);

 // Search for template by code
 const searchedTemplate = useMemo(() => {
 if (!searchCode || !templates) return null;
 return templates.find(t => t.code === searchCode || t.code.includes(searchCode)) || null;
 }, [searchCode, templates]);

 // === PRICING CALCULATIONS ===
 const calculations = useMemo(() => {
 // Child costs based on DMC rate
 const adultRate = tripDetails.dmcCostPerAdult * tripDetails.usdToInrRate;
 const kidsTotal =
 tripDetails.kidsUnder5 * 0 + // Under 5: FREE
 tripDetails.kids5to10Sharing * adultRate * 0.60 + // 5-10 sharing: 60%
 tripDetails.kids5to10ExtraBed * adultRate * 0.85 + // 5-10 extra bed: 85%
 tripDetails.kids11plus * adultRate; // 11+: 100%

 // Hotels total
 const hotelsInr = (tripDetails.adults * adultRate) + kidsTotal;

 // Subtotal before markup/tax
 const subtotal =
 hotelsInr +
 tripDetails.activitiesCost +
 tripDetails.transfersCost +
 tripDetails.visaCost +
 tripDetails.travelInsurance +
 tripDetails.arrivalVisa +
 tripDetails.otherCost;

 // Markup
 const markupAmount = subtotal * (tripDetails.markupPercent / 100);

 // GST on (subtotal + markup)
 const gstAmount = (subtotal + markupAmount) * (tripDetails.gstPercent / 100);

 // TCS on total (subtotal + markup + gst)
 const tcsAmount = (subtotal + markupAmount + gstAmount) * (tripDetails.tcsPercent / 100);

 // Grand total
 const grandTotal = subtotal + markupAmount + gstAmount + tcsAmount;

 // Per person
 const totalPax = tripDetails.adults + tripDetails.kids;
 const perPerson = totalPax > 0 ? Math.round(grandTotal / totalPax) : 0;

 return {
 adultRate,
 kidsTotal,
 hotelsInr,
 subtotal,
 markupAmount,
 gstAmount,
 tcsAmount,
 grandTotal,
 perPerson,
 };
 }, [tripDetails]);

  const handleSelectTemplate = () => {
    if (searchedTemplate) {
      setSelectedTemplate(searchedTemplate);
      setStep(2);
      // Update end date based on new template
      if (tripDetails.startDate) {
        const endDate = calculateEndDate(tripDetails.startDate, searchedTemplate.days);
        setTripDetails(prev => ({ ...prev, endDate }));
      }
    }
  };

const handleStepChange = (newStep: Step) => {
 if (newStep === 2 && !selectedTemplate) {
 toast.error('Select a template first');
 return;
 }
 if (newStep === 3) {
 if (!tripDetails.customerName || !tripDetails.startDate) {
 toast.error('Fill in all required fields');
 return;
 }
 }
 setStep(newStep);
 };

 const generatePDFMutation = useMutation({
 mutationFn: async () => {
 const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
 const token = localStorage.getItem('token');
 
 const response = await fetch(`${apiUrl}/api/itinerary-templates/generate-pdf`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 template: {
 code: selectedTemplate?.code,
 title: selectedTemplate?.title,
 days: selectedTemplate?.days,
 nights: selectedTemplate?.nights,
 destination: selectedTemplate?.destination || 'Vietnam',
 brief: selectedTemplate?.brief,
 itinerary: selectedTemplate?.itinerary,
 },
 customer: {
 name: tripDetails.customerName,
 phone: tripDetails.customerPhone,
 tripId: tripDetails.tripId,
 consultant: tripDetails.consultantName,
 startDate: tripDetails.startDate,
 endDate: tripDetails.endDate,
 adults: tripDetails.adults,
 kids: tripDetails.kids,
 },
 hotelCategory: tripDetails.hotelCategory,
 pricing: {
 hotelUsd: tripDetails.dmcCostPerAdult,
 forexRate: tripDetails.usdToInrRate,
 hotelInr: calculations.hotelInr,
 activities: tripDetails.activitiesCost,
 transfers: tripDetails.transfersCost,
 visa: tripDetails.visaCost,
 insurance: tripDetails.travelInsurance,
 arrivalVisa: tripDetails.arrivalVisa,
 other: tripDetails.otherCost,
 otherLabel: tripDetails.otherLabel,
 markupPercent: tripDetails.markupPercent,
 markupAmount: calculations.markupAmount,
 gstPercent: tripDetails.gstPercent,
 gstAmount: calculations.gstAmount,
 tcsPercent: tripDetails.tcsPercent,
 tcsAmount: calculations.tcsAmount,
 subtotal: calculations.subtotal,
 totalInr: calculations.totalInr,
 perPerson: calculations.perPerson,
 }
 })
 });

 if (!response.ok) {
 const error = await response.json();
 throw new Error(error.error || 'Failed to generate PDF');
 }

 return response.blob();
 },
 onSuccess: (blob) => {
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `MANY2GO-${tripDetails.tripId}-${tripDetails.customerName.replace(/\s+/g, '_')}.pdf`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 window.URL.revokeObjectURL(url);
 toast.success('PDF downloaded successfully!');
 },
 onError: (error) => {
 toast.error(`Failed to generate PDF: ${error.message}`);
 }
 });

 const handleGeneratePDF = () => {
 if (!selectedTemplate) {
 toast.error('Please select a template first');
 return;
 }
 if (!tripDetails.customerName) {
 toast.error('Please enter customer name');
 return;
 }
 generatePDFMutation.mutate();
 };

 const handleSaveDraft = () => {
 toast.success('Draft Saved Successfully');
 };

 const handleLinkLead = () => {
 // Will implement dropdown to select lead
 toast('Link to Lead - Coming Soon');
 };

  return (
    <AgentLayout>
      <PageHeader
        title="Itinerary Builder"
        description="Create customized travel itineraries for your customers"
      />

      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                onClick={() => s < step && handleStepChange(s as Step)}
                style={{ cursor: s < step ? 'pointer' : 'default' }}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    step > s ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-2xl mx-auto mt-2 text-sm text-gray-500">
          <span className="ml-0">Search</span>
          <span className="ml-8">Details</span>
          <span className="mr-4">Review</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* STEP 1: Search & Select Template */}
        {step === 1 && (
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Search className="w-6 h-6 text-primary-600" />
              Select Itinerary Template
            </h2>

            <div className="max-w-md mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Itinerary Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="e.g. 201, 233, 218"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Try codes: 201-217 (North/South Vietnam), 208-217 (Central), 218-225 (Cambodia), 226-239 (Extended)
              </p>
            </div>

            {searchedTemplate && (
              <div className="mt-8 p-6 bg-primary-50 rounded-lg border-2 border-primary-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-600 text-white">
                      Code: {searchedTemplate.code}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">
                      {searchedTemplate.days}D / {searchedTemplate.nights}N
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchedTemplate.title}
                </h3>

                <div className="flex items-center gap-4 text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {searchedTemplate.destination}
                  </span>
                </div>

                <p className="text-gray-600 mb-6">
                  {searchedTemplate.brief}
                </p>

                <button
                  onClick={handleSelectTemplate}
                  className="w-full btn-primary py-3 text-lg"
                >
                  Use This Template
                  <ChevronRight className="w-5 h-5 ml-2 inline" />
                </button>
              </div>
            )}

            {!searchedTemplate && searchCode && (
              <div className="mt-8 text-center text-gray-500">
                No template found with code "{searchCode}"
              </div>
            )}
          </div>
        )}

{/* STEP 2: Customer & Trip Details - NEW DESIGN */}
 {step === 2 && selectedTemplate && (
 <div className="space-y-6">
 {/* Selected Template Summary */}
 <div className="card p-4 bg-primary-50 border border-primary-200">
 <div className="flex items-center justify-between">
 <div>
 <span className="text-sm text-gray-600">Selected Template</span>
 <h3 className="font-semibold text-lg">
 {selectedTemplate.code}: {selectedTemplate.title}
 </h3>
 <span className="text-sm text-gray-500">
 {selectedTemplate.days} Days / {selectedTemplate.nights} Nights
 </span>
 </div>
 <button
 onClick={() => setStep(1)}
 className="text-primary-600 hover:text-primary-700 text-sm"
 >
 Change
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* === LEFT COLUMN: Customer & Trip Info === */}
 <div className="space-y-6">
 {/* Customer Details Section */}
 <div className="card space-y-4">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 <Users className="w-5 h-5 text-primary-600" />
 Customer Details
 </h3>

 <div>
 <label className="input-label">Customer Name *</label>
 <input
 type="text"
 value={tripDetails.customerName}
 onChange={(e) => setTripDetails(prev => ({ ...prev, customerName: e.target.value }))}
 className="input-field"
 placeholder="Enter customer name"
 />
 </div>

 <div>
 <label className="input-label">Customer Phone</label>
 <input
 type="tel"
 value={tripDetails.customerPhone}
 onChange={(e) => setTripDetails(prev => ({ ...prev, customerPhone: e.target.value }))}
 className="input-field"
 placeholder="+91 XXXXX XXXXX"
 />
 </div>

 <div>
 <label className="input-label">Trip ID (Auto-generated)</label>
 <input
 type="text"
 value={tripDetails.tripId}
 readOnly
 className="input-field bg-gray-100 font-mono"
 />
 </div>

 <div>
 <label className="input-label">Holiday Consultant</label>
 <input
 type="text"
 value={tripDetails.consultantName}
 onChange={(e) => setTripDetails(prev => ({ ...prev, consultantName: e.target.value }))}
 className="input-field"
 placeholder="Enter consultant name"
 />
 </div>
 </div>

 {/* Travel Details Section */}
 <div className="card space-y-4">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-primary-600" />
 Travel Details
 </h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="input-label">Travel Start Date *</label>
 <input
 type="date"
 value={tripDetails.startDate}
 onChange={(e) => setTripDetails(prev => ({ ...prev, startDate: e.target.value }))}
 className="input-field"
 />
 </div>
 <div>
 <label className="input-label">Travel End Date</label>
 <input
 type="date"
 value={tripDetails.endDate}
 readOnly
 className="input-field bg-gray-100"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="input-label">No. of Adults</label>
 <input
 type="number"
 min={1}
 value={tripDetails.adults}
 onChange={(e) => setTripDetails(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
 className="input-field"
 />
 </div>
 <div>
 <label className="input-label">No. of Kids</label>
 <input
 type="number"
 min={0}
 value={tripDetails.kids}
 onChange={(e) => setTripDetails(prev => ({ ...prev, kids: parseInt(e.target.value) || 0 }))}
 className="input-field"
 />
 </div>
 </div>

 {/* Kids Breakdown - Only visible if kids > 0 */}
 {tripDetails.kids > 0 && (
 <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
 <h4 className="font-medium text-orange-800 mb-3">Child Details (Total: {tripDetails.kids})</h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="input-label text-xs">Under 5 (Free: 0%)</label>
 <input
 type="number"
 min={0}
 max={tripDetails.kids}
 value={tripDetails.kidsUnder5}
 onChange={(e) => {
 const val = parseInt(e.target.value) || 0;
 const total = tripDetails.kidsUnder5 + tripDetails.kids5to10Sharing + tripDetails.kids5to10ExtraBed + tripDetails.kids11plus;
 if (val + total - tripDetails.kidsUnder5 <= tripDetails.kids) {
 setTripDetails(prev => ({ ...prev, kidsUnder5: val }));
 }
 }}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label text-xs">Age 5-10 (Sharing: 60%)</label>
 <input
 type="number"
 min={0}
 max={tripDetails.kids}
 value={tripDetails.kids5to10Sharing}
 onChange={(e) => {
 const val = parseInt(e.target.value) || 0;
 const total = tripDetails.kidsUnder5 + tripDetails.kids5to10Sharing + tripDetails.kids5to10ExtraBed + tripDetails.kids11plus;
 if (val + total - tripDetails.kids5to10Sharing <= tripDetails.kids) {
 setTripDetails(prev => ({ ...prev, kids5to10Sharing: val }));
 }
 }}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label text-xs">Age 5-10 (Extra Bed: 85%)</label>
 <input
 type="number"
 min={0}
 max={tripDetails.kids}
 value={tripDetails.kids5to10ExtraBed}
 onChange={(e) => {
 const val = parseInt(e.target.value) || 0;
 const total = tripDetails.kidsUnder5 + tripDetails.kids5to10Sharing + tripDetails.kids5to10ExtraBed + tripDetails.kids11plus;
 if (val + total - tripDetails.kids5to10ExtraBed <= tripDetails.kids) {
 setTripDetails(prev => ({ ...prev, kids5to10ExtraBed: val }));
 }
 }}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label text-xs">Age 11+ (Adult Rate: 100%)</label>
 <input
 type="number"
 min={0}
 max={tripDetails.kids}
 value={tripDetails.kids11plus}
 onChange={(e) => {
 const val = parseInt(e.target.value) || 0;
 const total = tripDetails.kidsUnder5 + tripDetails.kids5to10Sharing + tripDetails.kids5to10ExtraBed + tripDetails.kids11plus;
 if (val + total - tripDetails.kids11plus <= tripDetails.kids) {
 setTripDetails(prev => ({ ...prev, kids11plus: val }));
 }
 }}
 className="input-field"
 placeholder="0"
 />
 </div>
 </div>
 </div>
 )}

 {/* Hotel Category */}
 <div>
 <label className="input-label">Hotel Category</label>
 <div className="flex gap-6">
 {['3', '4', '5'].map((cat) => (
 <label key={cat} className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="hotelCategory"
 value={cat}
 checked={tripDetails.hotelCategory === cat}
 onChange={(e) => setTripDetails(prev => ({ ...prev, hotelCategory: e.target.value as '3' | '4' | '5' }))}
 className="w-4 h-4 text-primary-600"
 />
 <span className="flex items-center gap-1">
 {Array.from({ length: parseInt(cat) }).map((_, i) => (
 <Flame key={i} className="w-4 h-4 text-yellow-500" />
 ))}
 <span className="ml-1 text-sm font-medium">{cat}★ Hotel</span>
 </span>
 </label>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* === RIGHT COLUMN: Cost Breakdown === */}
 <div className="space-y-6">
 {/* Section 1: Hotels (Land Package) */}
 <div className="card space-y-4">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 <Building2 className="w-5 h-5 text-blue-600" />
 🏨 HOTELS (Land Package)
 </h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="input-label">DMC Cost per Adult (USD)</label>
 <input
 type="number"
 step="1"
 value={tripDetails.dmcCostPerAdult}
 onChange={(e) => setTripDetails(prev => ({ ...prev, dmcCostPerAdult: parseFloat(e.target.value) || 0 }))}
 className="input-field"
 placeholder="650"
 />
 </div>
 <div>
 <label className="input-label">USD to INR Rate</label>
 <input
 type="number"
 step="0.01"
 value={tripDetails.usdToInrRate}
 onChange={(e) => setTripDetails(prev => ({ ...prev, usdToInrRate: parseFloat(e.target.value) || 85.50 }))}
 className="input-field"
 placeholder="85.50"
 />
 </div>
 </div>

 <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex justify-between items-center">
 <span className="text-gray-700 font-medium">Hotel Total (INR)</span>
 <span className="font-bold text-lg text-blue-700">₹ {Math.round(calculations.hotelsInr).toLocaleString()}</span>
 </div>
 <div className="text-xs text-gray-500 mt-1">
 Formula: (Adults × Adult Rate + Kids Total) × Forex
 </div>
 </div>
 </div>

 {/* Section 2: Activities */}
 <div className="card space-y-3">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 🎯 ACTIVITIES
 </h3>
 <div>
 <label className="input-label">Cost (INR)</label>
 <input
 type="number"
 value={tripDetails.activitiesCost}
 onChange={(e) => setTripDetails(prev => ({ ...prev, activitiesCost: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 <p className="text-xs text-gray-500 italic">Usually included in land package</p>
 </div>

 {/* Section 3: Transfers */}
 <div className="card space-y-3">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 🚌 TRANSFERS
 </h3>
 <div>
 <label className="input-label">Cost (INR)</label>
 <input
 type="number"
 value={tripDetails.transfersCost}
 onChange={(e) => setTripDetails(prev => ({ ...prev, transfersCost: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 <p className="text-xs text-gray-500 italic">Usually included in land package</p>
 </div>

 {/* Section 4: Other Special Inclusions */}
 <div className="card space-y-4">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 ✨ OTHER SPECIAL INCLUSIONS
 </h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="input-label">Visa (INR)</label>
 <input
 type="number"
 value={tripDetails.visaCost}
 onChange={(e) => setTripDetails(prev => ({ ...prev, visaCost: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label">Travel Insurance (INR)</label>
 <input
 type="number"
 value={tripDetails.travelInsurance}
 onChange={(e) => setTripDetails(prev => ({ ...prev, travelInsurance: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="input-label">Arrival Visa (INR)</label>
 <input
 type="number"
 value={tripDetails.arrivalVisa}
 onChange={(e) => setTripDetails(prev => ({ ...prev, arrivalVisa: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label">Other Label</label>
 <input
 type="text"
 value={tripDetails.otherLabel}
 onChange={(e) => setTripDetails(prev => ({ ...prev, otherLabel: e.target.value }))}
 className="input-field"
 placeholder="e.g. Extra Services"
 />
 </div>
 </div>
 <div>
 <label className="input-label">Other Cost (INR)</label>
 <input
 type="number"
 value={tripDetails.otherCost}
 onChange={(e) => setTripDetails(prev => ({ ...prev, otherCost: parseInt(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 </div>

 {/* Section 5: Markup & Taxes */}
 <div className="card space-y-4">
 <h3 className="font-semibold text-gray-900 flex items-center gap-2">
 📊 MARKUP & TAXES
 </h3>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="input-label">Markup %</label>
 <input
 type="number"
 step="0.1"
 value={tripDetails.markupPercent}
 onChange={(e) => setTripDetails(prev => ({ ...prev, markupPercent: parseFloat(e.target.value) || 0 }))}
 className="input-field"
 placeholder="0"
 />
 </div>
 <div>
 <label className="input-label">GST %</label>
 <input
 type="number"
 step="0.1"
 value={tripDetails.gstPercent}
 onChange={(e) => setTripDetails(prev => ({ ...prev, gstPercent: parseFloat(e.target.value) || 5 }))}
 className="input-field"
 placeholder="5"
 />
 </div>
 <div>
 <label className="input-label">TCS %</label>
 <input
 type="number"
 step="0.1"
 value={tripDetails.tcsPercent}
 onChange={(e) => setTripDetails(prev => ({ ...prev, tcsPercent: parseFloat(e.target.value) || 5 }))}
 className="input-field"
 placeholder="5"
 />
 </div>
 </div>
 </div>

 {/* === GRAND TOTAL BOX === */}
 <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg sticky top-4">
 <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
 <DollarSign className="w-5 h-5" />
 QUOTE SUMMARY
 </h3>

 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-400">Hotels (Land Package)</span>
 <span className="font-medium">₹ {Math.round(calculations.hotelsInr).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Activities</span>
 <span className="font-medium">₹ {tripDetails.activitiesCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Transfers</span>
 <span className="font-medium">₹ {tripDetails.transfersCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Visa</span>
 <span className="font-medium">₹ {tripDetails.visaCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Insurance</span>
 <span className="font-medium">₹ {tripDetails.travelInsurance.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Arrival Visa</span>
 <span className="font-medium">₹ {tripDetails.arrivalVisa.toLocaleString()}</span>
 </div>
 {tripDetails.otherCost > 0 && (
 <div className="flex justify-between">
 <span className="text-gray-400">{tripDetails.otherLabel || 'Other'}</span>
 <span className="font-medium">₹ {tripDetails.otherCost.toLocaleString()}</span>
 </div>
 )}
 <div className="border-t border-gray-700 my-2"></div>
 <div className="flex justify-between">
 <span className="text-gray-300">Subtotal</span>
 <span className="font-medium">₹ {Math.round(calculations.subtotal).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">Markup ({tripDetails.markupPercent}%)</span>
 <span className="font-medium">₹ {Math.round(calculations.markupAmount).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">GST ({tripDetails.gstPercent}%)</span>
 <span className="font-medium">₹ {Math.round(calculations.gstAmount).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-400">TCS ({tripDetails.tcsPercent}%)</span>
 <span className="font-medium">₹ {Math.round(calculations.tcsAmount).toLocaleString()}</span>
 </div>
 <div className="border-t-2 border-white mt-3 pt-3">
 <div className="flex justify-between text-lg font-bold">
 <span>TOTAL</span>
 <span className="text-green-400">₹ {Math.round(calculations.grandTotal).toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-sm mt-1">
 <span className="text-gray-400">Per Person</span>
 <span className="font-semibold text-green-300">₹ {calculations.perPerson.toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Navigation Buttons */}
 <div className="flex justify-between">
 <button
 onClick={() => setStep(1)}
 className="btn-secondary"
 >
 <ChevronLeft className="w-4 h-4 mr-2" />
 Back
 </button>
 <button
 onClick={() => handleStepChange(3)}
 className="btn-primary"
 >
 Continue to Review
 <ChevronRight className="w-4 h-4 ml-2" />
 </button>
 </div>
 </div>
 )}

{/* STEP 3: Review & Generate */}
 {step === 3 && selectedTemplate && (
 <div className="space-y-6">
 <div className="card p-6">
 <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
 <FileText className="w-6 h-6 text-primary-600" />
 Review Itinerary
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
 {/* Template Summary */}
 <div className="bg-gray-50 p-4 rounded-lg">
 <h3 className="font-semibold text-gray-700 mb-3">Template</h3>
 <div className="space-y-1">
 <p className="font-medium">{selectedTemplate.title}</p>
 <p className="text-sm text-gray-600">Code: {selectedTemplate.code}</p>
                    <p className="text-sm text-gray-600">
                      {selectedTemplate.days} Days / {selectedTemplate.nights} Nights
                    </p>
                    <p className="text-sm text-gray-600">{selectedTemplate.destination}</p>
                  </div>
                </div>

 {/* Customer Summary */}
 <div className="bg-gray-50 p-4 rounded-lg">
 <h3 className="font-semibold text-gray-700 mb-3">Customer</h3>
 <div className="space-y-1">
 <p className="font-medium">{tripDetails.customerName}</p>
 <p className="text-sm text-gray-600">{tripDetails.customerPhone}</p>
 <p className="text-sm text-gray-600">Trip ID: {tripDetails.tripId}</p>
 <p className="text-sm text-gray-600">Consultant: {tripDetails.consultantName || 'Not specified'}</p>
 </div>
 </div>

                {/* Travel Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Travel Details</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {tripDetails.startDate} to {tripDetails.endDate}
                    </p>
                    <p className="text-sm text-gray-600">
                      {tripDetails.adults} Adults, {tripDetails.kids} Kids
                    </p>
                    <p className="text-sm text-gray-600">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {tripDetails.hotelCategory} Star Hotel
                    </p>
                  </div>
                </div>

 {/* Pricing Summary */}
 <div className="bg-green-50 p-4 rounded-lg">
 <h3 className="font-semibold text-green-800 mb-3">Pricing Summary</h3>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-600">Hotels (Land Package)</span>
 <span>₹ {Math.round(calculations.hotelsInr).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Activities</span>
 <span>₹ {tripDetails.activitiesCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Transfers</span>
 <span>₹ {tripDetails.transfersCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Visa</span>
 <span>₹ {tripDetails.visaCost.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Insurance</span>
 <span>₹ {tripDetails.travelInsurance.toLocaleString()}</span>
 </div>
 {tripDetails.arrivalVisa > 0 && (
 <div className="flex justify-between">
 <span className="text-gray-600">Arrival Visa</span>
 <span>₹ {tripDetails.arrivalVisa.toLocaleString()}</span>
 </div>
 )}
 {tripDetails.otherCost > 0 && (
 <div className="flex justify-between">
 <span className="text-gray-600">{tripDetails.otherLabel || 'Other'}</span>
 <span>₹ {tripDetails.otherCost.toLocaleString()}</span>
 </div>
 )}
 <div className="flex justify-between">
 <span className="text-gray-600">Markup ({tripDetails.markupPercent}%)</span>
 <span>₹ {Math.round(calculations.markupAmount).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">GST ({tripDetails.gstPercent}%)</span>
 <span>₹ {Math.round(calculations.gstAmount).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">TCS ({tripDetails.tcsPercent}%)</span>
 <span>₹ {Math.round(calculations.tcsAmount).toLocaleString()}</span>
 </div>
 <div className="border-t pt-2 flex justify-between font-semibold text-lg text-green-700">
 <span>Total Quote</span>
 <span>₹ {Math.round(calculations.grandTotal).toLocaleString()}</span>
 </div>
 <div className="flex justify-between text-sm text-gray-600">
 <span>Per Person</span>
 <span>₹ {calculations.perPerson.toLocaleString()}</span>
 </div>
 </div>
 </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
 <button
 onClick={handleGeneratePDF}
 disabled={generatePDFMutation.isPending}
 className="btn-primary flex-1 min-w-[200px]"
 >
 {generatePDFMutation.isPending ? (
 <>
 <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Generating...
 </>
 ) : (
 <>
 <FileText className="w-4 h-4 mr-2" />
 Generate PDF
 </>
 )}
 </button>
                <button
                  onClick={handleSaveDraft}
                  className="btn-secondary flex-1 min-w-[200px]"
                >
                  Save as Draft
                </button>
                <button
                  onClick={handleLinkLead}
                  className="btn-secondary flex-1 min-w-[200px]"
                >
                  Link to Lead
                </button>
              </div>

              <div className="flex justify-start mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
