# Pharmacist Dashboard — Feature Reference

This document covers every feature available to a user with the `pharmacist` role in MediTrack.

---

## Navigation

The sidebar has 4 sections focused entirely on dispensing and stock management.

| Label | Route |
|---|---|
| Dispensing Queue | `/pharmacy` (dashboard home) |
| History | `/pharmacy/history` |
| Inventory | `/pharmacy/inventory` |
| Settings | `/pharmacy/settings` |

---

## 1. Dispensing Queue `/pharmacy` (Dashboard Home)

The primary operational page. Shows all prescription items from completed doctor visits that have not yet been dispensed.

**Top bar**
- Pharmacist name + "Pharmacy Station" label
- Notification bell

**Page header**
- Title: "Pharmacy Dispensing"
- Live count: "X prescriptions awaiting dispensing"

### Stat Cards (3 tiles)

| Card | What it shows |
|---|---|
| Pending Dispense | Count of prescription items not yet dispensed |
| Stock Batches | Total number of inventory batches across all medicines |
| Low Stock (≤10) | Count of batches with 10 or fewer units remaining (highlighted red when > 0) |

---

### Search Bar

- Full-width search input filtering the pending queue in real time
- Searches by **patient name** or **medicine name**
- Instant client-side filtering — no page reload

---

### Pending Prescription Queue

Each card in the queue represents one prescription line item from a completed consultation.

**Card layout:**

Left side:
- Patient initials avatar
- Patient full name
- Prescribing doctor name + prescription date/time

Right side:
- Medicine name (bold)
- Dosage · Frequency · Duration (e.g. "10mg · Once daily · 30 days")

**Dispense controls (bottom of card):**

1. **Select Batch dropdown** — lists all in-stock inventory batches for that medicine:
   - Shows: medicine name · batch number · quantity in stock · expiry date
   - Only batches with `quantityInStock > 0` are shown
   - If the prescription item has a `medicineId` link, only matching batches are shown; otherwise all in-stock batches are offered
2. **Quantity input** — numeric field, minimum 1
3. **Dispense button** — triggers the dispense action

**On dispense:**
- Validates that a batch is selected and quantity is ≥ 1
- Checks that the item has not already been dispensed (enforced server-side with a unique constraint)
- Checks that the selected batch matches the prescribed medicine (when `medicineId` is present)
- Checks that the batch has sufficient stock (`quantityInStock ≥ quantity`)
- Runs a database transaction: decrements `quantityInStock` on the batch + creates a `dispensings` record stamped with the logged-in pharmacist's user ID
- Updates inventory display optimistically in the UI (no full page reload)
- Shows a success toast: "[Medicine] dispensed to [Patient]."
- On any error: shows the server error message as a toast

**Empty state** — shown when no pending prescriptions exist or no search results match.

---

### Low Stock Alert Panel

Appears automatically below the queue when any batch has ≤ 10 units.

- Red bordered panel with an alert triangle
- Lists up to 5 low-stock batches: medicine name · batch number · unit count
- Message: "These batches have 10 or fewer units. Contact admin to restock."

---

### Add Medicine to Catalog (inline form)

A compact form on the dashboard that lets the pharmacist extend the medicine catalog.

**Fields:**
- Medicine Name (required)
- Generic Name (optional)
- Strength (optional, e.g. "500mg")

**On submit:**
- Validates that a medicine with the same name + strength doesn't already exist
- Inserts a new record into the `medicines` table
- Shows "Medicine added to the catalog." toast
- Clears the form and refreshes the page

---

### Receive Stock (inline form)

A companion form for logging new stock deliveries.

**Fields:**
- Select Medicine (required) — dropdown of all medicines in the catalog
- Quantity (required, integer ≥ 0)
- Batch Number (optional, e.g. "BN-2024-001")

**On submit:**
- Creates a new `medicineInventory` batch record linked to the selected medicine
- The batch is immediately available in the batch selector on pending queue cards
- Shows "Stock batch added." toast
- Clears the form and refreshes the page

---

## 2. Dispense History `/pharmacy/history`

A read-only audit log of all dispensing actions, plus the ability to undo a recent dispensing.

**Header:** Total count of dispensings recorded.

### History Table

Columns: Medicine · Patient · Qty · When · By · Action

| Column | Description |
|---|---|
| Medicine | Brand name of the dispensed medicine |
| Patient | Patient who received the medicine |
| Qty | Number of units dispensed |
| When | Date and time of dispensing (e.g. "Aug 10, 2:30 PM") |
| By | Name of the pharmacist who dispensed |
| Action | "Undo" button |

**Undo dispensing:**
- Prompts a confirmation: "Undo dispensing of [Medicine]? Stock will be restored and the prescription will become pending again."
- On confirm: runs a database transaction that restores `quantityInStock` on the original batch and deletes the `dispensings` record
- The prescription item immediately reappears in the Dispensing Queue as pending
- Shows "Dispensing undone. Stock restored." toast
- Up to 100 records are loaded per page (server-side limit)

---

## 3. Inventory `/pharmacy/inventory`

A read-only view of all stock batches currently in the system.

**Header:** Total batch count + note "read-only view (contact admin to manage stock)"

### Inventory Table

Columns: Medicine · Batch · Qty · Expiry

| Column | Description |
|---|---|
| Medicine | Brand name + generic name + strength |
| Batch | Batch number (or "—" if not set) |
| Qty | Units in stock; shown in red with a warning icon when ≤ 10 |
| Expiry | Expiry month/year color-coded: **Red** = expired · **Amber** = expiring within 30 days · **Grey** = fine |

**Color coding logic:**
- Expired batches → red text
- Expiring within 30 days → amber text
- Low stock (≤ 10 units) → red quantity with `AlertTriangle` icon
- Normal → grey/muted text

> Stock adjustments and new batches are managed from the dashboard (Receive Stock form) or by an admin. The inventory page itself is read-only.

---

## 4. Settings `/pharmacy/settings`

**Top bar:** Pharmacist Settings label + notification bell.

### Profile section

- **Name** — editable text input (min 2 characters)
- **Email** — editable (validated as a valid email format; server checks uniqueness against all users)
- **Save button** — saves via `updateOwnNurseProfile` server action (shared with nurse/lab roles)

### Password

- Password changes for the pharmacist are **not available in the settings UI**
- Note displayed: "Password changes are managed by the system administrator. Please contact your admin if you need a password reset."

---

## Data Flow — How the Dispensing Queue is Populated

The queue is built from the following chain:

```
Doctor completes appointment
  → Doctor creates a visit record
    → Doctor adds prescription items (medicineName, dosage, frequency, duration)
      → Prescription items appear in the pharmacist's queue
        → Pharmacist dispenses: selects batch + quantity → stock decremented + dispensing logged
          → Item removed from queue
```

Only items from **completed** appointments (`appointments.status = 'completed'`) that have **no existing** `dispensings` record appear in the queue.

---

## Pharmacist RBAC Permissions

| Resource | Permission |
|---|---|
| Pending prescription items | Read (all patients, all doctors) |
| Dispense prescription items | Create (select batch + quantity) |
| Undo dispensings | Delete (own + all dispensings) |
| Dispense history | Read (all dispensings, up to 100) |
| Medicine catalog | Read + Create (add new medicines) |
| Inventory batches | Read + Create (receive stock) |
| Notification bell | Receive alerts |
| Own profile (name, email) | Update |

A pharmacist **cannot** access: appointment booking, clinical visit notes or diagnosis, lab results, billing invoices, admin management pages, user role assignment, triage queue, or the audit log.

> Stock adjustments on existing batches (changing quantity directly) and expiry alert management are admin-only operations.
