import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute';

// Auth pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

// Customer pages
import { CustomerDashboard } from '@/pages/Customer/CustomerDashboard';
import { Itineraries } from '@/pages/Customer/Itineraries';
import { ItineraryDetail } from '@/pages/Customer/ItineraryDetail';
import { NewItinerary } from '@/pages/Customer/NewItinerary';
import CustomerChat from '@/pages/Customer/Chat';

// Agent pages
import { AgentDashboard } from '@/pages/Agent/AgentDashboard';
import { LeadsKanban } from '@/pages/Agent/LeadsKanban';
import { CallManagement } from '@/pages/Agent/CallManagement';
import { Customers } from '@/pages/Agent/Customers';
import { AgentReminders } from '@/pages/Agent/AgentReminders';
import { AgentRevenue } from '@/pages/Agent/AgentRevenue';
import AgentChat from '@/pages/Agent/AgentChat';
import { WeeklyReport } from '@/pages/Agent/WeeklyReport';

// Admin pages
import { AdminDashboard } from '@/pages/Admin/AdminDashboard';
import { AdminAgents } from '@/pages/Admin/AdminAgents';
import { AdminLeads } from '@/pages/Admin/AdminLeads';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

          {/* Customer routes */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/app/dashboard" element={<CustomerDashboard />} />
            <Route path="/app/itineraries" element={<Itineraries />} />
            <Route path="/app/itinerary/:id" element={<ItineraryDetail />} />
            <Route path="/app/itinerary/new" element={<NewItinerary />} />
            <Route path="/app/bookings" element={<div className="p-8">My Bookings - Coming soon</div>} />
            <Route path="/app/offers" element={<div className="p-8">Special Offers - Coming soon</div>} />
            <Route path="/app/chat" element={<CustomerChat />} />
            <Route path="/app/*" element={<CustomerDashboard />} />
          </Route>

{/* Agent routes */}
      <Route element={<ProtectedRoute allowedRoles={['AGENT']} />}>
<Route path="/agent/dashboard" element={<AgentDashboard />} />
 <Route path="/agent/leads" element={<Navigate to="/agent/calls" />} />
        <Route path="/agent/calls" element={<CallManagement />} />
        <Route path="/agent/customers" element={<Customers />} />
        <Route path="/agent/reminders" element={<AgentReminders />} />
<Route path="/agent/revenue" element={<AgentRevenue />} />
 <Route path="/agent/chat" element={<AgentChat />} />
 <Route path="/agent/weekly" element={<WeeklyReport />} />
 <Route path="/agent/*" element={<AgentDashboard />} />
      </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/agents" element={<AdminAgents />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/offers" element={<div className="p-8">Offers CRUD - Coming soon</div>} />
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Login />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #e5e7eb',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
