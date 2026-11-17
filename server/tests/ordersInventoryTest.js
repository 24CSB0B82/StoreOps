/**
 * Comprehensive Inventory, Order & ACID Transaction Test Suite
 * Validates docs/TESTING.md Sections 3, 4, and 5 (including Concurrency & Rollback).
 */

const http = require('http');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');

const PORT = 5057;
let server;

const request = ({ method, path, body = null, token = null }) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
    if (dataString) reqHeaders['Content-Length'] = Buffer.byteLength(dataString);

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path: `/api/v1${path}`,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
};

const runAllTests = async () => {
  console.log('===============================================================');
  console.log('  StoreOps Phase 5: Inventory, Orders & ACID Transaction Tests ');
  console.log('===============================================================\n');

  server = app.listen(PORT);
  let passed = 0;
  let total = 0;

  const assert = (description, condition) => {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${description}`);
    }
  };

  try {
    // 0. Authenticate Admin and Staff
    const adminAuth = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@storeops.local', password: 'Admin@123' },
    });
    const adminToken = adminAuth.data.data.token;

    const staffAuth = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'staff@storeops.local', password: 'Staff@123' },
    });
    const staffToken = staffAuth.data.data.token;

    // Fetch customer and product IDs
    const custRes = await request({ method: 'GET', path: '/customers', token: staffToken });
    const customerId = custRes.data.data.customers[0].customer_id;

    // Create a dedicated product for deterministic testing
    const testSku = `SKU-ORD-${Date.now()}`;
    const newProdRes = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Transactional Wireless Mouse',
        sku: testSku,
        category: 'Electronics',
        price: 25.0,
        quantity: 10,
        reorder_level: 3,
      },
    });
    const testProductId = newProdRes.data.data.product.product_id;

    console.log('\n--- Section 3: Inventory Testing ---');

    // Test 3.1: Add stock via adjustment (Admin)
    const addStockRes = await request({
      method: 'POST',
      path: '/inventory/adjustments',
      token: adminToken,
      body: { product_id: testProductId, quantity_changed: 5, transaction_type: 'STOCK_IN', reason: 'Supplier delivery' },
    });
    assert('Add stock increases quantity (10 -> 15)', addStockRes.status === 200 && addStockRes.data.data.product.quantity === 15);

    // Test 3.2: Remove stock within available quantity
    const remStockRes = await request({
      method: 'POST',
      path: '/inventory/adjustments',
      token: adminToken,
      body: { product_id: testProductId, quantity_changed: -3, transaction_type: 'ADJUSTMENT', reason: 'Damaged packaging' },
    });
    assert('Remove stock decreases quantity (15 -> 12)', remStockRes.status === 200 && remStockRes.data.data.product.quantity === 12);

    // Test 3.3: Remove more than available quantity (Should fail with 400)
    const excessDeductRes = await request({
      method: 'POST',
      path: '/inventory/adjustments',
      token: adminToken,
      body: { product_id: testProductId, quantity_changed: -20, transaction_type: 'ADJUSTMENT' },
    });
    assert('Remove more than available quantity rejected (400)', excessDeductRes.status === 400 && excessDeductRes.data.error.code === 'INSUFFICIENT_STOCK');

    // Test 3.4: Staff attempts inventory adjustment (Should fail with 403 Forbidden)
    const staffAdjRes = await request({
      method: 'POST',
      path: '/inventory/adjustments',
      token: staffToken,
      body: { product_id: testProductId, quantity_changed: 2 },
    });
    assert('Staff blocked from adjusting stock (403 Forbidden)', staffAdjRes.status === 403 && staffAdjRes.data.error.code === 'FORBIDDEN_ROLE');

    // Test 3.5: View low-stock products
    const lowStockRes = await request({ method: 'GET', path: '/inventory/low-stock', token: staffToken });
    assert('View low-stock products returns low-stock items', lowStockRes.status === 200 && Array.isArray(lowStockRes.data.data.products));

    // Test 3.6: View inventory transactions audit history
    const txHistoryRes = await request({ method: 'GET', path: `/inventory/transactions?product_id=${testProductId}`, token: staffToken });
    assert('Inventory transactions recorded in audit history', txHistoryRes.status === 200 && txHistoryRes.data.data.transactions.length >= 3);

    console.log('\n--- Section 4: Order Management Testing ---');

    // Test 4.1: Place order with nonexistent customer
    const badCustRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: 999999, items: [{ product_id: testProductId, quantity: 1 }] },
    });
    assert('Place order for nonexistent customer rejected (404)', badCustRes.status === 404 && badCustRes.data.error.code === 'CUSTOMER_NOT_FOUND');

    // Test 4.2: Place order with invalid/zero quantity
    const badQtyRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 0 }] },
    });
    assert('Place order with invalid quantity rejected (400)', badQtyRes.status === 400 && badQtyRes.data.error.code === 'INVALID_QUANTITY');

    // Test 4.3: Place valid order (Stock is currently 12; order 2 units)
    const validOrderRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 2 }] },
    });
    assert('Place valid order succeeds (201 Created)', validOrderRes.status === 201 && validOrderRes.data.data.order.status === 'PLACED');
    const createdOrderId = validOrderRes.data.data.order.order_id;

    // Test 4.4: Verify stock deducted (12 -> 10)
    const checkStock1 = await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken });
    assert('Stock correctly deducted from products table (12 -> 10)', checkStock1.data.data.product.quantity === 10);

    // Test 4.5: Place order with insufficient stock (Order 20 units when only 10 available)
    const overOrderRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 20 }] },
    });
    assert('Place order with insufficient stock rejected (409 Conflict)', overOrderRes.status === 409 && overOrderRes.data.error.code === 'INSUFFICIENT_STOCK');

    // Test 4.6: Place order with inactive product
    await request({ method: 'PATCH', path: `/products/${testProductId}/status`, token: adminToken, body: { is_active: false } });
    const inactiveOrderRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 1 }] },
    });
    assert('Place order with inactive product rejected (400 Bad Request)', inactiveOrderRes.status === 400 && inactiveOrderRes.data.error.code === 'INACTIVE_PRODUCT');
    // Reactivate for subsequent tests
    await request({ method: 'PATCH', path: `/products/${testProductId}/status`, token: adminToken, body: { is_active: true } });

    // Test 4.7: Cancel order & verify stock restoration
    const cancelRes = await request({
      method: 'POST',
      path: `/orders/${createdOrderId}/cancel`,
      token: adminToken,
    });
    assert('Cancel eligible order succeeds and marks status CANCELLED', cancelRes.status === 200 && cancelRes.data.data.order.status === 'CANCELLED');

    const checkStock2 = await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken });
    assert('Stock restored to inventory on cancellation (10 -> 12)', checkStock2.data.data.product.quantity === 12);

    // Test 4.8: Cancel the same order twice (Should fail with 409 Conflict)
    const doubleCancelRes = await request({
      method: 'POST',
      path: `/orders/${createdOrderId}/cancel`,
      token: adminToken,
    });
    assert('Double cancellation rejected (409 Conflict - stock restored only once)', doubleCancelRes.status === 409 && doubleCancelRes.data.error.code === 'ORDER_ALREADY_CANCELLED');

    const checkStock3 = await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken });
    assert('Stock remained 12 after rejected second cancellation attempt', checkStock3.data.data.product.quantity === 12);

    // Test 4.9: Complete an order (PLACED -> COMPLETED)
    const newOrderForComplete = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 1 }] },
    });
    const orderIdToComplete = newOrderForComplete.data.data.order.order_id;

    const completeRes = await request({
      method: 'PATCH',
      path: `/orders/${orderIdToComplete}/status`,
      token: staffToken,
      body: { status: 'COMPLETED' },
    });
    assert('Complete a placed order updates status to COMPLETED', completeRes.status === 200 && completeRes.data.data.order.status === 'COMPLETED');

    // Test 4.10: Attempt to cancel a completed order (Should fail)
    const cancelCompletedRes = await request({
      method: 'POST',
      path: `/orders/${orderIdToComplete}/cancel`,
      token: adminToken,
    });
    assert('Attempt to cancel a completed order rejected (400)', cancelCompletedRes.status === 400 && cancelCompletedRes.data.error.code === 'CANNOT_CANCEL_COMPLETED');

    console.log('\n--- Section 5: Mandatory Database Transaction Testing ---');

    // -------------------------------------------------------------
    // Test A: Order Rollback (Simulate transaction failure)
    // -------------------------------------------------------------
    const stockBeforeRollback = (await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken })).data.data.product.quantity;
    const ordersCountBefore = (await request({ method: 'GET', path: '/orders', token: staffToken })).data.data.pagination.total;

    // Send order with 1 valid product and 1 non-existent product (ID: 999999)
    const rollbackRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: {
        customer_id: customerId,
        items: [
          { product_id: testProductId, quantity: 2 },
          { product_id: 999999, quantity: 1 },
        ],
      },
    });

    const stockAfterRollback = (await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken })).data.data.product.quantity;
    const ordersCountAfter = (await request({ method: 'GET', path: '/orders', token: staffToken })).data.data.pagination.total;

    assert('Test A: Failed multi-item order aborted with 404', rollbackRes.status === 404);
    assert('Test A: Rollback confirmed - stock of valid item was NOT deducted', stockAfterRollback === stockBeforeRollback);
    assert('Test A: Rollback confirmed - no partial order record was saved', ordersCountAfter === ordersCountBefore);

    // -------------------------------------------------------------
    // Test B: Concurrent Ordering (Assume 5 in stock; 2 concurrent orders for 4 units each)
    // -------------------------------------------------------------
    console.log('\nExecuting Test B: Concurrency Stress Test...');
    // Set stock to exactly 5 units
    const currentStock = (await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken })).data.data.product.quantity;
    await request({
      method: 'POST',
      path: '/inventory/adjustments',
      token: adminToken,
      body: { product_id: testProductId, quantity_changed: 5 - currentStock, reason: 'Reset stock to 5 for concurrency test' },
    });

    const stockCheck = (await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken })).data.data.product.quantity;
    console.log(`Starting stock level: ${stockCheck} units`);

    // Fire TWO concurrent order requests for 4 units each simultaneously
    const orderPromise1 = request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 4 }] },
    });

    const orderPromise2 = request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: { customer_id: customerId, items: [{ product_id: testProductId, quantity: 4 }] },
    });

    const [res1, res2] = await Promise.all([orderPromise1, orderPromise2]);

    const successCount = (res1.status === 201 ? 1 : 0) + (res2.status === 201 ? 1 : 0);
    const conflictCount = (res1.status === 409 ? 1 : 0) + (res2.status === 409 ? 1 : 0);

    const finalStockRes = await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken });
    const finalStock = finalStockRes.data.data.product.quantity;

    assert('Test B: Exactly ONE concurrent order succeeded (201)', successCount === 1);
    assert('Test B: Competing concurrent order rejected due to insufficient stock (409)', conflictCount === 1);
    assert('Test B: Final inventory stock is exactly 1 (5 - 4 = 1; zero overselling)', finalStock === 1);

    // -------------------------------------------------------------
    // Test C: Cancellation Consistency for Multi-Item Order
    // -------------------------------------------------------------
    console.log('\nExecuting Test C: Multi-item Cancellation Consistency...');
    // Create product 2
    const prod2Res = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Secondary Test Item',
        sku: `SKU-SEC-${Date.now()}`,
        price: 15.0,
        quantity: 8,
      },
    });
    const prod2Id = prod2Res.data.data.product.product_id;

    // Place multi-item order: 1 unit of product 1, 3 units of product 2
    const multiOrderRes = await request({
      method: 'POST',
      path: '/orders',
      token: staffToken,
      body: {
        customer_id: customerId,
        items: [
          { product_id: testProductId, quantity: 1 },
          { product_id: prod2Id, quantity: 3 },
        ],
      },
    });
    const multiOrderId = multiOrderRes.data.data.order.order_id;

    // Cancel the multi-item order
    const multiCancelRes = await request({
      method: 'POST',
      path: `/orders/${multiOrderId}/cancel`,
      token: adminToken,
    });
    assert('Test C: Multi-item cancellation succeeded', multiCancelRes.status === 200 && multiCancelRes.data.data.order.status === 'CANCELLED');

    // Verify stock of both products was fully restored
    const p1AfterCancel = (await request({ method: 'GET', path: `/products/${testProductId}`, token: staffToken })).data.data.product.quantity;
    const p2AfterCancel = (await request({ method: 'GET', path: `/products/${prod2Id}`, token: staffToken })).data.data.product.quantity;

    assert('Test C: Product 1 stock restored back to 1', p1AfterCancel === 1);
    assert('Test C: Product 2 stock restored back to 8', p2AfterCancel === 8);

    console.log(`\nResults: ${passed} / ${total} tests passed.`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await pool.end();
  }
};

runAllTests();
