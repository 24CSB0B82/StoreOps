# StoreOps – Testing and Acceptance Criteria

## 1. Authentication Testing

| Test | Expected Result |
|---|---|
| Login with valid credentials | Login successful |
| Login with incorrect password | Authentication rejected |
| Access protected API without JWT | 401 Unauthorized |
| Staff attempts admin-only operation | 403 Forbidden |
| Login with unknown email | Authentication rejected |

## 2. Product Testing

| Test | Expected Result |
|---|---|
| Add valid product | Product created |
| Add duplicate SKU | Request rejected |
| Add product with negative price | Validation error |
| Add product with negative quantity | Validation error |
| Update product | Changes persisted |
| Search by SKU | Matching product returned |
| Deactivate product with order history | Product retained, marked inactive |

## 3. Inventory Testing

| Test | Expected Result |
|---|---|
| Add stock | Quantity increases |
| Remove stock within available quantity | Quantity decreases |
| Remove more than available quantity | Operation rejected |
| View low-stock products | Correct products displayed |
| Perform stock adjustment | Inventory history created |
| Attempt unauthorized adjustment | 403 Forbidden |

## 4. Order Testing

| Test | Expected Result |
|---|---|
| Place valid order | Order created |
| Place order with sufficient stock | Stock deducted |
| Place order with insufficient stock | Order rejected |
| Place order with inactive product | Order rejected |
| Place order for nonexistent customer | Order rejected |
| Place order with invalid quantity | Order rejected |
| Cancel eligible order | Stock restored |
| Cancel the same order twice | Stock restored only once |
| Complete a placed order | Status updated |
| Attempt invalid status transition | Request rejected |

## 5. Database Transaction Testing

These tests are mandatory.

### Test A: Order rollback

Simulate a failure while inserting an order item.

Expected:
- Order record must not remain.
- Stock must not be deducted.
- Inventory history must not contain incomplete movements.

### Test B: Concurrent ordering

Assume a product has 5 units in stock.

Two requests attempt to purchase 4 units each simultaneously.

Expected:
- Only one request succeeds.
- The other request fails due to insufficient stock.
- Final stock is 1.
- Inventory records match the successful order.

### Test C: Cancellation consistency

Cancel an order containing multiple products.

Expected:
- All quantities are restored.
- All corresponding inventory transactions are recorded.
- Order status becomes CANCELLED.

If any part fails, the entire cancellation must roll back.

## 6. Dashboard Testing

Verify:
- Product count matches the database.
- Customer count matches the database.
- Order count matches the database.
- Sales total excludes cancelled orders.
- Low-stock count uses the configured reorder level.
- Top-selling products are calculated from order items.
- Recent orders are sorted by creation time.

## 7. Final Acceptance Criteria

The project is considered complete when:

1. Users can authenticate successfully.
2. Admin and staff permissions work correctly.
3. Products, suppliers, and customers can be managed.
4. Inventory adjustments are recorded.
5. Orders can be created and cancelled.
6. Inventory remains consistent after order operations.
7. PostgreSQL transactions work correctly.
8. Dashboard statistics are retrieved from SQL queries.
9. All major frontend pages are connected to the backend.
10. The project can be installed and run using the README instructions.

A feature must not be marked complete solely because its UI exists. Its API, database behavior, validation, and error cases must also be tested.