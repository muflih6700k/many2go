/**
 * SHARED TYPES - Single source of truth for all types
 * Never duplicate these in apps or API
 */

// ========================================
// User & Auth Types
// ========================================

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ========================================
// Lead Types
// ========================================

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUOTED = 'QUOTED',
  BOOKED = 'BOOKED',
  CLOSED = 'CLOSED',
}

export interface Lead {
  id: string;
  customerId: string;
  agentId: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: Date;
  // Relations
  customer?: User;
  agent?: User | null;
}

export interface CreateLeadInput {
  customerId: string;
  notes?: string;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  agentId?: string | null;
  notes?: string;
}

// ========================================
// Itinerary Types
// ========================================

export enum ItineraryStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
  location: string;
}

export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  days: ItineraryDay[];
  status: ItineraryStatus;
  pdfUrl: string | null;
  createdAt: Date;
  // Relations
  user?: User;
  bookings?: Booking[];
}

export interface CreateItineraryInput {
  userId: string;
  title: string;
  days: ItineraryDay[];
}

export interface UpdateItineraryInput {
  title?: string;
  days?: ItineraryDay[];
  status?: ItineraryStatus;
  pdfUrl?: string | null;
}

// ========================================
// Booking Types
// ========================================

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: string;
  itineraryId: string;
  status: BookingStatus;
  paidAmount: number;
  createdAt: Date;
  // Relations
  itinerary?: Itinerary;
}

export interface CreateBookingInput {
  itineraryId: string;
}

export interface UpdateBookingInput {
  status?: BookingStatus;
  paidAmount?: number;
}

// ========================================
// Offer Types
// ========================================

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: number;
  imageUrl: string | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateOfferInput {
  title: string;
  description: string;
  discount: number;
  imageUrl?: string;
  expiresAt: Date;
}

export interface UpdateOfferInput {
  title?: string;
  description?: string;
  discount?: number;
  imageUrl?: string | null;
  expiresAt?: Date;
  isActive?: boolean;
}

// ========================================
// Message Types
// ========================================

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  // Relations
  sender?: User;
  recipient?: User;
}

export interface CreateMessageInput {
  senderId: string;
  recipientId: string;
  body: string;
}

// ========================================
// Reminder Types (Kanban)
// ========================================

export interface Reminder {
  id: string;
  agentId: string;
  leadId: string;
  note: string;
  dueAt: Date;
  isDone: boolean;
  createdAt: Date;
  // Relations
  agent?: User;
  lead?: Lead;
}

export interface CreateReminderInput {
  agentId: string;
  leadId: string;
  note: string;
  dueAt: Date;
}

export interface UpdateReminderInput {
  note?: string;
  dueAt?: Date;
  isDone?: boolean;
}

export enum KanbanColumn {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface KanbanItem {
  id: string;
  column: KanbanColumn;
  sortOrder: number;
}

// ========================================
// Revenue Types
// ========================================

export interface Revenue {
  id: string;
  agentId: string;
  bookingId: string;
  amount: number;
  createdAt: Date;
  // Relations
  agent?: User;
  booking?: Booking;
}

// ========================================
// Pagination Types
// ========================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ========================================
// API Response Types
// ========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

// ========================================
// PDF Generation Types
// ========================================

export interface PdfJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  url: string | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ========================================
// Socket Types
// ========================================

export interface SocketUserPayload {
  userId: string;
  socketId: string;
}

export interface MessageSocketPayload {
  message: Message;
  roomId: string;
}

// Re-export for convenience
export type { UserRole as Role };
