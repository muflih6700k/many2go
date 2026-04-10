import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { Lead, Booking, Offer, Itinerary, Reminder, User } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        onRefreshed(accessToken);
        isRefreshing = false;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  refresh: () => api.post('/api/auth/refresh'),
};

export const leadsApi = {
 getAll: () => api.get('/api/leads'),
 getById: (id: string) => api.get(`/api/leads/${id}`),
 create: (data: Partial<Lead>) => api.post('/api/leads', data),
 update: (id: string, data: Partial<Lead>) => api.patch(`/api/leads/${id}`, data),
 delete: (id: string) => api.delete(`/api/leads/${id}`),
 assign: (leadId: string, agentId: string) =>
 api.patch(`/api/leads/${leadId}/assign`, { agentId }),
 getActivities: (id: string) => api.get(`/api/leads/${id}/activities`),
};

export const itinerariesApi = {
  getAll: () => api.get('/api/itineraries'),
  getById: (id: string) => api.get(`/api/itineraries/${id}`),
  create: (data: Partial<Itinerary>) => api.post('/api/itineraries', data),
  update: (id: string, data: Partial<Itinerary>) => api.patch(`/api/itineraries/${id}`, data),
  delete: (id: string) => api.delete(`/api/itineraries/${id}`),
  generatePdf: (id: string) => api.post(`/api/itineraries/${id}/pdf`),
};

export const bookingsApi = {
  getAll: () => api.get('/api/bookings'),
  getById: (id: string) => api.get(`/api/bookings/${id}`),
  create: (data: Partial<Booking>) => api.post('/api/bookings', data),
  update: (id: string, data: Partial<Booking>) => api.patch(`/api/bookings/${id}`, data),
};

export const offersApi = {
  getAll: () => api.get('/api/offers'),
  getById: (id: string) => api.get(`/api/offers/${id}`),
  create: (data: Partial<Offer>) => api.post('/api/offers', data),
  update: (id: string, data: Partial<Offer>) => api.patch(`/api/offers/${id}`, data),
  delete: (id: string) => api.delete(`/api/offers/${id}`),
};

export const messages = {
  getConversations: () => api.get('/api/messages/conversations'),
  getConversation: (userId: string) => api.get(`/api/messages/${userId}`),
  create: (data: { recipientId: string; body: string }) => api.post('/api/messages', data),
};

export const remindersApi = {
  getAll: () => api.get('/api/reminders'),
  create: (data: Partial<Reminder>) => api.post('/api/reminders', data),
  update: (id: string, data: Partial<Reminder>) => api.patch(`/api/reminders/${id}`, data),
  complete: (id: string) => api.post(`/api/reminders/${id}/complete`),
};

export const revenueApi = {
  getAll: () => api.get('/api/revenue'),
  getStats: () => api.get('/api/revenue/stats'),
};

export const usersApi = {
 getAll: (role?: string) => api.get(role ? `/api/users?role=${role}` : '/api/users'),
 getById: (id: string) => api.get(`/api/users/${id}`),
 update: (id: string, data: Partial<User>) => api.patch(`/api/users/${id}`, data),
 deactivate: (id: string) => api.patch(`/api/users/${id}/deactivate`),
 getAgents: () => api.get('/api/users?role=AGENT'),
};

export const itineraryTemplatesApi = {
 getAll: () => api.get('/api/itinerary-templates'),
 getByCode: (code: string) => api.get(`/api/itinerary-templates/${code}`),
};

export const agentsApi = {
 getAgents: () => api.get('/api/users?role=AGENT'),
};

export default api;