'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPatientSchema, type CreatePatientInput } from '@/lib/validators/patient';
import { createPatient } from '@/server/actions/patients.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NewPatientPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
  });

  async function onSubmit(values: CreatePatientInput) {
    try {
      await createPatient(values);
      toast.success('Patient created successfully');
      router.push('/receptionist/patients');
    } catch {
      toast.error('Failed to create patient');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Patient</h1>
        <p className="text-gray-500 text-sm">Fill in the patient's details below</p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input {...register('name')} className="mt-1" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" {...register('dob')} className="mt-1" />
              {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...register('phone')} className="mt-1" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" {...register('email')} className="mt-1" />
            </div>
            <div>
              <Label>Gender</Label>
              <select {...register('gender')} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Blood Group</Label>
              <select {...register('bloodGroup')} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Select</option>
                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input {...register('address')} className="mt-1" />
          </div>
          <div>
            <Label>Allergies</Label>
            <Input {...register('allergies')} className="mt-1" placeholder="e.g. Penicillin, Pollen" />
          </div>
          <div>
            <Label>Emergency Contact</Label>
            <Input {...register('emergencyContact')} className="mt-1" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Patient'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}