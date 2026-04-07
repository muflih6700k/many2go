// Local types - copied from shared package for Railway deployment

export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'BOOKED' | 'CLOSED';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ItineraryStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'COMPLETED';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}
