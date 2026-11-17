import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionError, setActionError] = useState('');

  const { isAdmin } = useAuth();

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setActionError('');
    try {
      const res = await orderService.getOrders({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setOrders(res.orders);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handleViewOrder = async (orderId) => {
    try {
      const order = await orderService.getOrderById(orderId);
      setSelectedOrder(order);
      setIsDetailsModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm(`Mark Order #${orderId} as COMPLETED?`)) return;

    try {
      await orderService.updateStatus(orderId, 'COMPLETED');
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (
      !window.confirm(
        `Are you sure you want to CANCEL Order #${orderId}? This will automatically restore all ordered stock quantities to the warehouse.`
      )
    ) {
      return;
    }

    try {
      await orderService.cancelOrder(orderId);
      fetchOrders(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Order Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track, complete, and manage customer orders and fulfillment</p>
        </div>

        <Link
          to="/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start"
        >
          <Plus className="w-4 h-4" />
          Create New Order
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID or customer name..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none text-slate-700 bg-white"
          >
            <option value="">All Order Statuses</option>
            <option value="PLACED">Placed (Pending Fulfillment)</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">#{o.order_id}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{o.customer_name}</span>
                      <span className="text-[10px] text-slate-400">{o.customer_email || 'No email'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(o.created_at).toLocaleDateString()} &bull; {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{o.item_count} items</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${Number(o.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewOrder(o.order_id)}
                          title="View Order Details"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Complete Order Action (Only for PLACED orders) */}
                        {o.status === 'PLACED' && (
                          <button
                            onClick={() => handleCompleteOrder(o.order_id)}
                            title="Mark as Completed"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Cancel Order Action (Admin only, only for PLACED orders) */}
                        {isAdmin && o.status === 'PLACED' && (
                          <button
                            onClick={() => handleCancelOrder(o.order_id)}
                            title="Cancel Order & Restore Stock"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {orders.length} of {pagination.total} orders</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchOrders(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchOrders(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Breakdown Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Order Breakdown" maxWidth="max-w-2xl">
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Order Reference</span>
                <h4 className="text-base font-bold text-slate-900">Order #{selectedOrder.order_id}</h4>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer Name</span>
                <span className="font-semibold text-slate-800">{selectedOrder.customer_name}</span>
                <p className="text-[10px] text-slate-500">{selectedOrder.customer_email || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Order Placed Date</span>
                <span className="font-semibold text-slate-800">{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Created By User</span>
                <span className="font-semibold text-slate-800">{selectedOrder.created_by_name || 'Staff'}</span>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-slate-800 mb-2">Purchased Items</h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Historical Unit Price</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.order_item_id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium text-slate-800">{item.product_name}</td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-500">{item.sku}</td>
                        <td className="p-2.5 text-center font-semibold">{item.quantity}</td>
                        <td className="p-2.5 text-right">${Number(item.unit_price).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">${Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right text-slate-700">Order Grand Total:</td>
                      <td className="p-2.5 text-right text-sm text-sky-700">${Number(selectedOrder.total_amount).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
