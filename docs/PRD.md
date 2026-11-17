# StoreOps – Inventory & Order Management System
## Product Requirements Document (PRD)

**Version:** 1.0  
**Project Type:** Full-Stack Web Application  
**Development Approach:** Individual project  
**Target:** Functional MVP suitable for academic and technical interview demonstration

---

## 1. Project Overview

StoreOps is a web-based inventory and order management application designed for small retail businesses.

The application allows administrators and staff members to manage products, suppliers, customers, inventory levels, and customer orders through a centralized platform.

The system maintains accurate inventory quantities by automatically updating stock when orders are placed or cancelled. It also provides inventory movement records and dashboard analytics to help users monitor business operations.

## 2. Problem Statement

Small businesses often manage their inventory and customer orders using spreadsheets or manual records. This can result in:

- Inaccurate inventory quantities.
- Difficulty tracking incoming and outgoing stock.
- Duplicate or inconsistent order records.
- Lack of visibility into low-stock products.
- Difficulty generating sales and inventory reports.

StoreOps aims to address these problems through a centralized inventory and order management system backed by a relational database.

## 3. Project Objectives

1. Provide centralized product and supplier management.
2. Maintain accurate inventory quantities.
3. Support customer order creation and management.
4. Prevent orders from exceeding available stock.
5. Maintain a history of inventory changes.
6. Provide useful sales and inventory summaries.
7. Implement secure authentication and role-based authorization.

## 4. User Roles

### 4.1 Administrator

The administrator has complete access to the application.

Permissions:
- Manage products.
- Manage suppliers.
- Manage customers.
- Create and manage orders.
- Add or adjust inventory.
- View inventory history.
- View dashboard analytics.

### 4.2 Staff

Staff members perform regular inventory and order operations.

Permissions:
- View products and inventory.
- View suppliers and customers.
- Create customer orders.
- View and manage permitted order operations.
- View inventory information.

Staff must not be allowed to manage user accounts or perform administrator-only operations.

## 5. Functional Requirements

### FR-01: User Authentication

- Users must be able to log in using email and password.
- Passwords must be securely hashed.
- Authentication must use JWT.
- Protected API endpoints must verify authentication.
- Role-based authorization must restrict administrator-only operations.
- Provide logout functionality.

Registration can be restricted to administrator-created accounts or a development seed account.

### FR-02: Product Management

Administrators must be able to:

- Add new products.
- View all products.
- Update product information.
- Search products by name or SKU.
- Filter products by category or stock status.
- View individual product details.

Each product must contain:
- Product ID.
- Product name.
- SKU (unique stock keeping unit).
- Description.
- Category.
- Selling price.
- Available quantity.
- Reorder level.
- Supplier.
- Created timestamp.

Products with existing order history should be deactivated rather than permanently deleted.

### FR-03: Supplier Management

Administrators must be able to:

- Add suppliers.
- View supplier details.
- Update supplier information.
- View products associated with each supplier.

Supplier information includes:
- Supplier ID.
- Supplier name.
- Email.
- Phone number.
- Address.

### FR-04: Customer Management

Users with appropriate permissions must be able to:

- Add customers.
- View customer details.
- Update customer information.
- Search customers.
- View previous orders placed by a customer.

Customer information includes:
- Customer ID.
- Name.
- Email.
- Phone number.

### FR-05: Inventory Management

The system must:

- Display current stock quantities.
- Support stock additions.
- Support manual stock adjustments.
- Maintain inventory movement records.
- Identify products below their reorder level.
- Prevent inventory quantities from becoming negative.

Every inventory adjustment must record:
- Product ID.
- Quantity changed.
- Transaction type.
- User responsible.
- Timestamp.
- Optional reference or reason.

### FR-06: Order Management

Users must be able to:

- Create a new customer order.
- Select products and quantities.
- View calculated order totals.
- View all orders.
- Search orders using order ID or customer.
- View order details.
- Cancel eligible orders.

Order creation must validate available inventory before processing.

The system must automatically deduct inventory quantities after a successful order.

### FR-07: Inventory Consistency

Order creation must be implemented using a PostgreSQL database transaction.

The following operations must succeed or fail together:

1. Validate product availability.
2. Create the order.
3. Insert order items.
4. Deduct inventory quantities.
5. Record inventory transactions.

If any operation fails, all database changes must be rolled back.

Concurrent orders must not result in overselling.

### FR-08: Order Cancellation

- Only eligible orders can be cancelled.
- Cancelling an order must restore the ordered quantities to inventory.
- Inventory restoration and order status update must occur in one database transaction.
- Repeated cancellation requests must not restore stock more than once.
- Cancelled orders must remain available for historical reference.

### FR-09: Dashboard and Reports

The dashboard must display:

- Total products.
- Total customers.
- Total orders.
- Total sales from completed/placed non-cancelled orders, according to the implemented order-status definition.
- Low-stock product count.
- Recent orders.
- Stock movement summary.

Reports should include:
- Low-stock products.
- Top-selling products.
- Recent orders.
- Sales summary.

Use SQL aggregation rather than calculating all statistics in the frontend.

## 6. Non-Functional Requirements

### Performance
- Use pagination for large product and order lists.
- Use indexes for frequently searched fields.
- Avoid unnecessary database queries.
- Use efficient SQL joins and aggregation.

### Security
- Hash passwords using bcrypt.
- Store JWT secrets in environment variables.
- Validate and sanitize request inputs.
- Use parameterized SQL queries.
- Enforce role-based authorization.
- Do not expose sensitive database information in API responses.

### Reliability
- Use database transactions for order processing.
- Enforce database constraints.
- Handle API errors consistently.
- Maintain inventory movement history.

### Usability
- Provide a clean and responsive interface.
- Display loading states and error messages.
- Provide confirmation before cancelling orders or adjusting stock.

## 7. Out of Scope

The initial version will NOT include:

- Online payment integration.
- Barcode scanning.
- Multi-warehouse management.
- GST invoicing.
- AI-based demand forecasting.
- Email or SMS notifications.
- Third-party accounting integrations.

These features may be considered for future enhancements.

## 8. Expected Outcome

A working inventory and order management application that demonstrates practical full-stack development, relational database design, SQL queries, transactional consistency, authentication, and backend API development.