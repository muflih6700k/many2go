import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { itinerariesApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FileDown, ArrowLeft, MapPin, Calendar, Building2, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Itinerary } from '@/types';

export function ItineraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: itinerary, isLoading } = useQuery({
    queryKey: ['itinerary', id],
    queryFn: () => itinerariesApi.getById(id!).then(res => res.data.data),
    enabled: !!id,
  });

  const generatePDFMutation = useMutation({
    mutationFn: (itineraryId: string) => itinerariesApi.generatePdf(itineraryId),
    onSuccess: (response) => {
      setIsGeneratingPDF(false);
      const { url } = response.data.data;
      if (url) {
        window.open(`http://localhost:3001${url}`, '_blank');
        toast.success('Your PDF is ready!');
      }
    },
    onError: (error: any) => {
      setIsGeneratingPDF(false);
      toast.error(error?.response?.data?.error?.message || 'PDF generation failed');
    },
  });

  const handleDownloadPDF = () => {
    if (!id) return;
    setIsGeneratingPDF(true);
    generatePDFMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="space-y-4 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!itinerary) {
    return (
      <CustomerLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Itinerary not found</p>
          <button
            onClick={() => navigate('/app/itineraries')}
            className="mt-4 text-primary-600 hover:underline"
          >
            Back to Itineraries
          </button>
        </div>
      </CustomerLayout>
    );
  }

  const days = itinerary.days || [];

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => navigate('/app/itineraries')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {itinerary.title || 'Untitled Itinerary'}
            </h1>
            <p className="text-gray-500 mt-1">
              {days.length} {days.length === 1 ? 'day' : 'days'} • {itinerary.status || 'DRAFT'}
            </p>
          </div>
          
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* Days */}
        <div className="space-y-6">
          {days.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No days added yet</p>
            </div>
          ) : (
            days.map((day: any, index: number) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border-l-4 border-primary-500 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1 rounded-full">
                    Day {day.dayNumber || index + 1}
                  </span>
                  {day.destination && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      <span className="font-medium">{day.destination}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {day.activities && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Activities
                      </h3>
                      <ul className="space-y-2">
                        {day.activities
                          .split('\n')
                          .map((a: string) => a.trim())
                          .filter((a: string) => a.length > 0)
                          .map((activity: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-gray-600">
                              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                              <span>{activity}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {day.hotel && (
                    <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        <span className="font-medium">Stay at:</span> {day.hotel}
                      </span>
                    </div>
                  )}

                  {day.notes && (
                    <div className="text-sm text-gray-500 italic">
                      <span className="font-medium text-gray-600">Notes:</span> {day.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-400">
          <p>Created {new Date(itinerary.createdAt).toLocaleDateString()}</p>
          {itinerary.pdfUrl && (
            <button
              onClick={handleDownloadPDF}
              className="mt-2 text-primary-600 hover:underline"
            >
              Previously generated PDF available
            </button>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
