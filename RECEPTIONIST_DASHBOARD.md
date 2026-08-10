# Receptionist Dashboard — Feature Reference

This document covers every feature available to a user with the `receptionist` role in MediTrack.

---

## Navigation

The sidebar has 4 sections plus a quick-action button.

| Label | Route |
|---|---|
| Dashboard | `/receptionist` |
| Patients | `/receptionist/patients` |
| Appointments | `/receptionist/appointments` |
| Settings | `/receptionist/settings` |

**Quick action button:** "Book Appointment" → `/receptionist/appointments`

---

## 1. Dashboard `/receptionist`

The home screen gives a live, real-time overview of the entire clinic's activity for the current day.

**Top bar**
- Receptionist's name and "Front Desk Operations" label
- Current date
- Notification bell

**Header banner**
- Title: "Reception Desk Overview"
- Subtitle: "Live clinic queue, patient intake shortcuts, and doctor occupancy"
- Three quick-action buttons: Register Patient · Manage Schedule · Walk-In Patient

### Metric Cards (4 tiles)

| Card | What it shows |
|---|---|
| Total Scheduled Today | Total number of appointments on record for today |
| Waiting Room Queue | Count of patients currently checked-in (highlighted with amber ring when > 0) |
| In Consultation | Count of appointments currently in-progress |
| Completed Today | Count of visits finished today |

### Waiting Room Queue (live panel)

- Live list of all patients who have checked in and are waiting to be seen
- Each row shows: patient avatar + name · assigned doctor · scheduled time · "Checked-in" badge
- Empty state shown when no patients are waiting
- Animated pulse dot in the panel header indicates live status

### Today's Appointment Schedule

- Full chronological list of every appointment for today across all doctors
- Each row: time · patient name · doctor name · reason · status badge
- **Quick Check-in button** — appears inline on any `scheduled` appointment; one click moves it to `checked_in` without leaving the dashboard
- Status badges: Scheduled · Waiting · In Visit · Completed · Cancelled · No-show
- "Full Grid" link navigates to the full calendar appointments page

### Quick Actions panel (right column)

Three shortcut cards:
- Register New Patient → `/receptionist/patients/new`
- Book / Reschedule → `/receptionist/appointments`
- Search Patient Records → `/receptionist/patients`

### Attending Doctors panel (right column)

- List of all doctors registered in the system with total today's appointment count per doctor
- Live occupancy status per doctor:
  - Orange pulse dot + "In visit with: [Patient Name]" when actively in a consultation
  - Green dot + "Available / No active visit" when free

---

## 2. Appointments `/receptionist/appointments`

A visual calendar grid for managing the full clinic schedule.

### Toolbar

- **Day / Week view toggle**
- **Date navigation:** Previous / Today / Next buttons
- **Current date label** (e.g. "Monday, Aug 10, 2026")
- **Book Appointment button** → opens the booking modal (slide-in panel from the right)

### Stats strip

Four count tiles for the selected day:
- Total Today · Scheduled · Checked In · Completed

### Calendar Grid

- Columns: one per doctor (all registered doctors are always shown, even with no appointments)
- Column headers: doctor name + specialization
- Rows: 30-minute time slots from 08:00 to 18:00
- Each booked slot appears as a colored card inside the cell showing:
  - Status color-coded left border and background
  - Status dot + patient name
  - Reason for visit
  - Status badge pill
- Clicking any appointment card navigates to `/receptionist/appointments/[id]`
- Empty slots are left blank (no visual noise)
- Horizontally scrollable on small screens

### Book Appointment Modal

A slide-in panel (right side) with:

1. **Patient search** — live debounced search (300ms) by name or ID; results show name + phone; selected patient shown as a removable chip
2. **Assigned Doctor** — dropdown of all doctors with specialization
3. **Date picker** — date input (today or future only)
4. **Time picker** — dropdown of 30-minute slots from 08:00 to 18:00
5. **Available Slots quick-pick** — visual slot buttons for common times today; clicking one sets both date and time
6. **Reason for Visit** — optional free-text textarea (max 1000 chars)
7. **Attach Records** — drag-and-drop area for medical records or referral (UI only, not yet wired to storage)
8. **Confirm Booking** / Cancel buttons

On success: toast confirmation + calendar grid refreshes automatically.

---

## 3. Appointment Detail `/receptionist/appointments/[id]`

Full details for a single appointment with status management controls.

### Header card

- Patient name + current status badge
- Age, gender, appointment date and time
- Reason for visit
- **Status action buttons** (context-sensitive, shown based on current status):

| Current Status | Available Actions |
|---|---|
| Scheduled | Check In Patient · Mark No-show · Cancel |
| Checked-in | Cancel |
| In Progress / Completed | Read-only (no actions) |

Clicking an action button immediately updates the status in the database and refreshes the page.

### Left sidebar

- **Patient panel** — avatar, name, phone number, "View Patient Profile" link
- **Doctor panel** — avatar, doctor name, specialization
- **Booking Info panel** — Booked By (name + role), booking creation date, appointment ID
- **Safety Info panel** (shown only when data exists) — allergies as red pills + blood group

### Right column

**Appointment Details card**
- Date · Time · Doctor · Specialization · Status · Reason

**Visit Record card (read-only)**
- Shows "Pending" badge if the doctor hasn't started the visit yet
- Once the doctor starts: displays vitals (BP, Temperature, Weight) + Chief Complaint + Diagnosis
- Receptionist cannot edit visit data — this is read-only

---

## 4. Walk-In Patient

A modal accessible from the dashboard header "Walk-In Patient" button. Used for unscheduled patients who arrive without a prior booking.

**Fields:**
- Patient search (debounced, by name or phone)
- Doctor selection dropdown
- Reason for visit (optional)

**On submit:** creates an appointment scheduled at the current time (via `createWalkInAppointment`) and adds it to the day's schedule immediately.

---

## 5. Patients List `/receptionist/patients`

Full patient registry — all patients in the system, not scoped to a doctor.

**Header**
- Total patient count in the system
- "Register Patient" button → opens the Register Patient modal

### Search & Filters

- **Search box** — by name, phone number, or patient ID (client-side, instant)
- **Gender filter** — dropdown populated dynamically from actual data
- **Blood Group filter** — dropdown populated dynamically from actual data
- **Registration Date filter** — date picker for exact registration date
- **Clear Filters** button — appears when any filter is active
- **Sort** — Registered (Newest) · Registered (Oldest) · Name A–Z

### Patient Table

Columns: Patient ID · Name (avatar + link) · Age/DOB · Phone · Gender · Blood Group · Registered Date · Actions

- 10 patients per page with numbered pagination controls
- Each name is a clickable link to the patient detail page
- **Actions menu** (three-dot ⋮) per row:
  - View
  - Edit
  - Book Appointment

---

## 6. Register Patient

Available as both a **dedicated page** (`/receptionist/patients/new`) and a **modal** (from the Patients list page). Both use the same form fields.

The modal is a slide-in panel from the right with 4 numbered sections:

**Section 1 — Basic Information**
- Full Name (required, min 2 chars)
- Date of Birth (required, date picker, max: today)
- Gender (required: Male / Female / Other)

**Section 2 — Contact Details**
- Phone Number (required)
- Email Address (optional)
- Password + Confirm Password (optional; min 8 chars if provided — allows patient portal login)
- Residential Address (optional textarea)

**Section 3 — Emergency Contact**
- Contact Name
- Relationship (e.g. Spouse)
- Emergency Phone

**Section 4 — Medical Basics**
- Blood Group (A+ / A- / B+ / B- / AB+ / AB- / O+ / O-)
- Known Allergies (comma-separated, e.g. "Penicillin, Peanuts")

On success: toast confirmation + patient list refreshes.

---

## 7. Patient Detail `/receptionist/patients/[id]`

Full profile view for a single patient.

### Header
- Patient name + ID badge
- Age, DOB, gender, blood group
- **Edit Contact Info button** → opens Edit Patient modal
- **Book Appointment button** → navigates to appointments with patient pre-filtered

### Left column — Demographics card
- Phone number
- Email address
- Residential address
- Emergency contact details

### Left column — Allergies & Medical Conditions card
- Allergies listed as red pills
- Blood group badge

### Left column — Appointment History table
- All appointments (upcoming and past) across all doctors
- Columns: Date · Time · Doctor · Status · Reason
- Upcoming appointments shown in a highlighted "Upcoming" section
- Past appointments shown below in a "Past" section
- "View All" link to the full appointments page filtered by patient

### Right column — Registration Summary card (dark green)
- Registered Since date
- Total Appointments count
- Last Appointment date

### Right column — Quick Actions
- Book Appointment
- Edit Contact Info
- Print Patient Summary

### Right column — Address map card
- Decorative map placeholder showing the patient's residential address (shown only when address is recorded)

---

## 8. Edit Patient Modal

Accessible from the Patient Detail page via the "Edit Contact Info" button.

Slide-in panel (right side) with a patient identity card at the top (showing initials avatar + name + ID).

**Editable fields:**
- Full Name
- Phone Number
- Email Address
- Residential Address
- Emergency Contact (name, relationship, phone as free text)

**Read-only:** Blood group, allergies, date of birth, gender — these require admin or doctor-level changes.

On save: updates the patient record in the database and refreshes the page.

---

## 9. Notifications

The receptionist receives real-time bell notifications (top bar) for:

| Event | Notification |
|---|---|
| Patient checks in | "Patient Checked In — [Name] is checked in and waiting." |
| Appointment cancelled today | "Appointment Cancelled — [Name] cancelled their appointment." |

Notifications link back to `/receptionist/appointments` for immediate action. Up to 5 check-in notifications and 3 cancellation notifications are shown at a time.

---

## 10. Settings `/receptionist/settings`

A tabbed settings page with a left navigation and right content area.

**Staff summary card at top:**
- Avatar (initials), name, email, "Reception Staff" + "Verified Active" badges
- System Access Level label: "Patient Intake & Scheduling"

### Tab 1 — Profile Information

- **Full Name** — editable
- **Email Address** — read-only (managed by admin)
- **Desk Location / Station** — editable (e.g. "Front Desk — Main Lobby (Station #2)")
- **Extension / Phone** — editable (e.g. "Ext. 4021")

Saves via `updateOwnReceptionistProfile` server action.

### Tab 2 — Desk & Workstation Preferences

- **Live Queue Refresh Interval** — 15s / 30s / 60s / Manual only
- **Default Appointments Filter** — All Today's / Scheduled Only / Checked-in Only
- **Sound Alert on Patient Check-in** — toggle (play a chime when patient checks in)
- **Require Check-in Confirmation Modal** — toggle (show a confirmation prompt before marking checked-in)

### Tab 3 — Security & Password

- **Current Password** field (with show/hide toggle)
- **New Password** field (with show/hide toggle + strength bar indicator)
- Password strength bar: Weak (red) → Fair (amber) → Good (green) → Strong (green)
- Saves via `changeOwnReceptionistPassword` server action (bcrypt-verified)

### Tab 4 — Notifications

Three toggles (visual; not yet persisted to backend):
- Email Alerts for Registration
- Appointment Cancellation Alerts
- Doctor Absence / Schedule Shift Alerts

### Sign Out (bottom card)

- Red-bordered card with "Sign Out" button
- Ends the session and redirects to `/login`

---

## Receptionist-Specific Components

| Component | Purpose |
|---|---|
| `quick-checkin-button.tsx` | One-click check-in button inline on the dashboard schedule |
| `book-appointment-button.tsx` | Trigger button that opens the booking modal |
| `book-appointment-modal.tsx` | Full appointment booking form (patient search, doctor, date/time, reason) |
| `walk-in-modal.tsx` | Instant walk-in appointment creation for unscheduled arrivals |
| `register-patient-modal.tsx` | New patient registration form (4-section slide-in panel) |
| `edit-patient-modal.tsx` | Edit contact details for an existing patient |
| `update-status-button.tsx` | Status transition buttons on appointment detail (check-in, cancel, no-show) |
| `receptionist-settings-form.tsx` | Tabbed settings form (profile, desk prefs, security, notifications) |

---

## Receptionist RBAC Permissions

| Resource | Permission |
|---|---|
| All patients | Read + Create + Update (contact details only) |
| All appointments | Read (all doctors) + Create (book/walk-in) + Update status |
| Appointment status transitions | Scheduled → Checked-in, Scheduled → No-show, Scheduled → Cancelled, Checked-in → Cancelled |
| Doctor list | Read (for booking dropdowns) |
| Doctor availability | Read (for slot generation) |
| Visit records | Read-only (vitals, diagnosis — set by doctor) |
| Billing / invoices | Read + Mark as Paid |
| Own profile & password | Update |
| Notifications | Receive (checked-in patients + cancellations today) |

A receptionist **cannot** access: admin management pages, pharmacy dispensing, lab test results, clinical visit forms, or the audit log.
