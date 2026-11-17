import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ShieldCheck, User, LogOut } from 'lucide-react';

export const TopNavbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Operational Dashboard';
      case '/products':
        return 'Product Catalog';
      case '/suppliers':
        return 'Supplier Directory';
      case '/customers':
        return 'Customer Directory';
      case '/orders':
        return 'Order Management';
      case '/orders/new':
        return 'Create Customer Order';
      case '/inventory':
        return 'Inventory Stock Monitor';
      case '/inventory/history':
        return 'Inventory Movement Audit Log';
      default:
        return 'StoreOps';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{getPageTitle(location.pathname)}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isAdmin
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> : <User className="w-3.5 h-3.5 text-slate-500" />}
          <span className="capitalize">{user?.role} Access</span>
        </div>

        {/* User Profile Info */}
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
          <span className="text-[11px] text-slate-400">{user?.email}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
