import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type StatusType = 'NEW' | 'CONTACTED' | 'QUOTED' | 'BOOKED' | 'CLOSED' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const statusStyles: Record<StatusType, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-yellow-100 text-yellow-800',
  BOOKED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusStyles[status] || statusStyles.NEW,
        className
      )}
    >
      {status}
    </span>
  );
}
