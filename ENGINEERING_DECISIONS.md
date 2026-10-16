# Engineering Decisions & System Architecture

This document details the engineering choices, database design, concurrency handling strategies, and scalability roadmap for the Enterprise EMR Appointment Management System.

---

## 1. Project Architecture

### Architecture Choice: Layered Controller-Service Architecture
The backend follows a modular, layered structure:
```
routes/ ➔ middlewares/ ➔ controllers/ ➔ services/ ➔ models/
```
- **Routes**: Expose clean REST endpoints (`/api/v1/...`).
- **Middlewares**: Enforce authentication (JWT), RBAC authorization, and centralized error handling.
- **Controllers**: Handle HTTP request extraction, validation, and standard response formatting.
- **Services**: Encapsulate reusable domain logic (e.g., `slotService` for dynamic schedule calculation and break exclusion).
- **Models**: Mongoose schemas enforcing constraints, hooks, and indexes.

### Why this architecture?
1. **Separation of Concerns**: Controllers stay thin and readable, while business logic resides in dedicated services.
2. **Maintainability & Testability**: Business logic can be unit-tested without mocking Express `req`/`res` objects.
3. **Production Readiness**: Scales smoothly as new features (e.g., billing, prescriptions, lab results) are introduced.

---

## 2. MongoDB Schema Design

The data model uses normalized references with targeted denormalization for high-read performance:

1. **User Collection**:
   - Stores Super Admins, Doctors, and Receptionists with role-based access.
   - Passwords hashed using `bcrypt` via a `pre("save")` hook.
   - Includes refresh tokens for session rotation and revocation.

2. **Department Collection**:
   - Represents medical specialties (Cardiology, General Medicine, Pediatrics, etc.).

3. **DoctorSchedule Collection**:
   - Decoupled from the User model to allow flexible scheduling without bloating user profiles.
   - Stores working days, session windows (`startTime`–`endTime`), break periods (e.g., lunch), and slot duration in minutes.

4. **Patient Collection**:
   - Auto-generates unique human-readable IDs (`PAT-XXXXXX`).
   - Indexed on `mobile`, `name`, and `patientId` for sub-millisecond autocomplete and search.

5. **Appointment Collection**:
   - References `patient`, `doctor`, and `department`.
   - Stores appointment date (`YYYY-MM-DD`) and slot time (`HH:mm`).
   - Enforces the appointment state machine: `scheduled` ➔ `arrived` ➔ `completed` or `cancelled`.

6. **AuditLog Collection**:
   - Captures User, Role, Action (`LOGIN`, `APPOINTMENT_CREATED`, `APPOINTMENT_CANCELLED`, etc.), Entity, and Timestamp for healthcare compliance.

---

## 3. Concurrency Handling & Preventing Double Booking

### The Problem
In high-concurrency environments, two receptionists or patients could attempt to book the same doctor slot at the exact same millisecond. Simple application-level checks (`findOne` followed by `create`) suffer from a race condition (Time-of-Check to Time-of-Use).

### Strategy Implemented
We implemented a **Two-Tier Defense Strategy**:

1. **Tier 1 (Application Level Check)**:
   - Before booking, query the database to verify if an active booking exists for `{ doctor, date, slotTime, status: { $ne: 'cancelled' } }`.

2. **Tier 2 (Database-Level Atomic Unique Compound Partial Index)**:
   ```javascript
   appointmentSchema.index(
     { doctor: 1, date: 1, slotTime: 1 },
     {
       unique: true,
       partialFilterExpression: { status: { $ne: "cancelled" } }
     }
   );
   ```
   - **How it works**: The MongoDB storage engine enforces uniqueness atomically. If two requests race past Tier 1, MongoDB rejects the second insert with error code `11000`.
   - **Why Partial Filter Expression?**: When an appointment is `cancelled`, the slot becomes freed for other patients. By excluding `cancelled` from the unique constraint, previous cancellations do not block re-booking the same slot.
   - **Error Handling**: The centralized `errorHandler.js` catches error code `11000` on `slotTime` and translates it to an HTTP `409 Conflict` with a user-friendly message: *"This appointment slot has already been booked. Please choose another slot."*

---

## 4. Database Indexes & Query Optimization

| Collection | Index Fields | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Fast O(1) user lookups during authentication. |
| `patients` | `{ mobile: 1 }`, `{ patientId: 1 }`, `{ name: 1 }` | Single & Compound | Enables fast prefix search across millions of patient records. |
| `appointments` | `{ doctor: 1, date: 1, slotTime: 1 }` | Unique Partial | Guarantees atomic double-booking prevention. |
| `appointments` | `{ doctor: 1, date: 1, status: 1 }` | Compound | Optimizes slot availability calculation and doctor daily schedule views. |
| `appointments` | `{ date: 1 }`, `{ status: 1 }` | Single / Compound | Accelerates server-side filtering and date range queries. |
| `auditlogs` | `{ createdAt: -1 }`, `{ action: 1 }` | Compound | Fast reverse-chronological retrieval for admin dashboards. |

---

## 5. Security Measures Implemented

1. **Bcrypt Password Hashing**: Passwords salted (10 rounds) before persisting. Plaintext passwords never stored.
2. **Dual-Token JWT Authentication**:
   - Short-lived Access Token (15m) minimizing the impact of token leakage.
   - Long-lived Refresh Token (7d) stored in the database for session invalidation on logout.
3. **Role-Based Access Control (RBAC)**:
   - Declarative middleware `authorize('super_admin', 'receptionist', ...)` guards sensitive mutations.
   - Doctors are strictly scoped to viewing only their own appointments.
4. **CORS Restrictions**: Configured to accept traffic only from authorized client origins.
5. **Sanitized Projections**: Passwords stripped by default using `{ select: false }`.
6. **Immutable Audit Trail**: Security actions (logins, cancellations, arrivals) recorded in an append-only collection.

---

## 6. Performance Optimizations

1. **Dynamic Slot Generation in Memory**:
   - Rather than storing thousands of empty slot documents per doctor in MongoDB (which wastes storage and index memory), slots are computed dynamically on-demand from schedule rules in `O(N)` time where `N` is daily slot count (~30 slots).
2. **Server-Side Pagination & Sorting**:
   - Avoids large payloads by streaming page slices using `.skip()` and `.limit()`.
3. **Selective Projection**:
   - MongoDB queries only return fields needed by the UI (`.select("name mobile patientId ...")`), reducing memory footprint and network serialization overhead.
4. **Real-Time Push via WebSockets**:
   - Replaces expensive client-side polling with Socket.IO event push (`appointment:created`, `appointment:updated`, etc.), reducing server HTTP requests by over 90%.

---

## 7. Scaling to Millions of Appointments (Architectural Roadmap)

If this system needed to scale to handle millions of appointments across hundreds of hospitals:

1. **Database Sharding**:
   - Shard the `appointments` collection on `{ department: "hashed", date: 1 }` or `{ hospitalId: 1, date: 1 }` to distribute write throughput horizontally across multiple MongoDB replica sets.
2. **Redis In-Memory Caching & Distributed Locks**:
   - Cache doctor schedules and department metadata in Redis with TTL.
   - Use Redis `Redlock` for distributed atomic slot locks with sub-millisecond latency before database persistence.
3. **Distributed Message Queue for Socket.IO**:
   - Use Redis Pub/Sub with `@socket.io/redis-adapter` so WebSocket connections scale horizontally across multiple stateless Node.js container replicas.
4. **Cold Data Archiving**:
   - Partition appointments older than 1 year into a cold archival collection or object storage (S3 / Parquet) with read-only query access, keeping the active working set small and fast in RAM.
