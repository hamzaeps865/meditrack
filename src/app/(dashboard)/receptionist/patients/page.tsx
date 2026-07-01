import { getAllPatients } from '@/server/actions/patients.actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function PatientsPage() {
  const patients = await getAllPatients();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-gray-500 text-sm">{patients.length} registered patients</p>
        </div>
        <Button render={<Link href="/receptionist/patients/new" />} className="bg-cyan-700 hover:bg-cyan-800">
          + Add Patient
        </Button>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No patients yet</p>
          <p className="text-sm mt-1">Add your first patient to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.bloodGroup ?? '—'}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{p.gender}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" render={<Link href={`/receptionist/patients/${p.id}`} />}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}