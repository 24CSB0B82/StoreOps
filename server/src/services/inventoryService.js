const { query, getClient } = require('../config/db');
const { AppError } = require('../utils/apiResponse');

/**
 * Get inventory stock view with pagination, search, and stock level filters
 */
const getInventory = async ({
  search = '',
  category = '',
  stock_status = '',
  page = 1,
  limit = 20,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    conditions.push(`(p.product_name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  if (category && category.trim()) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(category.trim());
    paramIdx++;
  }

  if (stock_status) {
    if (stock_status === 'out_of_stock') {
      conditions.push('p.quantity = 0');
    } else if (stock_status === 'low_stock') {
      conditions.push('p.quantity > 0 AND p.quantity <= p.reorder_level');
    } else if (stock_status === 'in_stock') {
      conditions.push('p.quantity > p.reorder_level');
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) FROM products p ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.sku,
      p.category,
      p.price,
      p.quantity,
      p.reorder_level,
      p.is_active,
      s.supplier_name,
      CASE
        WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END AS stock_status,
      (p.quantity * p.price)::NUMERIC(12,2) AS inventory_value
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
    ${whereClause}
    ORDER BY p.quantity ASC, p.product_name ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const { rows: inventory } = await query(dataSql, dataParams);

  return {
    inventory,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieve products that have quantity <= reorder_level
 */
const getLowStockProducts = async () => {
  const sql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.sku,
      p.category,
      p.price,
      p.quantity,
      p.reorder_level,
      p.supplier_id,
      s.supplier_name,
      s.email AS supplier_email,
      s.phone AS supplier_phone,
      (p.reorder_level - p.quantity) AS units_below_reorder
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
    WHERE p.is_active = TRUE AND p.quantity <= p.reorder_level
    ORDER BY p.quantity ASC;
  `;

  const { rows } = await query(sql);
  return rows;
};

/**
 * Retrieve audit log of inventory transactions
 */
const getInventoryTransactions = async ({
  product_id = null,
  transaction_type = null,
  page = 1,
  limit = 20,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (product_id) {
    conditions.push(`it.product_id = $${paramIdx}`);
    params.push(Number(product_id));
    paramIdx++;
  }

  if (transaction_type) {
    conditions.push(`it.transaction_type = $${paramIdx}`);
    params.push(transaction_type.trim().toUpperCase());
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) FROM inventory_transactions it ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT 
      it.transaction_id,
      it.product_id,
      p.product_name,
      p.sku,
      it.user_id,
      u.name AS user_name,
      it.quantity_changed,
      it.transaction_type,
      it.reference_id,
      it.reason,
      it.created_at
    FROM inventory_transactions it
    JOIN products p ON it.product_id = p.product_id
    JOIN users u ON it.user_id = u.user_id
    ${whereClause}
    ORDER BY it.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const { rows: transactions } = await query(dataSql, dataParams);

  return {
    transactions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Manually adjusts stock quantities inside a database transaction.
 * Checks for negative stock violations and creates an audit movement.
 */
const adjustStock = async (
  { product_id, quantity_changed, transaction_type = 'ADJUSTMENT', reason = null },
  userId
) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock product row FOR UPDATE
    const productRes = await client.query(
      'SELECT product_id, product_name, quantity, price FROM products WHERE product_id = $1 FOR UPDATE;',
      [product_id]
    );

    if (productRes.rows.length === 0) {
      throw new AppError(`Product with ID ${product_id} not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    const product = productRes.rows[0];
    const newQuantity = product.quantity + quantity_changed;

    // 2. Prevent negative inventory quantities
    if (newQuantity < 0) {
      throw new AppError(
        `Adjustment rejected: Cannot reduce stock of "${product.product_name}" below zero (Current: ${product.quantity}, Attempted deduction: ${Math.abs(quantity_changed)}).`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    // 3. Update stock in products table
    const updateRes = await client.query(
      'UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING *;',
      [newQuantity, product_id]
    );

    // 4. Record audit transaction
    const txRes = await client.query(
      `INSERT INTO inventory_transactions (
         product_id, user_id, quantity_changed, transaction_type, reason
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [product_id, userId, quantity_changed, transaction_type, reason || 'Manual inventory adjustment']
    );

    await client.query('COMMIT');

    return {
      product: updateRes.rows[0],
      transaction: txRes.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getInventory,
  getLowStockProducts,
  getInventoryTransactions,
  adjustStock,
};
