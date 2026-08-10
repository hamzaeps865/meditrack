# MediTrack — Admin Role Overview

> **Access:** All admin routes are guarded at the page level (`session.user.role !== 'admin'` → redirect to `/login`) and at the server-action level via `requireRole(['admin'])`. Admins bypass all resource-ownership scoping checks (doctor owns, patient owns, etc.).

---

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [Appointments](#2-appointments)
3. [Patients](#3-patients)
4. [Doctors](#4-doctors)
5. [Users](#5-users)
6. [Health Alerts](#6-health-alerts)
7. [Billing](#7-billing)
8. [Pharmacy](#8-pharmacy)
9. [Audit Logs](#9-audit-logs)
10. [Settings](#10-settings)
11. [RBAC Summary](#11-rbac-summary)
12. [Feature Matrix](#12-feature-matrix)

---

## 1. Dashboard

**Route:** `/admin`

The landing page after admin login. Gives a real-time snapshot of the entire clinic.

### Stats Cards (4 tiles)
| Card | Data Source | Link |
|---|---|---|
| Total Patients | `patients` table (non-deleted) | `/admin/patients` |
| Today's Appointments | `appointments` filtered to today | `/admin/appointments` |
| Active Doctors | `doctors` table (row count) | `/admin/doctors` |
| System Users | `users` table (all roles) | `/admin/users` |

### Today's Schedule
- Table showing up to 6 of today's appointments
- Columns: Time, Patient (avatar + name), Doctor, Status badge
- "View All" and footer link to `/admin/appointments`

### Recent Activity
- Last 5 audit log entries
- Shows: actor name, action (viewed/created/updated/deleted), resource table, timestamp, IP address
- Links to full audit history at `/admin/audit-logs`

### Floating Action Button
- Bottom-right `+` button → `/admin/appointments/new` (quick appointment creation)

---

## 2. Appointments

**Routes:** `/admin/appointments` · `/admin/appointments/new` · `/admin/appointments/[id]`

### List Page (`/admin/appointments`)

**Stats bar:**
- Total, Completed, Cancelled, No-Show counts

**Doctor Utilization Panel:**
- Per-doctor: appointments this month + cancellation rate

**Appointment Table:**
- Columns: Time, Patient, Doctor, Reason, Status, Booked By, Live-Now indicator
- Client-side filters: by status, by doctor
- Row actions: Reschedule (modal), Cancel button

### New Appointment Page (`/admin/appointments/new`)
- Form to book a new appointment
- Selects patient, doctor, date/time, reason
- Validates against doctor's availability windows
- Concurrency-safe via `UNIQUE(doctor_id, scheduled_at)` DB constraint

### Detail Page (`/admin/appointments/[id]`)
Read-only enriched view:
- Appointment card: patient demographics, doctor info, booking metadata
- Visit record: vitals, chief complaint, diagnosis, clinical notes
- Prescriptions table: medicine, dosage, frequency, duration
- Safety flags: allergies, blood group

### Supported Actions
| Action | Function | Also accessible by |
|---|---|---|
| Book appointment | `bookAppointment()` | receptionist, patient (self) |
| Update status | `updateAppointmentStatus()` | receptionist, doctor (limited) |
| Reschedule | `rescheduleAppointment()` | receptionist |
| Cancel | `cancelAppointment()` | receptionist |
| Walk-in | `createWalkInAppointment()` | receptionist, nurse |
| Follow-up | `scheduleFollowUp()` | doctor |

### Appointment Status Lifecycle
```
scheduled → checked_in → in_progress → completed
any state → cancelled | no_show
```

### Side Effects on Completion
When an appointment is marked `completed`:
1. Invoice auto-generated (reads `consultation_fee` from system settings)
2. +20 health points awarded to patient
3. Medication reminders generated from prescriptions

---

## 3. Patients

**Routes:** `/admin/patients` · `/admin/patients/[id]`

### List Page (`/admin/patients`)

**Stats bar:**
- Male / Female demographic bar
- New patients this month (with growth %)
- Inactive this week

**Patient Table:**
- Columns: Patient ID, Name, Age/Gender, Phone, Primary Doctor, Registered By, Date, Status
- Tabs: Active / Inactive (soft-deleted)
- Search: by name, phone number, or patient ID
- Sort: Newest / Oldest / Name A–Z

### Detail Page (`/admin/patients/[id]`)
- Full demographics: name, DOB, gender, phone, email, address, blood group, allergies, emergency contact
- Medical info panel
- Recent Visits (last 3): vitals, diagnosis preview
- Full Appointment History: upcoming + past
- Registration summary card
- Quick actions: Book Appointment, View Audit Logs
- Inline edit via `EditPatientModal`

### Supported Actions
| Action | Function | Notes |
|---|---|---|
| List all | `getAllPatients()` | Also: receptionist, doctor |
| Search | `searchPatients(query)` | By name or phone; also: receptionist, doctor |
| Get by ID | `getPatientById(id)` | Audit-logged; also: receptionist, doctor |
| Create | `createPatient(input)` | Also creates user account if email given; also: receptionist |
| Update | `updatePatient(id, input)` | PATCH semantics; also: receptionist |
| Soft delete | `softDeletePatient(id)` | Admin only — sets `deletedAt`; never hard-deletes |

> **Important:** Clinical records (visits, prescriptions) are never deleted. Patient records use soft-delete only.

---

## 4. Doctors

**Routes:** `/admin/doctors` · `/admin/doctors/[id]` · `/admin/doctors/[id]/availability`

### List Page (`/admin/doctors`)

**Doctor Table:**
- Columns: Name/Email, Specialization, License ID, Availability (days + hours/week), Patient Count, Status, Actions
- Filter chips: by specialization, "Active Only" toggle
- Pagination: 10 per page

### Detail Page (`/admin/doctors/[id]`)

**Stats cards:**
- Total Appointments, This Month, Patients Seen, Weekly Hours

**Sections:**
- Profile header: name, specialization, license, email, joined date
- Recent Appointments list (last 5)
- Weekly Schedule panel (availability windows by day of week)
- Patient Reviews section (star ratings)

### Availability Page (`/admin/doctors/[id]/availability`)
- Admin can manage any doctor's time slots
- Same `AvailabilityManager` component as doctor self-service
- Add, edit, or delete availability blocks per day

### Supported Actions
| Action | Function | Notes |
|---|---|---|
| List (enriched) | `getAllDoctorsAdmin()` | Admin only — includes availability + patient counts |
| List (simple) | `getAllDoctors()` | Also: receptionist, doctor, patient (for booking dropdowns) |
| Create | `createDoctor(input)` | Creates user (role=doctor) + doctor profile; if email exists, promotes existing user |
| Update | `updateDoctor(id, input)` | Name, specialization, license number |
| Delete | `deleteDoctor(id)` | Hard-deletes doctor profile; demotes user account to `patient` role |
| Add availability | `addAvailability()` | Also: doctor (own schedule) |
| Update availability | `updateAvailability()` | Also: doctor (own schedule) |
| Delete availability | `deleteAvailability()` | Also: doctor (own schedule) |

---

## 5. Users

**Route:** `/admin/users`

Central user management — every account in the system regardless of role.

### What It Shows
- Table: Name, Email, Join Date, Current Role (badge + dropdown), Actions
- Total user count

### Supported Actions
| Action | Function | Notes |
|---|---|---|
| List all users | `getAllUsers()` | Admin only |
| Assign role | `assignRole(input)` | Any of 7 roles; admin cannot demote themselves |
| Update name | `updateUserName(input)` | Admin cannot rename themselves here |
| Deactivate | `deactivateUser(userId)` | Sets role to `patient`; no hard delete; cannot deactivate self |

### Role Assignment Rules
- Admin can assign any role: `admin | doctor | receptionist | patient | nurse | pharmacist | lab`
- Self-protection: admin cannot remove their own `admin` role
- Deactivation: downgrades staff accounts to `patient` (effectively removes access)

---

## 6. Health Alerts

**Route:** `/admin/alerts`

Broadcast community health alerts to patients, filterable by city.

### What It Shows
- 3 stat cards: Total Alerts, Active, Critical Active
- Alert list with title, severity badge, city scope, expiry, and delete action
- Managed by `AlertManager` client component

### Supported Actions
| Action | Function | Notes |
|---|---|---|
| Create | `createHealthAlert(input)` | Admin only |
| List all | `getAllHealthAlerts()` | Admin only — includes expired |
| List active (city) | `getActiveAlertsForCity(city)` | Also: doctor, receptionist, patient |
| Delete | `deleteHealthAlert(id)` | Admin only — hard delete |

### Alert Fields
| Field | Type | Notes |
|---|---|---|
| Title | string (3–255 chars) | Required |
| Message | string (10–2000 chars) | Required |
| Disease | string (optional) | e.g. "Dengue", "Flu" |
| Severity | enum | `low` / `medium` / `high` / `critical` |
| City | string (optional) | `null` = broadcast to all cities |
| Expires At | datetime (optional) | `null` = never expires |

---

## 7. Billing

**Route:** `/admin/billing`

Invoice tracking and payment management. Currency: Pakistani Rupees (stored as paisa/cents).

### What It Shows
- 4 summary cards: Total Revenue (paid), Outstanding, Total Invoices, Paid Invoices
- Invoice table: Patient, Doctor, Date, Amount, Status, Actions

### Invoice Statuses
- `pending` — awaiting payment
- `paid` — payment received
- `waived` — fee waived

### Supported Actions
| Action | Function | Also accessible by |
|---|---|---|
| List invoices | `getInvoices(filters?)` | receptionist |
| Summary stats | `getBillingSummary()` | receptionist |
| Mark paid | `markInvoicePaid(input)` | receptionist — records payment method + timestamp |
| Print receipt | `getInvoiceForPrint(id)` | receptionist, doctor, patient |
| Outstanding balance | `getOutstandingBalance(patientId)` | receptionist, patient |

### Auto-Invoice Generation
Invoices are created automatically when a visit is completed — no manual creation needed.
- Triggered by `updateAppointmentStatus()` → `completed`
- Amount read from `system_settings` key `consultation_fee` (set in Settings → Appointment Settings)
- Default fallback: Rs 2,000.00
- Idempotent: duplicate inserts are silently ignored

---

## 8. Pharmacy

**Route:** `/admin/pharmacy`

Full pharmacy management: medicine catalog, inventory batches, dispensing, and alerts.

### What It Shows
- 4 summary cards: Medicines in Catalog, Total Stock Value (cost), Low Stock Count, Expiring in 30 Days
- Tabbed interface: **Catalog** · **Inventory** · **Pending Dispensing** · **Dispense History**

### Medicine Catalog Tab
| Action | Function | Also accessible by |
|---|---|---|
| List all | `getAllMedicines()` | pharmacist |
| Search/autocomplete | `searchMedicines(query)` | doctor, nurse, receptionist |
| Add medicine | `addMedicineUI()` / `addMedicine()` | pharmacist |
| Update medicine | `updateMedicine(id, input)` | pharmacist |

**Medicine Fields:** name, generic name, category, form (tablet/capsule/syrup/injection/drops/cream/inhaler/other), strength, manufacturer, reorder level, unit price

### Inventory Tab
| Action | Function | Also accessible by |
|---|---|---|
| View inventory | `getInventory()` | doctor, pharmacist |
| Add stock batch | `addStock(input)` | pharmacist |
| Adjust quantity | `adjustStock()` / `adjustStockUI()` | pharmacist |
| Low stock alerts | `getLowStockAlerts()` | Admin only |
| Expiry alerts | `getExpiryAlerts(daysAhead)` | Admin only — default 30 days |

**Batch Fields:** medicine, batch number, quantity, reorder level, expiry date, cost price, supplier, received date

### Pending Dispensing Tab
- Queue of prescription items from completed visits not yet dispensed

| Action | Function | Also accessible by |
|---|---|---|
| View queue | `getPendingDispensings()` | pharmacist |
| Dispense item | `dispensePrescriptionItem(input)` | pharmacist |
| Undo dispensing | `undoDispensing(id)` | pharmacist — restores stock |

**Dispensing is transactional:** stock decremented and dispensing record created atomically. Unique constraint prevents double-dispensing.

### Dispense History Tab
| Action | Function | Also accessible by |
|---|---|---|
| View history | `getDispenseHistory(limit)` | pharmacist |

---

## 9. Audit Logs

**Route:** `/admin/audit-logs`

Append-only security log of all access to sensitive patient data. No mutations allowed through the UI.

### What It Shows
- Paginated table: Timestamp (ms precision), User Identity + Role Badge, Action Badge, Resource, Record ID (short), IP Address

### Columns
| Column | Description |
|---|---|
| Timestamp | `yyyy-MM-dd HH:mm:ss.SSS` — millisecond precision |
| User Identity | Actor name + role badge (color-coded by role) |
| Action | `VIEW` / `CREATE` / `UPDATE` / `DELETE` badges |
| Resource | Patient Records / Visits / Prescriptions |
| Record ID | Shortened UUID (`ABC-DEF-012` format) |
| IP Address | Requester's IP |

### Filters
| Filter | Options |
|---|---|
| System User | Dropdown of all users |
| Action Type | view / create / update / delete |
| Resource | patients / visits / prescriptions |
| Date Range | From → To date pickers |

Active filter chips show above the table, with individual clear buttons and a "Clear All" link.

### Pagination
- Page sizes: 10 / 25 / 50 / 100 rows
- Full pagination controls: First / Prev / numbered pages / Next / Last
- Shows "Showing X–Y of Z records"

### Export
- **Export CSV** button → `GET /api/audit-logs/export` with current filter params applied
- Respects all active filters (action, resource, date range)

### What Gets Logged
All reads via `getPatientById()` → `auditRead()`, and all writes via `withAudit()`:
- Patient record reads
- Patient creates, updates, soft-deletes
- Visit creates and updates

---

## 10. Settings

**Route:** `/admin/settings`

5-tab sidebar for system-wide configuration. All settings stored as key/value text in the `system_settings` table.

### Tab 1 — Clinic Information
- Clinic name
- Contact email
- Phone number
- Physical address
- Operating hours per day of week (open/closed toggle + start/end time)
- Logo upload *(placeholder — coming soon)*

### Tab 2 — Appointment Settings
| Setting | Type | Notes |
|---|---|---|
| Consultation fee (Rs) | number | Stored in paisa; used by `autoGenerateInvoice()` |
| Slot duration | select | 15 / 20 / 30 / 45 / 60 min |
| Buffer time | select | 0–20 min between slots |
| Booking window | select | 7–90 days ahead |
| Allow Patient Self-Booking | toggle | |
| Require Doctor Approval | toggle | |
| Allow Cancellations | toggle | |

### Tab 3 — Notifications
| Setting | Type |
|---|---|
| Email Reminders | toggle |
| SMS Reminders | toggle |
| Reminder Lead Time | 1–48 hours |
| New Patient Alert | toggle |
| Cancellation Alert | toggle |
| Daily Digest | toggle |

### Tab 4 — Security
- Change own password (`changeOwnAdminPassword()`)
- Two-Factor Authentication toggle
- Session timeout (15–240 min)
- Edit own display name (`updateOwnAdminProfile()`)

### Tab 5 — Roles & Permissions
- UI tab declared; role assignment lives in `/admin/users`

### Actions
| Action | Function |
|---|---|
| Load all settings | `getSystemSettings()` |
| Load one setting | `getSystemSetting(key)` |
| Save (batch upsert) | `setSystemSettings(input)` |

---

## 11. RBAC Summary

```
Admin bypasses ALL resource-ownership scoping checks.
```

### Role Hierarchy for Admin-Exclusive Actions
| Action | Admin | Other Roles |
|---|---|---|
| Soft-delete patient | ✅ | ✗ |
| Hard-delete doctor | ✅ | ✗ |
| Assign / change roles | ✅ | ✗ |
| Deactivate users | ✅ | ✗ |
| Create / delete health alerts | ✅ | ✗ |
| View audit logs | ✅ | ✗ |
| Export audit logs CSV | ✅ | ✗ |
| System settings | ✅ | ✗ |
| Low stock / expiry pharmacy alerts | ✅ | ✗ |
| Pharmacy summary stats | ✅ | ✗ |

### Shared Admin Access
| Action | Admin + ... |
|---|---|
| Book / reschedule appointments | receptionist |
| Patient create / update | receptionist |
| Patient read / search | receptionist, doctor |
| Invoice list / mark paid | receptionist |
| Medicine catalog / inventory | pharmacist |
| Dispensing queue / history | pharmacist |

---

## 12. Feature Matrix

| Module | Create | Read | Update | Delete | Admin-Only? |
|---|---|---|---|---|---|
| Dashboard | — | ✅ | — | — | ✅ Yes |
| Appointments | ✅ | ✅ | ✅ status + reschedule | soft (cancel) | Shared w/ receptionist |
| Patients | ✅ | ✅ | ✅ | ✅ soft-delete | Soft-delete: admin only |
| Doctors | ✅ | ✅ | ✅ | ✅ hard-delete | ✅ Yes |
| Users | — | ✅ | ✅ role + name | deactivate | ✅ Yes |
| Health Alerts | ✅ | ✅ | — | ✅ hard-delete | ✅ Yes |
| Billing | auto | ✅ | ✅ mark paid | — | Shared w/ receptionist |
| Pharmacy | ✅ | ✅ | ✅ | ✅ undo dispense | Shared w/ pharmacist |
| Audit Logs | — | ✅ + export | — | — | ✅ Yes |
| Settings | — | ✅ | ✅ batch upsert | — | ✅ Yes |

---

*Generated from source: `src/app/(dashboard)/admin/`, `src/server/actions/`, `src/server/auth/rbac.ts`*
