# 🍱 Campus Canteen Pre-order Platform
> **SLIIT SE2020 — Web and Mobile Technologies Individual Assignment (2026)**
> **Full Stack Mobile Application** (React Native + Node.js + Express.js + MongoDB Atlas)

---

## 📌 Project Overview
The **Campus Canteen Pre-order Platform** is an end-to-end mobile application designed specifically for students at the SLIIT campus to pre-order food for their lecture breaks (`Morning 10:30 AM`, `Lunch 12:30 PM`, `Evening 03:30 PM`). It prevents long canteen queues and implements real kitchen preparation capacity business logic.

---

## 🏗️ Architecture & Stack

- **Frontend (Mobile):** React Native (Expo framework), React Navigation (Stack + Tabs), Axios, AsyncStorage.
- **Backend (API):** Node.js, Express.js REST API.
- **Database:** MongoDB Atlas (Mongoose ODM).
- **Authentication:** JWT Bearer tokens + Password hashing using `bcryptjs`.
- **Image Upload:** `multer` disk storage middleware (handles primary entity food images).

---

## 🛠 System Entities & Business Logic (Assignment Requirements)

### 1. Primary Entity — `MenuItem`
- **CRUD:** Create, Read All (with search & category filters), Read One, Update, Delete.
- **Image Upload:** Uploaded using Multer, stored in `/uploads/` and served statically.
- **Fields:** `name`, `description`, `price`, `category` (Breakfast/Lunch/Snacks/Beverages), `image`, `isAvailable`, `preparationTimeMinutes`, `dailyStock`.

### 2. Related Entity — `Order`
- **Reference:** Refers directly to `MenuItem` (`menuItem: ObjectId`) and `User` (`user: ObjectId`).
- **CRUD:** Create pre-order, Read user pre-orders, Read all canteen orders (staff view), Cancel order.
- **State Change Workflow:** Status transitions cleanly:
  `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed` (or `Cancelled`).

### 3. Real Business Logic Rule (Enforced on Backend)
- **Break Slot Kitchen Capacity Limit:** To prevent kitchen overload during peak lecture breaks, the backend restricts active orders (`Pending` or `Preparing`) to a **maximum of 25 orders per break slot**. If a student attempts to order when capacity is reached, the backend rejects the request with HTTP `400 Bad Request` and a descriptive message.
- **Stock Quota:** Automatically verifies stock and deducts/releases item inventory upon order placement/cancellation.

---

## 🚀 How to Run locally

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```
*Note: Make sure to update `backend/.env` with your valid MongoDB Atlas connection string.*

### 2. Start React Native Mobile App
```bash
cd mobile
npm install
npx expo start
```
- Press `a` to open in Android Emulator, or scan the QR code with the **Expo Go** app on your physical mobile device.

---

## 📂 Project Structure

```
Project/
├── backend/
│   ├── config/          # MongoDB Atlas Connection
│   ├── controllers/     # Auth, MenuItem (Primary), Order (Related)
│   ├── middleware/      # JWT protection, Multer upload, Error handler
│   ├── models/          # Mongoose schemas (User, MenuItem, Order)
│   ├── routes/          # RESTful endpoint routes
│   ├── uploads/         # Uploaded food image files
│   └── server.js        # Express entry point
└── mobile/
    ├── src/
    │   ├── api/         # Axios REST API services
    │   ├── components/  # CustomInput, CustomButton, MenuItemCard, OrderCard
    │   ├── context/     # AuthContext (JWT & state management)
    │   ├── navigation/  # AuthStack & MainTabs
    │   ├── screens/     # All mobile screen views
    │   └── utils/       # Storage & API config
    └── App.tsx          # Root app component
```

---

## 📑 Rubric Compliance Check

| Rubric Area | Implementation | Status |
| :--- | :--- | :--- |
| **Authentication** | Registration, Login, `bcryptjs` hashing, JWT bearer tokens, protected routes |  Complete |
| **Entities & Logic** | `MenuItem` (Primary) + `Order` (Related) + Kitchen Slot Capacity Business Rule |  Complete |
| **Image Upload** | Multer disk storage + file type/size validation + URL serving |  Complete |
| **Mobile App** | React Native, React Navigation, Form validation, empty & loading states, zero hardcoded data |  Complete |
| **API Quality** | RESTful HTTP status codes (200, 201, 400, 401, 403, 404, 500) |  Complete |

---

## 💳 Stripe Test Mode & Payment Integration

The CampusBites platform includes a complete **Stripe Test Mode payment system** alongside **Cash on Pickup**.

### 1. Payment Options
* **💳 Pay Online (Stripe Test Mode):** Creates a server-validated Stripe Checkout Session in LKR currency and redirects the student to Stripe's hosted checkout portal. Order payment status remains `PENDING` until Stripe session verification or webhook signature verification confirms payment.
* **💵 Cash on Pickup:** Places the order immediately with `paymentStatus: PENDING`. Canteen kitchen staff can confirm cash payment upon collection via the Chef portal (`PUT /api/orders/:id/confirm-cash-payment`).

### 2. Environment Variables Configuration (`backend/.env`)
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_51Q...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:8081
```

### 3. Stripe Official Test Cards
To test online payments in **Stripe Test Mode**:
* **Card Number:** `4242 4242 4242 4242`
* **Expiration Date:** Any future date (e.g., `12/28`)
* **CVC:** Any 3 digits (e.g., `123`)
* **Postal Code:** Any valid ZIP / Postal Code (e.g., `10100` or `90210`)

### 4. Payment Status Lifecycle
```text
Student Selects "Pay Online"
  └── Order Created (paymentStatus: PENDING, paymentMethod: ONLINE)
  └── Redirects to Stripe Checkout
  └── Student enters test card
        ├── Payment Success ──> Verified by Backend API / Webhook ──> paymentStatus: PAID
        └── Payment Failure ──> Redirects with status=cancelled ──> paymentStatus: FAILED / PENDING
```

### 5. Local Webhook Testing (Stripe CLI)
To test Webhooks locally with Stripe CLI:
```bash
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Copy the printed `whsec_...` signature secret into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

