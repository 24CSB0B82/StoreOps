import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Power,
  RotateCcw,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    product_name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    quantity: '',
    reorder_level: 10,
    supplier_id: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isAdmin } = useAuth();

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await productService.getProducts({
        search,
        category,
        stock_status: stockStatus,
        page,
        limit: 10,
      });
      setProducts(res.products);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const list = await supplierService.getSuppliers();
      setSuppliers(list);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    fetchSuppliers();
  }, [category, stockStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const openAddModal = () => {
    setFormData({
      product_name: '',
      sku: '',
      description: '',
      category: 'Electronics',
      price: '',
      quantity: '',
      reorder_level: 10,
      supplier_id: suppliers[0]?.supplier_id || '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormData({
      product_name: prod.product_name,
      sku: prod.sku,
      description: prod.description || '',
      category: prod.category || 'General',
      price: prod.price,
      reorder_level: prod.reorder_level,
      supplier_id: prod.supplier_id || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openViewModal = async (id) => {
    try {
      const details = await productService.getProductById(id);
      setSelectedProduct(details);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await productService.createProduct(formData);
      setIsAddModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await productService.updateProduct(selectedProduct.product_id, formData);
      setIsEditModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to update product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (prod) => {
    const action = prod.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${prod.product_name}"?`)) {
      return;
    }

    try {
      await productService.toggleStatus(prod.product_id, !prod.is_active);
      fetchProducts(pagination.page);
    } catch (err) {
      alert(err.message || 'Status update failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Product Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage master product SKU list, pricing, and suppliers</p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none text-slate-700 bg-white"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Audio">Audio</option>
          </select>

          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none text-slate-700 bg-white"
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (At/Below Reorder)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Available Qty</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products matched your criteria.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr
                    key={prod.product_id}
                    className={`hover:bg-slate-50/70 transition ${
                      !prod.is_active ? 'opacity-60 bg-slate-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {prod.product_name}
                      {!prod.is_active && (
                        <span className="ml-2 text-[10px] text-slate-400 font-normal italic">
                          (Deactivated)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{prod.sku}</td>
                    <td className="py-3.5 px-4 text-slate-600">{prod.category || '—'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">${Number(prod.price).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`font-semibold ${prod.quantity <= prod.reorder_level ? 'text-amber-600' : 'text-slate-800'}`}>
                        {prod.quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{prod.supplier_name || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={prod.stock_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(prod.product_id)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(prod)}
                              title="Edit Product"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(prod)}
                              title={prod.is_active ? 'Deactivate Product' : 'Reactivate Product'}
                              className={`p-1.5 rounded-lg transition ${
                                prod.is_active
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                            >
                              {prod.is_active ? <Power className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                            </button>
                          </>
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
          <span>
            Showing {products.length} of {pagination.total} products
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchProducts(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchProducts(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Product">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="e.g. Wireless Ergonomic Mouse"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-ELEC-009"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Electronics"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Qty</label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                placeholder="5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
            >
              <option value="">None / Unassigned</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description and specs..."
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
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product Details">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
            >
              <option value="">None / Unassigned</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Product Information">
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedProduct.product_name}</h4>
                <p className="font-mono text-slate-400">{selectedProduct.sku}</p>
              </div>
              <StatusBadge status={selectedProduct.stock_status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Category</span>
                <span className="font-semibold text-slate-800">{selectedProduct.category || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Selling Price</span>
                <span className="font-bold text-slate-900">${Number(selectedProduct.price).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Available Stock</span>
                <span className="font-semibold text-slate-800">{selectedProduct.quantity} units</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Reorder Threshold</span>
                <span className="font-semibold text-slate-800">{selectedProduct.reorder_level} units</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Supplier Details
              </span>
              <p className="font-semibold text-slate-800">{selectedProduct.supplier_name || 'No supplier linked'}</p>
              {selectedProduct.supplier_email && (
                <p className="text-slate-500 mt-0.5">{selectedProduct.supplier_email} &bull; {selectedProduct.supplier_phone}</p>
              )}
            </div>

            {selectedProduct.description && (
              <div>
                <span className="text-slate-400 block mb-1">Description</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedProduct.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
