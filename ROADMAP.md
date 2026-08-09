# MediTrack — Patient Journey Roadmap

Mapping every step of a patient's clinic visit to the missing features that
complete the journey. Ordered by impact + ease of implementation.

## Journey Status Legend
- ✅ Works today
- 🟡 Partial / needs polish
- ❌ Missing — must build
- 🔴 Critical gap

---

## STEP 0 — Before arrival (online, at home)
**Goal:** patient pre-registers and books from home.

- ✅ Self-registration creates an account (`/register`)
- ❌ **GAP 1 — Self-registration dead-end:** no `patients` row is created → patient
  is stuck ("No patient profile found") and can't book.
- ❌ No online booking for walk-in patients (no patient record to book against)

**→ FIX: `registerUser` auto-creates a `patients` row (email-link) so the new
account is immediately usable. Plus a "complete my profile" step for DOB/gender/phone.**

---

## STEP 1 — Arrival at reception
**Goal:** find-or-create the record, book or walk-in.

- ✅ Receptionist can register a patient + book an appointment
- ⚠️ No merge/find-existing step if email differs from the self-registered one
- ❌ **GAP 2 — No walk-in queue:** system assumes pre-booked appointments only.
  Walk-ins must be forced into the appointment system with a fake time slot.

**→ FIX: add a `walk_in` appointment status + a "Walk-in" creation flow that
doesn't require a `scheduledAt` time slot. Receptionist queue page lists walk-ins.**

---

## STEP 2 — Triage (waiting room)
**Goal:** nurse takes vitals + flags severity + prioritizes the queue.

- ❌ **GAP 3 — No triage / no nurse role:** vitals are only recorded *by the
  doctor during consultation*. No way to catch a 103°F fever early. This is the
  biggest clinical gap — it's where dengue/fever severity is caught.
- ❌ No severity flagging / prioritized queue
- ❌ No patient-facing "you are #3" waiting display

**→ FIX: add a `nurse` role (RBAC enum + nav), a `triage` table (vitals +
chief complaint + severity score), and a prioritized waiting-room queue page.
Doctors see triage data when they open the visit.**

---

## STEP 3 — Check-in
- ✅ `scheduled → checked_in` works; doctor dashboard + notifications work.
- No changes needed.

---

## STEP 4 — Doctor consultation
- ✅ Visit form (complaint, diagnosis, vitals, notes) works.
- ✅ Prescription (multi-medicine) works.
- ✅ Complete visit → +20 health points.
- 🟡 **GAP 7 (small):** doctor's patient detail page doesn't surface the
  "managed by [family head]" relationship for hereditary context.
- ❌ **GAP 8 — No lab test ordering:** if the doctor suspects dengue, there's no
  way to order CBC / NS1 antigen through the system.

**→ FIX: show family-manager linkage on doctor's patient view; add a `lab_orders`
table + doctor UI to order tests and record results.**

---

## STEP 5 — Payment / billing
- ❌ **GAP 4 — No billing at all:** no fees, invoices, payments, or receipts in
  the database.
- ❌ No Sehat Card / insurance integration.

**→ FIX: add `invoices` + `payments` tables, consultation-fee invoicing on visit
completion, a billing page for reception/admin, and printable receipts. (Sehat
Card eligibility = later, needs gov API.)**

---

## STEP 6 — Pharmacy / prescription handoff
- ✅ Prescription saved as a digital record.
- ❌ **GAP 5 — No printable prescription:** patient has nothing physical/digital
  to take to an external pharmacy. The record only lives in the portal.
- ❌ No pharmacy module (inventory, dispensing, stock).
- ❌ No Medicine Checker (price comparison / interactions / fake detection).

**→ FIX (quick win): a "Download Prescription PDF" button — reuse the print
infrastructure from the health report. (Full pharmacy module = later.)**

---

## STEP 7 — Follow-up & adherence (at home)
- ✅ Patient portal: visits, prescriptions, health report, reviews.
- ❌ **GAP 6a — No medication reminders** (nothing tells the patient to take
  Paracetamol at 2 PM).
- ❌ **GAP 6b — No follow-up automation** (can't auto-book a 3-day follow-up).
- ❌ **GAP 6c — No SMS notifications** (critical for Pakistan; in-app only today).

**→ FIX: medication-reminder scheduling on prescriptions; follow-up appointment
flag; integrate an SMS gateway (Twilio / local Jazz/Zong) for appointment +
prescription-ready alerts.**

---

## STEP 8 — Family context (Pakistan joint-family)
- ✅ Family Profiles work (Phase B): head manages dependents, books, views records.
- 🟡 No batch family booking; doctor doesn't see the family-manager linkage.

**→ FIX: surface "managed by" on doctor's patient detail page (small); optional
family batch-booking (later).**

---

# Implementation Plan (priority order)

## Phase C — Quick wins (≈ 2 days total)
1. **C1 — Printable Prescription PDF** (Gap 5, easy)
   - Reuse the `/patient-reports-print` print infrastructure.
   - "Download Prescription" button on doctor visit page + patient prescriptions page.
2. **C2 — Fix self-registration** (Gap 1, easy)
   - `registerUser` auto-creates a `patients` row linked by email.
   - "Complete profile" step (DOB, gender, phone) after first login.

## Phase D — Clinical completeness (≈ 1.5 weeks)
3. **D1 — Walk-in queue + walk-in status** (Gap 2, medium)
4. **D2 — Nurse role + triage** (Gap 3, medium) ⭐ highest clinical impact
5. **D3 — Lab test ordering + results** (Gap 8, medium)
6. **D4 — Doctor family-context view** (Gap 7, small)

## Phase E — Operations (≈ 2 weeks)
7. **E1 — Billing / invoices / payments** (Gap 4, hard)
8. **E2 — Medication reminders + follow-up flags** (Gap 6a/b, medium)
9. **E3 — SMS gateway integration** (Gap 6c, hard — needs provider)

## Later (Sehat Sathi vision)
10. Full pharmacy module (inventory + dispensing)
11. Sehat Card / insurance eligibility
12. Medicine Checker (drug DB + interactions)
