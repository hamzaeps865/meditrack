'use server';

import { db } from '@/server/db';
import { medicationReminders, prescriptions, prescriptionItems, visits } from '@/server/db/schema';
import { requireRole, assertPatientOwnsPatientRecord } from '@/server/auth/rbac';
import { eq, and, asc } from 'drizzle-orm';

// ─── Parse frequency string → interval in hours ───────────────────────────────
// Handles common patterns: "once daily", "twice daily", "thrice daily",
// "every X hours", "BD", "TDS", "QID", etc. Falls back to 24h.

function parseFrequencyToHours(frequency: string): number {
  const f = frequency.toLowerCase().trim();
  if (f.includes('thrice') || f.includes('tid') || f.includes('tds') || f.includes('3 time')) return 8;
  if (f.includes('twice') || f.includes('bid') || f.includes('bd') || f.includes('2 time')) return 12;
  if (f.includes('four') || f.includes('qid') || f.includes('4 time')) return 6;
  if (f.includes('once') || f.includes('od') || f.includes('daily') || f.includes('1 time')) return 24;
  const everyMatch = f.match(/every\s+(\d+)\s*hr?s?/);
  if (everyMatch) return Number(everyMatch[1]);
  return 24; // default: once daily
}

// ─── Generate Medication Reminders (internal — called on visit completion) ────

export async function generateMedicationReminders(visitId: string, patientId: string) {
  try {
    // Find all prescriptions for this visit
    const prescriptionRows = await db
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(eq(prescriptions.visitId, visitId));

    if (prescriptionRows.length === 0) return;

    // Get all items across those prescriptions
    const items = await db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, prescriptionRows[0].id));

    if (items.length === 0) return;

    const now = new Date();
    // Deactivate old reminders for this patient (new prescription replaces old)
    await db
      .update(medicationReminders)
      .set({ isActive: false })
      .where(eq(medicationReminders.patientId, patientId));

    // Create new reminders
    for (const item of items) {
      const intervalHours = parseFrequencyToHours(item.frequency);
      // First dose in 1 hour from now (or next interval boundary)
      const nextDoseAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

      await db.insert(medicationReminders).values({
        patientId,
        prescriptionItemId: item.id,
        medicineName: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        nextDoseAt,
        intervalHours,
        isActive: true,
      });
    }
  } catch (err) {
    console.error('[medication-reminders] generateMedicationReminders failed:', err);
  }
}

// ─── Get Active Medication Reminders for a Patient ────────────────────────────

export async function getMedicationReminders(patientId: string) {
  const session = await requireRole(['admin', 'doctor', 'patient']);
  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(patientId, session);
  }

  return db
    .select()
    .from(medicationReminders)
    .where(
      and(
        eq(medicationReminders.patientId, patientId),
        eq(medicationReminders.isActive, true),
      ),
    )
    .orderBy(asc(medicationReminders.nextDoseAt));
}

// ─── Mark a Dose as Taken (advances nextDoseAt) ───────────────────────────────

export async function markDoseTaken(reminderId: string) {
  const session = await requireRole(['patient', 'admin']);

  const [reminder] = await db
    .select()
    .from(medicationReminders)
    .where(eq(medicationReminders.id, reminderId));

  if (!reminder) throw new Error('Reminder not found.');

  if (session.user.role === 'patient') {
    await assertPatientOwnsPatientRecord(reminder.patientId, session);
  }

  const interval = reminder.intervalHours ?? 24;
  const nextDoseAt = new Date(Date.now() + interval * 60 * 60 * 1000);

  await db
    .update(medicationReminders)
    .set({ nextDoseAt })
    .where(eq(medicationReminders.id, reminderId));

  return { success: true, nextDoseAt };
}
