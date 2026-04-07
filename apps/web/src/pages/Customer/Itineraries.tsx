import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { PageHeader } from '@/components/PageHeader';
import { itinerariesApi } from '@/lib/api';
import { Calendar, MapPin, ChevronRight, Plus, FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import type { Itinerary } from '@/types';

export function Itineraries() {
  const navigate = useNavigate();

  const { data: itineraries, isLoading } = useQuery({
    queryKey: ['itineraries'],
    queryFn: () => itinerariesApi.getAll().then(res => res.data.data),
  });

  return (
    <CustomerLayout>
      <PageHeader
        title="My Itineraries"
        subtitle="View and manage your travel plans"
      >
        <button
          onClick={() => navigate('/app/itinerary/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Itinerary
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      ) : itineraries?.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No itineraries yet"
          submessage="Create your first travel plan to get started"
          action={
            <button
              onClick={() => navigate('/app/itinerary/new')}
              className="btn-primary"
            >
              Create Itinerary
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {itineraries?.map((itinerary: Itinerary) => (
            <div
              key={itinerary.id}
              onClick={() => navigate(`/app/itinerary/${itinerary.id}`)}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {itinerary.title || 'Untitled Itinerary'}
                    </h3>
                    {itinerary.pdfUrl && (
                      <FileText className="w-4 h-4 text-green-500" title="PDF available" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {itinerary.totalDays || (itinerary.days?.length || 0)} days
                    </span>
                    {itinerary.destinations?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {itinerary.destinations.slice(0, 2).join(', ')}
                        {itinerary.destinations.length > 2 && '...'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Created {new Date(itinerary.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
