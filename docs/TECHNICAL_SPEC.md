# StoreOps – Technical Requirements Specification
## Database Design, Backend Architecture & API Specification

---

## 1. Technology Stack

### Frontend
- React.js
- JavaScript
- React Router
- Axios
- CSS / Tailwind CSS (choose one styling approach)

### Backend
- Node.js
- Express.js
- JavaScript
- REST API architecture
- JWT authentication
- bcrypt password hashing

### Database
- PostgreSQL
- node-postgres (`pg`)
- SQL migrations or versioned schema scripts

### Development Tools
- Visual Studio Code
- Git and GitHub
- Postman
- pgAdmin or PostgreSQL CLI

Use JavaScript throughout the project. Do not introduce TypeScript unless explicitly requested.

---

## 2. System Architecture

The application must follow a three-layer architecture.

### Presentation Layer
React frontend handles:
- User interaction.
- Forms and validation.
- Dashboard rendering.
- API communication.
- Loading and error states.

### Application Layer
Express backend handles:
- Authentication.
- Authorization.
- Request validation.
- Business logic.
- Database interaction.
- Error handling.

### Data Layer
PostgreSQL handles:
- Persistent data storage.
- Relational integrity.
- Constraints.
- Transactions.
- Aggregation and reporting.

Architecture flow:

React UI → Axios → Express Routes → Controllers → Services → PostgreSQL

Use a separate database connection pool and a centralized error-handling middleware.

---

## 3. Database Requirements

Create the following seven tables.

### 3.1 users

| Column | Type | Constraint |
|---|---|---|
| user_id | SERIAL | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| role | VARCHAR(20) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

Allowed roles: `admin`, `staff`.

### 3.2 suppliers

| Column | Type | Constraint |
|---|---|---|
| supplier_id | SERIAL | PRIMARY KEY |
| supplier_name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(150) | |
| phone | VARCHAR(20) | |
| address | TEXT | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 3.3 products

| Column | Type | Constraint |
|---|---|---|
| product_id | SERIAL | PRIMARY KEY |
| product_name | VARCHAR(150) | NOT NULL |
| sku | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | |
| category | VARCHAR(100) | |
| price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| quantity | INTEGER | NOT NULL, CHECK >= 0 |
| reorder_level | INTEGER | DEFAULT 10, CHECK >= 0 |
| supplier_id | INTEGER | FOREIGN KEY |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

Use `ON DELETE RESTRICT` for supplier references where appropriate.

### 3.4 customers

| Column | Type | Constraint |
|---|---|---|
| customer_id | SERIAL | PRIMARY KEY |
| customer_name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(150) | |
| phone | VARCHAR(20) | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 3.5 orders

| Column | Type | Constraint |
|---|---|---|
| order_id | SERIAL | PRIMARY KEY |
| customer_id | INTEGER | FOREIGN KEY |
| total_amount | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| status | VARCHAR(20) | NOT NULL |
| created_by | INTEGER | FOREIGN KEY to users |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

Allowed order statuses:
- PLACED
- COMPLETED
- CANCELLED

For the MVP, a newly created order has status `PLACED`. Only non-cancelled orders are included in sales totals. A completed order represents an order fulfilled by the business.

### 3.6 order_items

| Column | Type | Constraint |
|---|---|---|
| order_item_id | SERIAL | PRIMARY KEY |
| order_id | INTEGER | FOREIGN KEY |
| product_id | INTEGER | FOREIGN KEY |
| quantity | INTEGER | NOT NULL, CHECK > 0 |
| unit_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| subtotal | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |

Store the unit price at the time of ordering. Historical orders must not change when a product's selling price changes.

### 3.7 inventory_transactions

| Column | Type | Constraint |
|---|---|---|
| transaction_id | SERIAL | PRIMARY KEY |
| product_id | INTEGER | FOREIGN KEY |
| user_id | INTEGER | FOREIGN KEY |
| quantity_changed | INTEGER | NOT NULL, CHECK <> 0 |
| transaction_type | VARCHAR(30) | NOT NULL |
| reference_id | INTEGER | Nullable |
| reason | TEXT | Nullable |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

Allowed transaction types:
- STOCK_IN
- STOCK_OUT
- ADJUSTMENT
- ORDER_CANCELLATION

Define quantity_changed as a signed value:
- Positive = stock added.
- Negative = stock removed.

---

## 4. Database Relationships

Implement these relationships:

1. One supplier can supply multiple products.
2. One customer can place multiple orders.
3. One order can contain multiple order items.
4. One product can appear in multiple order items.
5. One user can create multiple orders.
6. One product can have multiple inventory transactions.
7. One user can perform multiple inventory transactions.

The relationship between orders and products is many-to-many, resolved through the `order_items` table.

---

## 5. Database Indexing

Create indexes for commonly queried fields:

- `products(sku)`
- `products(product_name)`
- `products(supplier_id)`
- `orders(customer_id)`
- `orders(status)`
- `orders(created_at)`
- `order_items(order_id)`
- `inventory_transactions(product_id, created_at)`

Do not add redundant indexes to columns already covered by primary-key or unique constraints.

---

## 6. Backend API Specification

Use base URL:

`/api/v1`

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /auth/login | Authenticate user |
| GET | /auth/me | Get current user |
| POST | /auth/logout | Logout / clear client session |

### Products

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /products | List products |
| GET | /products/:id | Product details |
| POST | /products | Create product |
| PUT | /products/:id | Update product |
| PATCH | /products/:id/status | Activate/deactivate product |

### Suppliers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /suppliers | List suppliers |
| GET | /suppliers/:id | Supplier details |
| POST | /suppliers | Create supplier |
| PUT | /suppliers/:id | Update supplier |

### Customers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /customers | List customers |
| GET | /customers/:id | Customer details |
| POST | /customers | Create customer |
| PUT | /customers/:id | Update customer |

### Orders

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /orders | List orders |
| GET | /orders/:id | Order details |
| POST | /orders | Create order |
| PATCH | /orders/:id/status | Update order status |
| POST | /orders/:id/cancel | Cancel order |

### Inventory

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /inventory | View inventory |
| GET | /inventory/low-stock | List low-stock products |
| GET | /inventory/transactions | View stock history |
| POST | /inventory/adjustments | Adjust stock |

### Dashboard

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /dashboard/summary | Dashboard statistics |
| GET | /dashboard/top-products | Top-selling products |
| GET | /dashboard/recent-orders | Recent orders |

All protected endpoints must validate the JWT and enforce the appropriate role permissions.

---

## 7. Critical Business Logic

### 7.1 Order Creation

Endpoint: `POST /api/v1/orders`

Request example:

{
  "customer_id": 1,
  "items": [
    {
      "product_id": 2,
      "quantity": 3
    },
    {
      "product_id": 4,
      "quantity": 1
    }
  ]
}

Processing:

1. Validate customer and item details.
2. Start a database transaction.
3. Lock the requested product rows using `SELECT ... FOR UPDATE`.
4. Verify that all products are active and have sufficient stock.
5. Calculate the order total using current database prices.
6. Insert the order.
7. Insert order_items with historical unit prices.
8. Deduct stock from products.
9. Insert corresponding STOCK_OUT inventory transactions.
10. Commit the transaction.

If any step fails, roll back the entire transaction.

Important:
- Do not trust product prices supplied by the frontend.
- Do not allow duplicate or invalid quantities.
- Lock products in a consistent order to reduce deadlock risk.
- Ensure the connection used for BEGIN, queries, COMMIT, and ROLLBACK is the same checked-out database client.

### 7.2 Order Cancellation

1. Start a database transaction.
2. Lock the order row.
3. Verify that the order is not already cancelled.
4. Lock the related product rows.
5. Restore each ordered quantity.
6. Insert ORDER_CANCELLATION inventory transactions.
7. Update the order status to CANCELLED.
8. Commit.

Repeated cancellation requests must not restore inventory twice.

### 7.3 Inventory Adjustment

1. Validate the requested adjustment.
2. Start a database transaction.
3. Lock the relevant product row.
4. Calculate the new stock quantity.
5. Reject the operation if the resulting quantity is negative.
6. Update the product quantity.
7. Insert an inventory transaction.
8. Commit.

### 7.4 Order Status Transitions

Implement these transitions:

- PLACED → COMPLETED
- PLACED → CANCELLED

Do not allow invalid transitions, such as COMPLETED → PLACED or CANCELLED → COMPLETED.

A completed order must not restore stock when its status changes.

---

## 8. SQL Reporting Requirements

Implement the following using SQL queries:

1. Total number of products.
2. Total number of customers.
3. Total number of orders.
4. Total sales from non-cancelled orders.
5. Number of low-stock products.
6. Top five selling products using `SUM(quantity)`.
7. Product-wise inventory valuation using `SUM(quantity * price)`.
8. Customer-wise order totals.
9. Monthly sales summary using date grouping.
10. Recent inventory transactions.

Use appropriate JOIN, GROUP BY, HAVING, ORDER BY, COUNT, SUM, and date functions.

Use parameterized queries throughout.

---

## 9. API Response Standards

Success response:

{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}

Error response:

{
  "success": false,
  "message": "Insufficient stock",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}

Use appropriate HTTP status codes:

- 200: Successful request.
- 201: Resource created.
- 400: Invalid request.
- 401: Unauthenticated.
- 403: Unauthorized role.
- 404: Resource not found.
- 409: Conflict, such as duplicate SKU or insufficient stock.
- 500: Internal server error.

Never expose stack traces, passwords, JWT secrets, or raw database errors to clients.

---

## 10. Validation Requirements

Validate requests on the backend.

Examples:
- Product name cannot be empty.
- SKU must be unique.
- Price cannot be negative.
- Quantity cannot be negative.
- Order quantity must be greater than zero.
- Customer must exist before order creation.
- Product must be active before ordering.
- Stock cannot become negative.
- Invalid status transitions must be rejected.
- Duplicate email addresses must be handled appropriately.

Use centralized validation and error-handling middleware.

---

## 11. Configuration and Environment Variables

Create a `.env.example` containing:

PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/storeops
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173

Never commit actual secrets or `.env` files to Git.

---

## 12. Expected Backend Deliverables

- Express application.
- PostgreSQL connection pool.
- Database schema and migration scripts.
- Authentication and authorization middleware.
- Routes and controllers.
- Business logic services.
- SQL query modules.
- Validation middleware.
- Centralized error handler.
- Seed script with sample data.
- API testing collection or documented test cases.