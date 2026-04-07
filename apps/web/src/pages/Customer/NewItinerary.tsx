import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { itinerariesApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, MapPin, BedDouble, List, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ItineraryDay } from '@/types';

interface DayForm {
  dayNumber: number;
  destination: string;
  activities: string;
  hotel: string;
}

export function NewItinerary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<DayForm[]>([
    { dayNumber: 1, destination: '', activities: '', hotel: '' },
  ]);

  const createMutation = useMutation({
    mutationFn: (data: { title: string; destinations: string[]; days: DayForm[] }) =>
      itinerariesApi.create(data as any),
    onSuccess: () => {
      toast.success('Itinerary saved as draft');
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      navigate('/app/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save itinerary');
    },
  });

  const addDay = () => {
    setDays([...days, { dayNumber: days.length + 1, destination: '', activities: '', hotel: '' }]);
  };

  const removeDay = (index: number) => {
    if (days.length === 1) {
      toast.error('Itinerary needs at least one day');
      return;
    }
    const newDays = days.filter((_, i) => i !== index);
    // Re-number days
    setDays(newDays.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const updateDay = (index: number, field: keyof DayForm, value: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    setDays(newDays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const destinations = [...new Set(days.filter(d => d.destination).map(d => d.destination))];
    
    if (destinations.length === 0) {
      toast.error('Please add at least one destination');
      return;
    }

    const validDays = days.filter(d => d.destination && d.activities);
    if (validDays.length === 0) {
      toast.error('Please fill in at least one complete day');
      return;
    }

    createMutation.mutate({
      title: title || undefined,
      destinations,
      days: validDays,
    });
  };

  return (
    <CustomerLayout>
      <PageHeader 
        title="New Itinerary"
        subtitle="Plan your perfect trip day by day"
      />

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Title */}
        <div className="card mb-6">
          <label className="label">Trip Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g., My Dream Vacation to Bali"
          />
        </div>

        {/* Days */}
        <div className="space-y-4 mb-6">
          {days.map((day, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">{day.dayNumber}</span>
                  </div>
                  <span className="font-medium text-gray-900">Day {day.dayNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDay(index)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Destination
                  </label>
                  <input
                    type="text"
                    value={day.destination}
                    onChange={(e) => updateDay(index, 'destination', e.target.value)}
                    className="input"
                    placeholder="e.g., Canggu, Bali"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-400" />
                    Activities
                  </label>
                  <textarea
                    value={day.activities}
                    onChange={(e) => updateDay(index, 'activities', e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="Morning temple visit, afternoon beach time, evening sunset dinner..."
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-gray-400" />
                    Hotel / Accommodation
                  </label>
                  <input
                    type="text"
                    value={day.hotel}
                    onChange={(e) => updateDay(index, 'hotel', e.target.value)}
                    className="input"
                    placeholder="e.g., The Santai Umalas"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Day Button */}
        <button
          type="button"
          onClick={addDay}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Day
        </button>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 btn-primary py-3"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2 inline" />
                Save as Draft
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="btn-secondary px-6"
          >
            Cancel
          </button>
        </div>
      </form>
    </CustomerLayout>
  );
}
