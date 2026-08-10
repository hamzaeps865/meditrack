'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateAvatar } from '@/server/actions/profile-photo.actions';
import { Avatar } from '@/components/shared/avatar';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PhotoUpload({
 name,
 initialAvatar,
 size = 80,
}: {
 name: string;
 initialAvatar?: string | null;
 size?: number;
}) {
 const router = useRouter();
 const fileRef = useRef<HTMLInputElement>(null);
 const [avatar, setAvatar] = useState<string | null>(initialAvatar ?? null);
 const [isPending, startTransition] = useTransition();

 function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
   toast.error('Please select an image file');
   return;
  }

  // Resize to 128×128 via canvas → base64
  const reader = new FileReader();
  reader.onload = (ev) => {
   const img = new Image();
   img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cover-fit crop
    const scale = Math.max(128 / img.width, 128 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (128 - w) / 2;
    const y = (128 - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setAvatar(base64);

    // Save to server
    startTransition(async () => {
     try {
      await updateAvatar({ avatarUrl: base64 });
      toast.success('Profile photo updated');
      router.refresh();
     } catch {
      toast.error('Failed to upload photo');
      setAvatar(initialAvatar ?? null);
     }
    });
   };
   img.src = ev.target?.result as string;
  };
  reader.readAsDataURL(file);
 }

 return (
  <div className="relative inline-block">
   <div
    onClick={() => fileRef.current?.click()}
    className="cursor-pointer group relative"
    style={{ width: size, height: size }}
   >
    <Avatar name={name} avatarUrl={avatar} size={size} className="w-full h-full" />
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
     {isPending ? (
      <Loader2 className="h-5 w-5 text-white animate-spin" />
     ) : (
      <Camera className="h-5 w-5 text-white" />
     )}
    </div>
   </div>
   <input
    ref={fileRef}
    type="file"
    accept="image/*"
    onChange={handleFile}
    className="hidden"
   />
  </div>
 );
}
