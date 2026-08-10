# Nurse Dashboard — Feature Reference

This document covers every feature available to a user with the `nurse` role in MediTrack.

---

## Navigation

The sidebar has 2 sections — the nurse dashboard is intentionally lean and focused on the triage workflow.

| Label | Route |
|---|---|
| Triage Queue | `/nurse` (dashboard home) |
| Settings | `/nurse/settings` |

No quick-action button is present. The dashboard itself is the primary action surface.

---

## 1. Triage Queue `/nurse` (Dashboard)

The main and only operational page. Shows every patient currently checked in or arrived as a walk-in, across all doctors, for the current day.

**Top bar**
- Nurse name + "Triage Station" label
- Notification bell

**Page header**
- Title: "Triage Queue"
- Live subtitle: "X awaiting triage · Y triaged"

### Stat Cards (3 tiles)

| Card | What it shows |
|---|---|
| Awaiting Triage | Count of patients not yet assessed |
| Critical / Urgent | Count of triaged patients with high-priority severity |
| Triage Completed | Count of patients who have been assessed |

### Queue Sort Order

Patients are automatically sorted with:
1. **Untriaged first** (by arrival time — longest wait at top)
2. **Triaged patients below**, sorted by severity: Critical → Urgent → Standard → Low

### Patient Queue Cards

Each card in the queue shows:

- **Patient initials avatar** (green)
- **Patient name** + age + gender
- **WALK-IN badge** — shown for unscheduled walk-in arrivals
- **Reason for appointment** (e.g. "Follow-up", "Chest pain")
- **Allergies warning** — amber triangle + allergy list shown when the patient has recorded allergies
- **Wait time** — "Waiting X min" (calculated from appointment creation time)
- **Severity badge** — shown once triaged: CRITICAL (rose) / URGENT (orange) / STANDARD (green) / LOW (green)
- **NEEDS TRIAGE badge** — shown for patients not yet assessed
- **Action button:**
  - "Triage" (primary green) — for patients not yet assessed
  - "Re-assess" (outlined) — for patients already triaged

Clicking either button navigates to `/nurse/triage/[appointmentId]`.

**Empty state** — shown when no checked-in or walk-in patients exist for the day.

---

## 2. Triage Assessment `/nurse/triage/[appointmentId]`

The full triage form for a single patient. Accessed from the queue.

### Patient Header Card

Read-only context panel shown at the top:
- Patient initials avatar
- Full name + WALK-IN badge (if applicable)
- Gender · Age · Blood group
- Reason for visit
- **Allergies safety alert** — amber banner with triangle icon and allergy list (shown only if allergies are recorded)

### Previous Triage Panel

Shown only when the nurse is re-assessing a patient who was already triaged. Displays:
- Previous severity level
- Previous chief complaint

### Triage Assessment Form

The main interactive form. All fields are saved as a new triage record linked to the appointment and the logged-in nurse.

#### Severity Assessment (required)

Four large toggle cards in a 2×2 grid:

| Severity | Color | Description |
|---|---|---|
| Critical | Rose/Red | Life-threatening, needs immediate attention |
| Urgent | Orange | Serious, should be seen soon |
| Standard | Green | Routine consultation |
| Low | Green | Minor / follow-up |

Clicking a card selects it with a highlighted border and ring. Default is **Standard**.

#### AI Triage Suggestion button

Appears automatically once the Chief Complaint field has content.

- Sends complaint + all vitals + patient age/gender/allergies to the AI
- Returns a modal with:
  - Suggested severity badge (CRITICAL / URGENT / STANDARD / LOW) with color coding
  - Full reasoning text from the AI
  - Disclaimer: "⚠ AI suggestion only. Use clinical judgment for final triage decision."
- The nurse can read the AI suggestion and then manually set the severity — the AI does **not** auto-fill the form

#### Chief Complaint (required)

- Free-text input, minimum 3 characters
- Examples: "Fever for 3 days", "Severe headache", "Chest pain"
- Required to submit the form

#### Vital Signs (all optional)

Four fields in a 2×4 grid:

| Field | Unit | Placeholder |
|---|---|---|
| Blood Pressure | mmHg | 120/80 |
| Temperature | °F | 98.6 |
| Pulse | bpm | 72 |
| Weight | kg | 70 |

These values are stored on the triage record and automatically pre-filled into the doctor's visit form when the doctor opens the appointment.

#### Triage Notes (optional)

- Free-text textarea (3 rows)
- Placeholder: "Additional observations for the doctor..."
- Stored as `notes` on the triage record; visible to the doctor during the consultation

#### Form Actions

- **Record Triage** button — saves the triage record, shows a success toast ("Triage recorded. Patient is ready for the doctor."), and redirects back to the Triage Queue
- **Cancel** button — discards changes and returns to the queue

---

## 3. Data Written by the Nurse

When "Record Triage" is submitted, a record is inserted into the `triage` table with:

| Field | Source |
|---|---|
| `appointmentId` | The appointment being triaged |
| `patientId` | The patient linked to the appointment |
| `nurseUserId` | The logged-in nurse's user ID (auto-stamped) |
| `severity` | Selected severity level |
| `chiefComplaint` | Nurse-entered complaint text |
| `vitalsBp` | Blood pressure reading |
| `vitalsTemp` | Temperature reading |
| `vitalsWeight` | Weight reading |
| `vitalsPulse` | Pulse reading |
| `notes` | Additional nurse observations |

This data flows directly to the doctor: when the doctor opens the same appointment, the triage panel appears in the left sidebar with all the nurse's entries and the vitals pre-fill the doctor's visit form fields.

---

## 4. Settings `/nurse/settings`

**Top bar:** Nurse name + "Nurse Settings" label + notification bell.

### Profile section

- **Name** — editable text input
- **Email** — editable (validated as a valid email; uniqueness-checked against other users)
- **Save button** — saves via `updateOwnNurseProfile` server action

### Password

- Password changes are **not available in the settings UI** for the nurse role
- A note states: "Password changes are managed by the system administrator. Please contact your admin if you need a password reset."

---

## AI Feature — Triage Suggestion

| Feature | Where | What it does |
|---|---|---|
| AI Triage Suggestion | Triage form (appears once complaint is entered) | Analyzes chief complaint, all vitals, patient age/gender/allergies and suggests a severity level with reasoning |

The AI call is made to `/api/ai/triage` as a POST request. The response is displayed in a modal and is purely advisory — the nurse makes the final clinical decision.

---

## Nurse RBAC Permissions

| Resource | Permission |
|---|---|
| Triage queue | Read (all checked-in + walk-in patients for today) |
| Triage records | Create (new assessments) + Read (own appointments) |
| Appointment data | Read (patient name, DOB, gender, blood group, allergies, reason) |
| Patient safety data | Read (allergies, blood group — shown in triage context) |
| Own profile (name, email) | Update |
| Notification bell | Receive alerts |

A nurse **cannot** access: appointment booking, visit records (clinical notes/diagnosis), prescriptions, lab orders, billing, pharmacy, doctor analytics, admin management pages, or the audit log.

The nurse's triage data is intentionally read-only to doctors — nurses write, doctors read.
