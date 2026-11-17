const { query, getClient } = require('../config/db');
const { AppError } = require('../utils/apiResponse');

/**
 * List products with search, filtering, and pagination
 */
const getProducts = async ({
  search = '',
  category = '',
  stock_status = '',
  is_active = null,
  page = 1,
  limit = 10,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  // Search by product name or SKU
  if (search && search.trim()) {
    conditions.push(`(p.product_name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  // Filter by category
  if (category && category.trim()) {
    conditions.push(`p.category = $${paramIdx}`);
    params.push(category.trim());
    paramIdx++;
  }

  // Filter by active status
  if (is_active !== null && is_active !== undefined && is_active !== '') {
    conditions.push(`p.is_active = $${paramIdx}`);
    params.push(is_active === 'true' || is_active === true);
    paramIdx++;
  }

  // Filter by stock status
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

  // Get total count for pagination
  const countSql = `SELECT COUNT(*) FROM products p ${whereClause};`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated data
  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.sku,
      p.description,
      p.category,
      p.price,
      p.quantity,
      p.reorder_level,
      p.is_active,
      p.supplier_id,
      s.supplier_name,
      p.created_at,
      p.updated_at,
      CASE
        WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END AS stock_status
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
    ${whereClause}
    ORDER BY p.product_id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const { rows: products } = await query(dataSql, dataParams);

  return {
    products,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieve single product details by ID
 */
const getProductById = async (id) => {
  const sql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.sku,
      p.description,
      p.category,
      p.price,
      p.quantity,
      p.reorder_level,
      p.is_active,
      p.supplier_id,
      s.supplier_name,
      s.email AS supplier_email,
      s.phone AS supplier_phone,
      p.created_at,
      p.updated_at,
      CASE
        WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.quantity <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END AS stock_status
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
    WHERE p.product_id = $1;
  `;

  const { rows } = await query(sql, [id]);
  if (rows.length === 0) {
    throw new AppError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
  }

  return rows[0];
};

/**
 * Create a new product and record initial inventory transaction if quantity > 0
 */
const createProduct = async (productData, userId) => {
  const {
    product_name,
    sku,
    description = null,
    category = null,
    price,
    quantity = 0,
    reorder_level = 10,
    supplier_id = null,
  } = productData;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Insert product
    const insertProductSql = `
      INSERT INTO products (
        product_name, sku, description, category, price, quantity, reorder_level, supplier_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *;
    `;

    const productRes = await client.query(insertProductSql, [
      product_name,
      sku,
      description,
      category,
      price,
      quantity,
      reorder_level,
      supplier_id,
    ]);

    const newProduct = productRes.rows[0];

    // 2. If initial stock is greater than 0, record initial inventory transaction
    if (quantity > 0) {
      await client.query(`
        INSERT INTO inventory_transactions (
          product_id, user_id, quantity_changed, transaction_type, reason
        ) VALUES ($1, $2, $3, 'STOCK_IN', 'Initial stock on product creation');
      `, [newProduct.product_id, userId, quantity]);
    }

    await client.query('COMMIT');
    return newProduct;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update product information
 */
const updateProduct = async (id, productData) => {
  const {
    product_name,
    description,
    category,
    price,
    reorder_level,
    supplier_id,
  } = productData;

  const sql = `
    UPDATE products
    SET 
      product_name = COALESCE($1, product_name),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      price = COALESCE($4, price),
      reorder_level = COALESCE($5, reorder_level),
      supplier_id = COALESCE($6, supplier_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE product_id = $7
    RETURNING *;
  `;

  const { rows } = await query(sql, [
    product_name,
    description,
    category,
    price,
    reorder_level,
    supplier_id,
    id,
  ]);

  if (rows.length === 0) {
    throw new AppError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
  }

  return rows[0];
};

/**
 * Toggle product active status (soft deactivation/reactivation)
 */
const toggleProductStatus = async (id, isActive) => {
  const sql = `
    UPDATE products
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = $2
    RETURNING product_id, product_name, sku, is_active, updated_at;
  `;

  const { rows } = await query(sql, [isActive, id]);
  if (rows.length === 0) {
    throw new AppError(`Product with ID ${id} not found.`, 404, 'PRODUCT_NOT_FOUND');
  }

  return rows[0];
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
};
