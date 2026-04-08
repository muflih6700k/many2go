import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { bookingsApi, offersApi, itinerariesApi } from '@/lib/api';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Tag, ArrowRight, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Booking, Offer, Itinerary } from '@/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function CustomerDashboard() {
  const { user } = useAuth();

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getAll().then(res => res.data.data),
  });

  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offersApi.getAll().then(res => res.data.data),
  });

  const { data: itineraries } = useQuery({
    queryKey: ['itineraries'],
    queryFn: () => itinerariesApi.getAll().then(res => res.data.data),
  });

  const upcomingBookings = bookings?.filter((b: Booking) => b.status !== 'CANCELLED').slice(0, 3) || [];
  const activeOffers = offers?.slice(0, 3) || [];

  return (
    <CustomerLayout>
      <PageHeader 
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle="Manage your travel plans and bookings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <div className="lg:col-span-2 card bg-gradient-to-br from-primary-600 to-primary-700 border-none">
          <div className="text-white">
            <h3 className="text-lg font-semibold mb-2">Ready to plan your next adventure?</h3>
            <p className="text-primary-100 mb-4">
              Create a custom itinerary and let our agents help you book the perfect trip.
            </p>
            <Link 
              to="/app/itinerary/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Create Itinerary
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Your Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Bookings</span>
              <span className="text-2xl font-bold text-gray-900">
                {bookingsLoading ? <Skeleton className="w-8 h-6" /> : upcomingBookings.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Itineraries</span>
              <span className="text-2xl font-bold text-gray-900">
                {itineraries?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Offers</span>
              <span className="text-2xl font-bold text-gray-900">
                {offersLoading ? <Skeleton className="w-8 h-6" /> : activeOffers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Upcoming Bookings
            </h3>
            <Link to="/app/bookings" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.map((booking: Booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Booking #{booking.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${booking.price.toLocaleString()} • Net: ${booking.netAmount.toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              message="No upcoming bookings" 
              submessage="Book a trip to see it here"
            />
          )}
        </div>

        {/* Active Offers Strip */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary-600" />
              Special Offers
            </h3>
            <Link to="/app/offers" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>

          {offersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : activeOffers.length > 0 ? (
            <div className="space-y-3">
              {activeOffers.map((offer: Offer) => (
                <div key={offer.id} className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{offer.destination}</span>
                    <Tag className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{offer.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-700">
                      ${offer.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      Valid until {new Date(offer.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              message="No active offers" 
              submessage="Check back later for deals"
            />
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
