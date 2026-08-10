# Doctor Dashboard — Feature Reference

This document covers every feature available to a user with the `doctor` role in MediTrack.

---

## Navigation

The sidebar has 6 sections plus a quick-action button at the bottom.

| Label | Route |
|---|---|
| Dashboard | `/doctor` |
| Appointments | `/doctor/appointments` |
| Patients | `/doctor/patients` |
| Analytics | `/doctor/analytics` |
| Availability | `/doctor/availability` |
| Settings | `/doctor/settings` |

**Quick action button:** "Today's Appointments" → `/doctor/appointments`

---

## 1. Dashboard `/doctor`

The home page gives a live snapshot of the doctor's day.

**Header**
- Time-aware greeting: "Good morning / afternoon / evening, Dr. [Name]"
- Today's date, total appointment count, and remaining appointment count

**Today's Timeline**
- Chronological list of every appointment scheduled for today
- Each row shows: time · patient avatar + name · reason · status badge
- The next actionable appointment is highlighted with a "Next Up" badge and a green "Start Visit" button
- Completed / cancelled / no-show rows are dimmed with strikethrough text
- Status badges: Scheduled · Checked-in · In-Progress · Completed · Cancelled · No-show

**Quick Stats panel**
- Number of patients seen this week (with a progress bar toward a 60-patient target)
- Today's breakdown chips: Total / Done / Remaining
- "Accepting Bookings" toggle — controls whether the doctor appears as bookable on the patient portal

**Patient Rating panel**
- Average star rating displayed as a number (e.g. 4.7) + star visual
- Up to 3 most recent patient reviews showing reviewer name, star score, and comment text

**Recent Patients panel**
- Last 3 distinct patients seen, ordered by most recent visit
- Each entry shows patient name, last visit date, and links to the patient detail page

**Availability Summary**
- 7-day Mon–Sun grid of dots/checkmarks showing which days have availability configured
- Direct link to edit the weekly schedule

---

## 2. Appointments List `/doctor/appointments`

**Views**
- **Day view** (default): all appointments for one selected day in a time-sorted table
- **Week view**: 7-day day-picker (Mon–Sun) showing per-day appointment counts; the main table shows all appointments for the selected week

**Date navigation**
- Previous / Today / Next buttons
- Direct day selection in week view by clicking any day tile

**Appointment table columns**
- Time (12-hour format) · Patient Name · Reason · Status · Action

**Status + action mapping**

| Status | Visual | Action button |
|---|---|---|
| Scheduled | Green dot | Pending (no button) |
| Checked-in | Amber pill, left accent border | "Start Visit" (primary color) |
| In-Progress | Dark pill, left accent border | "Complete Visit" |
| Completed | Green text | "View Record" link |
| Cancelled / No-show | Dimmed, reduced opacity | — |

**Footer stat bar**
- Total · Done · Remaining counts for the current day/view

---

## 3. Appointment Detail & Visit Form `/doctor/appointments/[id]`

The core clinical workflow. Access is scoped — a doctor can only open appointments assigned to them.

### Left sidebar (read-only context)

**Patient header**
- Name, age, gender, patient ID, appointment date/time, reason, status badge

**Safety Critical Info**
- Allergies displayed as red pills
- Blood group

**Triage Assessment** *(recorded by nurse before the consultation)*
- Severity badge: Critical / Urgent / Standard / Low
- Chief complaint, BP, temperature, pulse, weight
- Nurse's notes, recorded-by name, and timestamp

**Visit History**
- Last 3 prior visits for this patient with date and diagnosis
- "View All" link to the full patient profile

### Right side — Visit Form (interactive)

#### Patient Vitals
- Blood Pressure (mmHg), Temperature (°F), Weight (lbs)
- Fields are pre-filled from the nurse's triage record when starting a new visit

#### Clinical Documentation
- **Chief Complaint** — required to save or complete
- **Diagnosis** — ICD-10 free-text field
- **Clinical Notes** — free-text textarea
- **AI Generate Notes button** — generates structured clinical notes from the complaint, vitals, diagnosis, and current medicines using AI

#### Prescriptions
- Add / remove medicine rows
- Each row: Medicine name (autocomplete search against the medicines database), Dosage, Frequency, Duration
- **AI Drug Interaction Check** button appears automatically when 2 or more medicines are in the list
- Completed visits show a "Download" link to the printable prescription PDF

#### Lab Orders
- Add / remove lab test rows (only available before the visit is completed)
- Each row: Test name (e.g. CBC, NS1 Antigen) · Special instructions (e.g. fasting required)
- Orders are picked up by the lab technician role

#### Follow-up Scheduling
- Optional checkbox: "Schedule a follow-up appointment"
- When checked, a datetime picker appears; on completing the visit a new appointment is automatically created with the same doctor

### Footer action bar (sticky)
- **Save Draft** — creates or updates the visit record; moves appointment to `in_progress`
- **Complete Visit** — saves the visit, prescriptions, and lab orders; marks the appointment `completed`; optionally creates the follow-up; then redirects to the appointments list

> When the appointment status is `completed` the entire form becomes read-only. No further edits are possible.

---

## 4. Patients List `/doctor/patients`

Shows only patients this doctor has personally seen (scoped via visit records).

**Table columns**
- Patient ID · Patient Name (initials avatar) · Age / Gender · Last Visit · Last Diagnosis · Chronic Conditions · Actions

**Quick filters**
- All Patients
- Seen this week
- Chronic Conditions (patients with recorded allergies)

**Sort options**
- Last Visit: Newest (default)
- Last Visit: Oldest
- Name A–Z

**Search**
- By patient name or patient ID prefix (GET form)

**Pagination**
- 10 patients per page with numbered page controls

**Bottom insight cards**
- **Treatment Insights** — unique patient total, new patients this month, follow-up rate (% of patients with more than one visit)
- **Medical Updates** — link to latest clinical guidelines

---

## 5. Patient Detail `/doctor/patients/[id]`

Access-controlled: only reachable if the doctor has at least one recorded visit with the patient.

### Left sidebar
- Safety Critical Info (allergies + blood group)
- Demographics: phone, email, address, emergency contact
- Family context: "Managed by [Name]" shown for dependent/family-member accounts
- Patient Summary card: My Visits count · Total Appointments · Registration date · Last Seen date

### Right column

**Latest Visit Record**
- Vitals strip: BP · Temperature · Weight
- Chief Complaint · Diagnosis · Clinical Notes
- "View Full" link to the appointment detail page

**Current Prescriptions**
- Table of prescription items from the most recent visit: Medication · Dosage · Frequency · Duration

**Visit History**
- All previous visits recorded by this doctor for the patient
- Each entry links back to the corresponding appointment detail

**Appointment History**
- Full appointment table across all doctors, split into Upcoming and Past sections
- Columns: Date · Time · Doctor · Status · Reason

**Actions**
- "Print Summary" button
- "View Appointments" filtered link

---

## 6. Analytics `/doctor/analytics`

All data is scoped to the logged-in doctor only.

**Summary stat cards**
- Total Visits (all time)
- Unique Patients (distinct patients seen)
- Average Rating (patient star score)
- Completion Rate (completed appointments ÷ total appointments)

**14-Day Visits Trend**
- SVG line chart with area gradient fill
- One data point per day for the past 14 days
- Total visit count shown in the header

**Appointment Status Donut**
- Conic-gradient donut chart with center showing total count
- Legend: Completed (green) · Scheduled (dark green) · Cancelled / No-show (red)
- Each segment shows count and percentage

**Rating Distribution**
- 5→1 star histogram
- Bar fill is proportional to share of total ratings
- Count per star level shown on the right

**Top Diagnoses**
- Ranked list of up to 5 most common diagnoses
- Each entry has a horizontal bar chart scaled to the most frequent diagnosis

---

## 7. Availability `/doctor/availability`

Controls the recurring weekly schedule that drives appointment slot generation (slots are built 30 days in advance).

**Weekly schedule table**
- One row per day (Monday–Sunday)
- Each row: toggle pill · existing time-block chips · "Add block" button

**Time blocks**
- Displayed as chips in 12-hour format, e.g. `09:00 AM – 05:00 PM`
- Remove a block with the × button on the chip
- Overlap detection: if two blocks on the same day overlap, both chips turn red and a warning banner appears

**Toggle pill**
- Turning a day OFF (when blocks exist) prompts for confirmation and deletes all blocks for that day
- Turning a day ON opens the inline add-block form

**Add time block**
- Inline form appears below the row: Start time · End time · Save / Cancel
- Saved immediately to the database; the UI updates optimistically

**Upcoming Exceptions** *(UI-only, no backend model yet)*
- List of named exception dates (e.g. "Out of office – Sunday, July 14")
- Add and remove exceptions locally

---

## 8. Settings `/doctor/settings`

**Profile banner**
- Avatar (initials), name, email, specialization, "Active" status badge

**Profile Information**
- Editable: Full Name
- Read-only (admin-managed): Email

**Clinical Profile**
- Editable: Specialization
- Read-only (admin-managed): License Number

**Password & Security**
- Change password form: Current Password · New Password (min 8 characters) · Confirm New Password
- Current password is bcrypt-verified before the new hash is stored

**Notifications** *(toggles are visual-only, not yet persisted)*
- Appointment reminders
- New patient check-in alerts
- Schedule changes

**Account**
- Sign Out button — ends the session and redirects to `/login`

---

## AI Features

| Feature | Where | What it does |
|---|---|---|
| Generate Notes | Visit Form → Clinical Documentation | Uses complaint, vitals, diagnosis, and medicines to draft structured clinical notes |
| Drug Interaction Check | Visit Form → Prescriptions | Checks the current prescription list for known drug-drug interactions |

---

## Doctor-Specific Permissions (RBAC)

The `doctor` role has access to:

| Resource | Permission |
|---|---|
| Own appointments | Read + Start/Complete visits |
| Own patients (via visits) | Read patient profile, demographics, history |
| Visits | Create and update (own appointments only) |
| Prescriptions | Create (linked to own visits) |
| Lab orders | Create (linked to own visits) |
| Own availability | Create / delete time blocks |
| Triage records | Read (for appointments assigned to them) |
| Own profile & password | Update |
| Analytics | Read (own data only) |
| Patient ratings | Receive (read-only; patients submit reviews) |

A doctor **cannot** access: other doctors' patients or visit records, admin management pages, billing, pharmacy dispensing, or the audit log.
