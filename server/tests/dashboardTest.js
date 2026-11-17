/**
 * Dashboard & SQL Aggregation Reporting Test Suite
 * Validates docs/TESTING.md Section 6.
 */

const http = require('http');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');

const PORT = 5058;
let server;

const request = ({ method, path, token = null }) => {
  return new Promise((resolve, reject) => {
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

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
    req.end();
  });
};

const runDashboardTests = async () => {
  console.log('==================================================');
  console.log('  StoreOps Phase 6: Dashboard & SQL Reports Tests  ');
  console.log('==================================================\n');

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
    // 1. Authenticate user
    const authRes = await new Promise((resolve) => {
      const postData = JSON.stringify({ email: 'admin@storeops.local', password: 'Admin@123' });
      const req = http.request(
        {
          host: '127.0.0.1',
          port: PORT,
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve(JSON.parse(b)));
        }
      );
      req.write(postData);
      req.end();
    });
    const token = authRes.data.token;

    // 2. Query database directly for ground truth
    const [dbProducts, dbCustomers, dbOrders, dbSales, dbLowStock] = await Promise.all([
      query('SELECT COUNT(*)::INTEGER AS count FROM products WHERE is_active = TRUE;'),
      query('SELECT COUNT(*)::INTEGER AS count FROM customers;'),
      query('SELECT COUNT(*)::INTEGER AS count FROM orders;'),
      query("SELECT COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS sales FROM orders WHERE status != 'CANCELLED';"),
      query('SELECT COUNT(*)::INTEGER AS count FROM products WHERE is_active = TRUE AND quantity <= reorder_level;'),
    ]);

    const groundTruth = {
      products: dbProducts.rows[0].count,
      customers: dbCustomers.rows[0].count,
      orders: dbOrders.rows[0].count,
      sales: dbSales.rows[0].sales,
      lowStock: dbLowStock.rows[0].count,
    };

    // 3. Test Dashboard Summary endpoint
    const summaryRes = await request({ method: 'GET', path: '/dashboard/summary', token });
    assert('Dashboard summary returns 200 OK', summaryRes.status === 200);

    const s = summaryRes.data.data;
    assert(`Product count matches database (${s.total_products} === ${groundTruth.products})`, s.total_products === groundTruth.products);
    assert(`Customer count matches database (${s.total_customers} === ${groundTruth.customers})`, s.total_customers === groundTruth.customers);
    assert(`Order count matches database (${s.total_orders} === ${groundTruth.orders})`, s.total_orders === groundTruth.orders);
    assert(`Sales total matches database and excludes cancelled orders ($${s.total_sales} === $${groundTruth.sales})`, Number(s.total_sales) === Number(groundTruth.sales));
    assert(`Low-stock count matches database (${s.low_stock_count} === ${groundTruth.lowStock})`, s.low_stock_count === groundTruth.lowStock);
    assert('Inventory valuation calculated and positive', Number(s.inventory_valuation) > 0);

    // 4. Test Top-Selling Products endpoint
    const topProdRes = await request({ method: 'GET', path: '/dashboard/top-products?limit=5', token });
    assert('Top-selling products returns 200 OK', topProdRes.status === 200);
    const topProducts = topProdRes.data.data.topProducts;
    assert('Top products array returned', Array.isArray(topProducts) && topProducts.length > 0);

    // Verify ordering is descending by quantity sold
    let isDescending = true;
    for (let i = 0; i < topProducts.length - 1; i++) {
      if (topProducts[i].total_quantity_sold < topProducts[i + 1].total_quantity_sold) {
        isDescending = false;
        break;
      }
    }
    assert('Top-selling products correctly sorted descending by units sold', isDescending);

    // 5. Test Recent Orders endpoint
    const recentRes = await request({ method: 'GET', path: '/dashboard/recent-orders?limit=5', token });
    assert('Recent orders returns 200 OK', recentRes.status === 200);
    const recentOrders = recentRes.data.data.recentOrders;
    assert('Recent orders array returned with customer name', Array.isArray(recentOrders) && recentOrders[0].customer_name !== undefined);

    // Verify ordering is descending by creation time
    let isDateDescending = true;
    for (let i = 0; i < recentOrders.length - 1; i++) {
      if (new Date(recentOrders[i].created_at) < new Date(recentOrders[i + 1].created_at)) {
        isDateDescending = false;
        break;
      }
    }
    assert('Recent orders sorted by creation time descending', isDateDescending);

    // 6. Test Monthly Sales endpoint
    const monthlyRes = await request({ method: 'GET', path: '/dashboard/monthly-sales', token });
    assert('Monthly sales returns 200 OK', monthlyRes.status === 200);
    assert('Monthly sales contains aggregated date buckets', Array.isArray(monthlyRes.data.data.monthlySales));

    console.log(`\nResults: ${passed} / ${total} tests passed.`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await pool.end();
  }
};

runDashboardTests();
