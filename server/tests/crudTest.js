/**
 * Master Data CRUD Test Suite
 * Validates all test cases in docs/TESTING.md Section 2 (Product, Supplier, Customer Testing).
 */

const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const PORT = 5056;
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

const runCrudTests = async () => {
  console.log('==============================================');
  console.log('   StoreOps Phase 4: Core CRUD Tests          ');
  console.log('==============================================\n');

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
    // 1. Authenticate admin & staff
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

    // 2. Fetch existing suppliers to get a valid supplier_id
    const suppliersRes = await request({
      method: 'GET',
      path: '/suppliers',
      token: staffToken,
    });
    assert('List suppliers (staff accessible)', suppliersRes.status === 200 && suppliersRes.data.data.suppliers.length > 0);
    const supplierId = suppliersRes.data.data.suppliers[0].supplier_id;

    // 3. Test Product Creation: Valid product (Admin)
    const testSku = `SKU-TEST-${Date.now()}`;
    const createProdRes = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Test Bluetooth Speaker',
        sku: testSku,
        category: 'Audio',
        price: 49.99,
        quantity: 15,
        reorder_level: 5,
        supplier_id: supplierId,
        description: 'Portable waterproof bluetooth speaker',
      },
    });
    assert('Add valid product (Admin)', createProdRes.status === 201 && createProdRes.data.data.product.sku === testSku);
    const createdProductId = createProdRes.data?.data?.product?.product_id;

    // 4. Test Product Creation: Staff attempt (Should fail with 403 Forbidden)
    const staffCreateRes = await request({
      method: 'POST',
      path: '/products',
      token: staffToken,
      body: {
        product_name: 'Unauthorized Product',
        sku: `SKU-UNAUTH-${Date.now()}`,
        price: 10,
        quantity: 5,
      },
    });
    assert('Staff blocked from adding product (403 Forbidden)', staffCreateRes.status === 403 && staffCreateRes.data.error.code === 'FORBIDDEN_ROLE');

    // 5. Test Product Creation: Duplicate SKU (Should fail with 409 Conflict)
    const dupSkuRes = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Duplicate SKU Product',
        sku: testSku,
        price: 30,
        quantity: 10,
      },
    });
    assert('Add duplicate SKU rejected (409 Conflict)', dupSkuRes.status === 409 && dupSkuRes.data.error.code === 'DUPLICATE_RESOURCE');

    // 6. Test Product Creation: Negative price (Validation error 400)
    const negPriceRes = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Negative Price Product',
        sku: `SKU-NEG-${Date.now()}`,
        price: -15.5,
        quantity: 10,
      },
    });
    assert('Add product with negative price rejected (400 Bad Request)', negPriceRes.status === 400 && negPriceRes.data.error.code === 'INVALID_PRICE');

    // 7. Test Product Creation: Negative quantity (Validation error 400)
    const negQtyRes = await request({
      method: 'POST',
      path: '/products',
      token: adminToken,
      body: {
        product_name: 'Negative Qty Product',
        sku: `SKU-NEG-QTY-${Date.now()}`,
        price: 19.99,
        quantity: -5,
      },
    });
    assert('Add product with negative quantity rejected (400 Bad Request)', negQtyRes.status === 400 && negQtyRes.data.error.code === 'INVALID_QUANTITY');

    // 8. Test Product Update (Admin)
    const updateProdRes = await request({
      method: 'PUT',
      path: `/products/${createdProductId}`,
      token: adminToken,
      body: {
        product_name: 'Updated Bluetooth Speaker Pro',
        sku: testSku,
        price: 59.99,
        reorder_level: 8,
      },
    });
    assert('Update product changes persisted (200 OK)', updateProdRes.status === 200 && updateProdRes.data.data.product.product_name === 'Updated Bluetooth Speaker Pro' && Number(updateProdRes.data.data.product.price) === 59.99);

    // 9. Test Product Search by SKU
    const searchRes = await request({
      method: 'GET',
      path: `/products?search=${testSku}`,
      token: staffToken,
    });
    assert('Search product by SKU returns matching product', searchRes.status === 200 && searchRes.data.data.products.some((p) => p.sku === testSku));

    // 10. Test Deactivate Product (Soft Deactivation: is_active = false)
    const deactRes = await request({
      method: 'PATCH',
      path: `/products/${createdProductId}/status`,
      token: adminToken,
      body: { is_active: false },
    });
    assert('Deactivate product updates is_active to false', deactRes.status === 200 && deactRes.data.data.product.is_active === false);

    // 11. Test Reactivate Product (is_active = true)
    const reactRes = await request({
      method: 'PATCH',
      path: `/products/${createdProductId}/status`,
      token: adminToken,
      body: { is_active: true },
    });
    assert('Reactivate product updates is_active to true', reactRes.status === 200 && reactRes.data.data.product.is_active === true);

    // 12. Test Supplier Details with Product Association Count
    const suppDetailRes = await request({
      method: 'GET',
      path: `/suppliers/${supplierId}`,
      token: staffToken,
    });
    assert('Supplier details include associated products list and count', suppDetailRes.status === 200 && Array.isArray(suppDetailRes.data.data.supplier.products));

    // 13. Test Customer Creation & Listing
    const custEmail = `customer_${Date.now()}@example.com`;
    const createCustRes = await request({
      method: 'POST',
      path: '/customers',
      token: staffToken,
      body: {
        customer_name: 'Test Valued Customer',
        email: custEmail,
        phone: '+1-555-9988',
      },
    });
    assert('Create customer (Staff permitted)', createCustRes.status === 201 && createCustRes.data.data.customer.email === custEmail);
    const newCustId = createCustRes.data?.data?.customer?.customer_id;

    // 14. Test Customer Details with Order History
    const custDetailRes = await request({
      method: 'GET',
      path: `/customers/${newCustId}`,
      token: staffToken,
    });
    assert('Customer details include orders array', custDetailRes.status === 200 && Array.isArray(custDetailRes.data.data.customer.orders));

    console.log(`\nResults: ${passed} / ${total} tests passed.`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await pool.end();
  }
};

runCrudTests();
