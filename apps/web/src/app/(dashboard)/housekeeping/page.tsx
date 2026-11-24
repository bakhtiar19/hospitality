'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  User,
  Smartphone,
  Layers,
  Wrench,
  Search,
  Check,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';

interface RoomHK {
  number: string;
  floor: number;
  type: string;
  status: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER';
  assignedTo?: string;
  lastCleaned?: string;
}

const initialRooms: RoomHK[] = [
  { number: '101', floor: 1, type: 'Superior', status: 'CLEAN', assignedTo: 'Budi (Attendant)' },
  { number: '102', floor: 1, type: 'Superior', status: 'CLEAN', assignedTo: 'Budi (Attendant)' },
  { number: '103', floor: 1, type: 'Superior', status: 'DIRTY', assignedTo: 'Budi (Attendant)' },
  { number: '104', floor: 1, type: 'Superior', status: 'INSPECTED', assignedTo: 'Rian (Supervisor)' },
  { number: '105', floor: 1, type: 'Superior', status: 'CLEAN', assignedTo: 'Budi (Attendant)' },
  { number: '201', floor: 2, type: 'Deluxe King', status: 'CLEAN', assignedTo: 'Siti (Attendant)' },
  { number: '202', floor: 2, type: 'Deluxe King', status: 'DIRTY', assignedTo: 'Siti (Attendant)' },
  { number: '203', floor: 2, type: 'Deluxe King', status: 'CLEAN', assignedTo: 'Siti (Attendant)' },
  { number: '204', floor: 2, type: 'Deluxe King', status: 'OUT_OF_ORDER', assignedTo: 'Maintenance (AC Repair)' },
  { number: '301', floor: 3, type: 'Deluxe King', status: 'CLEAN', assignedTo: 'Agus (Attendant)' },
  { number: '401', floor: 4, type: 'Executive Suite', status: 'INSPECTED', assignedTo: 'Rian (Supervisor)' },
  { number: '407', floor: 4, type: 'Family Suite', status: 'CLEAN', assignedTo: 'Agus (Attendant)' },
];

export default function HousekeepingPage() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<RoomHK[]>(initialRooms);
  const [filterFloor, setFilterFloor] = useState<number | 'ALL'>('ALL');

  const toggleStatus = (roomNum: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.number !== roomNum) return r;
        if (r.status === 'DIRTY') return { ...r, status: 'CLEAN' };
        if (r.status === 'CLEAN') return { ...r, status: 'INSPECTED' };
        if (r.status === 'INSPECTED') return { ...r, status: 'DIRTY' };
        return r;
      })
    );
  };

  const filtered = rooms.filter((r) => filterFloor === 'ALL' || r.floor === filterFloor);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Housekeeping Board & Tasks
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Room Cleanliness
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time room cleanliness tracking, attendant task assignments, and mobile touch updates.
          </p>
        </div>

        {/* Floor Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Floor:</span>
          {(['ALL', 1, 2, 3, 4] as const).map((fl) => (
            <button
              key={fl}
              onClick={() => setFilterFloor(fl)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                filterFloor === fl
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {fl === 'ALL' ? 'All Floors' : `Lt ${fl}`}
            </button>
          ))}
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Clean Rooms</div>
            <div className="text-xl font-bold text-foreground">
              {rooms.filter((r) => r.status === 'CLEAN').length}
            </div>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Dirty Rooms</div>
            <div className="text-xl font-bold text-amber-600">
              {rooms.filter((r) => r.status === 'DIRTY').length}
            </div>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Inspected Rooms</div>
            <div className="text-xl font-bold text-indigo-600">
              {rooms.filter((r) => r.status === 'INSPECTED').length}
            </div>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Out of Order (OOO)</div>
            <div className="text-xl font-bold text-rose-600">
              {rooms.filter((r) => r.status === 'OUT_OF_ORDER').length}
            </div>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((r) => {
          const statusColors = {
            CLEAN: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
            DIRTY: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
            INSPECTED: 'border-indigo-500/40 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400',
            OUT_OF_ORDER: 'border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400',
          };

          return (
            <div
              key={r.number}
              className={`p-4 rounded-xl border shadow-xs space-y-3 bg-card transition-all ${statusColors[r.status]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-lg text-foreground">Room {r.number}</span>
                  <div className="text-xs text-muted-foreground">{r.type} • Lt {r.floor}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider">
                  {r.status}
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{r.assignedTo || 'Unassigned'}</span>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <button
                  onClick={() => toggleStatus(r.number)}
                  className="w-full py-1.5 text-xs font-bold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-2xs"
                >
                  Toggle Clean / Inspect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
