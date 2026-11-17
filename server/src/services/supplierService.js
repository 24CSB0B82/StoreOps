const { query } = require('../config/db');
const { AppError } = require('../utils/apiResponse');

/**
 * List all suppliers with product counts
 */
const getSuppliers = async ({ search = '' }) => {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    conditions.push('(s.supplier_name ILIKE $1 OR s.email ILIKE $1 OR s.phone ILIKE $1)');
    params.push(`%${search.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      s.supplier_id,
      s.supplier_name,
      s.email,
      s.phone,
      s.address,
      s.created_at,
      COUNT(p.product_id)::INTEGER AS product_count
    FROM suppliers s
    LEFT JOIN products p ON s.supplier_id = p.supplier_id
    ${whereClause}
    GROUP BY s.supplier_id
    ORDER BY s.supplier_name ASC;
  `;

  const { rows } = await query(sql, params);
  return rows;
};

/**
 * Get single supplier with associated products list
 */
const getSupplierById = async (id) => {
  const supplierSql = `
    SELECT supplier_id, supplier_name, email, phone, address, created_at
    FROM suppliers
    WHERE supplier_id = $1;
  `;

  const supplierRes = await query(supplierSql, [id]);
  if (supplierRes.rows.length === 0) {
    throw new AppError(`Supplier with ID ${id} not found.`, 404, 'SUPPLIER_NOT_FOUND');
  }

  const supplier = supplierRes.rows[0];

  // Fetch associated products
  const productsSql = `
    SELECT product_id, product_name, sku, category, price, quantity, is_active
    FROM products
    WHERE supplier_id = $1
    ORDER BY product_name ASC;
  `;

  const productsRes = await query(productsSql, [id]);
  supplier.products = productsRes.rows;
  supplier.product_count = productsRes.rows.length;

  return supplier;
};

/**
 * Create a new supplier
 */
const createSupplier = async (supplierData) => {
  const { supplier_name, email = null, phone = null, address = null } = supplierData;

  const sql = `
    INSERT INTO suppliers (supplier_name, email, phone, address)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const { rows } = await query(sql, [supplier_name, email, phone, address]);
  return rows[0];
};

/**
 * Update an existing supplier
 */
const updateSupplier = async (id, supplierData) => {
  const { supplier_name, email, phone, address } = supplierData;

  const sql = `
    UPDATE suppliers
    SET 
      supplier_name = COALESCE($1, supplier_name),
      email = COALESCE($2, email),
      phone = COALESCE($3, phone),
      address = COALESCE($4, address)
    WHERE supplier_id = $5
    RETURNING *;
  `;

  const { rows } = await query(sql, [supplier_name, email, phone, address, id]);
  if (rows.length === 0) {
    throw new AppError(`Supplier with ID ${id} not found.`, 404, 'SUPPLIER_NOT_FOUND');
  }

  return rows[0];
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
};
