# Patient Dashboard — Feature Reference

This document covers every feature available to a user with the `patient` role in MediTrack.

---

## Navigation

The sidebar has 9 sections. The patient dashboard has no dedicated home page — the default route `/patient` redirects straight to My Appointments.

| Label | Route |
|---|---|
| My Appointments | `/patient/appointments` |
| Find a Doctor | `/patient/doctors` |
| My Visits | `/patient/visits` |
| Prescriptions | `/patient/prescriptions` |
| Lab Results | `/patient/lab-results` |
| Billing | `/patient/billing` |
| Family | `/patient/family` |
| Health Report | `/patient/reports` |
| Settings | `/patient/settings` |

**Profile Switcher** — shown at the top of the sidebar when a patient has added family members. Allows switching the active profile between self and any managed family member. All pages (appointments, visits, prescriptions, etc.) reflect the selected profile.

---

## 1. My Appointments `/patient/appointments`

The primary landing page. Shows the full appointment history for the active patient profile.

**Top bar**
- Patient avatar (initials) + name + "Patient" role label
- Notification bell

**Community Health Alerts Banner**
- Shown at the top when the clinic has active health alerts for the patient's city
- Each alert shows a severity badge (low / medium / high / critical), title, message, and associated disease
- Dismissible per-alert

**Managing-as indicator**
- A green banner appears when the patient is viewing a family member's profile (e.g. "Viewing appointments for Sarah")

**Header**
- Title: "My Appointments"
- Total count + upcoming count
- "Book Appointment" button → `/patient/appointments/new`

**Stats row (3 cards)**
- Upcoming · Completed · Cancelled counts

### Gamification — Health Score & Loyalty Status

Two side-by-side cards shown when data is available:

**Health Score card**
- Numeric score total
- Current tier badge with color: Starter (0+) · Bronze (50+) · Silver (200+) · Gold (500+) · Platinum (1000+)
- Progress bar toward the next tier
- Points are earned automatically: completing an appointment, posting a review, blood donation

**Loyalty Status card**
- Computed from distinct calendar months with at least one non-cancelled appointment
- Tiers: Bronze 🥉 (1+ month) · Silver 🥈 (3+ months) · Gold 🥇 (6+ months) · Platinum 💎 (12+ months)
- Shows months active and next tier milestone

### Next Appointment Banner

- Dark green hero card showing the soonest upcoming appointment
- Displays: day of week + date · time · doctor name + specialization · reason for visit
- Countdown label: "Today" / "Tomorrow" / "In X days" / day name
- Status badge

### Medication Reminders

- Shown when active prescription reminders exist
- Each reminder: medicine name · dosage · frequency · next dose time (relative, e.g. "in 2 hours")
- Overdue reminders highlighted in red with a count badge
- "Taken ✓" button — one click marks the dose as taken and schedules the next dose

### Upcoming Appointments section

- Chronological list of all future appointments
- Each row: date block (day + month) · doctor avatar + name + specialization · time · reason · status badge
- **Cancel button** — inline text button for `scheduled` or `checked_in` appointments; removes the appointment
- **Leave Review button** — appears inline for `completed` appointments; opens the review modal

### Past Appointments section

- Dimmed list of up to 12 past appointments (same row layout as upcoming)
- Shows "Showing 12 of N past appointments" if more exist
- Completed past appointments also show the "Leave Review" / "Reviewed ✓" indicator

---

## 2. Book Appointment `/patient/appointments/new`

A full-page booking form. Shows "Booking as [Patient Name]" to confirm the active profile.

**Doctor selector**
- Dropdown of all doctors with name + specialization
- Warning shown if the selected doctor has not configured availability yet

**Date picker**
- Calendar date input; minimum date = today
- Warning shown if the doctor is not available on the selected day

**Time slot grid**
- Slots generated from the doctor's weekly availability windows (30-minute intervals)
- Already booked slots are shown but greyed out with strikethrough and a "not-clickable" cursor
- Available slot count + booked count shown in header
- Fully booked date shows a warning banner instead of slots
- Selected slot highlighted in primary green

**Reason for visit**
- Optional free-text input (e.g. "Annual check-up, follow-up, acute pain")

**Info note**
- "Arrive 10 minutes early for check-in. Cancellations within 24 hours may require administrative override."

**Confirm Booking button**
- Disabled until a doctor, date, and time slot are all selected
- On success: shows a "Appointment Booked!" confirmation card and redirects to My Appointments after 1.5 seconds

---

## 3. Find a Doctor `/patient/doctors`

Browse all doctors registered in the system.

- Grid of doctor cards (2 columns on desktop)
- Each card: initials avatar · name · specialization · star rating (average + review count)
- Clicking a card navigates to `/patient/doctors/[id]` — individual doctor profile with full reviews and a direct booking button
- Empty state shown if no doctors are registered

---

## 4. My Visits `/patient/visits`

Read-only list of all consultation records for the active patient profile.

- Total visit count in header
- Each visit card shows:
  - Chief complaint (or "Consultation" fallback)
  - Visit date (day of week + full date)
  - Diagnosis (if recorded by the doctor)
  - Vitals strip: Blood Pressure (BP icon) · Temperature (thermometer icon) · Weight (scale icon)
  - Doctor's clinical notes (shown below a divider)
- Empty state shown if no visits have been recorded yet

---

## 5. Prescriptions `/patient/prescriptions`

All prescriptions issued across every completed visit.

**Stats row (3 cards)**
- Total Prescriptions · Total Medicines · Unique Doctors

**Prescription Accordion**
- Each prescription is an expandable accordion item
- Collapsed state shows: date · doctor name + specialization · diagnosis summary
- Expanded state shows:
  - Full medicine table: Medication · Dosage · Frequency · Duration · Notes
  - Vitals from that visit (BP, Temperature, Weight)
  - Chief complaint and clinical notes
- Each prescription has a **Print / Download** button for the printable prescription PDF

---

## 6. Lab Results `/patient/lab-results`

All lab orders placed by doctors for the active patient profile.

**Status system**

| Status | Icon | Color |
|---|---|---|
| Ordered | Clock | Amber |
| Completed | Checkmark | Green |
| Cancelled | Flask | Grey |

**Each lab card shows:**
- Test name + ordered date
- Status badge
- Instructions (e.g. "Fasting required")
- Result text (shown when status is Completed), with completion date
- **AI Explain button** — when a result is present, opens an AI-powered plain-language explanation of the lab result (using `LabExplainButton`)
- **View Report** button → `/patient/lab-results/[id]`
- **Print** button → `/patient/lab-results/[id]/print` (opens in new tab)

---

## 7. Billing `/patient/billing`

Invoice history for the active patient profile.

**Summary cards (2 tiles)**
- Total Paid (in Rs)
- Outstanding Balance (highlighted amber when > 0)

**Invoice table**
- Columns: Date · Amount · Status · Receipt
- Status badges: Pending (amber) · Paid (green) · Waived (grey)
- For paid invoices: "Receipt" download link → `/invoices/[id]/print`
- Empty state shown if no invoices exist yet

---

## 8. Family `/patient/family`

Manage health profiles for dependent family members (spouse, children, parents).

**Managing-as indicator**
- Shown when a family member profile is currently active; prompts to switch back via the sidebar switcher

**Add Family Member button**
- Dashed border button → opens the Add Family Member form/modal

**Family member cards (2-column grid)**
- Each card: initials avatar · name · age · gender badge · blood group badge · city badge · allergies warning (if any) · phone number
- **Edit (pencil) button** — opens the edit form pre-filled with current data
- **Remove (trash) button** — confirms deletion; removes the member from the family group

### Add / Edit Family Member form

Fields:
- Full Name (required)
- Date of Birth (required)
- Gender (Male / Female / Other)
- Phone Number (required)
- Blood Group (A+ / A- / B+ / B- / AB+ / AB- / O+ / O-)
- Allergies (comma-separated)
- City
- Emergency Contact

On save: creates or updates a `patient` record linked to the current user as `managedBy`.

---

## 9. Health Report `/patient/reports`

A consolidated summary of the active patient's entire medical history.

**Header actions**
- **AI Health Insights button** — generates a plain-language AI summary of the patient's health trends, diagnoses, medications, and recommendations (`HealthInsightsButton`)
- **Download PDF button** → `/patient-reports-print` (opens printable report in new tab)

**Gamification snapshot**
- Health Score card (same as on Appointments page)
- Loyalty Status badge

**Quick stats (3 tiles)**
- Total Appointments · Total Visits · Total Prescriptions

**Latest Vitals section**
- Blood Pressure · Temperature · Weight — taken from the most recent visit record
- "Last recorded" date shown below

**Visit History timeline**
- Up to 10 most recent visits
- Each entry: chief complaint · date · diagnosis · doctor name + specialization
- Left border accent in primary color

**Prescriptions section**
- Up to 8 most recent prescriptions
- Each entry: doctor name · date · medicine chips (name + dosage)

---

## 10. Settings `/patient/settings`

**Profile summary card (top)**
- Photo upload component (`PhotoUpload`) — allows avatar/profile photo update
- Patient name · email · blood group badge · gender badge · DOB · loyalty tier badge

### Personal Information section

Editable fields:
- Full Name
- Phone Number (validated against Pakistani phone number format)
- Email Address (required; used for sign-in and updates)
- Emergency Contact (name + phone)
- Address

Saves via `updateOwnProfile` server action.

### Password & Security section

- Current Password (with show/hide toggle)
- New Password (with show/hide toggle + strength bar)
- Password strength indicator: Too Short (red) → Weak (amber) → Good (green) → Strong (green)
- Security note: "Your medical records are encrypted and never shared without consent."

Saves via `changeOwnPassword` server action (bcrypt-verified).

### Notification Preferences section

Two toggles (visual only; persistence not yet implemented):
- Email Appointment Reminders — "Receive reminders 24 hours before your appointment"
- SMS Reminders — "Get a text message reminder before each visit"

### Sign Out

- Red-bordered card with Sign Out button
- Ends the session and redirects to `/login`

---

## Leave a Review (Doctor Review Modal)

Accessible inline on completed appointments in the My Appointments page.

- Checks if the appointment has already been reviewed (shows "Reviewed ✓" if so)
- **Star picker** — 1–5 stars with hover effect; label shown (Poor / Fair / Good / Very Good / Excellent)
- **Comments** — optional free-text textarea
- **Submit Review** button — saves the review and updates the doctor's average rating
- One review per appointment is enforced by the database

---

## AI Features Available to Patients

| Feature | Where | What it does |
|---|---|---|
| AI Health Insights | Health Report page | Generates a plain-language summary of health trends, diagnoses, active medications, and personalised recommendations |
| AI Lab Explain | Lab Results page | Explains a specific lab result in plain language so the patient can understand it without medical jargon |

---

## Gamification System

| Element | How it works |
|---|---|
| Health Points | Earned automatically: completing an appointment, posting a review, blood donation (idempotent — same event can't award twice) |
| Score Tiers | Starter (0+) · Bronze (50+) · Silver (200+) · Gold (500+) · Platinum (1000+) |
| Loyalty Tier | Based on distinct calendar months with at least one non-cancelled appointment: Bronze (1m+) · Silver (3m+) · Gold (6m+) · Platinum (12m+) |
| Progress bar | HealthScoreCard shows progress between current tier threshold and next tier threshold |

---

## Patient RBAC Permissions

| Resource | Permission |
|---|---|
| Own appointments | Read + Create (book) + Cancel (own scheduled/checked-in only) |
| Own visits | Read (records created by doctor) |
| Own prescriptions | Read + Print |
| Own lab orders | Read + Print |
| Own invoices | Read + Download receipt (paid invoices) |
| All doctors | Read (browse + ratings) |
| Own profile | Update (name, phone, email, address, emergency contact) |
| Own password | Change (bcrypt-verified) |
| Family members | Create + Read + Update + Delete (own family group only) |
| Doctor reviews | Create (one per completed appointment) |
| Medication reminders | Read + Mark dose taken |
| Health score / loyalty | Read (own only) |
| Community health alerts | Read (filtered by own city) |

A patient **cannot** access: other patients' records, doctor clinical tools, admin pages, pharmacy, lab technician queue, receptionist tools, or audit logs.
