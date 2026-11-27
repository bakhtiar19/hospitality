'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ConciergeBell,
  DoorClosed,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  Search,
  Sparkles,
  User,
  Wrench,
  X,
  Ban,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { formatCurrency, getTodayJakarta, addDaysIso } from '../../../lib/utils';
import {
  TapeChartBooking,
  getStoredBookings,
  saveStoredBookings,
  initialBookings,
  calculateBookingBalance,
  apiCheckInBooking,
  apiCheckOutBooking,
  apiCancelPmsBooking,
} from '../../../lib/bookings-store';
import { apiRequest } from '../../../lib/api-client';

type AvailabilityStatus = 'AVAILABLE' | 'IN_HOUSE' | 'CONFIRMED' | 'DIRTY' | 'OUT_OF_ORDER';

interface RoomGridItem {
  id?: string;
  number: string;
  floor: number;
  type: string;
  baseRate: number;
  housekeepingStatus: string;
  operationalStatus: string;
  availabilityStatus: AvailabilityStatus;
  booking?: TapeChartBooking;
  isDayUse?: boolean;
}

const defaultFallbackRooms = [
  { number: '101', floor: 1, type: 'Superior', baseRate: 650000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '102', floor: 1, type: 'Superior', baseRate: 650000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '103', floor: 1, type: 'Superior', baseRate: 650000, housekeepingStatus: 'DIRTY', operationalStatus: 'AVAILABLE' },
  { number: '104', floor: 1, type: 'Superior', baseRate: 650000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '105', floor: 1, type: 'Superior', baseRate: 650000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '201', floor: 2, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '202', floor: 2, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '203', floor: 2, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '204', floor: 2, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'DIRTY', operationalStatus: 'AVAILABLE' },
  { number: '205', floor: 2, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '301', floor: 3, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '302', floor: 3, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '303', floor: 3, type: 'Deluxe King', baseRate: 880000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '401', floor: 4, type: 'Executive Suite', baseRate: 1450000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '402', floor: 4, type: 'Executive Suite', baseRate: 1450000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
  { number: '407', floor: 4, type: 'Family Suite', baseRate: 2100000, housekeepingStatus: 'CLEAN', operationalStatus: 'AVAILABLE' },
];

const STATUS_META: Record<
  AvailabilityStatus,
  { label: string; shortLabel: string; badgeClass: string; cardClass: string; dotClass: string }
> = {
  AVAILABLE: {
    label: 'Vacant Ready (VR)',
    shortLabel: 'Kamar Siap Jual',
    badgeClass: 'bg-emerald-600 text-white',
    cardClass: 'border-emerald-500/35 bg-emerald-500/[0.04] hover:border-emerald-500/70',
    dotClass: 'bg-emerald-500',
  },
  IN_HOUSE: {
    label: 'Occupied (OC)',
    shortLabel: 'Kamar Terisi',
    badgeClass: 'bg-purple-600 text-white',
    cardClass: 'border-purple-500/45 bg-purple-500/[0.07] hover:border-purple-500/80',
    dotClass: 'bg-purple-600',
  },
  CONFIRMED: {
    label: 'Reserved (Confirmed)',
    shortLabel: 'Sudah Dipesan',
    badgeClass: 'bg-sky-600 text-white',
    cardClass: 'border-sky-500/45 bg-sky-500/[0.06] hover:border-sky-500/80',
    dotClass: 'bg-sky-500',
  },
  DIRTY: {
    label: 'Vacant Dirty (VD)',
    shortLabel: 'Kamar Kotor',
    badgeClass: 'bg-amber-600 text-white',
    cardClass: 'border-amber-500/40 bg-amber-500/[0.06] hover:border-amber-500/80',
    dotClass: 'bg-amber-500',
  },
  OUT_OF_ORDER: {
    label: 'Out of Order',
    shortLabel: 'Perbaikan',
    badgeClass: 'bg-rose-600 text-white',
    cardClass: 'border-rose-500/40 bg-rose-500/[0.06] hover:border-rose-500/80',
    dotClass: 'bg-rose-500',
  },
};

export default function RoomAvailabilityPage() {
  const { dbSynced, rooms: dbRooms, refreshBootstrap } = useAuth();
  const today = getTodayJakarta();

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayJakarta());
  const [statusFilter, setStatusFilter] = useState<'ALL' | AvailabilityStatus>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [bookings, setBookings] = useState<TapeChartBooking[]>(initialBookings);
  const [selectedRoomItem, setSelectedRoomItem] = useState<RoomGridItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    setBookings(getStoredBookings());
    const handler = () => setBookings(getStoredBookings());
    window.addEventListener('pms_bookings_updated', handler);
    return () => window.removeEventListener('pms_bookings_updated', handler);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const baseRooms = useMemo(() => {
    if (dbSynced && dbRooms.length > 0) {
      return dbRooms;
    }
    return defaultFallbackRooms;
  }, [dbSynced, dbRooms]);

  // Compute live availability status per physical room on selectedDate
  const roomItems: RoomGridItem[] = useMemo(() => {
    const isToday = selectedDate === today;

    return baseRooms.map((r: any) => {
      const coveringBookings = bookings.filter((b) => {
        if (b.roomNumber !== r.number) return false;
        if (b.status === 'CHECKED_OUT' || b.status === 'CANCELLED') return false;
        const isDayUse = b.isDayUse || b.checkInDate === b.checkOutDate;
        return isDayUse
          ? b.checkInDate === selectedDate
          : b.checkInDate <= selectedDate && b.checkOutDate > selectedDate;
      });

      // Prefer IN_HOUSE booking if multiple exist
      const activeBooking =
        coveringBookings.find((b) => b.status === 'IN_HOUSE') || coveringBookings[0];

      const hk = (r.housekeepingStatus || 'CLEAN').toUpperCase();
      const op = (r.operationalStatus || 'AVAILABLE').toUpperCase();

      let availabilityStatus: AvailabilityStatus = 'AVAILABLE';
      if (op === 'OUT_OF_ORDER' || hk === 'OUT_OF_ORDER') {
        availabilityStatus = 'OUT_OF_ORDER';
      } else if (activeBooking) {
        availabilityStatus = activeBooking.status === 'IN_HOUSE' ? 'IN_HOUSE' : 'CONFIRMED';
      } else if (isToday && hk === 'DIRTY') {
        availabilityStatus = 'DIRTY';
      } else {
        availabilityStatus = 'AVAILABLE';
      }

      return {
        id: r.id,
        number: r.number,
        floor: r.floor,
        type: r.type,
        baseRate: r.baseRate,
        housekeepingStatus: hk,
        operationalStatus: op,
        availabilityStatus,
        booking: activeBooking,
        isDayUse: activeBooking
          ? Boolean(activeBooking.isDayUse || activeBooking.checkInDate === activeBooking.checkOutDate)
          : false,
      };
    });
  }, [baseRooms, bookings, selectedDate, today]);

  // Summary counts per status
  const statusSummary = useMemo(() => {
    const total = roomItems.length;
    const available = roomItems.filter((r) => r.availabilityStatus === 'AVAILABLE').length;
    const inHouse = roomItems.filter((r) => r.availabilityStatus === 'IN_HOUSE').length;
    const confirmed = roomItems.filter((r) => r.availabilityStatus === 'CONFIRMED').length;
    const dirty = roomItems.filter((r) => r.availabilityStatus === 'DIRTY').length;
    const outOfOrder = roomItems.filter((r) => r.availabilityStatus === 'OUT_OF_ORDER').length;
    return { total, available, inHouse, confirmed, dirty, outOfOrder };
  }, [roomItems]);

  const floors = useMemo(
    () => Array.from(new Set(roomItems.map((r) => r.floor))).sort((a, b) => a - b),
    [roomItems]
  );

  const roomTypes = useMemo(
    () => Array.from(new Set(roomItems.map((r) => r.type))).sort(),
    [roomItems]
  );

  const filteredRooms = useMemo(() => {
    return roomItems.filter((r) => {
      if (statusFilter !== 'ALL' && r.availabilityStatus !== statusFilter) return false;
      if (floorFilter !== 'ALL' && r.floor !== Number(floorFilter)) return false;
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
        const matchGuest = (r.booking?.guestName || '').toLowerCase().includes(q);
        const matchCode = (r.booking?.bookingNumber || '').toLowerCase().includes(q);
        if (!matchRoom && !matchGuest && !matchCode) return false;
      }
      return true;
    });
  }, [roomItems, statusFilter, floorFilter, typeFilter, searchQuery]);

  // Operational Actions inside Detail Modal
  const handleCheckIn = async (booking: TapeChartBooking) => {
    setBusyAction(true);
    try {
      const apiUpdated = dbSynced ? await apiCheckInBooking(booking.id) : null;
      if (!apiUpdated) {
        const updated = bookings.map((b) =>
          b.id === booking.id ? { ...b, status: 'IN_HOUSE' as const } : b
        );
        saveStoredBookings(updated);
      }
      setBookings(getStoredBookings());
      setSelectedRoomItem(null);
      triggerToast(`Check-In berhasil untuk ${booking.guestName} (Kamar ${booking.roomNumber}).`);
    } catch (err: any) {
      alert(err?.message || 'Gagal melakukan Check-In.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCheckOut = async (booking: TapeChartBooking) => {
    const balance = calculateBookingBalance(booking);
    if (balance > 0) {
      alert(
        `Check-Out ditolak! Pembayaran harus lunas 100% (Full Payment).\n\nSisa tagihan ${booking.guestName}: ${formatCurrency(balance)}. Silakan selesaikan pembayaran di menu Front Desk & Reservasi.`
      );
      return;
    }

    setBusyAction(true);
    try {
      const apiUpdated = dbSynced ? await apiCheckOutBooking(booking.id, today) : null;
      if (!apiUpdated) {
        const isEarly = booking.checkOutDate > today;
        const updated = bookings.map((b) =>
          b.id === booking.id
            ? { ...b, status: 'CHECKED_OUT' as const, checkOutDate: isEarly ? today : b.checkOutDate }
            : b
        );
        saveStoredBookings(updated);
      }
      setBookings(getStoredBookings());
      await refreshBootstrap();
      setSelectedRoomItem(null);
      triggerToast(`Check-Out selesai untuk ${booking.guestName} (Kamar ${booking.roomNumber}).`);
    } catch (err: any) {
      alert(err?.message || 'Gagal melakukan Check-Out.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCancelBooking = async (booking: TapeChartBooking) => {
    if (booking.status !== 'CONFIRMED') return;
    if (!confirm(`Cancel reservasi atas nama ${booking.guestName} (#${booking.bookingNumber}) di Kamar ${booking.roomNumber}?`)) return;
    setBusyAction(true);
    try {
      if (dbSynced) {
        await apiCancelPmsBooking(booking.id);
      } else {
        const updated = bookings.map((b) =>
          b.id === booking.id ? { ...b, status: 'CANCELLED' as const } : b
        );
        saveStoredBookings(updated);
      }
      setBookings(getStoredBookings());
      setSelectedRoomItem(null);
      triggerToast(`Reservasi ${booking.guestName} berhasil di-cancel.`);
    } catch (err: any) {
      alert(err?.message || 'Gagal melakukan Cancel Reservation.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleMarkRoomClean = async (room: RoomGridItem, nextStatus: 'CLEAN' | 'DIRTY' | 'OUT_OF_ORDER') => {
    if (!room.id || !dbSynced) {
      alert('Sinkronisasi database diperlukan untuk mengubah status housekeeping.');
      return;
    }
    setBusyAction(true);
    try {
      await apiRequest(`/pms/housekeeping/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshBootstrap();
      setSelectedRoomItem(null);
      triggerToast(`Status Kamar ${room.number} diperbarui menjadi ${nextStatus}.`);
    } catch (err: any) {
      alert(err?.message || 'Gagal memperbarui status kamar.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[80] bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 border border-emerald-400/30">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-bold leading-snug max-w-sm">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Room Availability
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {selectedDate === today ? 'Hari Ini' : selectedDate}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pantau ringkasan status ketersediaan seluruh unit kamar dan detail penghuni berdasarkan tanggal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grid vs Table Switcher */}
          <div className="flex items-center p-1 bg-muted/60 border border-border rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              Grid Kamar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5 text-primary" />
              Tabel Status
            </button>
          </div>

          <Link
            href="/front-office"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white shadow-xs hover:bg-primary/90 transition-colors"
          >
            <ConciergeBell className="w-4 h-4" />
            Ke Front Desk
          </Link>
        </div>
      </div>

      {/* Top Summary Cards Per Status (Clickable Filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            statusFilter === 'ALL' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Kamar</span>
            <BedDouble className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-black mt-1 text-foreground">{statusSummary.total}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Semua Unit</div>
        </button>

        <button
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-emerald-500/50 shadow-xs ${
            statusFilter === 'AVAILABLE' ? 'border-emerald-500 ring-2 ring-emerald-500/15' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Vacant Ready (VR)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-1 text-emerald-600">{statusSummary.available}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Kamar Siap Jual</div>
        </button>

        <button
          onClick={() => setStatusFilter('IN_HOUSE')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-purple-500/50 shadow-xs ${
            statusFilter === 'IN_HOUSE' ? 'border-purple-500 ring-2 ring-purple-500/15' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Occupied (OC)</span>
            <DoorClosed className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black mt-1 text-purple-600">{statusSummary.inHouse}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Kamar Terisi</div>
        </button>

        <button
          onClick={() => setStatusFilter('CONFIRMED')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-sky-500/50 shadow-xs ${
            statusFilter === 'CONFIRMED' ? 'border-sky-500 ring-2 ring-sky-500/15' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Reserved</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black mt-1 text-sky-600">{statusSummary.confirmed}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Confirmed / Arrival</div>
        </button>

        <button
          onClick={() => setStatusFilter('DIRTY')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-amber-500/50 shadow-xs ${
            statusFilter === 'DIRTY' ? 'border-amber-500 ring-2 ring-amber-500/15' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Vacant Dirty (VD)</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-1 text-amber-600">{statusSummary.dirty}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Kamar Kotor</div>
        </button>

        <button
          onClick={() => setStatusFilter('OUT_OF_ORDER')}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-rose-500/50 shadow-xs ${
            statusFilter === 'OUT_OF_ORDER' ? 'border-rose-500 ring-2 ring-rose-500/15' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Out of Order</span>
            <Wrench className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black mt-1 text-rose-600">{statusSummary.outOfOrder}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Maintenance / Rusak</div>
        </button>
      </div>

      {/* Filter Bar (Default Tanggal = Hari Ini) */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysIso(selectedDate, -1))}
              className="p-1.5 hover:bg-card rounded-lg text-foreground transition-colors"
              title="Mundur 1 Hari"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-foreground outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysIso(selectedDate, 1))}
              className="p-1.5 hover:bg-card rounded-lg text-foreground transition-colors"
              title="Maju 1 Hari"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
              selectedDate === today
                ? 'bg-primary text-white border-primary'
                : 'bg-muted/50 border-border text-foreground hover:bg-muted'
            }`}
          >
            Hari Ini ({today})
          </button>
        </div>

        {/* Floor, Type & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Semua Lantai</option>
            {floors.map((fl) => (
              <option key={fl} value={String(fl)}>
                Lantai {fl}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Semua Tipe Kamar</option>
            {roomTypes.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari kamar / tamu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 w-48"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: ROOM AVAILABILITY GRID */}
      {viewMode === 'grid' && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-xs">
            <div className="font-bold text-foreground">
              Menampilkan {filteredRooms.length} dari {roomItems.length} Kamar pada{' '}
              <span className="font-mono text-primary">{selectedDate}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {(['AVAILABLE', 'IN_HOUSE', 'CONFIRMED', 'DIRTY', 'OUT_OF_ORDER'] as AvailabilityStatus[]).map((st) => (
                <span key={st} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[st].dotClass}`} />
                  {STATUS_META[st].label}
                </span>
              ))}
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              Tidak ada kamar yang sesuai dengan filter saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredRooms.map((room) => {
                const meta = STATUS_META[room.availabilityStatus];
                const bal = room.booking ? calculateBookingBalance(room.booking) : 0;

                return (
                  <button
                    key={room.number}
                    type="button"
                    onClick={() => setSelectedRoomItem(room)}
                    className={`p-4 rounded-xl border text-left transition-all shadow-xs flex flex-col justify-between gap-3 ${meta.cardClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-foreground flex items-center gap-1.5">
                          Kamar {room.number}
                          {room.isDayUse && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-600 text-white font-extrabold">
                              DAY USE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          {room.type} • Lt. {room.floor}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </div>

                    {room.booking ? (
                      <div className="p-2.5 rounded-lg bg-background/80 border border-border/70 space-y-1 text-[11px]">
                        <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="truncate">{room.booking.guestName}</span>
                        </div>
                        <div className="text-muted-foreground font-mono text-[10px] flex items-center justify-between">
                          <span>{room.booking.checkInDate} → {room.booking.checkOutDate}</span>
                          <span className={bal === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {bal === 0 ? 'LUNAS' : formatCurrency(bal)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{meta.shortLabel}</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrency(room.baseRate)}/mlm
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STATUS TABLE GRID */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs overflow-hidden">
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Kamar</th>
                  <th className="p-3">Tipe & Lantai</th>
                  <th className="p-3">Status ({selectedDate})</th>
                  <th className="p-3">Housekeeping</th>
                  <th className="p-3">Tamu / Penghuni</th>
                  <th className="p-3">Masa Inap</th>
                  <th className="p-3 text-right">Tarif / Saldo</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Tidak ada kamar yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const meta = STATUS_META[room.availabilityStatus];
                    const bal = room.booking ? calculateBookingBalance(room.booking) : 0;

                    return (
                      <tr key={room.number} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-bold text-foreground">Kamar {room.number}</td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{room.type}</div>
                          <div className="text-[10px] text-muted-foreground">Lantai {room.floor}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {room.housekeepingStatus}
                        </td>
                        <td className="p-3">
                          {room.booking ? (
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {room.booking.guestName}
                                {room.isDayUse && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-600 text-white font-extrabold">
                                    DAY USE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                #{room.booking.bookingNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {room.booking ? `${room.booking.checkInDate} s/d ${room.booking.checkOutDate}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {room.booking ? (
                            <div>
                              <div className="font-bold text-foreground">{formatCurrency(room.booking.totalAmount)}</div>
                              <div className={`text-[10px] font-bold ${bal === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {bal === 0 ? 'LUNAS' : `Sisa ${formatCurrency(bal)}`}
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-foreground">{formatCurrency(room.baseRate)}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedRoomItem(room)}
                            className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg border border-border text-[11px]"
                          >
                            Kelola
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROOM / RESERVATION DETAIL MODAL */}
      {selectedRoomItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Kamar {selectedRoomItem.number} — {selectedRoomItem.type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoomItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status ({selectedDate}):</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${STATUS_META[selectedRoomItem.availabilityStatus].badgeClass}`}>
                  {STATUS_META[selectedRoomItem.availabilityStatus].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Housekeeping:</span>
                <span className="font-mono font-bold text-foreground">{selectedRoomItem.housekeepingStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tarif Dasar:</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(selectedRoomItem.baseRate)}/mlm</span>
              </div>
            </div>

            {selectedRoomItem.booking ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-foreground">{selectedRoomItem.booking.guestName}</span>
                    {selectedRoomItem.isDayUse && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-600 text-white font-extrabold">
                        DAY USE
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    #{selectedRoomItem.booking.bookingNumber} • {selectedRoomItem.booking.checkInDate} s/d {selectedRoomItem.booking.checkOutDate}
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">Sisa Saldo:</span>
                    <span className={`font-mono font-bold ${calculateBookingBalance(selectedRoomItem.booking) === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {calculateBookingBalance(selectedRoomItem.booking) === 0
                        ? 'LUNAS'
                        : formatCurrency(calculateBookingBalance(selectedRoomItem.booking))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedRoomItem.booking.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleCheckIn(selectedRoomItem.booking!)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-4 h-4" />
                        Check-In
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleCancelBooking(selectedRoomItem.booking!)}
                        className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold rounded-xl border border-destructive/20 flex items-center justify-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Cancel Reservation
                      </button>
                    </>
                  )}

                  {selectedRoomItem.booking.status === 'IN_HOUSE' && (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleCheckOut(selectedRoomItem.booking!)}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Check-Out
                    </button>
                  )}

                  <Link
                    href="/front-office"
                    className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl border border-border flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                    Buka Detail Lengkap di Front Desk
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRoomItem.id && dbSynced && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleMarkRoomClean(selectedRoomItem, 'CLEAN')}
                      className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl border border-emerald-500/20"
                    >
                      Set Clean
                    </button>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleMarkRoomClean(selectedRoomItem, 'DIRTY')}
                      className="py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl border border-amber-500/20"
                    >
                      Set Dirty
                    </button>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleMarkRoomClean(selectedRoomItem, 'OUT_OF_ORDER')}
                      className="py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold rounded-xl border border-rose-500/20"
                    >
                      Out of Order
                    </button>
                  </div>
                )}

                <Link
                  href="/front-office"
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <ConciergeBell className="w-4 h-4" />
                  Buat Reservasi / Check-In di Front Desk
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
