'use server';

import { db } from '@/server/db';
import {
  appointments, doctors, patients, users, auditLogs,
  prescriptionItems, prescriptions, visits, dispensings,
  medicineInventory, medicines,
} from '@/server/db/schema';
import { requireSession } from '@/server/auth/rbac';
import {
  eq, and, gte, lte, desc, isNull, sql,
} from 'drizzle-orm';
import {
  startOfDay, endOfDay, subHours, addHours,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationItem = {
  id:        string;
  type:      'appointment' | 'checked_in' | 'cancelled' | 'new_patient' | 'audit' | 'system' | 'pharmacy' | 'prescription';
  title:     string;
  body:      string;
  time:      string;   // ISO string
  read:      boolean;
  href:      string;
};

// ─── Get notifications by role ────────────────────────────────────────────────

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = await requireSession();
  const { id: userId, role } = session.user;
  const now = new Date();

  const items: NotificationItem[] = [];

  // ── ADMIN notifications ───────────────────────────────────────────────────
  if (role === 'admin') {
    // 1. Today's appointments
    const todayAppts = await db
      .select({
        id:          appointments.id,
        scheduledAt: appointments.scheduledAt,
        status:      appointments.status,
        patientName: patients.name,
        createdAt:   appointments.createdAt,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          gte(appointments.scheduledAt, startOfDay(now)),
          lte(appointments.scheduledAt, endOfDay(now)),
        ),
      )
      .orderBy(desc(appointments.createdAt))
      .limit(5);

    for (const a of todayAppts) {
      if (a.status === 'checked_in') {
        items.push({
          id:    `chkin-${a.id}`,
          type:  'checked_in',
          title: 'Patient Checked In',
          body:  `${a.patientName ?? 'A patient'} has checked in for their appointment.`,
          time:  a.createdAt.toISOString(),
          read:  false,
          href:  `/admin/appointments/${a.id}`,
        });
      } else if (a.status === 'cancelled') {
        items.push({
          id:    `cancel-${a.id}`,
          type:  'cancelled',
          title: 'Appointment Cancelled',
          body:  `${a.patientName ?? 'A patient'}'s appointment was cancelled.`,
          time:  a.createdAt.toISOString(),
          read:  false,
          href:  `/admin/appointments/${a.id}`,
        });
      } else if (a.status === 'scheduled') {
        items.push({
          id:    `sched-${a.id}`,
          type:  'appointment',
          title: 'Appointment Today',
          body:  `${a.patientName ?? 'A patient'} has an appointment scheduled today.`,
          time:  a.scheduledAt.toISOString(),
          read:  true,
          href:  `/admin/appointments/${a.id}`,
        });
      }
    }

    // 2. New patients registered in last 24 hours
    const newPatients = await db
      .select({ id: patients.id, name: patients.name, createdAt: patients.createdAt })
      .from(patients)
      .where(
        and(
          gte(patients.createdAt, subHours(now, 24)),
          isNull(patients.deletedAt),
        ),
      )
      .orderBy(desc(patients.createdAt))
      .limit(3);

    for (const p of newPatients) {
      items.push({
        id:    `newpat-${p.id}`,
        type:  'new_patient',
        title: 'New Patient Registered',
        body:  `${p.name} was registered in the last 24 hours.`,
        time:  p.createdAt.toISOString(),
        read:  false,
        href:  `/admin/patients/${p.id}`,
      });
    }

    // 3. Recent audit activity (delete actions are high priority)
    const recentAudit = await db
      .select({
        id:        auditLogs.id,
        action:    auditLogs.action,
        tableName: auditLogs.tableName,
        createdAt: auditLogs.createdAt,
        userName:  users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          gte(auditLogs.createdAt, subHours(now, 6)),
          eq(auditLogs.action, 'delete'),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(3);

    for (const log of recentAudit) {
      items.push({
        id:    `audit-${log.id}`,
        type:  'audit',
        title: 'Record Deleted',
        body:  `${log.userName ?? 'Someone'} deleted a ${log.tableName} record.`,
        time:  log.createdAt.toISOString(),
        read:  false,
        href:  `/admin/audit-logs`,
      });
    }
  }

  // ── DOCTOR notifications ──────────────────────────────────────────────────
  if (role === 'doctor') {
    const [doctorRow] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId));

    if (doctorRow) {
      // Checked-in patients waiting
      const waiting = await db
        .select({
          id:          appointments.id,
          scheduledAt: appointments.scheduledAt,
          status:      appointments.status,
          patientName: patients.name,
          createdAt:   appointments.createdAt,
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .where(
          and(
            eq(appointments.doctorId, doctorRow.id),
            eq(appointments.status,   'checked_in'),
            gte(appointments.scheduledAt, startOfDay(now)),
            lte(appointments.scheduledAt, endOfDay(now)),
          ),
        )
        .orderBy(appointments.scheduledAt)
        .limit(5);

      for (const a of waiting) {
        items.push({
          id:    `wait-${a.id}`,
          type:  'checked_in',
          title: 'Patient Ready',
          body:  `${a.patientName ?? 'A patient'} has checked in and is waiting for you.`,
          time:  a.createdAt.toISOString(),
          read:  false,
          href:  `/doctor/appointments/${a.id}`,
        });
      }

      // Upcoming appointments in the next 2 hours
      const upcoming = await db
        .select({
          id:          appointments.id,
          scheduledAt: appointments.scheduledAt,
          patientName: patients.name,
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .where(
          and(
            eq(appointments.doctorId, doctorRow.id),
            eq(appointments.status,   'scheduled'),
            gte(appointments.scheduledAt, now),
            lte(appointments.scheduledAt, addHours(now, 2)),
          ),
        )
        .orderBy(appointments.scheduledAt)
        .limit(3);

      for (const a of upcoming) {
        items.push({
          id:    `upcoming-${a.id}`,
          type:  'appointment',
          title: 'Upcoming Appointment',
          body:  `${a.patientName ?? 'A patient'} is scheduled soon.`,
          time:  a.scheduledAt.toISOString(),
          read:  true,
          href:  `/doctor/appointments/${a.id}`,
        });
      }

      // Cancelled appointments today
      const cancelled = await db
        .select({
          id:          appointments.id,
          scheduledAt: appointments.scheduledAt,
          patientName: patients.name,
          createdAt:   appointments.createdAt,
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .where(
          and(
            eq(appointments.doctorId, doctorRow.id),
            eq(appointments.status,   'cancelled'),
            gte(appointments.scheduledAt, startOfDay(now)),
            lte(appointments.scheduledAt, endOfDay(now)),
          ),
        )
        .limit(3);

      for (const a of cancelled) {
        items.push({
          id:    `doccancel-${a.id}`,
          type:  'cancelled',
          title: 'Appointment Cancelled',
          body:  `${a.patientName ?? 'A patient'} cancelled their appointment today.`,
          time:  a.createdAt.toISOString(),
          read:  false,
          href:  `/doctor/appointments`,
        });
      }
    }
  }

  // ── RECEPTIONIST notifications ────────────────────────────────────────────
  if (role === 'receptionist') {
    // Checked-in patients (all doctors)
    const checkedIn = await db
      .select({
        id:          appointments.id,
        scheduledAt: appointments.scheduledAt,
        patientName: patients.name,
        createdAt:   appointments.createdAt,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.status, 'checked_in'),
          gte(appointments.scheduledAt, startOfDay(now)),
          lte(appointments.scheduledAt, endOfDay(now)),
        ),
      )
      .orderBy(desc(appointments.createdAt))
      .limit(5);

    for (const a of checkedIn) {
      items.push({
        id:    `rchkin-${a.id}`,
        type:  'checked_in',
        title: 'Patient Checked In',
        body:  `${a.patientName ?? 'A patient'} is checked in and waiting.`,
        time:  a.createdAt.toISOString(),
        read:  false,
        href:  `/receptionist/appointments`,
      });
    }

    // Cancellations today
    const cancelledToday = await db
      .select({
        id:          appointments.id,
        patientName: patients.name,
        createdAt:   appointments.createdAt,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.status, 'cancelled'),
          gte(appointments.scheduledAt, startOfDay(now)),
          lte(appointments.scheduledAt, endOfDay(now)),
        ),
      )
      .orderBy(desc(appointments.createdAt))
      .limit(3);

    for (const a of cancelledToday) {
      items.push({
        id:    `rcancel-${a.id}`,
        type:  'cancelled',
        title: 'Appointment Cancelled',
        body:  `${a.patientName ?? 'A patient'} cancelled their appointment.`,
        time:  a.createdAt.toISOString(),
        read:  false,
        href:  `/receptionist/appointments`,
      });
    }
  }

  // ── PHARMACIST notifications ──────────────────────────────────────────────
  if (role === 'pharmacist') {
    // 1. Pending prescriptions awaiting dispensing (last 24h)
    const pendingRx = await db
      .select({
        id:          prescriptionItems.id,
        medicineName: prescriptionItems.medicineName,
        patientName: patients.name,
        createdAt:   prescriptions.createdAt,
      })
      .from(prescriptionItems)
      .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
      .innerJoin(visits, eq(prescriptions.visitId, visits.id))
      .leftJoin(patients, eq(visits.patientId, patients.id))
      .leftJoin(dispensings, eq(prescriptionItems.id, dispensings.prescriptionItemId))
      .where(
        and(
          isNull(dispensings.id),
          gte(prescriptions.createdAt, subHours(now, 24)),
        ),
      )
      .orderBy(desc(prescriptions.createdAt))
      .limit(5);

    for (const rx of pendingRx) {
      items.push({
        id:    `rx-${rx.id}`,
        type:  'pharmacy',
        title: 'New Prescription to Dispense',
        body:  `${rx.patientName ?? 'A patient'} — ${rx.medicineName}`,
        time:  rx.createdAt.toISOString(),
        read:  false,
        href:  `/pharmacy`,
      });
    }

    // 2. Low-stock alerts (batches below 10 units)
    const lowStock = await db
      .select({
        id:        medicineInventory.id,
        medicineName: medicines.name,
        quantity:  medicineInventory.quantityInStock,
      })
      .from(medicineInventory)
      .innerJoin(medicines, eq(medicineInventory.medicineId, medicines.id))
      .where(lte(medicineInventory.quantityInStock, 10))
      .limit(5);

    for (const ls of lowStock) {
      items.push({
        id:    `lows-${ls.id}`,
        type:  'pharmacy',
        title: 'Low Stock Alert',
        body:  `${ls.medicineName} — only ${ls.quantity} units left`,
        time:  now.toISOString(),
        read:  false,
        href:  `/pharmacy/inventory`,
      });
    }
  }

  // ── PATIENT notifications ─────────────────────────────────────────────────
  if (role === 'patient') {
    // Prescription ready for pickup (dispensed in the last 24h)
    const readyRx = await db
      .select({
        id:          dispensings.id,
        medicineName: prescriptionItems.medicineName,
        quantity:    dispensings.quantityDispensed,
        dispensedAt: dispensings.dispensedAt,
      })
      .from(dispensings)
      .innerJoin(prescriptionItems, eq(dispensings.prescriptionItemId, prescriptionItems.id))
      .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
      .innerJoin(visits, eq(prescriptions.visitId, visits.id))
      .leftJoin(patients, eq(visits.patientId, patients.id))
      .where(
        and(
          eq(patients.email, session.user.email ?? ''),
          gte(dispensings.dispensedAt, subHours(now, 24)),
        ),
      )
      .orderBy(desc(dispensings.dispensedAt))
      .limit(5);

    for (const rx of readyRx) {
      items.push({
        id:    `ready-${rx.id}`,
        type:  'prescription',
        title: 'Prescription Ready',
        body:  `${rx.medicineName} × ${rx.quantity} — please collect from the pharmacy.`,
        time:  rx.dispensedAt.toISOString(),
        read:  false,
        href:  `/patient/prescriptions`,
      });
    }
  }

  // Sort by time descending, cap at 15
  return items
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 15);
}
