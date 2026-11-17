const { query, getClient } = require('../config/db');
const { AppError } = require('../utils/apiResponse');

/**
 * Creates a new customer order inside an ACID PostgreSQL transaction.
 * Uses SELECT ... FOR UPDATE with ascending ID sorting to prevent race conditions and deadlocks.
 */
const createOrder = async ({ customer_id, items }, userId) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify customer exists
    const customerRes = await client.query(
      'SELECT customer_id, customer_name FROM customers WHERE customer_id = $1;',
      [customer_id]
    );

    if (customerRes.rows.length === 0) {
      throw new AppError(`Customer with ID ${customer_id} does not exist.`, 404, 'CUSTOMER_NOT_FOUND');
    }
    const customer = customerRes.rows[0];

    // 2. Deadlock Prevention: Sort requested product IDs in ascending numerical order
    const sortedProductIds = [...items.map((i) => i.product_id)].sort((a, b) => a - b);

    // 3. Lock product rows using SELECT ... FOR UPDATE
    const productsRes = await client.query(
      `SELECT product_id, product_name, price, quantity, is_active 
       FROM products 
       WHERE product_id = ANY($1) 
       ORDER BY product_id ASC 
       FOR UPDATE;`,
      [sortedProductIds]
    );

    const lockedProductsMap = new Map();
    for (const prod of productsRes.rows) {
      lockedProductsMap.set(prod.product_id, prod);
    }

    // 4. Validate all products exist, are active, and have sufficient stock
    const itemMap = new Map();
    for (const item of items) {
      itemMap.set(item.product_id, item.quantity);
    }

    let calculatedTotal = 0;
    const validatedLineItems = [];

    for (const [productId, requestedQty] of itemMap.entries()) {
      const product = lockedProductsMap.get(productId);

      if (!product) {
        throw new AppError(`Product with ID ${productId} does not exist.`, 404, 'PRODUCT_NOT_FOUND');
      }

      if (!product.is_active) {
        throw new AppError(
          `Product "${product.product_name}" (SKU: ${product.sku || productId}) is currently inactive and cannot be ordered.`,
          400,
          'INACTIVE_PRODUCT'
        );
      }

      if (product.quantity < requestedQty) {
        throw new AppError(
          `Insufficient stock for "${product.product_name}". Available: ${product.quantity}, Requested: ${requestedQty}.`,
          409,
          'INSUFFICIENT_STOCK'
        );
      }

      const unitPrice = Number(product.price);
      const subtotal = Number((unitPrice * requestedQty).toFixed(2));
      calculatedTotal += subtotal;

      validatedLineItems.push({
        product_id: productId,
        product_name: product.product_name,
        quantity: requestedQty,
        unit_price: unitPrice,
        subtotal,
      });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));

    // 5. Insert order header
    const insertOrderSql = `
      INSERT INTO orders (customer_id, total_amount, status, created_by)
      VALUES ($1, $2, 'PLACED', $3)
      RETURNING *;
    `;
    const orderRes = await client.query(insertOrderSql, [customer_id, calculatedTotal, userId]);
    const newOrder = orderRes.rows[0];

    // 6. Insert order items, decrement stock, and record inventory movements
    for (const lineItem of validatedLineItems) {
      // 6a. Insert order item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5);`,
        [newOrder.order_id, lineItem.product_id, lineItem.quantity, lineItem.unit_price, lineItem.subtotal]
      );

      // 6b. Deduct stock from products table
      await client.query(
        `UPDATE products 
         SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP 
         WHERE product_id = $2;`,
        [lineItem.quantity, lineItem.product_id]
      );

      // 6c. Record signed STOCK_OUT movement in inventory_transactions
      await client.query(
        `INSERT INTO inventory_transactions (
           product_id, user_id, quantity_changed, transaction_type, reference_id, reason
         ) VALUES ($1, $2, $3, 'STOCK_OUT', $4, 'Order placed');`,
        [lineItem.product_id, userId, -lineItem.quantity, newOrder.order_id]
      );
    }

    await client.query('COMMIT');

    newOrder.customer_name = customer.customer_name;
    newOrder.items = validatedLineItems;
    return newOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cancels an eligible order and restores inventory quantities in a single transaction.
 */
const cancelOrder = async (orderId, userId) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock and fetch order
    const orderRes = await client.query(
      'SELECT order_id, customer_id, total_amount, status FROM orders WHERE order_id = $1 FOR UPDATE;',
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new AppError(`Order with ID ${orderId} not found.`, 404, 'ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];

    // 2. Validate cancellation eligibility
    if (order.status === 'CANCELLED') {
      throw new AppError(`Order #${orderId} is already cancelled.`, 409, 'ORDER_ALREADY_CANCELLED');
    }

    if (order.status === 'COMPLETED') {
      throw new AppError(`Completed order #${orderId} cannot be cancelled.`, 400, 'CANNOT_CANCEL_COMPLETED');
    }

    // 3. Fetch line items
    const itemsRes = await client.query(
      'SELECT order_item_id, product_id, quantity FROM order_items WHERE order_id = $1;',
      [orderId]
    );
    const items = itemsRes.rows;

    // 4. Lock products in ascending order to prevent deadlocks
    const productIds = items.map((i) => i.product_id).sort((a, b) => a - b);
    await client.query(
      'SELECT product_id FROM products WHERE product_id = ANY($1) ORDER BY product_id ASC FOR UPDATE;',
      [productIds]
    );

    // 5. Restore stock and record ORDER_CANCELLATION movements
    for (const item of items) {
      await client.query(
        'UPDATE products SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2;',
        [item.quantity, item.product_id]
      );

      await client.query(
        `INSERT INTO inventory_transactions (
           product_id, user_id, quantity_changed, transaction_type, reference_id, reason
         ) VALUES ($1, $2, $3, 'ORDER_CANCELLATION', $4, 'Order cancelled by user');`,
        [item.product_id, userId, item.quantity, orderId]
      );
    }

    // 6. Update order status to CANCELLED
    const updateOrderRes = await client.query(
      `UPDATE orders 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = $1 
       RETURNING *;`,
      [orderId]
    );

    await client.query('COMMIT');
    return updateOrderRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Updates order status (e.g. PLACED -> COMPLETED)
 */
const updateOrderStatus = async (orderId, newStatus) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT order_id, status FROM orders WHERE order_id = $1 FOR UPDATE;',
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new AppError(`Order with ID ${orderId} not found.`, 404, 'ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];

    // Enforce valid transitions: only PLACED -> COMPLETED is supported here
    if (order.status === 'CANCELLED') {
      throw new AppError('Cannot update status of a cancelled order.', 400, 'INVALID_STATUS_TRANSITION');
    }

    if (order.status === 'COMPLETED') {
      throw new AppError('Order is already completed.', 400, 'ORDER_ALREADY_COMPLETED');
    }

    if (order.status === 'PLACED' && newStatus === 'COMPLETED') {
      const updateRes = await client.query(
        `UPDATE orders 
         SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
         WHERE order_id = $1 
         RETURNING *;`,
        [orderId]
      );
      await client.query('COMMIT');
      return updateRes.rows[0];
    }

    throw new AppError(
      `Transition from ${order.status} to ${newStatus} is not permitted.`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * List orders with search, status filtering, and pagination
 */
const getOrders = async ({ search = '', status = '', page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search && search.trim()) {
    // Check if search is numeric (Order ID)
    if (!isNaN(Number(search.trim()))) {
      conditions.push(`(o.order_id = $${paramIdx} OR c.customer_name ILIKE $${paramIdx + 1})`);
      params.push(Number(search.trim()), `%${search.trim()}%`);
      paramIdx += 2;
    } else {
      conditions.push(`c.customer_name ILIKE $${paramIdx}`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }
  }

  if (status && status.trim()) {
    conditions.push(`o.status = $${paramIdx}`);
    params.push(status.trim().toUpperCase());
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get count
  const countSql = `
    SELECT COUNT(*) 
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    ${whereClause};
  `;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].count, 10);

  // Fetch paginated orders
  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT 
      o.order_id,
      o.customer_id,
      c.customer_name,
      c.email AS customer_email,
      o.total_amount,
      o.status,
      o.created_by,
      u.name AS created_by_name,
      o.created_at,
      o.updated_at,
      COUNT(oi.order_item_id)::INTEGER AS item_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN users u ON o.created_by = u.user_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    ${whereClause}
    GROUP BY o.order_id, c.customer_id, u.user_id
    ORDER BY o.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const { rows: orders } = await query(dataSql, dataParams);

  return {
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get single order details with customer and line items
 */
const getOrderById = async (orderId) => {
  const orderSql = `
    SELECT 
      o.order_id,
      o.customer_id,
      c.customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      o.total_amount,
      o.status,
      o.created_by,
      u.name AS created_by_name,
      o.created_at,
      o.updated_at
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN users u ON o.created_by = u.user_id
    WHERE o.order_id = $1;
  `;

  const orderRes = await query(orderSql, [orderId]);
  if (orderRes.rows.length === 0) {
    throw new AppError(`Order with ID ${orderId} not found.`, 404, 'ORDER_NOT_FOUND');
  }

  const order = orderRes.rows[0];

  // Fetch line items
  const itemsSql = `
    SELECT 
      oi.order_item_id,
      oi.product_id,
      p.product_name,
      p.sku,
      oi.quantity,
      oi.unit_price,
      oi.subtotal
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.order_item_id ASC;
  `;

  const itemsRes = await query(itemsSql, [orderId]);
  order.items = itemsRes.rows;

  return order;
};

module.exports = {
  createOrder,
  cancelOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
};
