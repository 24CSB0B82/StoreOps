import { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Users,
  Edit,
  Eye,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await customerService.getCustomers({ search, page, limit: 10 });
      setCustomers(res.customers);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const openAddModal = () => {
    setFormData({ customer_name: '', email: '', phone: '' });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c) => {
    setSelectedCustomer(c);
    setFormData({
      customer_name: c.customer_name,
      email: c.email || '',
      phone: c.phone || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openViewModal = async (id) => {
    try {
      const c = await customerService.getCustomerById(id);
      setSelectedCustomer(c);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await customerService.createCustomer(formData);
      setIsAddModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await customerService.updateCustomer(selectedCustomer.customer_id, formData);
      setIsEditModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to update customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer accounts and purchase histories</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start"
        >
          <Plus className="w-4 h-4" />
          Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500"
          />
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Orders Placed</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{c.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.email || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c.order_count} orders
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${Number(c.total_spent || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(c.customer_id)}
                          title="View Past Orders"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
          <span>Showing {customers.length} of {pagination.total} customers</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchCustomers(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchCustomers(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Customer">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Jane Doe"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane.doe@example.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1-555-0155"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Customer Full Name</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer & Order History Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Customer Profile & Order History" maxWidth="max-w-2xl">
        {selectedCustomer && (
          <div className="space-y-5 text-xs">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">{selectedCustomer.customer_name}</h4>
              <p className="text-slate-500 mt-0.5">{selectedCustomer.email || 'No email on file'} &bull; {selectedCustomer.phone || 'No phone'}</p>
            </div>

            <div>
              <h5 className="font-semibold text-slate-800 mb-2">
                Order History ({selectedCustomer.order_count || 0})
              </h5>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2">Order #</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Items</th>
                      <th className="p-2">Total Amount</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCustomer.orders?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          This customer has not placed any orders yet.
                        </td>
                      </tr>
                    ) : (
                      selectedCustomer.orders?.map((o) => (
                        <tr key={o.order_id} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-900">#{o.order_id}</td>
                          <td className="p-2 text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="p-2 text-slate-600">{o.item_count} items</td>
                          <td className="p-2 font-bold text-slate-900">${Number(o.total_amount).toFixed(2)}</td>
                          <td className="p-2">
                            <StatusBadge status={o.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
