const { query } = require('../config/db');
const { AppError } = require('../utils/apiResponse');

/**
 * List all customers with order counts and search
 */
const getCustomers = async ({ search = '', page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    conditions.push(`(c.customer_name ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx} OR c.phone ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) FROM customers c ${whereClause};`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated customers with order count
  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT 
      c.customer_id,
      c.customer_name,
      c.email,
      c.phone,
      c.created_at,
      COUNT(o.order_id)::INTEGER AS order_count,
      COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total_amount ELSE 0 END), 0)::NUMERIC(12,2) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    ${whereClause}
    GROUP BY c.customer_id
    ORDER BY c.customer_name ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const { rows: customers } = await query(dataSql, dataParams);

  return {
    customers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get customer details along with recent orders
 */
const getCustomerById = async (id) => {
  const customerSql = `
    SELECT customer_id, customer_name, email, phone, created_at
    FROM customers
    WHERE customer_id = $1;
  `;

  const customerRes = await query(customerSql, [id]);
  if (customerRes.rows.length === 0) {
    throw new AppError(`Customer with ID ${id} not found.`, 404, 'CUSTOMER_NOT_FOUND');
  }

  const customer = customerRes.rows[0];

  // Fetch recent orders placed by this customer
  const ordersSql = `
    SELECT 
      o.order_id,
      o.total_amount,
      o.status,
      o.created_at,
      COUNT(oi.order_item_id)::INTEGER AS item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.customer_id = $1
    GROUP BY o.order_id
    ORDER BY o.created_at DESC
    LIMIT 10;
  `;

  const ordersRes = await query(ordersSql, [id]);
  customer.orders = ordersRes.rows;
  customer.order_count = ordersRes.rows.length;

  return customer;
};

/**
 * Create a new customer
 */
const createCustomer = async (customerData) => {
  const { customer_name, email = null, phone = null } = customerData;

  const sql = `
    INSERT INTO customers (customer_name, email, phone)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const { rows } = await query(sql, [customer_name, email, phone]);
  return rows[0];
};

/**
 * Update an existing customer
 */
const updateCustomer = async (id, customerData) => {
  const { customer_name, email, phone } = customerData;

  const sql = `
    UPDATE customers
    SET 
      customer_name = COALESCE($1, customer_name),
      email = COALESCE($2, email),
      phone = COALESCE($3, phone)
    WHERE customer_id = $4
    RETURNING *;
  `;

  const { rows } = await query(sql, [customer_name, email, phone, id]);
  if (rows.length === 0) {
    throw new AppError(`Customer with ID ${id} not found.`, 404, 'CUSTOMER_NOT_FOUND');
  }

  return rows[0];
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};
