'use client';

import { useState, useEffect, useRef } from 'react';
import { searchMedicines } from '@/server/actions/pharmacy.actions';
import { Search, Loader2 } from 'lucide-react';

interface MedicineResult {
 id: string;
 name: string;
 genericName: string | null;
 category: string | null;
 form: string | null;
 strength: string | null;
}

/**
 * Autocomplete medicine search input. Replaces the plain text input in the
 * prescription rows. Shows a dropdown of matching medicines as the doctor types.
 * On select, calls onSelect with the medicine name + optional medicineId.
 */
export default function MedicineSearch({
 value,
 onChange,
 onSelect,
 placeholder = 'e.g. Panadol',
 disabled,
}: {
 value: string;
 onChange: (val: string) => void;
 onSelect?: (medicineId: string, displayName: string) => void;
 placeholder?: string;
 disabled?: boolean;
}) {
 const [results, setResults] = useState<MedicineResult[]>([]);
 const [loading, setLoading] = useState(false);
 const [showDropdown, setShowDropdown] = useState(false);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const containerRef = useRef<HTMLDivElement>(null);

 // Debounced search
 useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (value.trim().length < 2) {
   setResults([]);
   setShowDropdown(false);
   return;
  }
  setLoading(true);
  debounceRef.current = setTimeout(async () => {
   try {
    const data = await searchMedicines(value);
    setResults(data);
    setShowDropdown(true);
   } catch {
    setResults([]);
   } finally {
    setLoading(false);
   }
  }, 250);

  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
 }, [value]);

 // Close dropdown on outside click
 useEffect(() => {
  function handler(e: MouseEvent) {
   if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
    setShowDropdown(false);
   }
  }
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
 }, []);

 function handleSelect(result: MedicineResult) {
  const display = result.strength ? `${result.name} ${result.strength}` : result.name;
  onChange(display);
  setShowDropdown(false);
  onSelect?.(result.id, display);
 }

 return (
  <div ref={containerRef} className="relative">
   <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onFocus={() => results.length > 0 && setShowDropdown(true)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full h-8 px-2.5 border border-border bg-muted/30 text-sm text-foreground
     placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20
     focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
   />
   {loading && (
    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
   )}
   {showDropdown && results.length > 0 && (
    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border shadow-lg max-h-60 overflow-y-auto">
     {results.map((r) => (
      <button
       key={r.id}
       type="button"
       onClick={() => handleSelect(r)}
       className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0"
      >
       <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{r.name}</span>
        {r.strength && <span className="text-xs text-muted-foreground">{r.strength}</span>}
       </div>
       {r.genericName && (
        <p className="text-xs text-muted-foreground">{r.genericName}</p>
       )}
       {r.category && (
        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">{r.category}</span>
       )}
      </button>
     ))}
    </div>
   )}
  </div>
 );
}
