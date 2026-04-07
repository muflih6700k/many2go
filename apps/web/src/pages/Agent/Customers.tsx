import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { usersApi } from '@/lib/api';
import { Search, X, User, Mail, Phone, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { User as UserType } from '@/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function Customers() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<UserType | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => usersApi.getAll('CUSTOMER').then(res => res.data.data),
  });

  const filteredCustomers = customers?.filter((c: UserType) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AgentLayout>
      <PageHeader 
        title="Customers"
        subtitle="View and manage your customer base"
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="input pl-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 card p-0">
          <div className="px-6 py-4 border-b">
            <h3 className="font-medium text-gray-900">Customer List ({filteredCustomers?.length || 0})</h3>
          </div>
          
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="w-32 h-4 mb-2" />
                      <Skeleton className="w-24 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-20 h-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {filteredCustomers?.map((customer: UserType) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`
                    flex items-center justify-between px-6 py-4 cursor-pointer
                    hover:bg-gray-50 transition-colors
                    ${selectedCustomer?.id === customer.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {filteredCustomers?.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No customers found matching "{search}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Details (Right Drawer) */}
        <div className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:shadow-none lg:bg-transparent lg:w-auto
          ${selectedCustomer ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:hidden'}
        `}>
          <div className="h-full lg:bg-white lg:rounded-xl lg:shadow-sm lg:border">
            {/* Mobile close button */}
            <div className="lg:hidden p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Customer Profile</h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedCustomer ? (
              <div className="p-6">
                {/* Avatar */}
                <div className="text-center mb-6">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-bold text-primary-700">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
                  <p className="text-gray-500">Customer</p>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Contact Information</h4>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Member Since</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(selectedCustomer.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Actions</h4>
                  <a
                    href={`mailto:${selectedCustomer.email}`}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center h-full text-gray-400 p-6">
                <User className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a customer to view their profile</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
