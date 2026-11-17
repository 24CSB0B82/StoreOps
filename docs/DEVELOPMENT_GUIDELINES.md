# StoreOps – AI Development Agent Instructions

## Role

Act as a senior full-stack software engineer and technical mentor.

Develop StoreOps, an Inventory and Order Management System, using the provided product, technical, database, and frontend requirements.

The project must be implemented with React.js, Node.js, Express.js, and PostgreSQL.

## 1. Mandatory Development Rules

1. Follow the requirements documents as the source of truth.
2. Do not add unnecessary features beyond the defined scope.
3. Use JavaScript rather than TypeScript.
4. Use PostgreSQL and the `pg` library for database access.
5. Write SQL queries explicitly wherever practical.
6. Do not use MongoDB, Firebase, Prisma, Sequelize, or another ORM.
7. Do not hardcode sample data into frontend components.
8. All business logic must be implemented and validated in the backend.
9. Use environment variables for sensitive configuration.
10. Implement proper error handling and request validation.
11. Do not leave incomplete functions, placeholder APIs, or non-functional buttons.
12. Never claim a feature is implemented until it has been tested.

## 2. Required Project Structure

Use a clean, modular structure similar to:

storeops/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── db/
│   │   ├── utils/
│   │   └── app.js
│   ├── migrations/
│   ├── seeds/
│   └── package.json
│
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── FRONTEND_SPEC.md
│   └── TESTING.md
│
├── .gitignore
├── README.md
└── package.json

You may adjust the structure when technically justified, but maintain separation of concerns.

## 3. Development Phases

Do not implement everything in one operation.

### Phase 1: Project Setup

- Initialize React frontend.
- Initialize Express backend.
- Configure PostgreSQL connection.
- Configure environment variables.
- Configure CORS.
- Create health-check endpoint.
- Verify frontend and backend run independently.

Deliverable: Working project skeleton.

### Phase 2: Database

- Create all seven database tables.
- Implement primary and foreign keys.
- Implement unique and check constraints.
- Create indexes.
- Create database migration scripts.
- Insert realistic seed data.

Deliverable: Working relational database.

### Phase 3: Authentication

- Implement login.
- Hash passwords using bcrypt.
- Generate and verify JWT.
- Implement authentication middleware.
- Implement role-based authorization.
- Protect routes.

Deliverable: Working authentication and access control.

### Phase 4: Core CRUD

Implement products, suppliers, and customers.

Deliverable: Fully functional APIs tested using Postman.

### Phase 5: Inventory and Orders

- Implement stock adjustments.
- Implement inventory history.
- Implement order creation using database transactions.
- Implement stock deduction.
- Implement order cancellation and stock restoration.
- Implement valid order status transitions.
- Test concurrent stock updates.

Deliverable: Correct inventory and order business logic.

### Phase 6: Dashboard and Reporting

- Implement summary statistics.
- Implement low-stock queries.
- Implement top-selling products.
- Implement monthly sales reporting.
- Implement recent orders.

Deliverable: Working dashboard APIs.

### Phase 7: Frontend

Implement the UI according to the frontend specification.

Connect all pages to real APIs.

Deliverable: Fully integrated application.

### Phase 8: Testing and Documentation

- Test authentication and role restrictions.
- Test CRUD functionality.
- Test order creation.
- Test insufficient stock.
- Test concurrent order attempts.
- Test cancellation and stock restoration.
- Test invalid requests.
- Fix all critical errors.
- Prepare README and screenshots.

Deliverable: Demonstrable, working MVP.

## 4. Quality Requirements

Before declaring completion:

- Verify that all required APIs work.
- Verify database relationships.
- Verify transaction rollback behavior.
- Verify inventory consistency.
- Verify authentication and authorization.
- Verify all frontend pages use real backend data.
- Verify there are no broken navigation links.
- Verify there are no non-functional buttons.
- Verify the project can be started using documented commands.

## 5. Communication Requirements

Work in small, reviewable steps.

At the beginning of every phase:
1. Explain what will be implemented.
2. Identify the files that will be created or modified.
3. Explain important technical decisions.

At the end of every phase:
1. Summarize completed work.
2. List changed files.
3. Provide commands to run and test the implementation.
4. Mention any incomplete requirements.
5. Explain important concepts so the developer understands the implementation.

Do not proceed past a phase with unresolved critical errors.

## 6. Final Deliverables

The completed repository must include:

- Fully working React frontend.
- Express REST API backend.
- PostgreSQL schema and migrations.
- Seed data.
- Authentication and role authorization.
- Inventory and order processing.
- Transaction handling.
- Dashboard and reports.
- API documentation.
- README with installation instructions.
- Environment variable example.
- Test cases and screenshots.

The code must be understandable, modular, maintainable, and suitable for a student to explain in a technical interview.