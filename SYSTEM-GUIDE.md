# MediTrack — Complete System Guide (Plain English)

This document explains exactly what every person in the clinic can do, and how they all work together to take care of a single patient — from the moment the patient decides to visit, until they go home with their medicine.

---

## The 6 Roles (Who's Who)

| Role | Who They Are | Their Job |
|---|---|---|
| **Admin** | The clinic owner or manager | Controls everything — staff, settings, money, pharmacy |
| **Doctor** | The physician who sees patients | Diagnoses, prescribes, orders tests, completes visits |
| **Nurse** | The triage nurse at the front of the clinic | Takes vitals, judges severity, prepares the patient for the doctor |
| **Receptionist** | The front desk person | Registers patients, books appointments, checks people in |
| **Pharmacist** | The person at the medicine counter | Dispenses medicine from inventory, tracks stock |
| **Patient** | The person coming to the clinic | Books appointments, sees their records, manages their family |

---

## What Each Role Can Do (Step by Step)

### 1. ADMIN (The Boss)

The admin is the only role that can access EVERYTHING. Think of them as the clinic manager.

**They can:**
- **See the dashboard** — how many patients today, how many doctors, total users, today's schedule, recent activity (who created/deleted what)
- **Manage doctors** — create new doctor accounts, edit doctor details (name, specialization, license number), delete doctors who leave, view each doctor's profile (appointments, patients seen, ratings, reviews, availability schedule)
- **Manage patients** — see all patients, view any patient's full profile, edit patient details (fix wrong phone numbers, correct allergies, update blood group), deactivate patients who leave
- **Manage appointments** — see all appointments across the whole clinic, create new appointments, cancel appointments
- **Manage users** — see everyone who has an account, assign roles (make someone a doctor, nurse, pharmacist, etc.), edit names, deactivate accounts
- **Billing** — see all invoices, mark invoices as paid, see total revenue and outstanding balances, print receipts
- **Pharmacy** — see the full medicine catalog (111 medicines), add/edit medicines, add stock batches, adjust stock counts, view low-stock and expiry alerts, dispense medicine, see the dispensing summary
- **Health Alerts** — create disease outbreak warnings (dengue, flu, etc.) targeted to specific cities, delete old alerts
- **Audit Logs** — see a complete log of every action taken in the system (who viewed what, who created/deleted/updated what, from which IP, at what time)
- **Settings** — configure the clinic name, contact info, operating hours, consultation fee (the amount charged per visit), appointment slot duration, booking rules, notification preferences, security settings

**The admin CANNOT:**
- Make medical decisions (diagnose, prescribe) — that's the doctor's job
- Do triage — that's the nurse's job
- Access other roles' dashboards (admin is locked to `/admin/*`)

---

### 2. DOCTOR (The Physician)

The doctor handles the medical side — seeing patients, diagnosing, prescribing.

**They can:**
- **See their dashboard** — today's timeline (appointments in order), "next up" patient highlighted, quick stats (patients seen this week), recent patients list, patient rating card (from reviews), availability summary, recent reviews
- **Manage appointments** — view their own appointments in day or week view, see appointment details (patient history, triage data, vitals)
- **Start and complete visits** — when they click "Start Visit", the appointment status changes to "in progress". They then record:
  - Chief complaint (what the patient says is wrong)
  - Vitals (blood pressure, temperature, weight) — pre-filled from the nurse's triage if available
  - Diagnosis
  - Clinical notes
  - Prescription medicines (with autocomplete from the 111-medicine catalog)
  - Lab test orders (CBC, blood sugar, etc.)
  - Follow-up scheduling (option to book a follow-up appointment)
- **When they click "Complete Visit":** the system automatically:
  1. Saves the visit record
  2. Saves the prescription
  3. Saves lab orders
  4. Marks the appointment as "completed"
  5. Awards the patient +20 health points
  6. Auto-generates an invoice for the consultation fee
  7. Creates medication reminders from the prescription
- **Manage patients** — see their own patient list, view each patient's full history (visits, prescriptions, appointments, vitals), see if the patient is a family dependent managed by someone else
- **Availability** — set their weekly schedule (which days, what hours), toggle days on/off, add/remove time blocks
- **Analytics** — see charts: total visits, unique patients, average rating, completion rate, 14-day visit trend, appointment status breakdown, top diagnoses, rating histogram
- **Settings** — edit their own name and specialization, change password, sign out

**The doctor CANNOT:**
- Register new patients or book appointments for patients (that's receptionist's job)
- Dispense medicine or manage pharmacy inventory
- See other doctors' patients or appointments
- Access billing or audit logs

---

### 3. NURSE (The Triage Station)

The nurse is the first clinical person the patient sees — they take vitals and judge how urgent the case is.

**They can:**
- **See the triage queue** — a prioritized list of all checked-in and walk-in patients waiting for the doctor, sorted by severity and wait time. Shows: patient name, age, gender, blood group, allergies, wait time, triage status
- **Perform triage** — for each patient, the nurse fills a triage form:
  - Severity assessment: Critical (life-threatening), Urgent (serious), Standard (routine), Low (minor)
  - Chief complaint (why the patient is here)
  - Vitals: blood pressure, temperature, pulse, weight
  - Notes for the doctor
- **Re-assess patients** — if a patient's condition changes, the nurse can do a new triage assessment
- **Settings** — edit their own name, change password, sign out

**When the nurse finishes triage, the doctor sees:**
- The severity badge (Critical/Urgent/Standard/Low) on the appointment
- All the vitals the nurse recorded
- The chief complaint
- The nurse's notes

The doctor's visit form vitals fields are **pre-filled** from the triage data, so the doctor doesn't need to re-enter blood pressure, temperature, and weight.

**The nurse CANNOT:**
- Diagnose or prescribe
- Book appointments or register patients
- Access any other role's dashboard
- See past visits or medical history beyond triage

---

### 4. RECEPTIONIST (The Front Desk)

The receptionist is the first person patients meet when they walk in.

**They can:**
- **See the reception dashboard** — live waiting room queue (who's checked in), today's full schedule, attending doctors (who's in a consult, who's available), quick action shortcuts
- **Register new patients** — full form: name, DOB, gender, phone, email, address, blood group, allergies, emergency contact
- **Edit patient details** — update name, phone, email, address, emergency contact for existing patients (but NOT blood group, DOB, gender, or allergies — those need an admin)
- **Book appointments** — search for a patient, pick a doctor, select a time slot, enter the reason for the visit
- **Create walk-in appointments** — for patients who show up without a booking (fever emergency, walk-in consultation)
- **Check-in patients** — when a patient arrives, click "Check In" → the appointment status changes from "scheduled" to "checked in" → the patient appears on the nurse's triage queue and the doctor's waiting list
- **Cancel appointments** — mark appointments as cancelled or no-show
- **View patient details** — see any patient's basic info and appointment history
- **Settings** — edit name, change password, sign out

**The receptionist CANNOT:**
- Diagnose, prescribe, or do triage
- Access billing, pharmacy, audit logs, or doctor analytics
- Edit blood group, allergies, DOB, or gender (admin only for those fields)

---

### 5. PHARMACIST (The Medicine Counter)

The pharmacist handles the medicine — from prescription to the patient's hands.

**They can:**
- **See the dispensing queue** — a list of all prescriptions from completed visits that haven't been dispensed yet. Shows: patient name, medicine name, dosage, frequency, duration, prescribing doctor
- **Search by patient name or medicine** — when a patient walks up to the counter, the pharmacist types their name to find their prescription instantly
- **Dispense medicine** — for each prescription item:
  1. Select which batch to dispense from (each batch shows quantity + expiry date)
  2. Enter the quantity to give
  3. Click "Dispense" → stock is automatically decremented from that batch
- **See low-stock alerts** — when any batch drops to 10 or fewer units, a red warning shows on the dashboard and in the notification bell
- **View inventory (read-only)** — see all medicine batches, their quantities, expiry dates, batch numbers. Can't add or adjust stock (admin only)
- **See dispense history** — a full list of everything they've dispensed, with patient name, medicine, quantity, time, and who dispensed it. Can **undo** a dispensing if they made a mistake (restores stock + makes the prescription pending again)
- **Settings** — edit name, change password, sign out

**The pharmacist CANNOT:**
- Add new medicines to the catalog (admin only)
- Add stock or adjust stock quantities (admin only)
- Diagnose, prescribe, or do triage
- Access patient medical records or billing

---

### 6. PATIENT (The Person Coming to the Clinic)

The patient is the center of the entire system. Everything exists to serve them.

**Before the visit (at home):**
- **Register online** — create an account with name, email, phone, DOB, gender, password. A patient record is created automatically.
- **Login with email OR phone** — phone login uses a 4-digit OTP code (shown on screen for now, pluggable to SMS later)
- **Find a doctor** — browse the doctor directory, see specializations, star ratings, and patient reviews
- **Book an appointment** — pick a doctor, see available time slots (based on the doctor's set hours), select a slot, enter the reason for the visit
- **Cancel an appointment** — cancel their own scheduled appointments (no need to call reception)
- **Manage family members** — create profiles for spouse, children, parents. Switch between profiles using the sidebar switcher. Book appointments for family members, view their records.

**During the visit (at the clinic):**
- **See their queue position** — when checked in, the system shows their approximate wait time (planned)
- **Nurse triage** — the nurse takes vitals and notes severity; the patient doesn't need to do anything

**After the visit (at home):**
- **See visit history** — every consultation: date, doctor, chief complaint, diagnosis, vitals, clinical notes
- **See prescriptions** — every prescription with medicine names, dosages, frequencies, durations. Download a printable PDF prescription.
- **See lab results** — lab tests the doctor ordered, their status (ordered/completed), and results when they come back
- **Medication reminders** — active medicines with next-dose times and a "Taken ✓" button. Overdue doses are highlighted red.
- **Billing** — see all invoices, outstanding balance, payment status (pending/paid), download printable receipts
- **Health report** — a full PDF summary of visits, prescriptions, vitals, appointment stats, health score, and loyalty tier
- **Health score** — gamified points: +20 for completing an appointment, +10 for posting a review. Tiers: Starter → Bronze → Silver → Gold → Platinum
- **Loyalty badge** — Bronze (1+ month active) → Silver (3+) → Gold (6+) → Platinum (12+)
- **Review doctors** — after a completed appointment, leave a star rating and comment
- **Community health alerts** — see disease outbreak warnings for their city (dengue, flu, etc.) with prevention tips
- **Edit profile** — update name, phone, address, emergency contact. Upload a profile photo.
- **Notifications** — see when prescriptions are ready for pickup, health alerts, medication reminders

**The patient CANNOT:**
- Access any staff dashboard
- See other patients' records (except family members they manage)
- Prescribe, diagnose, or self-book past the doctor's available hours

---

## How All Roles Work Together for One Patient

### The Complete Journey of Muzzamil's Fever

**Phase 1: Registration & Booking**

Muzzamil feels sick. He goes to the MediTrack website on his phone.

1. **Muzzamil (Patient)** registers online → account + patient record created automatically.
2. **Muzzamil** browses "Find a Doctor" → sees Dr. Ahmed Khan (General Practitioner, 4.5 stars).
3. **Muzzamil** books an appointment for tomorrow at 10:00 AM → the system confirms the slot is available based on the doctor's set hours.

**Phase 2: Arrival at the Clinic**

4. Muzzamil arrives at the clinic at 9:45 AM.
5. **Receptionist** searches for Muzzamil → clicks "Check In" → status changes to "Checked In".
6. Muzzamil appears on:
   - The **Nurse's** triage queue (status: "Needs Triage")
   - The **Doctor's** dashboard (status: waiting)

**Phase 3: Triage**

7. **Nurse** calls Muzzamil → opens the triage form:
   - Takes his temperature: 102°F
   - Blood pressure: 120/80
   - Pulse: 95 bpm
   - Asks what's wrong → "Fever for 3 days, body aches"
   - Sets severity: **Urgent** (high fever, 3 days duration)
   - Notes: "Patient looks fatigued, possible viral infection"
8. The triage data is saved. The doctor now sees a severity badge + all vitals on the appointment detail page.

**Phase 4: Consultation**

9. **Doctor** opens Muzzamil's appointment → sees:
   - Triage data: Urgent, 102°F, the nurse's notes
   - Patient history: no prior visits, no known allergies, blood group O+
   - The vitals fields are pre-filled from triage (no re-entry needed)
10. **Doctor** fills the visit form:
    - Chief complaint: "Fever for 3 days" (pre-filled from triage)
    - Vitals: confirmed from triage
    - Diagnosis: "Viral fever — supportive care"
    - Notes: "Rest, fluids, return if fever persists beyond 5 days"
    - Prescription: Panadol 500mg (selected from autocomplete), twice daily, 5 days
    - Lab order: CBC (complete blood count) to rule out dengue
11. **Doctor** checks "Schedule Follow-up" → selects 3 days from now
12. **Doctor** clicks **"Complete Visit"**

**Phase 5: Automatic System Actions (all happen at once)**

The system automatically:
- Saves the visit record (diagnosis, notes, vitals)
- Saves the prescription (Panadol 500mg × 5 days)
- Saves the lab order (CBC)
- Creates the follow-up appointment (3 days later)
- Marks Muzzamil's appointment as "Completed"
- Awards Muzzamil +20 health points
- Generates an invoice for Rs 2000 (the consultation fee set by admin)
- Creates medication reminders: "Take Panadol — every 12 hours"

**Phase 6: Notification Chain**

- **Pharmacist** gets a notification in their bell: "New prescription to dispense — Muzzamil Hassan — Panadol 500mg"
- The prescription appears in the pharmacist's dispensing queue

**Phase 7: Pharmacy**

13. Muzzamil walks to the pharmacy counter.
14. **Pharmacist** searches "Muzzamil" in the dispensing queue → finds the pending prescription.
15. **Pharmacist** selects a batch of Panadol → enters quantity (10 tablets) → clicks "Dispense".
16. Stock is decremented from the inventory automatically.
17. **Muzzamil** gets a notification in his bell: "Prescription Ready — Panadol × 10. Please collect from the pharmacy."
18. Muzzamil collects his medicine and goes home.

**Phase 8: Billing**

19. **Muzzamil** checks his billing page → sees invoice: Rs 2000, status "Pending".
20. **Receptionist or Admin** marks the invoice as "Paid" (cash payment at the counter).
21. **Muzzamil** can download a printable receipt from his billing page.

**Phase 9: At Home — Self-Management**

22. **Muzzamil** opens his patient portal:
    - **My Visits** → sees the full visit record: diagnosis (Viral fever), notes, vitals
    - **Prescriptions** → sees Panadol with download option (printable PDF prescription)
    - **Lab Results** → sees "CBC — Ordered" (will show result when the lab sends it back)
    - **Medication Reminders** → "Take Panadol — in 2 hours" with a "Taken ✓" button
    - **Billing** → sees the paid invoice + receipt
    - **Health Report** → downloads a full PDF of his medical activity
    - **Health Score** → sees his points (20) and Starter tier
    - **Review** → leaves a 5-star review for Dr. Ahmed Khan

23. Three days later: the **follow-up appointment** is already booked. Muzzamil receives a reminder. If the fever is gone, he can cancel it himself from the portal.

---

## Summary: Who Does What

| Step | Who Does It | What Happens |
|---|---|---|
| Register | Patient | Creates account online |
| Book | Patient or Receptionist | Reserves a time slot |
| Arrive | Receptionist | Checks the patient in |
| Triage | Nurse | Takes vitals, sets severity |
| Consult | Doctor | Diagnoses, prescribes, orders labs |
| Auto-actions | System | Invoice, reminders, follow-up, health points |
| Pharmacy | Pharmacist | Dispenses medicine from stock |
| Payment | Receptionist/Admin | Marks invoice paid |
| At home | Patient | Sees records, reminders, results |
| Follow-up | Patient or System | Already booked, patient can cancel |

---

*This document covers the complete MediTrack system as of August 2026.*
