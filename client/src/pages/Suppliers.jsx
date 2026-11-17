import { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Truck,
  Mail,
  Phone,
  MapPin,
  Package,
  Edit,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    supplier_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isAdmin } = useAuth();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const list = await supplierService.getSuppliers({ search });
      setSuppliers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const openAddModal = () => {
    setFormData({ supplier_name: '', email: '', phone: '', address: '' });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (s) => {
    setSelectedSupplier(s);
    setFormData({
      supplier_name: s.supplier_name,
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openViewModal = async (id) => {
    try {
      const s = await supplierService.getSupplierById(id);
      setSelectedSupplier(s);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await supplierService.createSupplier(formData);
      setIsAddModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setFormError(err.message || 'Failed to create supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await supplierService.updateSupplier(selectedSupplier.supplier_id, formData);
      setIsEditModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      setFormError(err.message || 'Failed to update supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supplier Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage wholesale vendors and associated catalog inventory</p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start"
          >
            <Plus className="w-4 h-4" />
            Add New Supplier
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500"
          />
        </form>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-center">Products Supplied</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{s.supplier_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.email || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-xs">{s.address || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {s.product_count} products
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(s.supplier_id)}
                          title="View Associated Products"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(s)}
                            title="Edit Supplier"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
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
      </div>

      {/* Add Supplier Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Supplier">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier Company Name *</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="Apex Wholesale Corp"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="orders@apexwholesale.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0199"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warehouse Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Industrial Parkway, Suite 400..."
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
              {submitting ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Supplier">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleUpdateSupplier} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier Company Name</label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warehouse Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

      {/* View Supplier & Associated Products Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Supplier & Catalog Details" maxWidth="max-w-2xl">
        {selectedSupplier && (
          <div className="space-y-5 text-xs">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">{selectedSupplier.supplier_name}</h4>
              <p className="text-slate-500 mt-0.5">{selectedSupplier.email || 'No email provided'} &bull; {selectedSupplier.phone || 'No phone'}</p>
              {selectedSupplier.address && <p className="text-slate-400 mt-1 italic">{selectedSupplier.address}</p>}
            </div>

            <div>
              <h5 className="font-semibold text-slate-800 mb-2">
                Products Supplied ({selectedSupplier.product_count || 0})
              </h5>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2">Product Name</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSupplier.products?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          No products mapped to this supplier yet.
                        </td>
                      </tr>
                    ) : (
                      selectedSupplier.products?.map((p) => (
                        <tr key={p.product_id} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">{p.product_name}</td>
                          <td className="p-2 font-mono text-slate-500">{p.sku}</td>
                          <td className="p-2 font-bold">${Number(p.price).toFixed(2)}</td>
                          <td className="p-2">{p.quantity} units</td>
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

export default Suppliers;
