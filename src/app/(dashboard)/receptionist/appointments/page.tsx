import { getAllAppointments } from '@/server/actions/appointments.actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  checked_in:  'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
  no_show:     'bg-gray-100 text-gray-700',
};

export default async function AppointmentsPage() {
  const appointments = await getAllAppointments();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-gray-500 text-sm">{appointments.length} total appointments</p>
        </div>
        <Button
          render={<Link href="/receptionist/appointments/new" />}
          className="bg-cyan-700 hover:bg-cyan-800"
        >
          + Book Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No appointments yet</p>
          <p className="text-sm mt-1">Book your first appointment to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.patientName ?? '—'}</TableCell>
                  <TableCell>{a.doctorName ?? '—'}</TableCell>
                  <TableCell>
                    {format(new Date(a.scheduledAt), 'MMM dd, yyyy hh:mm a')}
                  </TableCell>
                  <TableCell>{a.reason ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[a.status]}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/receptionist/appointments/${a.id}`} />}
                    >
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
