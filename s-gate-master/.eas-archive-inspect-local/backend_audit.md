# Admin Dashboard: Backend Integration Audit

This audit outlines the current state of API integrations across the S-Gate Admin suite. The goal is to identify all hardcoded/mocked data and define the expected contracts for backend implementation to ensure a production-ready system.

## 📊 Summary of API Status

| Module | Status | Core Endpoints |
| :--- | :--- | :--- |
| **Onboarding Requests** | ✅ Ready | `/resident/onboarding/admin/...` |
| **Helpdesk (Complaints)**| ✅ Ready | `/community/complaints/...` |
| **Gate Passes** | ✅ Ready | `/gate/passes/...` |
| **Guard Management** | ✅ Ready | `/auth/resident-app/guards` |
| **Resident Directory** | 🧪 Mocked (CRUD) | `/resident/onboarding/...` (Partial) |
| **Finance & Billing** | 🧪 Mocked | `/admin/billing/...`, `/admin/dues` |
| **Staff & Payroll** | 🧪 Mocked | `/admin/staff/...` |
| **Broadcast & Intercom**| 🧪 Mocked | `/admin/broadcast`, `/admin/intercom` |

---

## 1. ✅ Ready APIs (Production-Ready)

These modules are fully integrated with the backend and adhere to the established schema.

### Onboarding Management
*   **List Requests:** `GET /resident/onboarding/admin/pending?status={status}`
*   **Approve:** `PATCH /resident/onboarding/admin/{id}/approve`
*   **Reject:** `PATCH /resident/onboarding/admin/{id}/reject` { "reason": string }
*   **Request Resubmit:** `PATCH /resident/onboarding/admin/{id}/request-resubmit` { "reason": string, "documentsToResubmit": string[] }

### Helpdesk (Complaints)
*   **List/Filter:** `GET /community/complaints`
*   **Details:** `GET /community/complaints/{id}`
*   **Update/Assign:** `PATCH /community/complaints/{id}` { "status": string, "assignedToId": string }

### Gate Passes
*   **List/Details:** `GET /gate/passes` / `GET /gate/passes/{id}`
*   **Admin Approval:** `PATCH /gate/passes/{id}/approve`
*   **Admin Rejection:** `PATCH /gate/passes/{id}/reject` { "reason": string }

---

## 2. 🧪 Mocked APIs (Backend Implementation Required)

The following modules have UI implementations but rely on developer-side mocks or local state.

### A. Finance & Billing (Prioritized)

| Feature | Endpoint | Method | Status |
| :--- | :--- | :--- | :--- |
| **Bulk Generate** | `/admin/billing/generate` | POST | 🧪 Mocked |
| **Apply Penalty** | `/admin/billing/penalty` | POST | 🧪 Mocked |
| **List Dues** | `/admin/dues` | GET | 🧪 Mocked |

#### 1. Bulk Invoice Generation
**Request Payload:**
```json
{
  "month": "April 2024",
  "amountPerFlat": 2500,
  "description": "Monthly Maintenance"
}
```
**Expected Behavior:** Backend should generate an invoice for every flat currently marked as `OCCUPIED`. If an invoice for this month already exists for a flat, it should not be duplicated.

#### 2. Apply Late Penalty
**Request Payload:**
```json
{
  "amount": 500
}
```
**Expected Behavior:** Backend should identify all invoices currently in `OVERDUE` status and append this amount to their total `amountDue` or create a new line item.

#### 3. List All Society Dues
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "amount": 2500,
      "status": "PENDING", // PENDING, PAID, OVERDUE
      "month": "April 2024",
      "dueDate": "2024-04-10T00:00:00Z",
      "residentName": "Amit Sharma",
      "flatNumber": "A-102",
      "blockName": "Block A"
    }
  ]
}
```

---

### B. Staff & Payroll Management

| Feature | Endpoint | Method | Status |
| :--- | :--- | :--- | :--- |
| **List Staff** | `/admin/staff` | GET | 🧪 Mocked |
| **Attendance** | `/admin/staff/attendance` | GET | 🧪 Mocked |

#### 1. Staff Directory (Normalized Schema)
Frontend expects a specific `StaffMember` object.
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "staff-uuid",
      "name": "Ramesh Kumar",
      "phone": "+919876543210",
      "role": "GUARD", // GUARD, MAID, PLUMBER, ELECTRICIAN, etc.
      "status": "ACTIVE", // ACTIVE, INACTIVE, SUSPENDED
      "salary": 15000,
      "shiftStart": "08:00",
      "shiftEnd": "20:00",
      "assignedFlats": ["A-101", "B-202"], // Can be ["SOCIETY"] for common staff
      "agencyName": "Shield Security", // Optional
      "photoUrl": "https://..."
    }
  ]
}
```

#### 2. Attendance Logs
**Endpoint:** `/admin/staff/attendance?date=YYYY-MM-DD`
**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "att-uuid",
      "staffId": "staff-uuid",
      "date": "2024-04-06",
      "checkInTime": "2024-04-06T08:05:00Z",
      "checkOutTime": "2024-04-06T20:10:00Z", // Null if still working
      "status": "PRESENT" // PRESENT, ABSENT, LATE, HALF_DAY
    }
  ]
}
```

---

### C. Broadcast & Push Notifications

#### 1. Send Broadcast
**Endpoint:** `/admin/broadcast`
**Method:** POST
**Request Payload:**
```json
{
  "title": "Emergency Maintenance",
  "message": "Water supply will be cut for 2 hours.",
  "isEmergency": true,
  "target": "ALL" // ALL, BLOCK_A, BLOCK_B
}
```
**Expected Behavior:**
1. Save the broadcast to the database notices table.
2. Filter users based on the `target`.
3. **Trigger FCM/PN:** Send a real-time push notification to all devices registered to those users.
4. If `isEmergency` is true, ensure the notification bypasses "Do Not Disturb" settings if possible (e.g. Critical Alerts on iOS).


---

## 3. ❌ Missing / To Be Discussed

These features are in the UI but lack a corresponding backend strategy.

1.  **Resident Direct CRUD:**
    *   *Current:* Front-end only manages residents approved via onboarding.
    *   *Needed:* `POST /admin/residents` to manually register a resident without the onboarding flow.
2.  **Staff Editing:**
    *   Endpoint needed for updating salary, roles, and shift timings for individual staff members.
3.  **Vehicle Entry & Parking Enforcement:**
    *   *Needed:* `GET /admin/vehicles?q={plate}` to lookup vehicles by license plate or sticker across the society.
    *   *Needed:* `POST /admin/vehicles/{id}/violations` to issue a parking ticket or clamp vehicle (penalty).

---

## Action Plan for Backend Team

1.  **Finance Endpoints:** Prioritize `/admin/billing/...` to enable society-wide automated billing.
2.  **Staff Schema:** Normalize the `/admin/staff` response to match the frontend `StaffMember` interface.
3.  **Push Integration:** Implement the logic for `/admin/broadcast` to trigger FCM notifications to all resident devices in 4. the target group.

> [!TIP]
> All Admin APIs must verify `user.role === 'ADMIN'` or `'SUPER_ADMIN'` in the backend middleware.
