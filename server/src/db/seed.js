const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Seed database with realistic initial data
 */
const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('[Seed] Seeding database with initial data...');
    await client.query('BEGIN');

    // 1. Clear existing data in reverse dependency order
    await client.query('TRUNCATE inventory_transactions, order_items, orders, products, customers, suppliers, users RESTART IDENTITY CASCADE;');

    // 2. Seed Users
    const saltRounds = 10;
    const adminPasswordHash = bcrypt.hashSync('Admin@123', saltRounds);
    const staffPasswordHash = bcrypt.hashSync('Staff@123', saltRounds);

    const userResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('System Administrator', 'admin@storeops.local', $1, 'admin'),
      ('Alex Turner (Staff)', 'staff@storeops.local', $2, 'staff')
      RETURNING user_id, email, role;
    `, [adminPasswordHash, staffPasswordHash]);

    const adminUser = userResult.rows.find((u) => u.role === 'admin');
    const staffUser = userResult.rows.find((u) => u.role === 'staff');
    console.log(`[Seed] Seeded ${userResult.rowCount} users (admin, staff).`);

    // 3. Seed Suppliers
    const supplierResult = await client.query(`
      INSERT INTO suppliers (supplier_name, email, phone, address) VALUES
      ('TechLogix Wholesale', 'orders@techlogix.com', '+1-555-0101', '100 Silicon Way, San Jose, CA'),
      ('Apex Office Supplies', 'supply@apexoffice.com', '+1-555-0102', '45 Commercial Blvd, Chicago, IL'),
      ('Global Components Co', 'sales@globalcomponents.com', '+1-555-0103', '78 Industrial Pkwy, Austin, TX'),
      ('Prime Retail Distributors', 'contact@primeretail.com', '+1-555-0104', '12 Harbour St, Seattle, WA')
      RETURNING supplier_id, supplier_name;
    `);
    const suppliers = supplierResult.rows;
    console.log(`[Seed] Seeded ${supplierResult.rowCount} suppliers.`);

    // 4. Seed Products (including low-stock products for testing low-stock alerts)
    const productResult = await client.query(`
      INSERT INTO products (product_name, sku, description, category, price, quantity, reorder_level, supplier_id, is_active) VALUES
      ('Wireless Ergonomic Mouse', 'SKU-ELEC-001', '2.4GHz wireless optical mouse with ergonomic grip', 'Electronics', 29.99, 45, 10, $1, TRUE),
      ('Mechanical Gaming Keyboard', 'SKU-ELEC-002', 'RGB backlit mechanical keyboard with blue switches', 'Electronics', 79.99, 3, 10, $1, TRUE),
      ('Ultra-Slim USB-C Hub 7-in-1', 'SKU-ELEC-003', 'Multiport adapter with HDMI, USB 3.0, and SD reader', 'Electronics', 39.50, 28, 8, $1, TRUE),
      ('High-Speed HDMI 2.1 Cable 2m', 'SKU-ELEC-004', '8K 60Hz ultra high speed braided HDMI cable', 'Electronics', 14.99, 4, 15, $3, TRUE),
      ('Heavy Duty Executive Chair', 'SKU-FURN-001', 'High-back mesh ergonomic office chair with lumbar support', 'Furniture', 189.00, 12, 5, $2, TRUE),
      ('Adjustable Standing Desk Riser', 'SKU-FURN-002', 'Dual tier tabletop workstation riser', 'Furniture', 149.99, 8, 5, $2, TRUE),
      ('Recycled Copier Paper A4 (500 Sheets)', 'SKU-OFFC-001', 'Standard white 80gsm printing paper ream', 'Office Supplies', 6.50, 120, 30, $2, TRUE),
      ('Gel Ink Rollerball Pens (Pack of 12)', 'SKU-OFFC-002', 'Smooth flow 0.5mm black ink pens', 'Office Supplies', 11.20, 85, 20, $2, TRUE),
      ('Heavy-Duty Metal Hole Punch', 'SKU-OFFC-003', '2-hole steel puncher with paper guide', 'Office Supplies', 18.00, 15, 8, $4, TRUE),
      ('Noise Cancelling Over-Ear Headphones', 'SKU-AUD-001', 'Active noise cancellation bluetooth headset', 'Audio', 129.99, 22, 5, $4, TRUE)
      RETURNING product_id, product_name, sku, price, quantity, reorder_level;
    `, [suppliers[0].supplier_id, suppliers[1].supplier_id, suppliers[2].supplier_id, suppliers[3].supplier_id]);

    const products = productResult.rows;
    console.log(`[Seed] Seeded ${productResult.rowCount} products (including 2 low-stock products).`);

    // 5. Seed Initial Stock-In Inventory Transactions
    for (const prod of products) {
      await client.query(`
        INSERT INTO inventory_transactions (product_id, user_id, quantity_changed, transaction_type, reason)
        VALUES ($1, $2, $3, 'STOCK_IN', 'Initial warehouse stock onboarding');
      `, [prod.product_id, adminUser.user_id, prod.quantity]);
    }
    console.log(`[Seed] Seeded ${products.length} initial STOCK_IN inventory transactions.`);

    // 6. Seed Customers
    const customerResult = await client.query(`
      INSERT INTO customers (customer_name, email, phone) VALUES
      ('Alice Johnson', 'alice.johnson@example.com', '+1-555-1101'),
      ('Bob Smith', 'bob.smith@example.com', '+1-555-1102'),
      ('Carol Davis', 'carol.davis@example.com', '+1-555-1103'),
      ('David Miller', 'david.miller@example.com', '+1-555-1104'),
      ('Emma Wilson', 'emma.wilson@example.com', '+1-555-1105')
      RETURNING customer_id, customer_name;
    `);
    const customers = customerResult.rows;
    console.log(`[Seed] Seeded ${customerResult.rowCount} customers.`);

    // 7. Seed Initial Sample Orders (1 COMPLETED, 1 PLACED, 1 CANCELLED)
    // Order 1: COMPLETED
    const order1Items = [
      { product: products[0], qty: 2 }, // Mouse ($29.99 * 2 = 59.98)
      { product: products[2], qty: 1 }, // Hub ($39.50 * 1 = 39.50)
    ];
    const order1Total = 59.98 + 39.50; // 99.48

    const order1Res = await client.query(`
      INSERT INTO orders (customer_id, total_amount, status, created_by)
      VALUES ($1, $2, 'COMPLETED', $3) RETURNING order_id;
    `, [customers[0].customer_id, order1Total, staffUser.user_id]);
    const order1Id = order1Res.rows[0].order_id;

    for (const item of order1Items) {
      const subtotal = (item.product.price * item.qty).toFixed(2);
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5);
      `, [order1Id, item.product.product_id, item.qty, item.product.price, subtotal]);

      await client.query(`
        INSERT INTO inventory_transactions (product_id, user_id, quantity_changed, transaction_type, reference_id, reason)
        VALUES ($1, $2, $3, 'STOCK_OUT', $4, 'Order fulfillment');
      `, [item.product.product_id, staffUser.user_id, -item.qty, order1Id]);
    }

    // Order 2: PLACED
    const order2Items = [
      { product: products[6], qty: 5 }, // Paper ($6.50 * 5 = 32.50)
      { product: products[7], qty: 2 }, // Pens ($11.20 * 2 = 22.40)
    ];
    const order2Total = 32.50 + 22.40; // 54.90

    const order2Res = await client.query(`
      INSERT INTO orders (customer_id, total_amount, status, created_by)
      VALUES ($1, $2, 'PLACED', $3) RETURNING order_id;
    `, [customers[1].customer_id, order2Total, adminUser.user_id]);
    const order2Id = order2Res.rows[0].order_id;

    for (const item of order2Items) {
      const subtotal = (item.product.price * item.qty).toFixed(2);
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5);
      `, [order2Id, item.product.product_id, item.qty, item.product.price, subtotal]);

      await client.query(`
        INSERT INTO inventory_transactions (product_id, user_id, quantity_changed, transaction_type, reference_id, reason)
        VALUES ($1, $2, $3, 'STOCK_OUT', $4, 'Order placed');
      `, [item.product.product_id, adminUser.user_id, -item.qty, order2Id]);
    }

    // Order 3: CANCELLED (Ordered then cancelled with stock restored)
    const order3Res = await client.query(`
      INSERT INTO orders (customer_id, total_amount, status, created_by)
      VALUES ($1, 79.99, 'CANCELLED', $2) RETURNING order_id;
    `, [customers[2].customer_id, staffUser.user_id]);
    const order3Id = order3Res.rows[0].order_id;

    await client.query(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
      VALUES ($1, $2, 1, 79.99, 79.99);
    `, [order3Id, products[1].product_id]);

    await client.query(`
      INSERT INTO inventory_transactions (product_id, user_id, quantity_changed, transaction_type, reference_id, reason)
      VALUES ($1, $2, -1, 'STOCK_OUT', $3, 'Order placed');
    `, [products[1].product_id, staffUser.user_id, order3Id]);

    await client.query(`
      INSERT INTO inventory_transactions (product_id, user_id, quantity_changed, transaction_type, reference_id, reason)
      VALUES ($1, $2, 1, 'ORDER_CANCELLATION', $3, 'Order cancelled by customer');
    `, [products[1].product_id, adminUser.user_id, order3Id]);

    console.log('[Seed] Seeded 3 initial sample orders (COMPLETED, PLACED, CANCELLED) with line items.');

    await client.query('COMMIT');
    console.log('[Seed] Database seeding finished successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed Error]: Seeding failed, transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
