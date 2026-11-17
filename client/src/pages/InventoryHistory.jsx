import { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import StatusBadge from '../components/StatusBadge';
import {
  History,
  Filter,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
} from 'lucide-react';

export const InventoryHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState('');

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await inventoryService.getTransactions({
        transaction_type: transactionType,
        page,
        limit: 20,
      });
      setTransactions(res.transactions);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [transactionType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Movement Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological ledger of all physical stock movements, order deductions, and restorations
          </p>
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-2 self-start bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="text-xs border-0 outline-none text-slate-700 font-medium bg-transparent pr-2"
          >
            <option value="">All Movement Types</option>
            <option value="STOCK_IN">STOCK_IN (Warehouse Additions)</option>
            <option value="STOCK_OUT">STOCK_OUT (Order Placements)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Manual Corrections)</option>
            <option value="ORDER_CANCELLATION">ORDER_CANCELLATION (Restocked)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tx #</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Qty Changed</th>
                <th className="py-3 px-4">User Responsible</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Reference / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transaction movements recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = Number(tx.quantity_changed) > 0;

                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        #{tx.transaction_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{tx.product_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{tx.sku}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tx.transaction_type} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-rose-600" />
                          )}
                          {isPositive ? `+${tx.quantity_changed}` : tx.quantity_changed} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {tx.user_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tx.reference_id && (
                          <span className="font-semibold text-sky-700 mr-1.5">
                            Order #{tx.reference_id}:
                          </span>
                        )}
                        <span>{tx.reason || 'Warehouse stock operation'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {transactions.length} of {pagination.total} audit movements</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchHistory(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchHistory(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHistory;
