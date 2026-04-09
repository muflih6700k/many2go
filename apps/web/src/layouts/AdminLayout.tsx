import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
 LayoutDashboard, 
 Users, 
 Target,
 Percent,
 LogOut,
 Plane,
 User,
 Menu,
 X,
 Shield,
 BarChart2
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
 { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
 { name: 'Agents', href: '/admin/agents', icon: Users },
 { name: 'Leads', href: '/admin/leads', icon: Target },
 { name: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
 { name: 'Offers', href: '/admin/offers', icon: Percent },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">MANY2GO</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex h-screen pt-14 lg:pt-0">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:relative lg:transform-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">MANY2GO</span>
              <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                ADMIN
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-purple-600 truncate">Administrator</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
