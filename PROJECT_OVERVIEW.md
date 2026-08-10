# MediTrack — Project Overview

MediTrack is a full-stack clinic management system built with Next.js 16. It covers the complete patient journey — from booking an appointment to receiving prescriptions and lab results — through a multi-role portal where every staff member (admin, doctor, receptionist, nurse, pharmacist, lab technician) operates from a purpose-built dashboard. An embedded AI layer powers clinical decision-support tools available at each step of the workflow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Neon Serverless (`@neondatabase/serverless`) |
| ORM | Drizzle ORM 0.45 |
| Auth | NextAuth v5 (beta) — credentials + OTP |
| AI | LangChain + LangChain/OpenAI → Groq API (Llama 3.3 70B) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui, Lucide React icons |
| Forms | React Hook Form + Zod validation |
| Toast Notifications | Sonner |
| Date Utilities | date-fns |
| Password Hashing | bcryptjs (12 rounds) |
| Package Manager | pnpm |

---

## Project Structure

```
meditrack/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── (dashboard)/            # Role-gated dashboard pages
│   │   │   ├── admin/              # Admin portal
│   │   │   ├── doctor/             # Doctor portal
│   │   │   ├── receptionist/       # Receptionist portal
│   │   │   ├── patient/            # Patient portal
│   │   │   ├── nurse/              # Nurse/triage portal
│   │   │   ├── pharmacy/           # Pharmacist portal
│   │   │   ├── lab/                # Lab technician portal
│   │   │   └── help/               # Help center
│   │   ├── api/
│   │   │   ├── ai/                 # AI API routes (triage, notes, drug-check, etc.)
│   │   │   └── auth/               # NextAuth handler
│   │   ├── login/                  # Sign-in page
│   │   ├── register/               # Self-registration (patient)
│   │   ├── forgot-password/        # Password reset
│   │   ├── invoices/[id]/          # Printable invoice
│   │   ├── prescriptions/[id]/     # Printable prescription
│   │   └── patient-reports-print/  # Printable health report
│   ├── components/
│   │   ├── admin/                  # Admin-specific components
│   │   ├── ai/                     # AI feature buttons & widgets
│   │   ├── doctor/                 # Doctor-specific components
│   │   ├── lab/                    # Lab-specific components
│   │   ├── layout/                 # Sidebar, profile switcher
│   │   ├── nurse/                  # Nurse-specific components
│   │   ├── patient/                # Patient-specific components
│   │   ├── pharmacy/               # Pharmacy-specific components
│   │   ├── receptionist/           # Receptionist-specific components
│   │   ├── shared/                 # Cross-role shared components
│   │   └── ui/                     # Base UI primitives (shadcn)
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── agents/             # LangChain AI agent implementations
│   │   │   └── models.ts           # LLM configuration (Groq/Llama)
│   │   ├── validators/             # Zod schemas for forms
│   │   ├── audit-wrapper.ts        # Audit log helper
│   │   └── gamification.ts        # Health score & loyalty tier logic
│   ├── server/
│   │   ├── actions/                # Next.js Server Actions (all data mutations)
│   │   ├── auth/                   # NextAuth config, RBAC guards
│   │   └── db/
│   │       ├── schema/             # Drizzle ORM table definitions
│   │       └── index.ts            # Neon DB client
│   ├── types/
│   │   └── next-auth.d.ts          # Session type augmentation
│   └── middleware.ts               # Route-based role redirect guard
├── drizzle/
│   └── migrations/                 # Auto-generated SQL migrations
├── scripts/                        # Seeding scripts (medicines, lab tests)
└── drizzle.config.ts
```

---

## Authentication & Access Control

### Login Methods

**Email + Password**
- Standard credentials sign-in via NextAuth
- Passwords hashed with bcrypt (12 rounds)

**Phone OTP**
- Pakistani phone number validation
- 4-digit OTP generated server-side, expires in 5 minutes, single-use
- Currently displayed in-app via toast (designed to be replaced with SMS gateway in production)
- After OTP verification, user is signed in using their linked email

**Forgot Password**
- Dedicated `/forgot-password` page for password reset

**Self-Registration**
- `/register` — patients register themselves
- Collects: name, email, phone, date of birth, gender, password
- Password strength indicator (Weak / Medium / Strong)
- Auto-signs in after successful registration
- Newly registered users get the `patient` role by default

### Route Guard (Middleware)

`src/middleware.ts` intercepts every request and enforces:
- Unauthenticated users are redirected to `/login` when accessing protected routes
- Authenticated users on `/login` or `/register` are redirected to their role home
- Authenticated users trying to access another role's routes are redirected to their own home

| Role | Home Route |
|---|---|
| admin | `/admin` |
| doctor | `/doctor` |
| receptionist | `/receptionist` |
| patient | `/patient` |
| nurse | `/nurse` |
| pharmacist | `/pharmacy` |
| lab | `/lab` |

### RBAC (Role-Based Access Control)

All server actions are protected with `requireRole(allowedRoles[])`. Additional scope guards exist:

- `assertDoctorOwnsResource(doctorUserId)` — doctors can only act on their own appointments/patients
- `assertPatientOwnsResource(userId)` — patients can only access their own user record
- `assertPatientOwnsPatientRecord(patientId)` — patients can only access their own patient record or managed family members (via email-join + `managedBy` FK)
- Admins bypass all scope checks

---

## Roles & Portals

The system has **7 roles**, each with a fully isolated portal:

| Role | Portal | Primary Responsibility |
|---|---|---|
| `admin` | `/admin` | Manage all system data, users, billing, health alerts |
| `doctor` | `/doctor` | Conduct consultations, write prescriptions, order lab tests |
| `receptionist` | `/receptionist` | Register patients, book appointments, manage check-ins |
| `patient` | `/patient` | Book appointments, view records, manage family profiles |
| `nurse` | `/nurse` | Triage patients, record vitals before consultations |
| `pharmacist` | `/pharmacy` | Dispense prescriptions, manage medicine inventory |
| `lab` | `/lab` | Process lab test orders, record results |

---

## Core Clinical Workflow

```
1. RECEPTION
   Patient registered → Appointment booked (scheduled)

2. ARRIVAL
   Receptionist: marks appointment as checked_in
   → Patient appears in Nurse Triage Queue

3. TRIAGE (Nurse)
   Nurse records: severity, chief complaint, vitals (BP, temp, pulse, weight)
   → Triage data attached to appointment
   → Patient ready for doctor

4. CONSULTATION (Doctor)
   Doctor opens appointment → sees triage data pre-filled
   Doctor records: diagnosis, clinical notes, vitals (can refine)
   Doctor adds: prescriptions (medicines) + lab orders
   Doctor completes visit → appointment status = completed

5. PHARMACY
   Prescription items appear in pharmacist's dispensing queue
   Pharmacist selects batch + quantity → dispenses
   Stock decremented, dispensing record stamped with pharmacist's ID

6. LAB
   Lab orders appear in lab technician queue
   Lab tech: collects sample → processes → records result
   Patient can view results in their portal

7. BILLING
   Invoice auto-generated when visit completes
   Admin/receptionist marks as paid
   Patient can download receipt
```

---

## Database Schema

### 19 Tables across 3 categories

#### User & Access
| Table | Purpose |
|---|---|
| `users` | All system users (all roles). Stores email, passwordHash, role, phone, avatarUrl |
| `otp_codes` | Phone OTP codes (4-digit, 5-min TTL, single-use) |
| `system_settings` | Key/value admin-configurable clinic settings |
| `support_requests` | Help center contact form submissions |
| `audit_logs` | Append-only log of view/create/update/delete actions with IP |

#### Clinical
| Table | Purpose |
|---|---|
| `patients` | Patient demographic records. Links to `users` via email. Supports family managed-by |
| `doctors` | Doctor profiles (specialization, licenseNumber) linked to a `users` row |
| `doctor_availability` | Weekly recurring time windows per doctor (day + start/end time) |
| `appointments` | Bookings linking patient ↔ doctor. Status enum: scheduled → checked_in → in_progress → completed / cancelled / no_show / walk_in. Unique on (doctorId, scheduledAt) |
| `triage` | Nurse pre-consultation assessments: severity (critical/urgent/standard/low), vitals, chief complaint, notes |
| `visits` | Doctor consultation records: diagnosis, clinical notes, vitals (one per appointment — unique) |
| `prescriptions` | Prescription headers linked to a visit |
| `prescription_items` | Individual medicine lines per prescription (medicineName, medicineId, dosage, frequency, duration) |
| `lab_orders` | Lab tests ordered by doctor during visit. Status: ordered → sample_collected → in_progress → completed |
| `invoices` | Auto-generated per completed visit. Amount stored in integer cents. Status: pending / paid / waived |
| `doctor_reviews` | Patient reviews of doctors post-consultation (1-5 stars). One review per appointment (unique) |
| `triage` | Severity, vitals, chief complaint — recorded by nurse before doctor sees patient |

#### Pharmacy
| Table | Purpose |
|---|---|
| `medicines` | Medicine catalog (brand name, generic name, form, strength, category) |
| `medicine_inventory` | Stock batches per medicine (quantity, batch number, expiry date, supplier) |
| `dispensings` | Records each dispense event (prescriptionItem ↔ batch, quantity, pharmacist). One per prescription item (unique) |

#### Patient Engagement
| Table | Purpose |
|---|---|
| `health_points` | Gamification points log (append-only, idempotent by recordId+reason). Reasons: appointment_completed, review_posted, blood_donation |
| `health_alerts` | Admin-created community health broadcasts (city-targeted, optional expiry) |
| `medication_reminders` | Auto-generated from prescription items. Tracks next-dose time for patient portal reminders |

---

## AI Features

All AI features use **Groq's free API** (OpenAI-compatible) running **Llama 3.3 70B Versatile**. Temperature is set to 0.3 for factual medical outputs. Configured via `GROQ_API_KEY` in `.env`.

| Feature | Route | Who Uses It | What It Does |
|---|---|---|---|
| **Triage Suggestion** | `POST /api/ai/triage` | Nurse | Analyzes chief complaint + all vitals + patient age/gender/allergies. Returns suggested severity level (Critical/Urgent/Standard/Low) with clinical reasoning. Advisory only — nurse makes final decision |
| **Clinical Notes Generator** | `POST /api/ai/notes` | Doctor | Generates structured SOAP-style clinical notes from complaint, vitals, diagnosis, and prescribed medicines |
| **Drug Interaction Check** | `POST /api/ai/drug-check` | Doctor | Checks a list of prescribed medicines for known drug-drug interactions. Appears automatically when ≥2 medicines are in the prescription |
| **Lab Result Explainer** | `POST /api/ai/lab-explain` | Patient | Explains a lab test result in plain language so the patient understands it without medical jargon |
| **Health Insights** | `POST /api/ai/insights` | Patient | Generates a comprehensive AI summary of the patient's health trends, diagnoses, medications, and personalised recommendations using their full medical history |
| **Symptom Checker** | `POST /api/ai/symptom-checker` | Patient (chat widget) | Interactive symptom triage chatbot. Patients describe symptoms and receive guidance on urgency and next steps |

---

## Feature Modules by Role

### Admin
- Doctor management (add, edit, view, manage availability)
- Patient management (view, edit, soft-delete)
- Appointment management (full CRUD, reschedule, cancel, create new)
- User management (list all users, assign roles, rename, deactivate)
- Billing (view all invoices, mark paid, view summary stats)
- Pharmacy management (medicine catalog, stock batches, adjust inventory)
- Community health alerts (create, manage, city-target alerts with expiry)
- System settings (clinic name, contact info, operating hours, slot config)
- Audit log (view all system activity with actor, action, table, IP)
- Analytics overview on dashboard (new patients, appointments today, revenue)

### Doctor
- Today's timeline with next-up appointment highlight
- Appointment calendar (day/week view)
- Full clinical visit form: vitals, chief complaint, diagnosis, notes
- AI notes generation (from complaint + vitals + diagnosis + medicines)
- Prescription writing with medicine autocomplete + AI drug interaction check
- Lab order creation (test name + instructions → fed to lab queue)
- Follow-up appointment scheduling (created during visit completion)
- Triage data visible pre-consultation (nurse's vitals and severity)
- Patient list (all patients seen, with filters, treatment insights)
- Patient detail (full history, visit records, prescriptions, appointment history)
- Weekly availability management (add/remove time blocks, overlap detection)
- Analytics dashboard (visits trend, appointment status, top diagnoses, rating distribution)
- Patient ratings and reviews visibility

### Receptionist
- Live reception desk dashboard (waiting room queue + doctor occupancy)
- Book appointment (patient search + doctor + date/time slot picker)
- Walk-in appointment creation
- Quick check-in button (inline on today's schedule)
- Appointment calendar grid (all doctors, day view with 30-min slots)
- Appointment detail with status controls (check-in, cancel, no-show)
- Patient registration (4-section form: personal, contact, emergency, medical)
- Patient list (search, filters, pagination)
- Patient detail (demographics, appointment history, quick actions)
- Edit patient contact details

### Patient
- Appointment list (upcoming + past) with health score + loyalty gamification
- Book appointment (doctor availability-aware slot picker)
- Cancel upcoming appointments
- Leave star reviews for completed appointments
- Medication reminders with "Mark as Taken" action
- Community health alert banner (city-targeted)
- Find a Doctor browser (ratings + direct booking)
- Visit history (read-only: vitals, diagnosis, clinical notes)
- Prescriptions (accordion with full medicine detail + PDF download)
- Lab results (with AI plain-language explanation + print)
- Billing (invoices + receipt download)
- Family profile management (add/edit/remove dependents, profile switcher)
- Health report (full medical history + AI health insights + PDF download)
- Profile settings (name, phone, email, emergency contact, address)

### Nurse
- Triage queue (all checked-in + walk-in patients, sorted by urgency)
- Triage assessment form (severity selector + vitals + chief complaint + notes)
- AI triage suggestion (advisory severity recommendation with clinical reasoning)
- Re-assessment of already-triaged patients

### Pharmacist
- Dispensing queue (all pending prescription items from completed visits)
- Real-time search by patient name or medicine
- Batch selection + quantity + dispense action (with stock validation)
- Low stock alert panel (inline warning)
- Add medicine to catalog (inline form)
- Receive stock / add inventory batch (inline form)
- Dispense history with undo capability (restores stock)
- Inventory overview (all batches with expiry + low-stock indicators)

### Lab Technician
- Lab order queue (ordered by doctor, awaiting processing)
- Status progression: ordered → sample_collected → in_progress → completed
- Result entry and completion
- Completed tests archive
- Lab test catalog

---

## Gamification System

Patients earn points and achieve tiers to encourage engagement with their health.

### Health Score (Points-Based)

| Event | Points Awarded |
|---|---|
| Appointment completed | Awarded automatically |
| Review posted | Awarded automatically |
| Blood donation | Awarded manually |

Points are awarded idempotently — the same event can only award once (enforced by unique constraint on `recordId + reason`).

**Score Tiers:**

| Tier | Min Points |
|---|---|
| Starter | 0 |
| Bronze | 50 |
| Silver | 200 |
| Gold | 500 |
| Platinum | 1000 |

### Loyalty Tier (Engagement-Based)

Computed from distinct calendar months with at least one non-cancelled appointment.

| Tier | Min Months Active |
|---|---|
| Bronze 🥉 | 1 month |
| Silver 🥈 | 3 months |
| Gold 🥇 | 6 months |
| Platinum 💎 | 12 months |

Both the Health Score card and Loyalty Status panel are shown on the patient's appointments page and health report.

---

## Notifications

Each role receives role-scoped real-time bell notifications via the notification bell component:

| Role | Notification Events |
|---|---|
| Doctor | New check-ins for today's appointments |
| Receptionist | Patients checked-in and waiting; same-day cancellations |
| Nurse | (Bell component available for future events) |
| Patient | Medication reminders due; appointment confirmations |
| Pharmacist | Pending prescriptions awaiting dispensing |
| Lab | Pending lab orders |
| Admin | System-wide alerts |

---

## Print & Export

| Document | Route | Who |
|---|---|---|
| Prescription PDF | `/prescriptions/[id]/print` | Patient, Doctor |
| Invoice / Receipt | `/invoices/[id]/print` | Patient, Admin |
| Patient Health Report | `/patient-reports-print` | Patient |
| Lab Result Report | `/patient/lab-results/[id]/print` | Patient |

---

## Scripts & Tooling

| Script | Command | Purpose |
|---|---|---|
| Dev server | `pnpm dev` | Start Next.js development server |
| Build | `pnpm build` | Production build |
| Generate migrations | `pnpm db:generate` | Generate SQL from schema changes |
| Run migrations | `pnpm db:migrate` | Apply pending migrations |
| Push schema | `pnpm db:push` | Push schema directly to DB (dev only) |
| DB Studio | `pnpm db:studio` | Open Drizzle Studio GUI |
| Seed medicines | `pnpm db:seed-medicines` | Seed medicine catalog |
| Lint | `pnpm lint` | ESLint |
| Create admin | `tsx scripts/create-admin.ts` | Create first admin user |
| Add accepting bookings | `tsx scripts/add-accepting-bookings.ts` | Migrate accepting bookings flag |
| Seed lab tests | `node scripts/seed-lab-tests.mjs` | Seed lab test catalog |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (32+ random bytes) |
| `GROQ_API_KEY` | Groq API key for AI features (free at console.groq.com) |

---

## Key Design Decisions

**Server Actions for all mutations** — No separate REST API layer. All data mutations use Next.js Server Actions with Zod validation, RBAC guards, and audit logging. This keeps the data layer co-located with the UI and eliminates the need for a separate API server.

**Role-isolated portals** — Each role gets its own subdirectory under `(dashboard)/`. The middleware prevents cross-role access at the routing level; RBAC guards enforce it at the server action level.

**Email-join for patients** — There is no `userId` FK on the `patients` table. Instead, a patient's user account is linked to their patient record via matching email addresses. This allows receptionists to register patients (creating a patient record) separately from patients creating their own accounts.

**Family Profiles** — A patient user can create dependent patient records (spouse, children, parents) that are linked via `patients.managedBy`. The sidebar profile switcher lets the user switch active context so all pages reflect the selected family member.

**Slot uniqueness** — Appointments enforce a unique constraint on `(doctorId, scheduledAt)`. The booking form shows real-time availability and greys out already-booked slots client-side, with a server-side concurrency guard as the final enforcement layer.

**Idempotent health points** — Health points use a unique constraint on `(recordId, reason)`. Re-processing the same event (e.g. a retry) silently ignores the duplicate, preventing double-awarding.

**Atomic pharmacy dispensing** — `dispensePrescriptionItem` runs inside a `db.transaction()`. The stock decrement and the dispensing record insert either both succeed or both roll back, preventing stock going negative or a dispensing being recorded without stock being deducted.

**AI is advisory** — All AI outputs (triage suggestions, notes, drug checks, insights) are displayed as recommendations alongside a disclaimer. No AI feature auto-fills critical fields without explicit user action.

---

## Role-Specific Documentation

Detailed feature references for each role are available as separate files:

- `DOCTOR_DASHBOARD.md` — All doctor portal features
- `RECEPTIONIST_DASHBOARD.md` — All receptionist portal features
- `PATIENT_DASHBOARD.md` — All patient portal features
- `NURSE_DASHBOARD.md` — All nurse/triage portal features
- `PHARMACIST_DASHBOARD.md` — All pharmacist portal features
- `ADMIN_OVERVIEW.md` — Admin portal overview
