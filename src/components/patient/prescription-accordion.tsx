'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown, ChevronUp, Pill, Stethoscope,
  Activity, Thermometer, Weight, FileText, Heart,
} from 'lucide-react';

interface PrescriptionItem {
  prescriptionId: string;
  medicineName:   string;
  dosage:         string;
  frequency:      string;
  duration:       string;
  notes:          string | null;
}

interface Prescription {
  id:             string;
  createdAt:      Date;
  visitId:        string;
  diagnosis:      string | null;
  chiefComplaint: string | null;
  notes:          string | null;
  vitalsBp:       string | null;
  vitalsTemp:     string | null;
  vitalsWeight:   string | null;
  doctorName:     string | null;
  doctorSpec:     string | null;
  items:          PrescriptionItem[];
}

interface Props {
  prescriptions: Prescription[];
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function PrescriptionAccordion({ prescriptions }: Props) {
  const [openId, setOpenId] = useState<string | null>(
    prescriptions.length > 0 ? prescriptions[0].id : null,
  );

  return (
    <div className="space-y-3">
      {prescriptions.map((rx, index) => {
        const isOpen = openId === rx.id;
        const hasVitals = rx.vitalsBp || rx.vitalsTemp || rx.vitalsWeight;

        return (
          <div
            key={rx.id}
            className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden
              transition-shadow hover:shadow-md"
          >
            {/* Header row */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : rx.id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4
                hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Doctor avatar */}
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0
                    text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F, #2d6a9f)' }}
                >
                  {rx.doctorName ? getInitials(rx.doctorName) : <Pill className="h-4 w-4" />}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {rx.diagnosis ?? rx.chiefComplaint ?? 'Prescription'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {rx.doctorName && (
                      <p className="text-xs text-muted-foreground">
                        Dr. {rx.doctorName}
                        {rx.doctorSpec && (
                          <span className="text-muted-foreground/60 ml-1">
                            · {rx.doctorSpec}
                          </span>
                        )}
                      </p>
                    )}
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {rx.items.length > 0 && (
                  <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full
                    bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                    <Pill className="h-3 w-3" />
                    {rx.items.length}
                  </span>
                )}
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-border">

                {/* Vitals row */}
                {hasVitals && (
                  <div className="px-5 py-3 bg-muted/20 border-b border-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Visit Vitals
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {rx.vitalsBp && (
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs text-foreground font-medium">{rx.vitalsBp}</span>
                          <span className="text-[10px] text-muted-foreground">BP</span>
                        </div>
                      )}
                      {rx.vitalsTemp && (
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs text-foreground font-medium">{rx.vitalsTemp}</span>
                          <span className="text-[10px] text-muted-foreground">Temp</span>
                        </div>
                      )}
                      {rx.vitalsWeight && (
                        <div className="flex items-center gap-1.5">
                          <Weight className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs text-foreground font-medium">{rx.vitalsWeight}</span>
                          <span className="text-[10px] text-muted-foreground">Weight</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chief complaint & diagnosis */}
                {(rx.chiefComplaint || rx.diagnosis) && (
                  <div className="px-5 py-3 border-b border-border space-y-2">
                    {rx.chiefComplaint && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                          Chief Complaint
                        </p>
                        <p className="text-sm text-foreground">{rx.chiefComplaint}</p>
                      </div>
                    )}
                    {rx.diagnosis && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                          Diagnosis
                        </p>
                        <p className="text-sm text-foreground">{rx.diagnosis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Medicines table */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Prescribed Medicines · {rx.items.length}
                  </p>

                  {rx.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-3">
                      No medicines recorded.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rx.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-muted/30
                            border border-border/60 hover:bg-muted/50 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center
                            justify-center shrink-0">
                            <Pill className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {item.medicineName}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">Dose: </span>
                                {item.dosage}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">Frequency: </span>
                                {item.frequency}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">Duration: </span>
                                {item.duration}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Doctor notes */}
                {rx.notes && (
                  <div className="px-5 py-3 border-t border-border bg-amber-50/50">
                    <div className="flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                          Doctor's Notes
                        </p>
                        <p className="text-sm text-foreground">{rx.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
