'use client';

import { useState, useEffect, useTransition } from 'react';
import {
 Search, HelpCircle, Globe,
 Calendar, BellRing, Shield, Users,
 FileImage, CheckCircle2, Clock,
 Lock, Eye, EyeOff, ToggleLeft, ToggleRight,
 Loader2,
} from 'lucide-react';
import NotificationBell from '@/components/shared/notification-bell';
import { toast } from 'sonner';
import {
 getSystemSettings,
 setSystemSettings,
} from '@/server/actions/settings.actions';
import {
 updateOwnAdminProfile,
 changeOwnAdminPassword,
} from '@/server/actions/admin-self.actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'clinic' | 'appointments' | 'notifications' | 'security' | 'roles';

interface Props {
 adminName: string;
 adminEmail: string;
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls =
 'w-full h-10 px-3 border border-border bg-white text-sm ' +
 'text-foreground placeholder:text-muted-foreground/60 ' +
 'focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors';

const labelCls = 'block text-xs font-semibold text-foreground mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
 return (
  <div>
   <label className={labelCls}>{label}</label>
   {children}
  </div>
 );
}

// ─── Operating hours row ──────────────────────────────────────────────────────

function HoursRow({
 day, open, start, end,
 onToggle, onStart, onEnd,
}: {
 day: string; open: boolean;
 start: string; end: string;
 onToggle: () => void;
 onStart: (v: string) => void;
 onEnd:  (v: string) => void;
}) {
 return (
  <div className="flex items-center gap-4 py-3
   border-b border-border last:border-b-0">
   <p className="text-sm font-medium text-foreground w-32 shrink-0">{day}</p>

   {open ? (
    <>
     <div className="flex items-center gap-2 flex-1">
      <input
       type="time"
       value={start}
       onChange={(e) => onStart(e.target.value)}
       className={`${inputCls} w-32`}
      />
      <span className="text-xs text-muted-foreground shrink-0">to</span>
      <input
       type="time"
       value={end}
       onChange={(e) => onEnd(e.target.value)}
       className={`${inputCls} w-32`}
      />
     </div>
     <button
      type="button"
      onClick={onToggle}
      className="shrink-0 px-3 py-1 text-[10px] font-bold
       uppercase tracking-wide bg-amber-50 text-amber-600 border
       border-amber-200 hover:bg-red-50 hover:text-red-600
       hover:border-red-200 transition-colors"
     >
      Open
     </button>
    </>
   ) : (
    <>
     <p className="flex-1 text-sm italic text-muted-foreground/60">Closed</p>
     <button
      type="button"
      onClick={onToggle}
      className="shrink-0 px-3 py-1 text-[10px] font-bold
       uppercase tracking-wide bg-red-50 text-red-500 border border-red-200
       hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200
       transition-colors"
     >
      Closed
     </button>
    </>
   )}
  </div>
 );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
 label, description, value, onChange,
}: {
 label: string; description: string;
 value: boolean; onChange: (v: boolean) => void;
}) {
 return (
  <div className="flex items-center justify-between gap-4 py-4
   border-b border-border last:border-b-0">
   <div>
    <p className="text-sm font-semibold text-foreground">{label}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
   </div>
   <button
    type="button"
    onClick={() => onChange(!value)}
    aria-pressed={value}
    className={`h-6 w-11 flex items-center px-0.5 shrink-0
     transition-colors ${value ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}
   >
    <div className="h-5 w-5 bg-white shadow-sm" />
   </button>
  </div>
 );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminSettings({ adminName, adminEmail }: Props) {
 const [activeTab, setActiveTab] = useState<Tab>('clinic');
 const [saved, setSaved] = useState(false);
 const [isPending, startTransition] = useTransition();

 // ── Admin profile (editable name) ─────────────────────────────────────────
 const [name, setName] = useState(adminName);

 // ── Clinic Information state ──────────────────────────────────────────────
 const [clinicName,  setClinicName]  = useState('MediTrack Central Clinic');
 const [contactEmail, setContactEmail] = useState('admin@meditrack-central.com');
 const [phone,     setPhone]     = useState('+1 (555) 902-3401');
 const [address,    setAddress]    = useState('102 Medical Plaza, Suite 400, Austin, TX 78701');
 const [clinicLogo,  setClinicLogo]  = useState<string | null>(null);

 function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
   toast.error('File size must be under 2MB');
   return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
   const base64 = event.target?.result as string;
   setClinicLogo(base64);
   toast.success('Logo uploaded! Click "Save Changes" to apply.');
  };
  reader.readAsDataURL(file);
 }

 const [hours, setHours] = useState([
  { day: 'Monday – Friday', open: true, start: '08:00', end: '18:00' },
  { day: 'Saturday',    open: true, start: '09:00', end: '14:00' },
  { day: 'Sunday',     open: false, start: '09:00', end: '17:00' },
 ]);

 function updateHour(i: number, field: 'open' | 'start' | 'end', val: boolean | string) {
  setHours((prev) => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));
 }

 // ── Appointment Settings state ────────────────────────────────────────────
 const [consultationFee, setConsultationFee] = useState('2000');
 const [slotDuration, setSlotDuration] = useState('30');
 const [bufferTime,  setBufferTime]  = useState('10');
 const [bookingWindow, setBookingWindow] = useState('30');
 const [allowSelfBook, setAllowSelfBook] = useState(true);
 const [requireApproval, setRequireApproval] = useState(false);
 const [allowCancellation, setAllowCancellation] = useState(true);

 // ── Notification state ────────────────────────────────────────────────────
 const [emailReminders,  setEmailReminders]  = useState(true);
 const [smsReminders,   setSmsReminders]   = useState(false);
 const [reminderHours,   setReminderHours]   = useState('24');
 const [newPatientAlert,  setNewPatientAlert]  = useState(true);
 const [cancellationAlert, setCancellationAlert] = useState(true);
 const [dailyDigest,    setDailyDigest]    = useState(true);

 // ── Security state ────────────────────────────────────────────────────────
 const [twoFactor,  setTwoFactor]  = useState(false);
 const [sessionTimeout, setSessionTimeout] = useState('60');
 const [showOldPw,  setShowOldPw]  = useState(false);
 const [showNewPw,  setShowNewPw]  = useState(false);
 const [oldPw,    setOldPw]    = useState('');
 const [newPw,    setNewPw]    = useState('');

 // ── Load persisted settings on mount ──────────────────────────────────────
 useEffect(() => {
  let cancelled = false;
  (async () => {
   try {
    const s = await getSystemSettings();
    if (cancelled) return;
    if (s.clinic_name)  setClinicName(s.clinic_name);
    if (s.clinic_logo)  setClinicLogo(s.clinic_logo);
    if (s.consultation_fee) setConsultationFee(s.consultation_fee);
    if (s.contact_email) setContactEmail(s.contact_email);
    if (s.phone)     setPhone(s.phone);
    if (s.address)    setAddress(s.address);
    if (s.slot_duration) setSlotDuration(s.slot_duration);
    if (s.buffer_time)  setBufferTime(s.buffer_time);
    if (s.booking_window) setBookingWindow(s.booking_window);
    if (s.allow_self_book !== undefined)   setAllowSelfBook(s.allow_self_book === 'true');
    if (s.require_approval !== undefined)   setRequireApproval(s.require_approval === 'true');
    if (s.allow_cancellation !== undefined)  setAllowCancellation(s.allow_cancellation === 'true');
    if (s.email_reminders !== undefined)   setEmailReminders(s.email_reminders === 'true');
    if (s.sms_reminders !== undefined)    setSmsReminders(s.sms_reminders === 'true');
    if (s.reminder_hours)           setReminderHours(s.reminder_hours);
    if (s.new_patient_alert !== undefined)  setNewPatientAlert(s.new_patient_alert === 'true');
    if (s.cancellation_alert !== undefined)  setCancellationAlert(s.cancellation_alert === 'true');
    if (s.daily_digest !== undefined)     setDailyDigest(s.daily_digest === 'true');
    if (s.two_factor !== undefined)      setTwoFactor(s.two_factor === 'true');
    if (s.session_timeout)          setSessionTimeout(s.session_timeout);
    if (s.operating_hours) {
     try { setHours(JSON.parse(s.operating_hours)); } catch { /* ignore bad JSON */ }
    }
   } catch {
    // Settings load is non-critical; defaults remain.
   }
  })();
  return () => { cancelled = true; };
 }, []);

 // ── Save handler — persists clinic/appointments/notifications/security prefs ─
 function handleSave() {
  startTransition(async () => {
   try {
    await setSystemSettings({
     clinic_name: clinicName,
     clinic_logo: clinicLogo ?? '',
     consultation_fee: String(Number(consultationFee) * 100), // store in paisa/cents
     contact_email: contactEmail,
     phone,
     address,
     operating_hours: JSON.stringify(hours),
     slot_duration: slotDuration,
     buffer_time: bufferTime,
     booking_window: bookingWindow,
     allow_self_book: String(allowSelfBook),
     require_approval: String(requireApproval),
     allow_cancellation: String(allowCancellation),
     email_reminders: String(emailReminders),
     sms_reminders: String(smsReminders),
     reminder_hours: reminderHours,
     new_patient_alert: String(newPatientAlert),
     cancellation_alert: String(cancellationAlert),
     daily_digest: String(dailyDigest),
     two_factor: String(twoFactor),
     session_timeout: sessionTimeout,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast.success('Settings saved.');
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
   }
  });
 }

 // ── Change password (security tab) ────────────────────────────────────────
 function handleChangePassword() {
  if (!oldPw || !newPw) {
   toast.error('Please fill in both password fields.');
   return;
  }
  startTransition(async () => {
   try {
    await changeOwnAdminPassword({ currentPassword: oldPw, newPassword: newPw });
    setOldPw('');
    setNewPw('');
    toast.success('Password changed successfully.');
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to change password.');
   }
  });
 }

 // ── Save admin profile name ───────────────────────────────────────────────
 function handleSaveProfile() {
  startTransition(async () => {
   try {
    await updateOwnAdminProfile({ name });
    toast.success('Profile updated.');
   } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update profile.');
   }
  });
 }

 // ── Sidebar nav ──────────────────────────────────────────────────────────
 const navItems: { key: Tab; label: string; icon: typeof Globe }[] = [
  { key: 'clinic',    label: 'Clinic Information',  icon: Globe   },
  { key: 'appointments', label: 'Appointment Settings', icon: Calendar },
  { key: 'notifications', label: 'Notifications',    icon: BellRing },
  { key: 'security',   label: 'Security',       icon: Shield  },
  { key: 'roles',     label: 'Roles & Permissions', icon: Users   },
 ];

 return (
  <div className="min-h-full bg-[#f0f7f3]">

   {/* ── Top bar ── */}
   <div className="bg-white border-b border-border px-6 py-3
    flex items-center justify-between gap-4">
    <div className="relative flex-1 max-w-sm">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
      text-muted-foreground" />
     <input type="text" placeholder="Search for patients or appointments..."
      className="w-full h-9 pl-9 pr-4 border border-border
       bg-muted/40 text-sm placeholder:text-muted-foreground
       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white" />
    </div>
    <div className="flex items-center gap-2.5">
     <NotificationBell />
     <button type="button" aria-label="Help"
      className="h-8 w-8 flex items-center justify-center 
       text-muted-foreground hover:bg-muted transition-colors">
      <HelpCircle className="h-4 w-4" />
     </button>
     <div className="pl-2.5 border-l border-border flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground hidden sm:block">
       Clinic 0812
      </span>
      <div className="h-8 w-8 bg-primary/10 text-primary
       flex items-center justify-center text-xs font-bold shrink-0">
       <Globe className="h-4 w-4" />
      </div>
     </div>
    </div>
   </div>

   {/* ── Page body ── */}
   <div className="px-6 py-5 max-w-5xl mx-auto">

    {/* Page header */}
    <div className="mb-6">
     <h1 className="text-2xl font-bold text-foreground">Settings</h1>
     <p className="text-sm text-muted-foreground mt-0.5">
      Manage clinic information and system preferences
     </p>
    </div>

    {/* Two-column layout */}
    <div className="flex gap-5 items-start">

     {/* ── Left nav sidebar ── */}
     <nav className="w-52 shrink-0 bg-white border border-border
      overflow-hidden shadow-sm">
      {navItems.map((item) => {
       const Icon  = item.icon;
       const isActive = activeTab === item.key;
       return (
        <button
         key={item.key}
         type="button"
         onClick={() => setActiveTab(item.key)}
         className={`w-full flex items-center gap-3 px-4 py-3 text-sm
          font-medium transition-colors text-left
          ${isActive
           ? 'text-white'
           : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
         style={isActive ? { backgroundColor: '#01411C' } : {}}
        >
         <Icon className="h-4 w-4 shrink-0" />
         {item.label}
        </button>
       );
      })}
     </nav>

     {/* ── Right content panel ── */}
     <div className="flex-1 min-w-0 bg-white border border-border
      p-6 shadow-sm">

      {/* ════ CLINIC INFORMATION ════ */}
      {activeTab === 'clinic' && (
       <div>
        <h2 className="text-base font-bold text-primary mb-5">
         Clinic Information
        </h2>
        <div className="border-t border-border pt-5">

         {/* Top two-column */}
         <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6 mb-6">
          <div className="space-y-4">
           <Field label="Clinic Name">
            <input type="text" value={clinicName}
             onChange={(e) => setClinicName(e.target.value)}
             className={inputCls} />
           </Field>
           <Field label="Contact Email">
            <input type="email" value={contactEmail}
             onChange={(e) => setContactEmail(e.target.value)}
             className={inputCls} />
           </Field>
           <Field label="Phone Number">
            <input type="tel" value={phone}
             onChange={(e) => setPhone(e.target.value)}
             className={inputCls} />
           </Field>
           <Field label="Physical Address">
            <textarea
             value={address}
             onChange={(e) => setAddress(e.target.value)}
             rows={3}
             className={`${inputCls} h-auto py-2.5 resize-none`}
            />
           </Field>
          </div>

          {/* Logo upload */}
          <div>
           <label className={labelCls}>Clinic Logo</label>
           <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50/20 flex flex-col items-center justify-center gap-3 relative group">
            {clinicLogo ? (
             <div className="flex flex-col items-center gap-3">
              <div className="h-24 w-24 rounded-2xl bg-white border-2 border-emerald-500/30 p-2 shadow-md flex items-center justify-center overflow-hidden">
               <img src={clinicLogo} alt="Clinic Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
               <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#01411C] text-white text-xs font-bold hover:bg-[#013316] transition-colors shadow-sm">
                Change Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
               </label>
               <button
                type="button"
                onClick={() => setClinicLogo(null)}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors"
               >
                Remove
               </button>
              </div>
             </div>
            ) : (
             <label className="cursor-pointer flex flex-col items-center justify-center w-full h-36 gap-2">
              <div className="h-12 w-12 rounded-xl bg-emerald-100/70 text-[#01411C] flex items-center justify-center">
               <FileImage className="h-6 w-6" />
              </div>
              <div className="text-center">
               <p className="text-xs font-extrabold text-[#01411C]">Click to Upload Logo</p>
               <p className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, SVG or WEBP (Max 2MB)</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
             </label>
            )}
           </div>
          </div>
         </div>

         {/* Operating Hours */}
         <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest
           text-primary mb-3">
           Operating Hours
          </p>
          {hours.map((h, i) => (
           <HoursRow
            key={h.day}
            day={h.day}
            open={h.open}
            start={h.start}
            end={h.end}
            onToggle={() => updateHour(i, 'open', !h.open)}
            onStart={(v) => updateHour(i, 'start', v)}
            onEnd={(v)  => updateHour(i, 'end',  v)}
           />
          ))}
         </div>
        </div>
       </div>
      )}

      {/* ════ APPOINTMENT SETTINGS ════ */}
      {activeTab === 'appointments' && (
       <div>
        <h2 className="text-base font-bold text-primary mb-5">
         Appointment Settings
        </h2>
        <div className="border-t border-border pt-5 space-y-5">
         {/* Consultation Fee */}
         <div className=" bg-primary/5 border border-primary/10 p-4">
          <Field label="Consultation Fee (Rs)">
           <input
            type="number"
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
            className={`${inputCls} max-w-xs`}
            placeholder="2000"
            min={0}
           />
          </Field>
          <p className="text-xs text-muted-foreground mt-1.5">
           This fee is automatically charged on every completed visit invoice.
          </p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Slot Duration (min)">
           <select value={slotDuration}
            onChange={(e) => setSlotDuration(e.target.value)}
            className={inputCls}>
            {['15','20','30','45','60'].map((v) => (
             <option key={v} value={v}>{v} minutes</option>
            ))}
           </select>
          </Field>
          <Field label="Buffer Time (min)">
           <select value={bufferTime}
            onChange={(e) => setBufferTime(e.target.value)}
            className={inputCls}>
            {['0','5','10','15','20'].map((v) => (
             <option key={v} value={v}>{v} minutes</option>
            ))}
           </select>
          </Field>
          <Field label="Booking Window (days)">
           <select value={bookingWindow}
            onChange={(e) => setBookingWindow(e.target.value)}
            className={inputCls}>
            {['7','14','30','60','90'].map((v) => (
             <option key={v} value={v}>{v} days</option>
            ))}
           </select>
          </Field>
         </div>
         <div className="border-t border-border pt-4">
          <ToggleRow
           label="Allow Patient Self-Booking"
           description="Patients can book appointments through the portal."
           value={allowSelfBook}
           onChange={setAllowSelfBook}
          />
          <ToggleRow
           label="Require Doctor Approval"
           description="New appointments need doctor confirmation before being confirmed."
           value={requireApproval}
           onChange={setRequireApproval}
          />
          <ToggleRow
           label="Allow Cancellations"
           description="Patients and staff can cancel scheduled appointments."
           value={allowCancellation}
           onChange={setAllowCancellation}
          />
         </div>
        </div>
       </div>
      )}

      {/* ════ NOTIFICATIONS ════ */}
      {activeTab === 'notifications' && (
       <div>
        <h2 className="text-base font-bold text-primary mb-5">
         Notifications
        </h2>
        <div className="border-t border-border pt-5">
         <ToggleRow
          label="Email Reminders"
          description="Send appointment reminders to patients via email."
          value={emailReminders}
          onChange={setEmailReminders}
         />
         <ToggleRow
          label="SMS Reminders"
          description="Send text message reminders (requires SMS integration)."
          value={smsReminders}
          onChange={setSmsReminders}
         />
         {(emailReminders || smsReminders) && (
          <div className="py-4 border-b border-border">
           <Field label="Send Reminder Before (hours)">
            <select value={reminderHours}
             onChange={(e) => setReminderHours(e.target.value)}
             className={`${inputCls} max-w-xs`}>
             {['1','2','4','12','24','48'].map((v) => (
              <option key={v} value={v}>{v} hours before</option>
             ))}
            </select>
           </Field>
          </div>
         )}
         <ToggleRow
          label="New Patient Alert"
          description="Notify admin when a new patient registers."
          value={newPatientAlert}
          onChange={setNewPatientAlert}
         />
         <ToggleRow
          label="Cancellation Alert"
          description="Notify staff when an appointment is cancelled."
          value={cancellationAlert}
          onChange={setCancellationAlert}
         />
         <ToggleRow
          label="Daily Digest"
          description="Send a morning summary of the day's schedule to all doctors."
          value={dailyDigest}
          onChange={setDailyDigest}
         />
        </div>
       </div>
      )}

      {/* ════ SECURITY ════ */}
      {activeTab === 'security' && (
       <div>
        <h2 className="text-base font-bold text-primary mb-5">Security</h2>
        <div className="border-t border-border pt-5 space-y-6">

         {/* Change password */}
         <div>
          <p className="text-xs font-bold uppercase tracking-widest
           text-muted-foreground mb-3">
           Change Password
          </p>
          <div className="space-y-3 max-w-sm">
           <Field label="Current Password">
            <div className="relative">
             <input type={showOldPw ? 'text' : 'password'}
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Enter current password"
              className={`${inputCls} pr-10`} />
             <button type="button"
              onClick={() => setShowOldPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2
               text-muted-foreground hover:text-foreground transition-colors">
              {showOldPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
             </button>
            </div>
           </Field>
           <Field label="New Password">
            <div className="relative">
             <input type={showNewPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
              className={`${inputCls} pr-10`} />
             <button type="button"
              onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2
               text-muted-foreground hover:text-foreground transition-colors">
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
             </button>
            </div>
           </Field>
           <div className="pt-1">
            <button
             type="button"
             onClick={handleChangePassword}
             disabled={isPending}
             className="h-9 px-4 border border-border bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
             {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
             Update Password
            </button>
           </div>
          </div>
         </div>

         <div className="border-t border-border pt-5">
          <ToggleRow
           label="Two-Factor Authentication"
           description="Require a verification code when signing in."
           value={twoFactor}
           onChange={setTwoFactor}
          />
          <div className="py-4">
           <Field label="Session Timeout (minutes)">
            <select value={sessionTimeout}
             onChange={(e) => setSessionTimeout(e.target.value)}
             className={`${inputCls} max-w-xs`}>
             {['15','30','60','120','240'].map((v) => (
              <option key={v} value={v}>{v} minutes</option>
             ))}
            </select>
           </Field>
          </div>
         </div>

         {/* Session info */}
         <div className=" bg-muted/40 border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-widest
           text-muted-foreground mb-2">
           Current Session
          </p>
          <div className="space-y-3">
           <div className="max-w-sm">
            <label className={labelCls}>Display Name</label>
            <div className="flex items-center gap-2">
             <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
             />
             <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isPending}
              className="shrink-0 h-10 px-4 border border-border bg-white text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
             >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
             </button>
            </div>
           </div>
           {[
            { label: 'Account', value: adminEmail },
            { label: 'Role',   value: 'Administrator' },
            { label: 'Timeout', value: `${sessionTimeout} min inactivity` },
           ].map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-sm">
             <span className="text-muted-foreground w-20 shrink-0">{r.label}</span>
             <span className="text-foreground font-medium">{r.value}</span>
            </div>
           ))}
          </div>
         </div>
        </div>
       </div>
      )}

      {/* ════ ROLES & PERMISSIONS ════ */}
      {activeTab === 'roles' && (
       <div>
        <h2 className="text-base font-bold text-primary mb-5">
         Roles & Permissions
        </h2>
        <div className="border-t border-border pt-5">
         {[
          {
           role: 'Admin',
           color: 'bg-primary/10 text-primary',
           permissions: [
            'Full system access',
            'Manage users & roles',
            'View audit logs',
            'Configure settings',
           ],
          },
          {
           role: 'Doctor',
           color: 'bg-emerald-50 text-emerald-700',
           permissions: [
            'View own appointments',
            'Create & update visit records',
            'Issue prescriptions',
            'Manage own availability',
           ],
          },
          {
           role: 'Receptionist',
           color: 'bg-amber-50 text-amber-700',
           permissions: [
            'Register & update patients',
            'Book & cancel appointments',
            'Check-in patients',
            'View schedules',
           ],
          },
          {
           role: 'Patient',
           color: 'bg-emerald-50 text-emerald-700',
           permissions: [
            'View own appointments',
            'View own prescriptions',
            'Self-booking (if enabled)',
           ],
          },
         ].map((r) => (
          <div key={r.role}
           className="flex items-start gap-4 py-4
            border-b border-border last:border-b-0">
           <span className={`px-2.5 py-1 text-xs font-bold
            shrink-0 ${r.color}`}>
            {r.role}
           </span>
           <ul className="flex-1 flex flex-wrap gap-2">
            {r.permissions.map((p) => (
             <li key={p}
              className="flex items-center gap-1.5 text-xs
               text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              {p}
             </li>
            ))}
           </ul>
          </div>
         ))}
         <p className="text-xs text-muted-foreground mt-4">
          Role assignments are managed in{' '}
          <a href="/admin/users"
           className="text-primary font-medium hover:underline">
           User Management →
          </a>
         </p>
        </div>
       </div>
      )}

      {/* ── Save button (all tabs except Roles) ── */}
      {activeTab !== 'roles' && (
       <div className="flex items-center justify-end gap-3 mt-6 pt-4
        border-t border-border">
        {saved && (
         <span className="flex items-center gap-1.5 text-sm
          text-emerald-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Changes saved
         </span>
        )}
        <button
         type="button"
         onClick={handleSave}
         disabled={isPending}
         className="h-10 px-6 text-sm font-bold text-white
          hover:opacity-90 transition-opacity disabled:opacity-60
          disabled:cursor-not-allowed flex items-center gap-2"
         style={{ backgroundColor: '#01411C' }}
        >
         {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
         Save Changes
        </button>
       </div>
      )}
     </div>
    </div>
   </div>
  </div>
 );
}
