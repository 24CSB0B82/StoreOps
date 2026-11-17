# StoreOps – Frontend Requirements Specification

## 1. UI Design Objective

Build a clean, modern, responsive inventory management dashboard.

The interface should resemble a professional business administration application, prioritizing usability and clear presentation of inventory and order information.

Avoid unnecessary animations, excessive gradients, decorative elements, or complicated UI components.

## 2. Application Layout

Use a consistent dashboard layout:

### Sidebar Navigation

Include:
- Dashboard
- Products
- Suppliers
- Customers
- Orders
- Inventory
- Inventory History
- Logout

Display navigation items according to user permissions.

### Top Navigation Bar

Include:
- Application name/logo: StoreOps
- Current page title
- Logged-in user name
- User role
- Logout option

### Main Content Area

Render the selected page while maintaining the shared dashboard layout.

## 3. Required Pages

### Page 1: Login

Components:
- Email input.
- Password input.
- Login button.
- Validation messages.
- Loading state.

After successful login, redirect the user to the dashboard.

### Page 2: Dashboard

Display summary cards:

- Total Products.
- Total Customers.
- Total Orders.
- Total Sales.
- Low Stock Items.

Additional sections:
- Recent Orders table.
- Low Stock Products table.
- Top-Selling Products.
- Monthly Sales Chart.

Fetch dashboard statistics from backend APIs.

### Page 3: Products

Display a table containing:

- Product Name.
- SKU.
- Category.
- Price.
- Available Quantity.
- Supplier.
- Stock Status.
- Actions.

Actions:
- Add Product.
- Edit Product.
- View Product.
- Deactivate Product.
- Search and filter products.

Provide a form for adding and editing products.

### Page 4: Suppliers

Display:
- Supplier Name.
- Email.
- Phone.
- Number of Associated Products.
- Actions.

Provide add and edit forms.

### Page 5: Customers

Display:
- Customer Name.
- Email.
- Phone.
- Number of Orders.
- Actions.

Provide customer registration and editing forms.

### Page 6: Orders

Display:
- Order ID.
- Customer.
- Order Date.
- Number of Items.
- Total Amount.
- Status.
- Actions.

Features:
- Create Order.
- View Order Details.
- Filter by Status.
- Search Orders.
- Cancel Eligible Orders.
- Complete Eligible Orders.

### Page 7: Create Order

Form components:
- Customer selector.
- Product selector.
- Quantity input.
- Add/remove order items.
- Available stock display.
- Unit price display.
- Subtotal calculation.
- Final order total.
- Place Order button.

The frontend can display calculated totals for convenience, but the backend must independently calculate and validate all prices and totals.

Display a clear error if requested quantities exceed available stock.

### Page 8: Inventory

Display:
- Product Name.
- SKU.
- Current Quantity.
- Reorder Level.
- Stock Status.

Features:
- Add Stock.
- Adjust Stock.
- View Low Stock.
- Search and filter.

Only administrators can perform stock adjustments.

### Page 9: Inventory History

Display:
- Transaction ID.
- Product.
- Transaction Type.
- Quantity Changed.
- User.
- Timestamp.
- Reason or Reference.

Use clear visual distinctions for stock additions and deductions.

## 4. Design Guidelines

- Use a consistent color palette.
- Use a professional sidebar and top navigation layout.
- Prefer readable typography.
- Use tables for structured business data.
- Use cards for dashboard statistics.
- Use status badges for order and stock status.
- Use confirmation dialogs for destructive actions.
- Make forms easy to navigate.
- Ensure responsiveness on desktop, tablet, and mobile.

## 5. Frontend Engineering Requirements

- Use React functional components and hooks.
- Use React Router for navigation.
- Use Axios for API requests.
- Keep API calls in a centralized service layer.
- Use reusable components for tables, forms, modals, and cards.
- Maintain authentication state.
- Implement protected routes.
- Handle loading, empty, success, and error states.
- Avoid placing business logic inside presentation components.
- Do not hardcode dashboard statistics or inventory data.

## 6. Expected Frontend Deliverables

- Login page.
- Dashboard.
- Product management.
- Supplier management.
- Customer management.
- Order management.
- Order creation form.
- Inventory management.
- Inventory history.
- Responsive navigation.
- API integration.
- Role-based UI restrictions.
- Consistent error and loading handling.