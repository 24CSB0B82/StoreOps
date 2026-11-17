import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { inventoryService } from '../services/inventoryService';
import StatusBadge from '../components/StatusBadge';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Boxes,
  Loader2,
  Calendar,
} from 'lucide-react';

export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, ordersData, topData, lowStockData, monthlyData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getRecentOrders(5),
        dashboardService.getTopProducts(5),
        inventoryService.getLowStock(),
        dashboardService.getMonthlySales(),
      ]);

      setSummary(sumData);
      setRecentOrders(ordersData);
      setTopProducts(topData);
      setLowStockProducts(lowStockData);
      setMonthlySales(monthlyData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard operational analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3 font-medium">Aggregating live operational data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <p className="font-semibold text-sm">Dashboard Analytics Unavailable</p>
        <p className="text-xs mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Products',
      value: summary?.total_products || 0,
      icon: Package,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
      link: '/products',
    },
    {
      title: 'Total Customers',
      value: summary?.total_customers || 0,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      link: '/customers',
    },
    {
      title: 'Total Orders',
      value: summary?.total_orders || 0,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      link: '/orders',
    },
    {
      title: 'Gross Sales',
      value: `$${Number(summary?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      subtitle: 'Excludes cancelled orders',
    },
    {
      title: 'Low Stock Alerts',
      value: summary?.low_stock_count || 0,
      icon: AlertTriangle,
      color: summary?.low_stock_count > 0 ? 'text-amber-600' : 'text-slate-400',
      bg: summary?.low_stock_count > 0 ? 'bg-amber-50' : 'bg-slate-50',
      border: summary?.low_stock_count > 0 ? 'border-amber-200' : 'border-slate-200',
      link: '/inventory',
    },
    {
      title: 'Inventory Value',
      value: `$${Number(summary?.inventory_valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: Boxes,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      subtitle: 'Current physical stock valuation',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const CardContent = (
            <div className={`p-5 rounded-xl border bg-white shadow-xs ${card.border} flex flex-col justify-between hover:shadow-md transition`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</span>
                {card.subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</p>}
              </div>
            </div>
          );

          return card.link ? (
            <Link key={i} to={card.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={i}>{CardContent}</div>
          );
        })}
      </div>

      {/* Main Sections: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Customer Orders</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live view of recent orders processed</p>
            </div>
            <Link
              to="/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
            >
              View all orders
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900">#{order.order_id}</td>
                      <td className="py-3 px-3">{order.customer_name}</td>
                      <td className="py-3 px-3">{order.item_count} items</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">${Number(order.total_amount).toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Top-Selling Items</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ranked by volume sold</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No completed sales recorded yet.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.product_id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{p.product_name}</p>
                      <p className="text-[11px] text-slate-400">{p.category} &bull; {p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">{p.total_quantity_sold} sold</span>
                    <p className="text-[11px] text-emerald-600 font-medium">${Number(p.total_revenue).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Secondary Sections: Low Stock Table & Monthly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Warning List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Low-Stock Reorder Alerts</h3>
                <p className="text-xs text-slate-400">Products at or below their configured reorder threshold</p>
              </div>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              Manage stock
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Reorder Point</th>
                  <th className="py-2.5 px-3">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-emerald-600 font-medium">
                      All inventory quantities are above reorder thresholds.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.slice(0, 5).map((prod) => (
                    <tr key={prod.product_id} className="hover:bg-amber-50/30 transition">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">{prod.product_name}</span>
                        <span className="text-[10px] text-slate-400">{prod.sku}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">{prod.quantity} units</td>
                      <td className="py-2.5 px-3 text-slate-500">{prod.reorder_level} units</td>
                      <td className="py-2.5 px-3 text-slate-500">{prod.supplier_name || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Performance Overview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Monthly Sales Summary</h3>
                <p className="text-xs text-slate-400">Gross revenue grouped by calendar month</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {monthlySales.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No monthly sales data yet.</p>
            ) : (
              monthlySales.map((month) => {
                const maxSales = Math.max(...monthlySales.map((m) => Number(m.total_sales) || 1));
                const percentage = Math.round((Number(month.total_sales) / maxSales) * 100);

                return (
                  <div key={month.month_key} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{month.month_label}</span>
                      <span className="font-bold text-slate-900">${Number(month.total_sales).toFixed(2)} ({month.total_orders} orders)</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
