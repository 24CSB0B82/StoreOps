const { query } = require('../config/db');

/**
 * High-performance dashboard summary statistics using SQL aggregation
 */
const getSummary = async () => {
  // Execute aggregations concurrently for maximum throughput
  const [productsRes, customersRes, ordersRes, lowStockRes, valuationRes] = await Promise.all([
    // Total active products
    query('SELECT COUNT(*)::INTEGER AS total_products FROM products WHERE is_active = TRUE;'),
    
    // Total customers
    query('SELECT COUNT(*)::INTEGER AS total_customers FROM customers;'),
    
    // Total orders and total sales (excluding CANCELLED)
    query(`
      SELECT 
        COUNT(*)::INTEGER AS total_orders,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::INTEGER AS completed_orders,
        COUNT(CASE WHEN status = 'PLACED' THEN 1 END)::INTEGER AS pending_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::INTEGER AS cancelled_orders,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0)::NUMERIC(12,2) AS total_sales
      FROM orders;
    `),
    
    // Low stock product count
    query('SELECT COUNT(*)::INTEGER AS low_stock_count FROM products WHERE is_active = TRUE AND quantity <= reorder_level;'),
    
    // Total inventory valuation (quantity * price)
    query('SELECT COALESCE(SUM(quantity * price), 0)::NUMERIC(12,2) AS inventory_valuation FROM products WHERE is_active = TRUE;')
  ]);

  const orderStats = ordersRes.rows[0];

  return {
    total_products: productsRes.rows[0].total_products,
    total_customers: customersRes.rows[0].total_customers,
    total_orders: orderStats.total_orders,
    completed_orders: orderStats.completed_orders,
    pending_orders: orderStats.pending_orders,
    cancelled_orders: orderStats.cancelled_orders,
    total_sales: orderStats.total_sales,
    low_stock_count: lowStockRes.rows[0].low_stock_count,
    inventory_valuation: valuationRes.rows[0].inventory_valuation,
  };
};

/**
 * Top 5 selling products ranked by quantity sold (excluding cancelled orders)
 */
const getTopSellingProducts = async (limit = 5) => {
  const sql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.sku,
      p.category,
      p.price,
      SUM(oi.quantity)::INTEGER AS total_quantity_sold,
      SUM(oi.subtotal)::NUMERIC(12,2) AS total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN products p ON oi.product_id = p.product_id
    WHERE o.status != 'CANCELLED'
    GROUP BY p.product_id, p.product_name, p.sku, p.category, p.price
    ORDER BY total_quantity_sold DESC, total_revenue DESC
    LIMIT $1;
  `;

  const { rows } = await query(sql, [limit]);
  return rows;
};

/**
 * Recent 5 orders with customer name and line item count
 */
const getRecentOrders = async (limit = 5) => {
  const sql = `
    SELECT 
      o.order_id,
      o.customer_id,
      c.customer_name,
      o.total_amount,
      o.status,
      o.created_at,
      COUNT(oi.order_item_id)::INTEGER AS item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY o.order_id, c.customer_name
    ORDER BY o.created_at DESC
    LIMIT $1;
  `;

  const { rows } = await query(sql, [limit]);
  return rows;
};

/**
 * Monthly sales revenue and order counts for chart visualization
 */
const getMonthlySales = async () => {
  const sql = `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(order_id)::INTEGER AS total_orders,
      COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_sales
    FROM orders
    WHERE status != 'CANCELLED'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
    LIMIT 12;
  `;

  const { rows } = await query(sql);
  return rows;
};

module.exports = {
  getSummary,
  getTopSellingProducts,
  getRecentOrders,
  getMonthlySales,
};
