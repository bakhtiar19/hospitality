'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Wrench,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';

interface RoomHK {
  id: string;
  number: string;
  floor: number;
  type: string;
  status: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER';
  assignedTo?: string;
}

export default function HousekeepingPage() {
  const { dbSynced, refreshBootstrap } = useAuth();
  const [rooms, setRooms] = useState<RoomHK[]>([]);
  const [filterFloor, setFilterFloor] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRooms = async () => {
    if (!dbSynced) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<RoomHK[]>('/pms/housekeeping');
      setRooms(data || []);
    } catch (err) {
      console.error('Failed to load housekeeping rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [dbSynced]);

  const updateRoomStatus = async (
    room: RoomHK,
    nextStatus: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER'
  ) => {
    setSavingId(room.id);
    try {
      const updated = await apiRequest<RoomHK>(`/pms/housekeeping/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setRooms((prev) => prev.map((r) => (r.id === room.id ? updated : r)));
      await refreshBootstrap();
    } catch (err: any) {
      alert(err?.message || 'Gagal memperbarui status kamar.');
    } finally {
      setSavingId(null);
    }
  };

  const cycleStatus = (room: RoomHK) => {
    const next =
      room.status === 'DIRTY'
        ? 'CLEAN'
        : room.status === 'CLEAN'
        ? 'INSPECTED'
        : room.status === 'INSPECTED'
        ? 'DIRTY'
        : 'CLEAN';
    updateRoomStatus(room, next);
  };

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  const filtered = rooms.filter((r) => filterFloor === 'ALL' || r.floor === filterFloor);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Housekeeping Board & Tasks
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
              PostgreSQL Live
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Status kebersihan kamar real-time tersimpan ke database (klik kartu untuk ubah status DIRTY → CLEAN → INSPECTED).
          </p>
        </div>

        {/* Floor Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadRooms}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-xs font-semibold text-muted-foreground ml-1">Lantai:</span>
          {(['ALL', ...floors] as const).map((fl) => (
            <button
              key={fl}
              onClick={() => setFilterFloor(fl)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                filterFloor === fl
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {fl === 'ALL' ? 'Semua' : `Lt ${fl}`}
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Inspected</div>
            <div className="text-xl font-bold text-blue-600">
              {rooms.filter((r) => r.status === 'INSPECTED').length}
            </div>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Out of Order</div>
            <div className="text-xl font-bold text-destructive">
              {rooms.filter((r) => r.status === 'OUT_OF_ORDER').length}
            </div>
          </div>
        </div>
      </div>

      {/* Room Cards Grid */}
      {loading ? (
        <div className="p-10 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
          Memuat daftar kamar dari PostgreSQL...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => cycleStatus(r)}
              className={`p-4 bg-card border rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-3 ${
                r.status === 'DIRTY'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : r.status === 'OUT_OF_ORDER'
                  ? 'border-destructive/40 bg-destructive/5'
                  : r.status === 'INSPECTED'
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-emerald-500/30 hover:border-primary'
              } ${savingId === r.id ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-black font-mono text-foreground">Kamar {r.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.type} • Lt {r.floor}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    r.status === 'CLEAN'
                      ? 'bg-emerald-500 text-white'
                      : r.status === 'DIRTY'
                      ? 'bg-amber-500 text-white'
                      : r.status === 'INSPECTED'
                      ? 'bg-blue-600 text-white'
                      : 'bg-destructive text-white'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                <span className="text-muted-foreground">Klik untuk ubah status</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateRoomStatus(r, r.status === 'OUT_OF_ORDER' ? 'CLEAN' : 'OUT_OF_ORDER');
                  }}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  title="Tandai Maintenance / Out of Order"
                >
                  <Wrench className="w-3 h-3" />
                  {r.status === 'OUT_OF_ORDER' ? 'Aktifkan' : 'OOO'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
