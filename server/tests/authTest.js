/**
 * Authentication Test Suite
 * Validates all test cases in docs/TESTING.md Section 1.
 */

const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const PORT = 5055;
let server;

// Helper to send HTTP requests to test server
const request = ({ method, path, body = null, headers = {} }) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path: `/api/v1${path}`,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runAuthTests = async () => {
  console.log('==============================================');
  console.log('   StoreOps Phase 3: Authentication Tests     ');
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
    // Test 1: Login with valid admin credentials
    const adminRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@storeops.local', password: 'Admin@123' },
    });
    assert('Login with valid admin credentials', adminRes.status === 200 && adminRes.data.data.token && adminRes.data.data.user.role === 'admin');
    const adminToken = adminRes.data?.data?.token;

    // Test 2: Verify password_hash is not returned in user payload
    assert('Password hash is omitted from response', adminRes.data?.data?.user?.password_hash === undefined);

    // Test 3: Login with valid staff credentials
    const staffRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'staff@storeops.local', password: 'Staff@123' },
    });
    assert('Login with valid staff credentials', staffRes.status === 200 && staffRes.data.data.token && staffRes.data.data.user.role === 'staff');
    const staffToken = staffRes.data?.data?.token;

    // Test 4: Login with incorrect password
    const badPassRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'admin@storeops.local', password: 'WrongPassword' },
    });
    assert('Login with incorrect password rejected with 401', badPassRes.status === 401 && badPassRes.data.error.code === 'INVALID_CREDENTIALS');

    // Test 5: Login with unknown email
    const unknownRes = await request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'ghost@storeops.local', password: 'AnyPassword' },
    });
    assert('Login with unknown email rejected with 401', unknownRes.status === 401 && unknownRes.data.error.code === 'INVALID_CREDENTIALS');

    // Test 6: Access protected /auth/me without JWT
    const noTokenRes = await request({
      method: 'GET',
      path: '/auth/me',
    });
    assert('Access protected API without JWT rejected with 401', noTokenRes.status === 401 && noTokenRes.data.error.code === 'MISSING_TOKEN');

    // Test 7: Access protected /auth/me with valid JWT
    const meRes = await request({
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Access /auth/me with valid JWT returns user profile', meRes.status === 200 && meRes.data.data.user.email === 'admin@storeops.local');

    // Test 8: Staff attempts admin-only operation
    const staffAdminRes = await request({
      method: 'GET',
      path: '/auth/admin-check',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert('Staff attempts admin-only operation rejected with 403 Forbidden', staffAdminRes.status === 403 && staffAdminRes.data.error.code === 'FORBIDDEN_ROLE');

    // Test 9: Admin performs admin-only operation
    const adminAdminRes = await request({
      method: 'GET',
      path: '/auth/admin-check',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Admin performs admin-only operation succeeds with 200', adminAdminRes.status === 200 && adminAdminRes.data.success === true);

    // Test 10: Logout endpoint
    const logoutRes = await request({
      method: 'POST',
      path: '/auth/logout',
    });
    assert('Logout request succeeds with 200', logoutRes.status === 200 && logoutRes.data.success === true);

    console.log(`\nResults: ${passed} / ${total} tests passed.`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    await pool.end();
  }
};

runAuthTests();
