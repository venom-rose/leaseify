# Leaseify — Full-Stack Rental Management System

A modern, role-based Property & Rental Management System built with React (Vite) + Tailwind CSS, Node.js + Express, MongoDB (Mongoose), and JWT authentication.

---

## 🌟 Features

- **Role-Based Access**:
  - **Property Manager (Admin)**: Full portfolio analytics, add/edit properties, issue lease contracts, record transactions, dispatch maintenance tickets.
  - **Tenant / Resident (User)**: Unit details overview, payment due tracker, 1-click rent settlement, submit maintenance requests.
- **Executive Dashboard**: Occupancy breakdown, rental revenue tracking, recent transactions, and active maintenance queue.
- **Property Catalog**: Multi-attribute filtering (apartment, condo, house, studio), status badges (Available, Rented, Maintenance), and rich property detail modals.
- **Lease Management**: Digital lease tracking with start/end dates, monthly rent, deposits, and status workflows.
- **Payments & Billing**: Rent collection ledger with payment status tracking (Paid, Pending, Overdue).
- **Maintenance Ticketing**: Priority-based service requests (Low, Medium, High, Urgent) with lifecycle management (Open, In Progress, Resolved).
- **API-first Architecture**: Clean Express REST API with JWT bearer tokens and MongoDB Mongoose schemas.
- **Built-in Mock Fallback**: Seamless frontend preview mode even before MongoDB is connected.

---

## 📂 Project Structure

```
leaseify/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection logic
│   │   ├── controllers/
│   │   │   ├── authController.js     # User registration, login, profile
│   │   │   ├── propertyController.js # Property CRUD and filtering
│   │   │   ├── leaseController.js    # Lease agreements & statuses
│   │   │   ├── paymentController.js  # Rent payments & stats
│   │   │   ├── maintenanceController.js # Maintenance tickets
│   │   │   └── dashboardController.js # Role-based KPIs & metrics
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification & role authorization
│   │   │   └── errorHandler.js       # Centralized error handling
│   │   ├── models/
│   │   │   ├── User.js               # Admin & Tenant schemas with bcrypt
│   │   │   ├── Property.js           # Property listing schema
│   │   │   ├── Lease.js              # Rental agreement schema
│   │   │   ├── Payment.js            # Transaction & rent records
│   │   │   └── MaintenanceRequest.js # Issue ticketing schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── propertyRoutes.js
│   │   │   ├── leaseRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── maintenanceRoutes.js
│   │   │   └── dashboardRoutes.js
│   │   ├── utils/
│   │   │   └── seedData.js           # Comprehensive sample DB seeder
│   │   ├── app.js                    # Express app configuration
│   │   └── server.js                 # Server entry point
│   ├── .env.example
│   ├── .env
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js             # API client + mock data layer
    │   ├── components/
    │   │   ├── common/               # Sidebar, Navbar, StatCard, Modal, Badge
    │   │   ├── dashboard/            # Executive KPI overview & charts
    │   │   ├── properties/           # Property catalog & Add form modal
    │   │   ├── leases/               # Lease agreements & contract modal
    │   │   ├── payments/             # Payments table & pay rent modal
    │   │   ├── maintenance/          # Maintenance request tickets
    │   │   ├── tenant/               # Resident home portal
    │   │   └── auth/                 # Login/Register & demo quick-switch
    │   ├── context/
    │   │   └── AuthContext.jsx       # User state & role switcher
    │   ├── App.jsx                   # Main layout & navigation
    │   ├── main.jsx                  # React DOM root
    │   └── index.css                 # Tailwind CSS & custom design tokens
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: v18 or higher (`node -v`)
- **MongoDB**: Local MongoDB community server running on port 27017 or a MongoDB Atlas connection URI.

---

### 2. Backend Setup

```bash
# Navigate into backend directory
cd backend

# Install dependencies
npm install

# (Optional) Seed demo data into MongoDB (users, properties, leases, payments)
npm run seed

# Start development server
npm run dev
```

> **Backend server runs at**: `http://localhost:5000`  
> **Health Check**: `http://localhost:5000/api/health`

#### Backend Environment Variables (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/leaseify
JWT_SECRET=super_secret_leaseify_jwt_key_2026_change_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

---

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate into frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

> **Frontend runs at**: `http://localhost:5173`

---

## 🔑 Default Demo Accounts

You can test both roles using the 1-click switcher in the sidebar or entering these credentials:

| Role | Email | Password |
|---|---|---|
| **Property Admin** | `admin@leaseify.com` | `password123` |
| **Resident Tenant** | `tenant@leaseify.com` | `password123` |

---

## 📡 Core API Endpoints

### Authentication
- `POST /api/auth/register` — Create new user
- `POST /api/auth/login` — Login & receive JWT token
- `GET  /api/auth/me` — Get authenticated user details

### Properties
- `GET    /api/properties` — List properties (supports `?search=`, `?status=`, `?type=`)
- `GET    /api/properties/:id` — Property details
- `POST   /api/properties` — Create property listing (Admin only)
- `PUT    /api/properties/:id` — Update property (Admin only)
- `DELETE /api/properties/:id` — Delete property (Admin only)

### Leases
- `GET  /api/leases` — List leases
- `POST /api/leases` — Issue new lease (Admin only)
- `PUT  /api/leases/:id` — Update lease terms/status (Admin only)

### Payments
- `GET  /api/payments` — Payment transaction history
- `POST /api/payments` — Record/submit rent payment
- `PUT  /api/payments/:id/status` — Update payment status (Admin only)

### Maintenance
- `GET  /api/maintenance` — List maintenance requests
- `POST /api/maintenance` — Create maintenance ticket
- `PUT  /api/maintenance/:id` — Update ticket status/cost

### Analytics Dashboard
- `GET /api/dashboard/stats` — Metrics and charts for Admin & Tenant