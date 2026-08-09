'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserName, deactivateUser } from '@/server/actions/users.actions';
import { Pencil, Loader2, UserX } from 'lucide-react';
import { toast } from 'sonner';

export default function EditUserName({
  userId,
  currentName,
  isSelf,
}: {
  userId: string;
  currentName: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(currentName);

  function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      try {
        await updateUserName({ userId, name });
        toast.success('Name updated.');
        setEditing(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed.');
      }
    });
  }

  function handleDeactivate() {
    if (!confirm('Deactivate this user? Their role will be set to patient and they will lose staff access.')) return;
    startTransition(async () => {
      try {
        await deactivateUser(userId);
        toast.success('User deactivated.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed.');
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 px-2 rounded border border-border text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button type="button" onClick={handleSave} disabled={isPending} className="text-xs font-semibold text-primary hover:underline">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </button>
        <button type="button" onClick={() => { setEditing(false); setName(currentName); }} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setEditing(true)} disabled={isSelf} className="text-muted-foreground hover:text-primary transition-colors" title={isSelf ? 'Use Settings page to edit your name' : 'Edit name'}>
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {!isSelf && (
        <button type="button" onClick={handleDeactivate} disabled={isPending} className="text-muted-foreground hover:text-red-500 transition-colors" title="Deactivate (set to patient)">
          <UserX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
