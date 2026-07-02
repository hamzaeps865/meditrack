'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';

const EditPatientModal = dynamic(
  () => import('./edit-patient-modal'),
  { ssr: false },
);

interface PatientData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
}

interface Props {
  patient: PatientData;
  patientCode: string;
}

export default function EditPatientButton({ patient, patientCode }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border
          text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Patient
      </button>

      {open && (
        <EditPatientModal
          patient={patient}
          patientCode={patientCode}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
