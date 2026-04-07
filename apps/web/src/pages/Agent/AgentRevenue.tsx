import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { AgentLayout } from '@/layouts/AgentLayout';
import { revenueApi } from '@/lib/api';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { Revenue } from '@/types';

export function AgentRevenue() {
  const { data: revenues, isLoading } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => revenueApi.getAll().then(res => res.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['revenue', 'stats'],
    queryFn: () => revenueApi.getStats().then(res => res.data.data),
  });

  const totalRevenue = revenues?.reduce((sum: number, r: Revenue) => sum + r.netAmount, 0) || 0;
  const totalGross = revenues?.reduce((sum: number, r: Revenue) => sum + r.grossAmount, 0) || 0;
  const avgCommission = revenues?.length 
    ? revenues.reduce((sum: number, r: Revenue) => sum + r.commissionPercent, 0) / revenues.length 
    : 0;

  return (
    <AgentLayout>
      <PageHeader title="Revenue" subtitle="Track your earnings and commissions" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Gross</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">${totalGross.toLocaleString()}</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Net Revenue</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 rounded" />
          ) : (
            <p className="text-2xl font-bold text-primary-600">${totalRevenue.toLocaleString()}</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Avg Commission</p>
            <TrendingDown className="w-5 h-5 text-blue-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{avgCommission.toFixed(1)}%</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">This Month</p>
            <Calendar className="w-5 h-5 text-primary-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              ${stats?.thisMonth?.total?.toLocaleString() || 0}
            </p>
          )}
        </div>
      </div>

      {/* Revenue Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium text-gray-900">Revenue History</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-14 rounded" />
            ))}
          </div>
        ) : revenues?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenues.map((rev: Revenue) => (
                  <tr key={rev.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {rev.bookingId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(rev.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      ${rev.grossAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="text-blue-600">{rev.commissionPercent}%</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="font-medium text-primary-600">${rev.netAmount.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No revenue records yet</p>
            <p className="text-sm text-gray-400 mt-1">Bookings will generate revenue entries</p>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
