'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
 const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const containerRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

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
    // Calculate position after results are loaded
    if (inputRef.current && showDropdown) {
     const rect = inputRef.current.getBoundingClientRect();
     setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
     });
    }
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

 // Update dropdown position on scroll or resize
 useEffect(() => {
  if (!showDropdown) return;

  function updatePosition() {
   if (inputRef.current) {
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
     top: rect.bottom + window.scrollY + 4,
     left: rect.left + window.scrollX,
     width: rect.width,
    });
   }
  }

  updatePosition();
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);

  return () => {
   window.removeEventListener('scroll', updatePosition, true);
   window.removeEventListener('resize', updatePosition);
  };
 }, [showDropdown]);

 return (
  <div ref={containerRef} className="relative">
   <input
    ref={inputRef}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onFocus={() => {
     if (results.length > 0) {
      setShowDropdown(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPosition({
       top: rect.bottom + window.scrollY + 4,
       left: rect.left + window.scrollX,
       width: rect.width,
      });
     }
    }}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full h-8 px-2.5 border border-border bg-muted/30 text-sm text-foreground
     placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20
     focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
   />
   {loading && (
    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
   )}
   {showDropdown && results.length > 0 &&
    createPortal(
     <div
      className="fixed z-[9999] bg-white border border-gray-200 rounded-md shadow-xl max-h-72 overflow-y-auto"
      style={{
       top: `${dropdownPosition.top}px`,
       left: `${dropdownPosition.left}px`,
       width: `${dropdownPosition.width}px`,
      }}
     >
      <div className="py-1">
      {results.map((r) => (
       <button
        key={r.id}
        type="button"
        onClick={() => handleSelect(r)}
        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
       >
       <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{r.name}</span>
        {r.strength && <span className="text-xs text-muted-foreground">{r.strength}</span>}
       </div>
       {r.genericName && (
        <p className="text-xs text-muted-foreground">{r.genericName}</p>
       )}
       {r.category && (
        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">{r.category}</span>
       )}
      </button>
     ))}
     </div>
    </div>,
     document.body
    )}
  </div>
 );
}
