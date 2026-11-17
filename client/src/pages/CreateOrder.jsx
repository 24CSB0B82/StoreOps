import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
} from 'lucide-react';

export const CreateOrder = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1 },
  ]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ is_active: true, limit: 100 }),
        ]);
        setCustomers(custRes.customers || []);
        setProducts(prodRes.products || []);
        if (custRes.customers?.length > 0) {
          setSelectedCustomerId(custRes.customers[0].customer_id);
        }
      } catch (err) {
        setError('Failed to load customers or active products.');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadMasterData();
  }, []);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (orderItems.length <= 1) return;
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    updated[index][field] = value;
    setOrderItems(updated);
  };

  // Find product details by ID
  const getProduct = (productId) => {
    return products.find((p) => p.product_id === Number(productId)) || null;
  };

  // Calculate order totals
  let orderTotal = 0;
  let hasStockError = false;

  const itemCalculations = orderItems.map((item) => {
    const product = getProduct(item.product_id);
    const qty = Number(item.quantity) || 0;
    const price = product ? Number(product.price) : 0;
    const subtotal = price * qty;
    orderTotal += subtotal;

    const availableStock = product ? product.quantity : 0;
    const isExceeded = product ? qty > availableStock : false;
    if (isExceeded) hasStockError = true;

    return {
      product,
      qty,
      price,
      subtotal,
      availableStock,
      isExceeded,
    };
  });

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    if (hasStockError) {
      setError('Cannot place order: One or more requested items exceed warehouse stock.');
      return;
    }

    // Filter out unselected rows
    const validItems = orderItems
      .filter((i) => i.product_id && Number(i.quantity) > 0)
      .map((i) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
      }));

    if (validItems.length === 0) {
      setError('Please select at least one product with quantity greater than 0.');
      return;
    }

    // Check for duplicates
    const productIds = validItems.map((i) => i.product_id);
    if (new Set(productIds).size !== productIds.length) {
      setError('Duplicate products selected in order. Please consolidate line items.');
      return;
    }

    setSubmitting(true);
    try {
      await orderService.createOrder({
        customer_id: Number(selectedCustomerId),
        items: validItems,
      });

      // Redirect to orders page
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Failed to process order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3 font-medium">Loading catalog and customer accounts...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page header */}
      <div className="flex items-center gap-3">
        <Link
          to="/orders"
          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create Customer Order</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ACID transaction: Validates stock, calculates line items, locks rows, and records movements
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Order Creation Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* Customer Selection Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs">
              1
            </span>
            Select Customer
          </h3>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Account *</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
            >
              <option value="">Choose a customer...</option>
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name} ({c.email || 'No email'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Items Builder Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs">
                2
              </span>
              Order Line Items
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {orderItems.map((item, index) => {
              const calc = itemCalculations[index];

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition ${
                    calc.isExceeded
                      ? 'border-rose-300 bg-rose-50/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Product Selector (6 cols) */}
                    <div className="md:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Product Item #{index + 1}
                      </label>
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.product_name} (${Number(p.price).toFixed(2)}) &bull; Stock: {p.quantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input (2 cols) */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className={`w-full px-3 py-2 text-xs border rounded-lg outline-none ${
                          calc.isExceeded
                            ? 'border-rose-400 focus:border-rose-500 bg-rose-50/50'
                            : 'border-slate-200 focus:border-sky-500 bg-white'
                        }`}
                      />
                    </div>

                    {/* Unit Price (2 cols) */}
                    <div className="md:col-span-2 text-left md:text-right">
                      <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Line Total
                      </span>
                      <span className="text-xs font-bold text-slate-900 block mt-1.5">
                        ${calc.subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Delete Item (2 cols) */}
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        disabled={orderItems.length <= 1}
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stock validation status indicator */}
                  {calc.product && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Warehouse Stock: <strong className="text-slate-700">{calc.availableStock} available</strong>
                        {' '}&bull; Unit Price: ${Number(calc.price).toFixed(2)}
                      </span>
                      {calc.isExceeded && (
                        <span className="flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Requested quantity exceeds available stock ({calc.qty} &gt; {calc.availableStock})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand Total Summary Box */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Estimated Grand Total</span>
              <span className="text-xs text-slate-400">Unit prices authoritative from DB on submit</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-sky-400 tracking-tight">
                ${orderTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/orders"
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || hasStockError}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing Database Transaction...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Place Customer Order
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrder;
