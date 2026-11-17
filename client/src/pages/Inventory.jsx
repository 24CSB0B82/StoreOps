import { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';

export const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('STOCK_IN');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isAdmin } = useAuth();

  const fetchInventory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await inventoryService.getInventory({
        search,
        category,
        stock_status: stockStatus,
        page,
        limit: 15,
      });
      setInventory(res.inventory);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory(1);
  }, [category, stockStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInventory(1);
  };

  const openAdjustModal = (product = null) => {
    setSelectedProduct(product || inventory[0]);
    setAdjustmentQty('');
    setAdjustmentType('STOCK_IN');
    setAdjustmentReason('');
    setModalError('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const qty = parseInt(adjustmentQty, 10);
    if (!qty || isNaN(qty) || qty === 0) {
      setModalError('Please specify a non-zero adjustment quantity.');
      return;
    }

    // Signed quantity: negative if deducting
    const signedQty = adjustmentType === 'ADJUSTMENT' && qty > 0 ? -qty : qty;

    setSubmitting(true);
    try {
      await inventoryService.adjustStock({
        product_id: selectedProduct.product_id,
        quantity_changed: signedQty,
        transaction_type: adjustmentType,
        reason: adjustmentReason || 'Manual inventory adjustment',
      });
      setIsAdjustModalOpen(false);
      fetchInventory(pagination.page);
    } catch (err) {
      setModalError(err.message || 'Stock adjustment rejected.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Stock Monitor</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time warehouse stock balances, reorder points, and physical valuation</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => openAdjustModal(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Adjust Stock
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
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500"
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
            <option value="low_stock">⚠️ Low Stock (At/Below Reorder)</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock (Zero Units)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Current Quantity</th>
                <th className="py-3 px-4 text-center">Reorder Point</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Physical Valuation</th>
                {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading inventory balances...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.product_name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{item.sku}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.category || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-bold text-sm ${item.quantity <= item.reorder_level ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {item.reorder_level}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.stock_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${Number(item.inventory_value).toFixed(2)}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-2.5 py-1 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition"
                        >
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {inventory.length} of {pagination.total} catalog items</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchInventory(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchInventory(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal (Admin Only) */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Perform Inventory Adjustment">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
            <select
              required
              value={selectedProduct?.product_id || ''}
              onChange={(e) => {
                const found = inventory.find((p) => p.product_id === Number(e.target.value));
                setSelectedProduct(found);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
            >
              {inventory.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} (Current Stock: {p.quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
              >
                <option value="STOCK_IN">Add Stock (STOCK_IN)</option>
                <option value="ADJUSTMENT">Correct/Reduce Discrepancy (ADJUSTMENT)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {adjustmentType === 'STOCK_IN' ? 'Quantity to Add' : 'Quantity to Deduct'} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Reference *</label>
            <input
              type="text"
              required
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g. Received new shipment from supplier / Damaged box"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          {selectedProduct && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-slate-600">
              <span>Current Stock: <strong>{selectedProduct.quantity} units</strong></span>
              {adjustmentQty && (
                <span>
                  Resulting Stock:{' '}
                  <strong className="text-sky-700">
                    {adjustmentType === 'STOCK_IN'
                      ? selectedProduct.quantity + Number(adjustmentQty)
                      : Math.max(0, selectedProduct.quantity - Number(adjustmentQty))}{' '}
                    units
                  </strong>
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Applying Adjustment...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
