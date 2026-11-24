'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  X,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  MoveRight,
  Sparkles,
  Zap,
  Bed,
  Check,
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarCheck,
  DoorClosed,
  RotateCcw,
  Flag,
  DollarSign,
  Phone,
  Compass,
  Receipt,
  Printer,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';
import {
  TapeChartBooking,
  getStoredBookings,
  saveStoredBookings,
  initialBookings,
} from '../../../lib/bookings-store';

export type { TapeChartBooking };

interface PMSNotification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
}

const mockRooms = [
  // Lantai 1: Superior
  { number: '101', floor: 1, type: 'Superior', clean: true },
  { number: '102', floor: 1, type: 'Superior', clean: true },
  { number: '103', floor: 1, type: 'Superior', clean: false },
  { number: '104', floor: 1, type: 'Superior', clean: true },
  { number: '105', floor: 1, type: 'Superior', clean: true },
  // Lantai 2: Deluxe
  { number: '201', floor: 2, type: 'Deluxe King', clean: true },
  { number: '202', floor: 2, type: 'Deluxe King', clean: true },
  { number: '203', floor: 2, type: 'Deluxe King', clean: true },
  { number: '204', floor: 2, type: 'Deluxe King', clean: false },
  { number: '205', floor: 2, type: 'Deluxe King', clean: true },
  // Lantai 3: Deluxe King
  { number: '301', floor: 3, type: 'Deluxe King', clean: true },
  { number: '302', floor: 3, type: 'Deluxe King', clean: true },
  { number: '303', floor: 3, type: 'Deluxe King', clean: true },
  // Lantai 4: Executive & Family
  { number: '401', floor: 4, type: 'Executive Suite', clean: true },
  { number: '402', floor: 4, type: 'Executive Suite', clean: true },
  { number: '407', floor: 4, type: 'Family Suite', clean: true },
];

const unassignedBookings: TapeChartBooking[] = [
  {
    id: 'u-1',
    bookingNumber: 'AGD-99014',
    source: 'AGODA',
    guestName: 'Agus Pratama',
    phone: '+628178901234',
    roomNumber: 'UNASSIGNED',
    roomType: 'Deluxe King',
    ratePlan: 'Bed & Breakfast',
    checkInDate: '2026-11-25',
    checkOutDate: '2026-11-27',
    status: 'CONFIRMED',
    totalAmount: 2129600,
  },
  {
    id: 'u-2',
    bookingNumber: 'AGD-99015',
    source: 'AGODA',
    guestName: 'Maya Indah',
    phone: '+628189012345',
    roomNumber: 'UNASSIGNED',
    roomType: 'Superior',
    ratePlan: 'Room Only',
    checkInDate: '2026-11-26',
    checkOutDate: '2026-11-28',
    status: 'CONFIRMED',
    totalAmount: 1573000,
  },
];

export default function BookingsTapeChartPage() {
  const { t } = useI18n();

  // Core Data State - synced with shared bookings store
  const [bookings, setBookings] = useState<TapeChartBooking[]>(initialBookings);
  const [unassigned, setUnassigned] = useState<TapeChartBooking[]>(unassignedBookings);
  const [selectedBooking, setSelectedBooking] = useState<TapeChartBooking | null>(null);

  // Load from and sync with shared bookings store
  useEffect(() => {
    setBookings(getStoredBookings());
    const handler = () => {
      setBookings(getStoredBookings());
    };
    window.addEventListener('pms_bookings_updated', handler);
    return () => window.removeEventListener('pms_bookings_updated', handler);
  }, []);

  // Date Navigation State (Supports ANY Year: 2026, 2027, 2028, dst)
  const [chartStartDate, setChartStartDate] = useState<string>('2026-11-24');
  const [daysCount, setDaysCount] = useState<7 | 14>(7);
  const [floorFilter, setFloorFilter] = useState<'ALL' | '1' | '2' | '3' | '4' | 'DIRTY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [otaQueueOpen, setOtaQueueOpen] = useState(false);

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState(mockRooms[0].number);
  const [printedReceiptBooking, setPrintedReceiptBooking] = useState<TapeChartBooking | null>(null);

  // Notification System
  const [notification, setNotification] = useState<PMSNotification | null>({
    id: 'init-1',
    type: 'info',
    title: 'Tape Chart Siap Digunakan',
    message: 'Tampilan 14 Hari dan 7 Hari kini menggunakan grid responsif modern. Anda dapat melompat ke tanggal berapa pun (termasuk tahun 2027) via pemilih tanggal.',
    time: '11:28 WIB',
  });

  // Express Reservation Form States
  const [guestName, setGuestName] = useState('Raden Surya');
  const [guestPhone, setGuestPhone] = useState('+62 812 3456 7890');
  const [bookingSource, setBookingSource] = useState<'WALK_IN' | 'DIRECT' | 'CORPORATE'>('WALK_IN');
  const [checkInDate, setCheckInDate] = useState('2026-11-24');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-25');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(mockRooms[0].number);
  const [ratePlan, setRatePlan] = useState<'RO' | 'BB'>('RO');
  const [isPaidDirect, setIsPaidDirect] = useState(true);

  // Shift Date Helper (Maju/Mundur hari)
  const shiftDate = (days: number) => {
    const cur = new Date(chartStartDate);
    cur.setDate(cur.getDate() + days);
    setChartStartDate(cur.toISOString().split('T')[0]);
  };

  // Quick Date Presets in Modal (Malam ini, Besok, Weekend, Tahun Depan 2027)
  const setQuickPreset = (type: 'TONIGHT' | 'TOMORROW' | 'WEEKEND' | 'NEXT_YEAR') => {
    if (type === 'TONIGHT') {
      setCheckInDate('2026-11-24');
      setCheckOutDate('2026-11-25');
    } else if (type === 'TOMORROW') {
      setCheckInDate('2026-11-25');
      setCheckOutDate('2026-11-26');
    } else if (type === 'WEEKEND') {
      setCheckInDate('2026-11-27');
      setCheckOutDate('2026-11-29');
    } else if (type === 'NEXT_YEAR') {
      setCheckInDate('2027-01-15');
      setCheckOutDate('2027-01-18');
    }
  };

  // Live Price Calculation with Indonesian PBJT & Service Charge
  const roomObj = mockRooms.find((r) => r.number === selectedRoomNumber);
  const roomTypeName = roomObj?.type || 'Superior';
  const basePricePerNight =
    roomTypeName.includes('Executive') ? 1450000 :
    roomTypeName.includes('Family') ? 2100000 :
    roomTypeName.includes('Deluxe') ? 880000 : 650000;

  const bbAddonPerNight = ratePlan === 'BB' ? 130000 : 0;
  const inTime = new Date(checkInDate).getTime();
  const outTime = new Date(checkOutDate).getTime();
  const calculatedNights = Math.max(1, Math.round((outTime - inTime) / (1000 * 60 * 60 * 24)));

  const subtotal = (basePricePerNight + bbAddonPerNight) * calculatedNights;
  const serviceCharge = Math.round(subtotal * 0.1);
  const pbjtTax = Math.round((subtotal + serviceCharge) * 0.1);
  const grandTotal = subtotal + serviceCharge + pbjtTax;

  // Conflict detection
  const isRoomOccupied = bookings.some(
    (b) => b.roomNumber === selectedRoomNumber && checkInDate < b.checkOutDate && checkOutDate > b.checkInDate
  );

  // Generate Calendar Dates dynamically based on chartStartDate & daysCount
  const dates = useMemo(() => {
    const base = new Date(chartStartDate);
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      const isToday = dayStr === '2026-11-24';
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
      return { dayStr, dayName, monthName, isToday, isWeekend, dayNum: d.getDate(), year: d.getFullYear() };
    });
  }, [chartStartDate, daysCount]);

  // Filtered Rooms (Search & Floor Filter)
  const filteredRooms = useMemo(() => {
    return mockRooms.filter((r) => {
      if (floorFilter === 'DIRTY' && r.clean) return false;
      if (floorFilter !== 'ALL' && floorFilter !== 'DIRTY' && r.floor !== Number(floorFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
        const matchesGuest = bookings.some(
          (b) => b.roomNumber === r.number && b.guestName.toLowerCase().includes(q)
        );
        if (!matchesRoom && !matchesGuest) return false;
      }
      return true;
    });
  }, [floorFilter, searchQuery, bookings]);

  // Status Counts for Legend
  const counts = useMemo(() => {
    const inHouse = bookings.filter((b) => b.status === 'IN_HOUSE').length;
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const checkedOut = bookings.filter((b) => b.status === 'CHECKED_OUT').length;
    const dirtyRooms = mockRooms.filter((r) => !r.clean).length;
    return { inHouse, confirmed, checkedOut, dirtyRooms };
  }, [bookings]);

  // Front Office Action Handlers with Clear Notifications & Local Storage Sync
  const handleAssignRoom = (booking: TapeChartBooking, roomNum: string) => {
    setUnassigned((prev) => prev.filter((b) => b.id !== booking.id));
    const updated = [...bookings, { ...booking, roomNumber: roomNum }];
    setBookings(updated);
    saveStoredBookings(updated);
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'success',
      title: 'Kamar OTA Berhasil Ditugaskan!',
      message: `Tamu OTA Agoda ${booking.guestName} (${booking.bookingNumber}) berhasil dialokasikan ke Kamar ${roomNum}.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  const handleMoveRoom = () => {
    if (!selectedBooking) return;
    const oldRoom = selectedBooking.roomNumber;
    const updated = bookings.map((b) => (b.id === selectedBooking.id ? { ...b, roomNumber: targetRoom } : b));
    setBookings(updated);
    saveStoredBookings(updated);
    setSelectedBooking((prev) => (prev ? { ...prev, roomNumber: targetRoom } : null));
    setMoveModalOpen(false);
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'info',
      title: 'Pindah Kamar Berhasil (Room Move)',
      message: `Reservasi ${selectedBooking.guestName} berhasil dipindahkan dari Kamar ${oldRoom} ke Kamar ${targetRoom}.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  const handleCancelBooking = (booking: TapeChartBooking) => {
    const updated = bookings.filter((b) => b.id !== booking.id);
    setBookings(updated);
    saveStoredBookings(updated);
    setSelectedBooking(null);
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'warning',
      title: 'Reservasi Dibatalkan',
      message: `Reservasi ${booking.bookingNumber} (${booking.guestName}) di Kamar ${booking.roomNumber} telah dibatalkan. Ketersediaan kamar dibuka kembali.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  const handleCheckInNow = (booking: TapeChartBooking) => {
    const updated = bookings.map((b) => (b.id === booking.id ? { ...b, status: 'IN_HOUSE' as const } : b));
    setBookings(updated);
    saveStoredBookings(updated);
    setSelectedBooking((prev) => (prev ? { ...prev, status: 'IN_HOUSE' } : null));
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'success',
      title: 'Tamu Berhasil Check-In (In-House)',
      message: `Tamu ${booking.guestName} (Kamar ${booking.roomNumber}) kini berstatus IN-HOUSE. Kunci kamar dapat diserahkan.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  const handleCheckOutNow = (booking: TapeChartBooking) => {
    const today = '2026-11-24';
    const isEarly = booking.checkOutDate > today;
    const updated = bookings.map((b) =>
      b.id === booking.id
        ? {
            ...b,
            status: 'CHECKED_OUT' as const,
            checkOutDate: isEarly ? today : b.checkOutDate,
          }
        : b
    );
    setBookings(updated);
    saveStoredBookings(updated);
    setSelectedBooking((prev) =>
      prev
        ? {
            ...prev,
            status: 'CHECKED_OUT',
            checkOutDate: isEarly ? today : prev.checkOutDate,
          }
        : null
    );
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'info',
      title: isEarly ? 'Early Check-Out Selesai' : 'Tamu Selesai Check-Out',
      message: isEarly
        ? `Tamu ${booking.guestName} telah check-out lebih awal dari Kamar ${booking.roomNumber}. Sisa malam dilepas dan kamar kembali tersedia di kalender.`
        : `Tamu ${booking.guestName} telah selesai check-out dari Kamar ${booking.roomNumber}. Kamar siap dibersihkan.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  // Jump directly to Year 2027
  const handleJumpTo2027 = () => {
    setChartStartDate('2027-01-15');
    setNotification({
      id: `notif-${Date.now()}`,
      type: 'info',
      title: 'Menampilkan Kalender Tahun 2027',
      message: 'Tape Chart telah melompat ke 15 Januari 2027. Reservasi Prof. Bambang Sutrisno di Kamar 401 kini terlihat.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });
  };

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto pb-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Tape Chart & Reservasi
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Hotel Winotosastro
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Matriks ketersediaan kamar & alokasi reservasi front desk (Surakarta WIB)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Reservation Button */}
          <button
            onClick={() => {
              setQuickPreset('TONIGHT');
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-xs transition-transform hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            + Reservasi Cepat
          </button>
        </div>
      </div>

      {/* Prominent Clear Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start justify-between shadow-xs animate-in fade-in transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
            {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>{notification.title}</span>
                <span className="text-[10px] font-normal opacity-70 font-mono">({notification.time})</span>
              </div>
              <p className="text-[11px] mt-0.5 opacity-90">{notification.message}</p>
            </div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Unassigned OTA Queue Bar */}
      {unassigned.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden transition-all shadow-xs">
          <div
            onClick={() => setOtaQueueOpen(!otaQueueOpen)}
            className="flex items-center justify-between p-3 px-4 cursor-pointer hover:bg-amber-500/15 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {unassigned.length} Reservasi OTA Butuh Penugasan Kamar
              </span>
              <span className="hidden sm:inline-block text-[11px] font-normal text-amber-700/80 dark:text-amber-400/80">
                • Inventori aman di level tipe kamar (Agoda Channel)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline">
                {otaQueueOpen ? 'Tutup Antrean' : 'Tugaskan Kamar Sekarang'}
              </span>
              {otaQueueOpen ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
            </div>
          </div>

          {otaQueueOpen && (
            <div className="p-4 pt-1 border-t border-amber-500/20 bg-amber-500/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassigned.map((ub) => (
                <div
                  key={ub.id}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <span className="px-1.5 py-0.2 bg-orange-500/10 text-orange-600 rounded text-[10px] font-extrabold">
                        {ub.source}
                      </span>
                      <span>{ub.guestName}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {ub.roomType} • {ub.checkInDate} s/d {ub.checkOutDate}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                      {formatCurrency(ub.totalAmount)}
                    </div>
                  </div>

                  <select
                    onChange={(e) => {
                      if (e.target.value) handleAssignRoom(ub, e.target.value);
                    }}
                    defaultValue=""
                    className="px-2.5 py-1.5 text-xs bg-primary text-white rounded-lg font-bold hover:bg-primary/90 cursor-pointer shadow-2xs"
                  >
                    <option value="" disabled>
                      Pilih Kamar...
                    </option>
                    {mockRooms
                      .filter((r) => r.type.includes(ub.roomType))
                      .map((r) => (
                        <option key={r.number} value={r.number} className="bg-card text-foreground">
                          Kmr {r.number} ({r.type})
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Strip: Date Picker, Jump to Next Year, 7 vs 14 Days, Floor Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-xs text-xs">
        {/* Floor & Cleanliness Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-muted-foreground mr-1 hidden sm:inline">Lantai:</span>
          {[
            { id: 'ALL', label: `Semua (${mockRooms.length})` },
            { id: '1', label: 'Lt 1 (Superior)' },
            { id: '2', label: 'Lt 2 (Deluxe)' },
            { id: '3', label: 'Lt 3' },
            { id: '4', label: 'Lt 4 (Suite)' },
            { id: 'DIRTY', label: `🧹 Perlu HK (${counts.dirtyRooms})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFloorFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                floorFilter === f.id
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-muted/40 border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search, Date Jump (Bisa pilih Tahun Depan), & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kamar / tamu..."
              className="pl-8 pr-2 py-1 bg-muted/40 border border-border rounded-lg text-xs w-36 focus:outline-hidden focus:border-primary"
            />
          </div>

          {/* Date Picker Input (Bisa Lompat ke Tanggal Apapun / Tahun Depan) */}
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-lg px-2 py-0.5">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <input
              type="date"
              value={chartStartDate}
              onChange={(e) => setChartStartDate(e.target.value)}
              className="bg-transparent border-0 text-xs font-mono font-bold text-foreground focus:outline-hidden cursor-pointer"
              title="Pilih tanggal awal kalender (bisa tahun depan/kapan saja)"
            />
          </div>

          {/* Quick Jump Shortcuts */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartStartDate('2026-11-24')}
              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors text-foreground"
            >
              Hari Ini
            </button>
            <button
              onClick={handleJumpTo2027}
              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-primary flex items-center gap-1"
              title="Lompat langsung ke Kalender 2027"
            >
              <Compass className="w-3 h-3" />
              Tahun 2027
            </button>
          </div>

          {/* 7 Days vs 14 Days Toggle */}
          <div className="flex items-center bg-muted/40 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setDaysCount(7)}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                daysCount === 7 ? 'bg-primary text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDaysCount(14)}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                daysCount === 14 ? 'bg-primary text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              14 Hari
            </button>
          </div>

          {/* Forward / Backward Step Buttons */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <button
              onClick={() => shiftDate(-daysCount)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title={`Mundur ${daysCount} hari`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shiftDate(daysCount)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title={`Maju ${daysCount} hari`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Status Legend & Current Period Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 bg-card border border-border rounded-xl text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
            Status:
          </span>
          {/* In-House Badge */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400 shadow-2xs flex items-center justify-center text-[9px] text-white">
              🛌
            </span>
            <span className="font-bold text-foreground">IN-HOUSE</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[10px]">
              {counts.inHouse}
            </span>
          </div>

          {/* Confirmed Badge */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-400 shadow-2xs flex items-center justify-center text-[9px] text-white">
              ✓
            </span>
            <span className="font-bold text-foreground">CONFIRMED</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
              {counts.confirmed}
            </span>
          </div>

          {/* Checked-Out Badge */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-500 border border-slate-400 shadow-2xs flex items-center justify-center text-[9px] text-white">
              🏁
            </span>
            <span className="font-bold text-foreground">CHECKED-OUT</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-500/10 text-slate-600 font-bold text-[10px]">
              {counts.checkedOut}
            </span>
          </div>

          {/* OTA Channel Badge */}
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.2 rounded bg-orange-500 text-white font-extrabold text-[9px]">
              OTA
            </span>
            <span className="text-muted-foreground">Agoda Channel</span>
          </div>
        </div>

        {/* Current Viewing Period & Cleanliness Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
            📅 {dates[0]?.dayNum} {dates[0]?.monthName} {dates[0]?.year} — {dates[dates.length - 1]?.dayNum} {dates[dates.length - 1]?.monthName} {dates[dates.length - 1]?.year}
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Siap</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-1.5" />
            <span className="text-muted-foreground">HK</span>
          </div>
        </div>
      </div>

      {/* Main Tape Chart Calendar Matrix (Cross-Browser Modern CSS Grid) */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: daysCount === 7 ? '100%' : '1180px' }}>
            {/* Header Dates Row (Sticky on top) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: daysCount === 7 ? '150px repeat(7, minmax(0, 1fr))' : '150px repeat(14, minmax(72px, 1fr))',
              }}
              className="border-b border-border bg-muted/60 text-xs font-semibold text-muted-foreground sticky top-0 z-20"
            >
              {/* Sticky Room Column Header */}
              <div className="sticky left-0 z-30 p-2.5 px-3 border-r border-border font-bold text-foreground bg-muted flex items-center justify-between shadow-xs">
                <span>Kamar ({filteredRooms.length})</span>
                <span className="text-[10px] text-muted-foreground font-normal">Tipe</span>
              </div>

              {/* Date Columns */}
              {dates.map((d) => (
                <div
                  key={d.dayStr}
                  className={`p-2 text-center border-r border-border transition-colors ${
                    d.isToday ? 'bg-primary/15 text-primary font-bold' : ''
                  } ${d.isWeekend ? 'bg-muted/40' : ''}`}
                >
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    {d.dayName}
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    {d.dayNum} {d.monthName}
                  </div>
                  {d.year !== 2026 && (
                    <div className="text-[9px] font-mono text-primary font-bold opacity-80">
                      {d.year}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Room Rows Matrix */}
            <div className="divide-y divide-border">
              {filteredRooms.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Tidak ada kamar yang sesuai dengan filter lantai atau pencarian.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const roomBookings = bookings.filter((b) => b.roomNumber === room.number);

                  return (
                    <div
                      key={room.number}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: daysCount === 7 ? '150px repeat(7, minmax(0, 1fr))' : '150px repeat(14, minmax(72px, 1fr))',
                      }}
                      className="text-xs hover:bg-muted/10 transition-colors h-11 items-center"
                    >
                      {/* Sticky Left Room Info Cell */}
                      <div className="sticky left-0 z-10 p-2 px-3 border-r border-border flex items-center justify-between bg-card h-full shadow-xs">
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground text-xs">
                              {room.number}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                room.clean ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                              }`}
                              title={room.clean ? 'Kamar Bersih & Siap' : 'Kamar Perlu Housekeeping'}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[85px]">
                            {room.type}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Lt {room.floor}
                        </span>
                      </div>

                      {/* Date Cells */}
                      {dates.map((d) => {
                        const bookingForDate = roomBookings.find(
                          (b) => d.dayStr >= b.checkInDate && d.dayStr < b.checkOutDate
                        );

                        if (bookingForDate) {
                          const isStart = d.dayStr === bookingForDate.checkInDate || d.dayStr === dates[0].dayStr;

                          // Visual Styles based on Status
                          let statusClass = 'bg-emerald-600 hover:bg-emerald-500 text-white border-l-2 border-emerald-300';
                          let statusIcon = '✓';

                          if (bookingForDate.status === 'IN_HOUSE') {
                            statusClass = 'bg-blue-600 hover:bg-blue-500 text-white border-l-2 border-cyan-300';
                            statusIcon = '🛌';
                          } else if (bookingForDate.status === 'CHECKED_OUT') {
                            statusClass = 'bg-slate-500 hover:bg-slate-400 text-slate-100 border-l-2 border-slate-300';
                            statusIcon = '🏁';
                          }

                          return (
                            <div
                              key={d.dayStr}
                              onClick={() => setSelectedBooking(bookingForDate)}
                              className="p-1 border-r border-border h-full flex items-center cursor-pointer transition-colors"
                            >
                              <div
                                className={`w-full h-8 flex items-center px-1.5 rounded-lg text-[11px] font-bold truncate shadow-xs transition-transform hover:scale-[1.02] ${statusClass}`}
                                title={`${bookingForDate.guestName} (${bookingForDate.status}) • Klik untuk detail`}
                              >
                                {isStart ? (
                                  <span className="truncate flex items-center gap-1.5">
                                    <span className="text-[10px] opacity-90">{statusIcon}</span>
                                    {bookingForDate.source === 'AGODA' && (
                                      <span className="text-[9px] px-1 bg-orange-500 text-white rounded font-extrabold">
                                        OTA
                                      </span>
                                    )}
                                    {bookingForDate.source === 'WALK_IN' && (
                                      <span className="text-[9px] px-1 bg-teal-500 text-white rounded font-semibold">
                                        Walk-In
                                      </span>
                                    )}
                                    <span className="truncate font-semibold">{bookingForDate.guestName}</span>
                                  </span>
                                ) : (
                                  <span className="opacity-40 text-center w-full tracking-widest text-[9px]">
                                    •••••
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Empty Cell: 1-Click Fast Reservation
                        return (
                          <div
                            key={d.dayStr}
                            onClick={() => {
                              setSelectedRoomNumber(room.number);
                              setTargetRoom(room.number);
                              setCheckInDate(d.dayStr);
                              const nextDay = new Date(d.dayStr);
                              nextDay.setDate(nextDay.getDate() + 1);
                              setCheckOutDate(nextDay.toISOString().split('T')[0]);
                              setCreateModalOpen(true);
                            }}
                            className="p-1 border-r border-border hover:bg-primary/10 cursor-pointer h-full flex items-center justify-center transition-colors group"
                            title={`Klik untuk reservasi cepat Kamar ${room.number} tanggal ${d.dayStr}`}
                          >
                            <span className="text-[10px] text-muted-foreground/30 group-hover:text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              + Pesan
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Drawer / Modal with Direct Status Actions */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-foreground">
                  {selectedBooking.bookingNumber}
                </span>
                {/* Source Badge */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedBooking.source === 'AGODA'
                      ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                      : selectedBooking.source === 'WALK_IN'
                      ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {selectedBooking.source}
                </span>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Guest & Status Header Card */}
              <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                    Nama Tamu
                  </span>
                  <div className="text-sm font-bold text-foreground mt-0.5">
                    {selectedBooking.guestName}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                    <Phone className="w-3 h-3" />
                    <span>{selectedBooking.phone || 'Tidak ada no. telp'}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">
                    Status
                  </span>
                  {selectedBooking.status === 'IN_HOUSE' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1 shadow-2xs">
                      🛌 IN-HOUSE
                    </span>
                  )}
                  {selectedBooking.status === 'CONFIRMED' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                      ✓ CONFIRMED
                    </span>
                  )}
                  {selectedBooking.status === 'CHECKED_OUT' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500 text-white flex items-center gap-1 shadow-2xs">
                      🏁 CHECKED-OUT
                    </span>
                  )}
                </div>
              </div>

              {/* Dates & Room Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/20 border border-border rounded-xl">
                  <span className="text-muted-foreground font-semibold">Jadwal Menginap</span>
                  <div className="font-bold text-foreground mt-0.5">
                    {selectedBooking.checkInDate} s/d {selectedBooking.checkOutDate}
                  </div>
                </div>
                <div className="p-3 bg-muted/20 border border-border rounded-xl">
                  <span className="text-muted-foreground font-semibold">Alokasi Kamar</span>
                  <div className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>Kamar {selectedBooking.roomNumber} ({selectedBooking.roomType})</span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Paket Tarif:</span>
                  <span className="font-semibold text-foreground">{selectedBooking.ratePlan}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                  <span>Total Tagihan (Termasuk PBJT 10% & Service 10%):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                    {formatCurrency(selectedBooking.totalAmount)}
                  </span>
                </div>
              </div>

              {/* 1-Click Status Transitions (Front Office Efficiency) */}
              <div className="pt-1 space-y-2">
                {selectedBooking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCheckInNow(selectedBooking)}
                    className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Bed className="w-4 h-4" />
                    Proses Check-In Tamu Sekarang (Ubah jadi In-House)
                  </button>
                )}

                {selectedBooking.status === 'IN_HOUSE' && (
                  <button
                    onClick={() => handleCheckOutNow(selectedBooking)}
                    className={`w-full py-2 px-3 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-2 shadow-xs transition-colors ${
                      selectedBooking.checkOutDate > '2026-11-24'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    {selectedBooking.checkOutDate > '2026-11-24'
                      ? 'Proses Early Check-Out (Lepas Sisa Malam Ini)'
                      : 'Proses Check-Out Tamu (Selesai Menginap)'}
                  </button>
                )}

                {selectedBooking.status === 'CHECKED_OUT' && (
                  <Link
                    href="/back-office"
                    className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Receipt className="w-4 h-4" />
                    Buka Arsip & Cetak Ulang Nota Resmi
                  </Link>
                )}

                <button
                  onClick={() => setPrintedReceiptBooking(selectedBooking)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-card border border-border hover:bg-muted text-foreground flex items-center justify-center gap-2 shadow-2xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  Cetak Nota / Tanda Terima Pembayaran
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setMoveModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors text-foreground"
                  >
                    <MoveRight className="w-3.5 h-3.5 text-primary" />
                    Pindah Kamar (Move)
                  </button>
                  <button
                    onClick={() => handleCancelBooking(selectedBooking)}
                    className="px-3 py-2 text-xs font-bold rounded-xl text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    Batalkan Reservasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Room Dialog */}
      {moveModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pindah Kamar (Room Move)</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pindahkan reservasi {selectedBooking.guestName} ke kamar fisik lain:
              </p>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground">Pilih Kamar Tujuan</label>
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-semibold"
              >
                {mockRooms
                  .filter((r) => r.number !== selectedBooking.roomNumber)
                  .map((r) => (
                    <option key={r.number} value={r.number}>
                      Kamar {r.number} ({r.type}) — Lt {r.floor}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setMoveModalOpen(false)}
                className="flex-1 px-3 py-2 bg-muted rounded-lg font-semibold hover:bg-muted/80 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleMoveRoom}
                className="flex-1 px-3 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
              >
                Konfirmasi Pindah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Express Reservation Modal (Front Desk Ultra-Efficient UI/UX with Next Year Booking Support) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Reservasi Cepat Front Desk</h3>
                  <p className="text-[11px] text-muted-foreground">Input walk-in, telepon, atau reservasi di muka (termasuk tahun depan)</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Quick Source Selector */}
              <div>
                <label className="font-semibold text-muted-foreground block mb-1.5">Tipe Kedatangan / Sumber:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'WALK_IN', label: '🚶 Walk-In' },
                    { id: 'DIRECT', label: '📞 Telepon / WA' },
                    { id: 'CORPORATE', label: '🏢 Corporate' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setBookingSource(s.id as any)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-colors ${
                        bookingSource === s.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Stay Duration Presets (Termasuk Tahun Depan) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-muted-foreground">Pilihan Durasi Cepat (1-Klik):</label>
                  <span className="text-[11px] font-mono text-primary font-bold">{calculatedNights} Malam</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickPreset('TONIGHT')}
                    className="py-1 px-2 text-[11px] font-semibold rounded-md border border-border hover:bg-muted hover:border-primary/50 transition-colors text-center"
                  >
                    🌙 Malam Ini (1M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPreset('TOMORROW')}
                    className="py-1 px-2 text-[11px] font-semibold rounded-md border border-border hover:bg-muted hover:border-primary/50 transition-colors text-center"
                  >
                    ☀️ Besok (1M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPreset('WEEKEND')}
                    className="py-1 px-2 text-[11px] font-semibold rounded-md border border-border hover:bg-muted hover:border-primary/50 transition-colors text-center"
                  >
                    🏖️ Weekend (2M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPreset('NEXT_YEAR')}
                    className="py-1 px-2 text-[11px] font-semibold rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-primary text-center font-bold"
                    title="Contoh reservasi tahun depan: Jan 2027"
                  >
                    📅 Thn 2027 (3M)
                  </button>
                </div>
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Nama Tamu <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Contoh: Raden Surya"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-semibold focus:outline-hidden focus:border-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="0812xxxxxxx"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-mono focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Stay Dates (Bisa pilih tahun apapun: 2026, 2027, 2028, dst) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Check-In</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Check-Out</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Room Assignment & Rate Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted-foreground">Pilih Kamar Fisik</label>
                  <select
                    value={selectedRoomNumber}
                    onChange={(e) => setSelectedRoomNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs font-semibold"
                  >
                    {mockRooms.map((r) => (
                      <option key={r.number} value={r.number}>
                        Kamar {r.number} — {r.type} ({r.clean ? 'Siap' : 'Dirty'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground">Paket Kamar (Rate Plan)</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setRatePlan('RO')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        ratePlan === 'RO'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Room Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setRatePlan('BB')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        ratePlan === 'BB'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Breakfast (+130k)
                    </button>
                  </div>
                </div>
              </div>

              {/* Conflict Warning Banner if Room is Occupied */}
              {isRoomOccupied && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Kamar {selectedRoomNumber} Sudah Terisi!</div>
                    <div className="text-[11px] text-rose-600/90 dark:text-rose-400/90">
                      Kamar ini telah dibooking oleh tamu lain pada rentang tanggal {checkInDate} s/d {checkOutDate}. Silakan pilih kamar kosong lain untuk mencegah double-booking.
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Live Price Breakdown (Surakarta PBJT & Service Charge) */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tarif Kamar ({calculatedNights} Malam x {formatCurrency(basePricePerNight + bbAddonPerNight)}):</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Service Charge (10%):</span>
                  <span className="font-mono">+{formatCurrency(serviceCharge)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>PBJT Jasa Perhotelan Surakarta (10%):</span>
                  <span className="font-mono">+{formatCurrency(pbjtTax)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-foreground pt-1.5 border-t border-border text-xs">
                  <span>Total Tagihan (Nett):</span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Instant Check-In / Payment Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                <div>
                  <div className="font-bold text-foreground">Langsung Check-In Tamu (In-House)?</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isPaidDirect ? 'Status: IN_HOUSE (Tamu langsung masuk kamar)' : 'Status: CONFIRMED (Menunggu kedatangan)'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPaidDirect}
                    onChange={(e) => setIsPaidDirect(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 p-4 px-5 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRoomOccupied || !guestName.trim()}
                onClick={() => {
                  const newB: TapeChartBooking = {
                    id: `b-${Date.now()}`,
                    bookingNumber: `BK-${checkInDate.substring(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
                    source: bookingSource,
                    guestName: guestName.trim() || 'Tamu Walk-in',
                    phone: guestPhone,
                    roomNumber: selectedRoomNumber,
                    roomType: roomTypeName,
                    ratePlan: ratePlan === 'BB' ? 'Bed & Breakfast' : 'Room Only',
                    checkInDate,
                    checkOutDate,
                    status: isPaidDirect ? 'IN_HOUSE' : 'CONFIRMED',
                    totalAmount: grandTotal,
                  };
                  const updated = [...bookings, newB];
                  setBookings(updated);
                  saveStoredBookings(updated);

                  // Jika reservasi berada di luar tanggal yang sedang ditampilkan (misal tahun depan),
                  // otomatis arahkan Tape Chart ke tanggal reservasi tersebut!
                  if (checkInDate < dates[0].dayStr || checkInDate > dates[dates.length - 1].dayStr) {
                    setChartStartDate(checkInDate);
                  }

                  setNotification({
                    id: `notif-${Date.now()}`,
                    type: 'success',
                    title: 'Reservasi Baru Berhasil Disimpan!',
                    message: `Reservasi ${newB.bookingNumber} (${newB.guestName} - Kamar ${newB.roomNumber}) berhasil dibuat. Nota Pembayaran & Tanda Terima siap dicetak.`,
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
                  });
                  setCreateModalOpen(false);
                  setPrintedReceiptBooking(newB);
                }}
                className="px-5 py-2 bg-primary text-white rounded-lg font-bold shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan & Konfirmasi Reservasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt / Folio Modal for New or Past Bookings */}
      {printedReceiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Nota Pembayaran / Guest Folio Resmi
                </h3>
              </div>
              <button
                onClick={() => setPrintedReceiptBooking(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hotel Letterhead & Invoice Number */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
              <div className="flex justify-between items-start border-b border-border pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">Hotel Winotosastro AProject</h4>
                  <p className="text-[11px] text-muted-foreground">Jl. Brigjend Slamet Riyadi, Surakarta, Jawa Tengah</p>
                  <p className="text-[10px] text-muted-foreground font-mono">NPWPD: 33.72.01.284.910-001 (Bapenda Solo)</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                    {(printedReceiptBooking.balance ?? 0) === 0 ? 'LUNAS (PAID)' : 'DEPOSIT DITERIMA'}
                  </span>
                  <div className="font-mono font-bold text-xs mt-1 text-primary">
                    INV-{printedReceiptBooking.bookingNumber}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Sumber: {printedReceiptBooking.source}
                  </div>
                </div>
              </div>

              {/* Guest & Room Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tamu (Billed To)</span>
                  <div className="font-bold text-foreground">{printedReceiptBooking.guestName}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">{printedReceiptBooking.phone || '-'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Kamar & Durasi</span>
                  <div className="font-bold text-foreground">Kamar {printedReceiptBooking.roomNumber} ({printedReceiptBooking.roomType})</div>
                  <div className="text-muted-foreground text-[11px]">
                    {printedReceiptBooking.checkInDate} s/d {printedReceiptBooking.checkOutDate}
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-border pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sewa Kamar ({printedReceiptBooking.ratePlan}):</span>
                  <span className="font-mono text-foreground">{formatCurrency(printedReceiptBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Termasuk PBJT Hotel 10% & Service 10%:</span>
                  <span className="font-mono text-emerald-600 font-semibold">Tercakup Resmi</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-foreground">Total Tagihan:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(printedReceiptBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Status Saldo:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {(printedReceiptBooking.balance ?? 0) === 0 ? 'Rp 0 (Lunas 100%)' : `Sisa Tagihan: ${formatCurrency(printedReceiptBooking.balance!)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Nota / Unduh PDF
              </button>
              <button
                onClick={() => setPrintedReceiptBooking(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors text-foreground"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
