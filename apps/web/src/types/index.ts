// Shared types for MANY2GO web app

export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'BOOKED' | 'CLOSED';

export type CallStatus =
 | 'PENDING'
 | 'NOT_INTERESTED'
 | 'BANG'
 | 'ENQUIRY_GENERATED'
 | 'CALL_BACK'
 | 'FUTURE_FOLLOWUP'
 | 'CM_BUSY_CALLBACK'
 | 'RINGING_NO_RESPONSE'
 | 'SWITCH_OFF'
 | 'NOT_REACHABLE'
 | 'BUSY'
 | 'VOICE_MAIL'
 | 'WRONG_NO'
 | 'INVALID_NO'
 | 'OUT_OF_SERVICE'
 | 'REPEATED_NO';

export interface Lead {
 id: string;
 status: LeadStatus;
 notes: string | null;
 createdAt: string;
 updatedAt: string;

 // Relations
 customerId: string;
 customer?: User;
 agentId: string | null;
 agent?: User;

 // Call Tracking
 callStatus: CallStatus | null;
 callDate: string | null;
 callTime: string | null;

 // Follow-up
 followUpDate: string | null;
 followUpTime: string | null;
 followUpNote: string | null;

 // Contact
 phone: string | null;
 source?: string | null;
 customerName?: string | null;

 // Pink Sheet Fields
 cmNumber: string | null;
 destination: string | null;
 travelMonth: string | null;
 travelDate: string | null;
 returnDate: string | null;
 daysPlanned: string | null;
 adults: number | null;
 kids: number | null;
 kidsAge: string | null;
 mealsplan: string | null;
 hotelCategory: string | null;
 budget: string | null;
 travelFrom: string | null;
 passportStatus: string | null;
 lastVacation: string | null;
 remarks: string | null;

 // Progress
 whatsappCreated: boolean;
 itineraryShared: boolean;
 flightCostsSent: boolean;
 quoteSent: boolean;

 // Outcome
 outcome: 'SALE_CLOSED' | 'PROLONGED' | 'DISBANDED' | null;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: string;
  customerId: string;
  itineraryId: string | null;
  status: BookingStatus;
  price: number;
  netAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface Offer {
  id: string;
  leadId: string;
  destination: string;
  description: string;
  price: number;
  validUntil: string;
  status: OfferStatus;
  createdAt: string;
}

export interface Itinerary {
  id: string;
  customerId: string;
  title: string | null;
  destinations: string[];
  days: ItineraryDay[];
  totalDays: number;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  dayNumber: number;
  destination: string;
  activities: string;
  hotel: string | null;
}

export interface Message {
  id: string;
  leadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: User;
}

export interface Reminder {
  id: string;
  agentId: string;
  leadId: string;
  note: string;
  dueAt: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    status: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface Revenue {
  id: string;
  bookingId: string;
  grossAmount: number;
  commissionPercent: number;
  netAmount: number;
  receivedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
