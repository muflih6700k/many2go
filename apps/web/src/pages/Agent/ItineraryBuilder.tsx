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
  consultantId: string;
  hotelCategory: '3' | '4' | '5';
  forexRate: number;
  forexCharges: number;
  visaCharges: number;
  insuranceCharges: number;
  markup: number;
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
    consultantId: '',
    hotelCategory: '4',
    forexRate: 84.5,
    forexCharges: 2.5,
    visaCharges: 0,
    insuranceCharges: 0,
    markup: 0,
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

  // Pricing calculations (mock pricing lookup - will be replaced with actual pricing table)
  const calculateLandCost = () => {
    // Mock pricing - per person based on hotel category
    const basePrices = {
      '3': 450,
      '4': 650,
      '5': 950,
    };
    const perPerson = basePrices[tripDetails.hotelCategory];
    const totalPax = tripDetails.adults + tripDetails.kids * 0.5; // kids half price
    return { perPerson, total: Math.round(perPerson * totalPax) };
  };

  const landCost = calculateLandCost();

  const calculateLandCostInr = () => {
    const forexMultiplier = tripDetails.forexRate * (1 + tripDetails.forexCharges / 100);
    return Math.round(landCost.total * forexMultiplier);
  };

  const landCostInr = calculateLandCostInr();

  const totalQuote = landCostInr + tripDetails.visaCharges + tripDetails.insuranceCharges + tripDetails.markup;

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
 if (!tripDetails.customerName || !tripDetails.startDate || !tripDetails.consultantId) {
 toast.error('Fill in all required fields');
 return;
 }
 }
 setStep(newStep);
 };

 const handleGeneratePDF = () => {
 toast('PDF Generation - Coming in Phase 2');
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

        {/* STEP 2: Customer & Trip Details */}
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
              {/* LEFT COLUMN */}
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
                  <label className="input-label">Trip ID</label>
                  <input
                    type="text"
                    value={tripDetails.tripId}
                    readOnly
                    className="input-field bg-gray-100"
                  />
                </div>

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

                <div>
                  <label className="input-label">Holiday Consultant *</label>
                  <select
                    value={tripDetails.consultantId}
                    onChange={(e) => setTripDetails(prev => ({ ...prev, consultantId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select consultant</option>
                    {agents?.map((agent: User) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="card space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary-600" />
                  Pricing & Costs
                </h3>

                <div>
                  <label className="input-label">Hotel Category</label>
                  <div className="flex gap-4">
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
                          <span className="ml-1 text-sm">Star</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">DMC Land Cost (USD)</span>
                    <span className="font-semibold">
                      Per person: ${landCost.perPerson} | Total: ${landCost.total}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Based on {tripDetails.adults} adults + {tripDetails.kids} kids (50% rate)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Forex Rate (USD to INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tripDetails.forexRate}
                      onChange={(e) => setTripDetails(prev => ({ ...prev, forexRate: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      placeholder="84.50"
                    />
                  </div>
                  <div>
                    <label className="input-label">Forex Charges %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tripDetails.forexCharges}
                      onChange={(e) => setTripDetails(prev => ({ ...prev, forexCharges: parseFloat(e.target.value) || 0 }))}
                      className="input-field"
                      placeholder="2.5"
                    />
                  </div>
                </div>

                <div className="p-4 bg-primary-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Land Cost (INR)</span>
                    <span className="font-semibold text-lg">₹ {landCostInr.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${landCost.total} × {tripDetails.forexRate} × {1 + tripDetails.forexCharges/100}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Visa Charges (INR)</label>
                    <input
                      type="number"
                      value={tripDetails.visaCharges}
                      onChange={(e) => setTripDetails(prev => ({ ...prev, visaCharges: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="input-label">Insurance Charges (INR)</label>
                    <input
                      type="number"
                      value={tripDetails.insuranceCharges}
                      onChange={(e) => setTripDetails(prev => ({ ...prev, insuranceCharges: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                      placeholder="3000"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Markup (INR)</label>
                  <input
                    type="number"
                    value={tripDetails.markup}
                    onChange={(e) => setTripDetails(prev => ({ ...prev, markup: parseInt(e.target.value) || 0 }))}
                    className="input-field"
                    placeholder="5000"
                  />
                </div>

                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">TOTAL QUOTE</span>
                    <span className="text-2xl font-bold text-green-700">₹ {totalQuote.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Land Cost + Visa + Insurance + Markup
                  </div>
                </div>
              </div>
            </div>

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
                      <span className="text-gray-600">Land Cost</span>
                      <span>₹ {landCostInr.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visa</span>
                      <span>₹ {tripDetails.visaCharges.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance</span>
                      <span>₹ {tripDetails.insuranceCharges.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Markup</span>
                      <span>₹ {tripDetails.markup.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg text-green-700">
                      <span>Total Quote</span>
                      <span>₹ {totalQuote.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGeneratePDF}
                  className="btn-primary flex-1 min-w-[200px]"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF
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
