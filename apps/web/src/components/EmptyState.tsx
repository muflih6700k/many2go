import { Package } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  submessage?: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, submessage, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-900 font-medium">{message}</p>
      {submessage && <p className="text-gray-500 text-sm mt-1">{submessage}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
