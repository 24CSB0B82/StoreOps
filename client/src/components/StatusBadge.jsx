export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const badgeConfig = {
    // Stock Statuses
    IN_STOCK: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'In Stock' },
    LOW_STOCK: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Low Stock' },
    OUT_OF_STOCK: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Out of Stock' },

    // Order Statuses
    PLACED: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Placed' },
    COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed' },
    CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Cancelled' },

    // Inventory Transaction Types
    STOCK_IN: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Stock In' },
    STOCK_OUT: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Stock Out' },
    ADJUSTMENT: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Adjustment' },
    ORDER_CANCELLATION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Restocked' },

    // User Roles
    ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Admin' },
    STAFF: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Staff' },

    // Active flags
    ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Active' },
    INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Inactive' },
  };

  const config = badgeConfig[normalized] || {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
