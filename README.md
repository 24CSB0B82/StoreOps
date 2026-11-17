# StoreOps – Inventory & Order Management System

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18+-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15+-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

StoreOps is a centralized, production-grade Inventory and Order Management web application built for small-to-medium retail operations. It replaces manual spreadsheets and error-prone records with a transactional relational database engine, ensuring strict inventory consistency, preventing overselling via row-level locks, logging immutable stock movements, and providing real-time dashboard analytics powered by SQL aggregations.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema & ERD](#2-database-schema--erd)
3. [ACID Transactions & Concurrency Control](#3-acid-transactions--concurrency-control)
4. [Role-Based Access Control (RBAC)](#4-role-based-access-control-rbac)
5. [Backend REST API Specification](#5-backend-rest-api-specification)
6. [Frontend UI Specification (9 Pages)](#6-frontend-ui-specification-9-pages)
7. [Installation & Setup Guide](#7-installation--setup-guide)
8. [Automated Testing & Verification](#8-automated-testing--verification)
9. [Key Technical Decisions & Interview Highlights](#9-key-technical-decisions--interview-highlights)

---

## 1. Architecture Overview

StoreOps adheres strictly to a clean **3-Tier Architecture** with total decoupling between layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (React)                       │
│  - React Router (Protected & Role-Guarded Routes)                      │
│  - Axios Client (with Auth Bearer Interceptor & Error Normalization)   │
│  - State Management: AuthContext, Modular Services Layer               │
│  - Reusable UI: Metric Cards, Data Tables, Modal Dialogs, Badges       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / JSON REST API
┌────────────────────────────────────▼───────────────────────────────────┐
│                       APPLICATION TIER (Express.js)                    │
│  - Global Security Middleware: Helmet, CORS, Morgan Request Logger     │
│  - Route Handlers & Input Validators (Sanitization & Constraint checks)│
│  - Stateless JWT Authentication & Role-Based Access Control (RBAC)     │
│  - Controllers: Request parsing, standard JSON responses               │
│  - Services: Transaction orchestration, row-locking business logic     │
│  - Centralized Error Handler: Normalizes DB errors to HTTP 409/400/500 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Parameterized SQL / pg.Pool
┌────────────────────────────────────▼───────────────────────────────────┐
│                          DATA TIER (PostgreSQL)                        │
│  - 7 Normalized Relational Tables with Foreign Keys & Constraints      │
│  - Concurrency Control: Pessimistic Row Locking (SELECT ... FOR UPDATE)│
│  - Performance: B-Tree Indexes on foreign keys and filter columns      │
│  - Analytics Engine: High-performance SQL Aggregations (SUM, COUNT)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & ERD

The database schema consists of **7 normalized tables** with strict constraints and foreign keys:

```
  ┌─────────────┐               ┌──────────────┐
  │  suppliers  │               │    users     │
  └──────┬──────┘               └──────┬───────┘
         │ 1                           │ 1
         │ supplies                    │ creates/audits
         │ M                           │ M
  ┌──────▼──────┐               ┌──────▼───────┐
  │  products   │◀─┐         ┌─▶│    orders    │
  └──────┬──────┘  │         │  └──────┬───────┘
         │ 1       │ M     M │         │ 1
         │         └─────────┼─┐       │ contains
         │           order_items       │ M
         │ contains            │ └────▶┌──────────────┐
         │ history             └───────┤ customers    │
         │ M                           └──────────────┘
  ┌──────▼──────────────────┐
  │ inventory_transactions  │
  └─────────────────────────┘
```

### Table Specifications & Constraints

| Table | Primary Key | Key Columns & Constraints | Purpose |
|---|---|---|---|
| **`users`** | `user_id` | `email` (UNIQUE), `password_hash`, `role` (`admin`, `staff`) | Authentication & RBAC |
| **`suppliers`** | `supplier_id` | `supplier_name`, `email`, `phone`, `address` | Vendor catalog master |
| **`products`** | `product_id` | `sku` (UNIQUE), `price` (`CHECK >= 0`), `quantity` (`CHECK >= 0`), `reorder_level` (`CHECK >= 0`), `is_active` | Inventory catalog |
| **`customers`** | `customer_id` | `customer_name`, `email`, `phone` | Client directory |
| **`orders`** | `order_id` | `customer_id` (FK), `total_amount` (`CHECK >= 0`), `status` (`PLACED`, `COMPLETED`, `CANCELLED`), `created_by` (FK) | Order headers |
| **`order_items`** | `order_item_id` | `order_id` (FK CASCADE), `product_id` (FK RESTRICT), `quantity` (`CHECK > 0`), `unit_price`, `subtotal` | Line item purchase snapshot |
| **`inventory_transactions`** | `transaction_id` | `product_id` (FK), `user_id` (FK), `quantity_changed` (`CHECK <> 0`), `transaction_type` (`STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `ORDER_CANCELLATION`) | Immutable audit trail |

### Database Indexes for Fast Query Execution
- `products(product_name)`, `products(supplier_id)`, `products(category)`
- `orders(customer_id)`, `orders(status)`, `orders(created_at)`
- `order_items(order_id)`, `order_items(product_id)`
- Composite Index: `inventory_transactions(product_id, created_at DESC)` for instantaneous chronological audit lookups.

---

## 3. ACID Transactions & Concurrency Control

### Order Creation Workflow (`POST /api/v1/orders`)
```
Client Request
      │
      ▼
Acquire client from pg.Pool: const client = await pool.connect();
      │
      ▼
BEGIN TRANSACTION;
      │
      ├──▶ 1. Validate customer existence: SELECT * FROM customers WHERE customer_id = $1;
      │
      ├──▶ 2. Deadlock Avoidance: Sort requested product IDs ascending [1, 4, 9]
      │
      ├──▶ 3. Pessimistic Row Locking:
      │       SELECT product_id, product_name, price, quantity, is_active 
      │       FROM products WHERE product_id = ANY($1) 
      │       ORDER BY product_id ASC FOR UPDATE;
      │
      ├──▶ 4. Verify Stock & Status:
      │       - Are all products active? (Abort if is_active === false)
      │       - Is product.quantity >= requested_quantity? (Abort with 409 if insufficient)
      │
      ├──▶ 5. Authoritative Pricing: Calculate subtotal = db_price * quantity; total = SUM(subtotals)
      │
      ├──▶ 6. INSERT INTO orders (...) RETURNING order_id;
      │
      ├──▶ 7. For each line item:
      │       - INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal);
      │       - UPDATE products SET quantity = quantity - requested WHERE product_id = ...;
      │       - INSERT INTO inventory_transactions (..., quantity_changed = -qty, 'STOCK_OUT', ...);
      │
      ▼
COMMIT; ──▶ Release client ──▶ Return 201 Created
      │ (on error)
      ▼
ROLLBACK; ──▶ Release client ──▶ Return Standardized Error
```

### Order Cancellation & Restoration Workflow (`POST /api/v1/orders/:id/cancel`)
1. Starts transaction: `BEGIN`.
2. Locks order row: `SELECT * FROM orders WHERE order_id = $1 FOR UPDATE;`.
3. Verifies order is in `PLACED` status (rejects repeated cancellation requests with `409 Conflict`).
4. Locks associated products and restores quantities: `UPDATE products SET quantity = quantity + $qty`.
5. Logs positive `ORDER_CANCELLATION` audit entries in `inventory_transactions`.
6. Sets `status = 'CANCELLED'`.
7. Commits transaction: `COMMIT`.

---

## 4. Role-Based Access Control (RBAC)

| Resource / Endpoint | Staff Permissions | Administrator Permissions |
|---|:---:|:---:|
| User Login / Profile (`/auth/me`) | ✅ | ✅ |
| View Products, Suppliers, Customers | ✅ | ✅ |
| Create / Update Products | ❌ | ✅ |
| Soft Deactivate Products (`PATCH /products/:id/status`) | ❌ | ✅ |
| Create / Update Suppliers | ❌ | ✅ |
| Create / Update Customers | ✅ | ✅ |
| Create Customer Orders (`POST /orders`) | ✅ | ✅ |
| View Order History & Line Items | ✅ | ✅ |
| Complete Order (`PLACED` → `COMPLETED`) | ✅ | ✅ |
| Cancel Order & Restore Stock (`POST /orders/:id/cancel`) | ❌ | ✅ |
| View Warehouse Stock Balances | ✅ | ✅ |
| View Inventory Audit Trail | ✅ | ✅ |
| Perform Manual Stock Adjustments | ❌ | ✅ |
| View Dashboard Analytics & Sales Summaries | ✅ | ✅ |

---

## 5. Backend REST API Specification

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/login`: Authenticate user using email and password. Returns JWT token and sanitized profile.
- `GET /auth/me`: Retrieve currently authenticated user profile.
- `POST /auth/logout`: Stateless session logout.

### Products
- `GET /products`: List products with search (`search`), category filter (`category`), stock status filter (`stock_status`), and pagination (`page`, `limit`).
- `GET /products/:id`: Get full product details including linked supplier info.
- `POST /products`: Create new product (Admin only). Automatically creates initial `STOCK_IN` audit log if initial quantity > 0.
- `PUT /products/:id`: Update product info and reorder thresholds (Admin only).
- `PATCH /products/:id/status`: Soft activate/deactivate product (`{ "is_active": false }`) (Admin only).

### Suppliers
- `GET /suppliers`: List suppliers with aggregated product counts (`product_count`).
- `GET /suppliers/:id`: Supplier details with full list of products supplied.
- `POST /suppliers`: Create new supplier (Admin only).
- `PUT /suppliers/:id`: Update supplier details (Admin only).

### Customers
- `GET /customers`: List customers with order count and total spent.
- `GET /customers/:id`: Customer details with 10 most recent orders.
- `POST /customers`: Register new customer.
- `PUT /customers/:id`: Update customer info.

### Orders
- `GET /orders`: List orders with search (Order ID or Customer name), status filter (`PLACED`, `COMPLETED`, `CANCELLED`), and pagination.
- `GET /orders/:id`: Full order details with customer contact info and line item breakdown.
- `POST /orders`: Place order inside an ACID transaction with pessimistic row locking.
- `PATCH /orders/:id/status`: Update status (`PLACED` → `COMPLETED`).
- `POST /orders/:id/cancel`: Cancel order and automatically restore stock (Admin only).

### Inventory
- `GET /inventory`: Warehouse stock monitor with calculated physical valuations.
- `GET /inventory/low-stock`: Products at or below their reorder threshold (`quantity <= reorder_level`).
- `GET /inventory/transactions`: Chronological immutable audit ledger.
- `POST /inventory/adjustments`: Manual stock additions or corrections (Admin only).

### Dashboard
- `GET /dashboard/summary`: High-level summary metrics (Products, Customers, Orders, Gross Sales, Low-Stock alerts, Inventory valuation).
- `GET /dashboard/top-products`: Top 5 selling items by volume and revenue.
- `GET /dashboard/recent-orders`: 5 most recent customer orders.
- `GET /dashboard/monthly-sales`: Monthly sales and order counts grouped by `DATE_TRUNC('month', created_at)`.

---

## 6. Frontend UI Specification (9 Pages)

The frontend is built with React.js, Tailwind CSS, and Lucide Icons, providing a clean, responsive layout:

1. **Login Page (`/login`):** Clean sign-in form with validation, loading states, and one-click quick-fill buttons for demo Admin and Staff accounts.
2. **Dashboard (`/`):** 6 operational metric cards, recent orders table, low-stock alerts table, top-selling products leaderboard, and monthly revenue trend bars.
3. **Products (`/products`):** Full catalog table with live search, category and stock filters, Add/Edit modals, and soft deactivation toggles.
4. **Suppliers (`/suppliers`):** Vendor directory with product count badges, Add/Edit modals, and associated catalog viewer.
5. **Customers (`/customers`):** Client directory with total spend and order counts, Add/Edit modals, and customer order history drawer.
6. **Orders (`/orders`):** Order list with status filters, search by ID or Customer, Order Details breakdown modal, Complete Order action, and Cancel Order action with confirmation.
7. **Create Order (`/orders/new`):** Interactive order builder with customer selector, dynamic line-item builder, real-time stock availability check, auto-calculated subtotals, and transactional submission.
8. **Inventory (`/inventory`):** Stock monitoring table, reorder levels, stock status badges, quick low-stock filter, and Admin-only Stock Adjustment modal.
9. **Inventory History (`/inventory/history`):** Complete immutable audit ledger with color-coded transaction badges (`STOCK_IN`, `STOCK_OUT`, `ORDER_CANCELLATION`, `ADJUSTMENT`), signed quantity changes, user attribution, and timestamp.

---

## 7. Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- [PostgreSQL](https://www.postgresql.org/) v15+ (Local or Cloud like [Neon](https://neon.tech/))

### 1. Clone Repository & Install Dependencies
```powershell
git clone https://github.com/24CSB0B82/StoreOps.git
cd StoreOps

# Install server and client dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy the example environment file:
```powershell
cp server/.env.example server/.env
```
Update `server/.env` with your PostgreSQL connection URL:
```ini
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/storeops
JWT_SECRET=your_super_secret_jwt_key_storeops
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Run Database Migrations & Seed Data
Execute the migration runner and seed script:
```powershell
# Run migrations (creates 7 tables, check constraints, B-Tree indexes)
npm run db:migrate

# Populate realistic seed data (bcrypt hashed admin & staff users, products, suppliers, customers)
npm run db:seed

# (Optional) Reset and seed in one step:
npm run db:reset
```

### 4. Start Development Servers
```powershell
# Option A: Start both Backend and Frontend concurrently:
npm run dev

# Option B: Run in separate terminals:
# Terminal 1:
npm run dev:server

# Terminal 2:
npm run dev:client
```
- Frontend UI: `http://localhost:5173`
- Backend REST API: `http://localhost:5000/api/v1`
- Health Endpoint: `http://localhost:5000/api/v1/health`

### Seed User Credentials
- **Administrator:** `admin@storeops.local` / `Admin@123` (Full permissions)
- **Staff Member:** `staff@storeops.local` / `Staff@123` (Order fulfillment & inventory viewing)

---

## 8. Automated Testing & Verification

StoreOps includes **65 automated test cases** validating authentication, CRUD integrity, database transactions, concurrency row-locking, and SQL aggregations.

### Run All Test Suites:
```powershell
npm test
```

### Run Individual Test Suites:
```powershell
# 1. Authentication & RBAC Test Suite (10 tests)
npm run test:auth --prefix server

# 2. Master Data CRUD Test Suite (13 tests)
npm run test:crud --prefix server

# 3. Orders, Inventory & ACID Concurrency Test Suite (27 tests)
npm run test:orders --prefix server

# 4. Dashboard SQL Aggregation Test Suite (15 tests)
npm run test:dashboard --prefix server
```

### What the Concurrency Test Proves (Test B):
The test initializes stock to 5 units and fires **two simultaneous order requests for 4 units each** at the exact same millisecond:
- Thanks to `SELECT ... FOR UPDATE`, PostgreSQL locks the product row for the first request.
- The competing request is queued until the first commits.
- When the second request evaluates stock, only 1 unit remains.
- **Result:** Exactly 1 order succeeds (201), the other is rejected (409 Conflict), final stock is 1. **Zero overselling**.

---

## 9. Key Technical Decisions & Interview Highlights

### Why Raw SQL & `pg` Instead of an ORM (Prisma / TypeORM / Sequelize)?
1. **Explicit Transaction Boundaries:** In an ORM, running `SELECT ... FOR UPDATE` with deterministic ascending ID sorting to prevent deadlocks is obscure or unsupported. Raw SQL with `node-postgres` gives total control over client checkout, `BEGIN`, row locking, and `ROLLBACK`.
2. **High-Performance Aggregations:** ORMs frequently fetch whole entity graphs into Node.js memory. With explicit SQL queries using `COALESCE(SUM(total_amount), 0)` and `DATE_TRUNC`, PostgreSQL performs all reductions in microsecond-level execution times.
3. **No Hidden Queries (N+1 Query Elimination):** Writing explicit `LEFT JOIN` and `GROUP BY` queries avoids N+1 query bugs common in ORM abstraction layers.

### Why Salt Work Factor 10 for `bcrypt`?
`bcrypt` uses adaptive key stretching. A work factor of 10 requires 1024 hashing rounds (~70ms CPU time). This is imperceptible during login, but prevents offline dictionary or rainbow table attacks if a database dump is ever leaked.

### Why Numeric Precision (`NUMERIC(12,2)`) Instead of `FLOAT`?
Binary floating point types (`FLOAT`, `DOUBLE PRECISION`) suffer from binary representation drift (`0.1 + 0.2 = 0.30000000000000004`). For financial transaction integrity, `NUMERIC(12,2)` guarantees exact decimal arithmetic.
