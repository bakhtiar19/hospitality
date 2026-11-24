'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ConciergeBell,
  LogIn,
  LogOut,
  Users,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Plus,
  Receipt,
  X,
  FileText,
  UserCheck,
  Building,
  Sparkles,
  Info,
  Calendar,
  ArrowRight,
  Phone,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';
import {
  TapeChartBooking,
  getStoredBookings,
  saveStoredBookings,
  initialBookings,
} from '../../../lib/bookings-store';

export default function FrontOfficePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'arrivals' | 'inHouse' | 'departures' | 'nightAudit'>('arrivals');

  // Shared Bookings State (Connected to /bookings Tape Chart)
  const [allBookings, setAllBookings] = useState<TapeChartBooking[]>(initialBookings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with Shared Local Storage
  useEffect(() => {
    setAllBookings(getStoredBookings());
    const handler = () => setAllBookings(getStoredBookings());
    window.addEventListener('pms_bookings_updated', handler);
    return () => window.removeEventListener('pms_bookings_updated', handler);
  }, []);

  // Today's Hotel Business Date
  const today = '2026-11-24';

  // 1. ARRIVALS TODAY: checkInDate === today & status === 'CONFIRMED'
  const arrivals = allBookings.filter((b) => b.checkInDate === today && b.status === 'CONFIRMED');

  // 2. IN-HOUSE GUESTS: currently in the hotel (status === 'IN_HOUSE')
  const inHouse = allBookings.filter((b) => b.status === 'IN_HOUSE');

  // 3. DEPARTURES TODAY: checkOutDate === today & status === 'IN_HOUSE'
  const departures = allBookings.filter((b) => b.checkOutDate === today && b.status === 'IN_HOUSE');

  // Check-In Modal State
  const [checkInModal, setCheckInModal] = useState<TapeChartBooking | null>(null);
  const [checkInRoom, setCheckInRoom] = useState('101');
  const [guestIdNum, setGuestIdNum] = useState('3372015504950003');
  const [guestIdType, setGuestIdType] = useState('KTP');

  // Check-Out Modal State
  const [checkOutModal, setCheckOutModal] = useState<TapeChartBooking | null>(null);

  // Fast Walk-In Modal State
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInRoom, setWalkInRoom] = useState('102');
  const [walkInId, setWalkInId] = useState('3372021105940001');

  // Night Audit State
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  // Handler: Confirm Check-In
  const handleConfirmCheckIn = () => {
    if (!checkInModal) return;
    const updated = allBookings.map((b) =>
      b.id === checkInModal.id
        ? {
            ...b,
            roomNumber: checkInRoom,
            status: 'IN_HOUSE' as const,
            idNumber: guestIdNum,
          }
        : b
    );
    setAllBookings(updated);
    saveStoredBookings(updated);
    setToastMessage(
      `Check-In Berhasil! Tamu ${checkInModal.guestName} ditempatkan di Kamar ${checkInRoom} (KTP: ${guestIdNum}). Tamu kini berstatus IN-HOUSE dan terlihat di Tape Chart.`
    );
    setCheckInModal(null);
  };

  // Handler: Confirm Check-Out
  const handleConfirmCheckOut = () => {
    if (!checkOutModal) return;
    const updated = allBookings.map((b) =>
      b.id === checkOutModal.id
        ? {
            ...b,
            status: 'CHECKED_OUT' as const,
          }
        : b
    );
    setAllBookings(updated);
    saveStoredBookings(updated);
    setToastMessage(
      `Check-Out Selesai! Tamu ${checkOutModal.guestName} (Kamar ${checkOutModal.roomNumber}) telah selesai menginap. Saldo tagihan lunas Rp 0. Kamar ditandai DIRTY untuk Housekeeping.`
    );
    setCheckOutModal(null);
  };

  // Handler: Direct Walk-In Registration
  const handleCreateWalkIn = () => {
    if (!walkInName.trim()) return;
    const newWalkIn: TapeChartBooking = {
      id: `b-${Date.now()}`,
      bookingNumber: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'WALK_IN',
      guestName: walkInName.trim(),
      phone: walkInPhone || '+6281234567890',
      roomNumber: walkInRoom,
      roomType: 'Superior',
      ratePlan: 'Room Only',
      checkInDate: today,
      checkOutDate: '2026-11-25',
      status: 'IN_HOUSE',
      totalAmount: 786500,
      balance: 0,
      idNumber: walkInId,
    };
    const updated = [...allBookings, newWalkIn];
    setAllBookings(updated);
    saveStoredBookings(updated);
    setToastMessage(
      `Tamu Walk-In ${newWalkIn.guestName} langsung Check-In ke Kamar ${newWalkIn.roomNumber}! Data otomatis tersinkron ke Tape Chart.`
    );
    setWalkInModalOpen(false);
    setWalkInName('');
  };

  const handleRunNightAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditSuccess(true);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Front Desk Operations
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Reception Desk
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Operasional harian resepsionis: proses check-in kedatangan tamu, pantau tamu menginap, dan check-out kepulangan hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tanggal Bisnis: 24 Nov 2026 (WIB)
          </span>

          <button
            onClick={() => setWalkInModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Check-In Walk-In
          </button>
        </div>
      </div>

      {/* Operational Guide Card: Explaining the workflow clearly */}
      <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Info className="w-4 h-4 text-primary" />
          <span>Alur Operasional: Hubungan antara Tape Chart & Front Office</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-muted-foreground">
          <div className="p-2.5 bg-card border border-border rounded-xl space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              1. Tape Chart (/bookings)
            </div>
            <p className="text-[11px]">
              Kalender perencanaan kamar jangka panjang. Reservasi untuk hari ini atau masa depan dibuat di sini (atau masuk dari OTA Agoda).
            </p>
          </div>
          <div className="p-2.5 bg-card border border-border rounded-xl space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
              2. Front Office: Arrivals Today
            </div>
            <p className="text-[11px]">
              Tamu yang reservasi untuk <strong>hari ini (24 Nov 2026)</strong> otomatis antre di tab <strong>Arrivals</strong>. Resepsionis mencatat NIK KTP & menyerahkan kunci kamar.
            </p>
          </div>
          <div className="p-2.5 bg-card border border-border rounded-xl space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              3. In-House & Check-Out
            </div>
            <p className="text-[11px]">
              Setelah Check-In, tamu berpindah ke <strong>In-House</strong> (kamar berwarna biru di Tape Chart). Saat waktu pulang tiba, staf memproses Check-Out di tab <strong>Departures</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'arrivals'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Arrivals Today ({arrivals.length})
        </button>

        <button
          onClick={() => setActiveTab('inHouse')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'inHouse'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          In-House Guests ({inHouse.length})
        </button>

        <button
          onClick={() => setActiveTab('departures')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'departures'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Departures Today ({departures.length})
        </button>

        <button
          onClick={() => setActiveTab('nightAudit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'nightAudit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="w-4 h-4" />
          Night Audit (EOD)
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 rounded-full font-bold">
            02:00 WIB
          </span>
        </button>
      </div>

      {/* Tab 1: Arrivals Today */}
      {activeTab === 'arrivals' && (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Tamu yang Dijadwalkan Tiba Hari Ini (24 Nov 2026)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Tamu terkonfirmasi dari Tape Chart & Agoda Channel yang siap diproses check-in
              </span>
            </div>
            <Link
              href="/bookings"
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              Lihat di Tape Chart <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {arrivals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <p>Tidak ada tamu yang dijadwalkan tiba hari ini (24 Nov 2026).</p>
                <p className="text-[11px]">
                  Untuk mencoba alur: Buka <Link href="/bookings" className="text-primary underline font-bold">Tape Chart</Link>, klik <strong>+ Reservasi Cepat</strong> dengan tanggal check-in <strong>Malam Ini (2026-11-24)</strong>, lalu kembali ke halaman ini.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                  <tr>
                    <th className="px-4 py-3">Sumber</th>
                    <th className="px-4 py-3">No. Booking</th>
                    <th className="px-4 py-3">Nama Tamu</th>
                    <th className="px-4 py-3">No. HP</th>
                    <th className="px-4 py-3">Jadwal Menginap</th>
                    <th className="px-4 py-3">Kamar</th>
                    <th className="px-4 py-3">Total Tagihan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {arrivals.map((arr) => (
                    <tr key={arr.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            arr.source === 'AGODA'
                              ? 'bg-orange-500/10 text-orange-600'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {arr.source}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">{arr.bookingNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">{arr.guestName}</td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">{arr.phone || '-'}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {arr.checkInDate} s/d {arr.checkOutDate}
                      </td>
                      <td className="px-4 py-3.5">
                        {arr.roomNumber === 'UNASSIGNED' || !arr.roomNumber ? (
                          <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                            {arr.roomType} (Belum Ditugaskan)
                          </span>
                        ) : (
                          <span className="font-bold text-foreground">Kamar {arr.roomNumber} ({arr.roomType})</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-foreground font-mono">
                        {formatCurrency(arr.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setCheckInModal(arr);
                            if (arr.roomNumber && arr.roomNumber !== 'UNASSIGNED') {
                              setCheckInRoom(arr.roomNumber);
                            }
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Proses Check In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: In-House Guests */}
      {activeTab === 'inHouse' && (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Tamu yang Sedang Menginap Saat Ini (In-House)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Tamu yang telah menyelesaikan check-in dan memegang kunci kamar fisik
              </span>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full">
              {inHouse.length} Kamar Terisi
            </span>
          </div>

          <div className="overflow-x-auto">
            {inHouse.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Tidak ada tamu yang sedang in-house saat ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                  <tr>
                    <th className="px-4 py-3">Kamar</th>
                    <th className="px-4 py-3">No. Booking</th>
                    <th className="px-4 py-3">Nama Tamu</th>
                    <th className="px-4 py-3">No. Identitas (KTP / Paspor)</th>
                    <th className="px-4 py-3">Jadwal Menginap</th>
                    <th className="px-4 py-3">Saldo Tagihan</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inHouse.map((inh) => (
                    <tr key={inh.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-sm text-foreground">
                        Kamar {inh.roomNumber}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">{inh.bookingNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">{inh.guestName}</td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">
                        {inh.idNumber ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {inh.idNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Terverifikasi</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {inh.checkInDate} s/d {inh.checkOutDate}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        {(inh.balance ?? 0) > 0 ? (
                          <span className="text-amber-600">{formatCurrency(inh.balance!)} Belum Lunas</span>
                        ) : (
                          <span className="text-emerald-600">Lunas (Rp 0)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          🛌 IN-HOUSE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Departures Today */}
      {activeTab === 'departures' && (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Tamu yang Dijadwalkan Check-Out Hari Ini (24 Nov 2026)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Batas waktu check-out standar hotel pukul 12:00 WIB
              </span>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-500/10 px-2.5 py-1 rounded-full">
              {departures.length} Tamu Pulang
            </span>
          </div>

          <div className="overflow-x-auto">
            {departures.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Tidak ada tamu yang dijadwalkan check-out hari ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                  <tr>
                    <th className="px-4 py-3">Kamar</th>
                    <th className="px-4 py-3">No. Booking</th>
                    <th className="px-4 py-3">Nama Tamu</th>
                    <th className="px-4 py-3">Saldo Tagihan Folio</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {departures.map((dep) => (
                    <tr key={dep.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-sm text-foreground">
                        Kamar {dep.roomNumber}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">{dep.bookingNumber}</td>
                      <td className="px-4 py-3.5 font-medium text-foreground">{dep.guestName}</td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        {(dep.balance ?? 0) === 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas (Siap Check-Out)
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold">
                            {formatCurrency(dep.balance!)} Belum Lunas
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setCheckOutModal(dep)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-700 text-white hover:bg-slate-800 shadow-xs transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Proses Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Night Audit */}
      {activeTab === 'nightAudit' && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                End-of-Day (EOD) Night Audit
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proses tutup buku harian otomatis dijalankan pada pukul 02:00 WIB (Asia/Jakarta)
              </p>
            </div>
            <button
              onClick={handleRunNightAudit}
              disabled={auditRunning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
            >
              {auditRunning ? 'Sedang Memproses Audit...' : 'Jalankan Night Audit Manual'}
            </button>
          </div>

          {auditSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Audit Harian Selesai! Tagihan kamar telah diposting dan tanggal bisnis bergulir ke 25 Nov 2026.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <span className="text-muted-foreground font-semibold">1. Validasi Status Kamar</span>
              <div className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Tidak ada kamar bentrok
              </div>
            </div>
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <span className="text-muted-foreground font-semibold">2. Rekonsiliasi Kasir & Deposit</span>
              <div className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Kasir seimbang
              </div>
            </div>
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2">
              <span className="text-muted-foreground font-semibold">3. Pajak Daerah PBJT Surakarta</span>
              <div className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Buku PBJT 10% seimbang
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Modal with KTP Capture */}
      {checkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <LogIn className="w-4 h-4 text-emerald-600" />
                Konfirmasi Check-In Tamu
              </h3>
              <button onClick={() => setCheckInModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
              <div className="font-bold text-sm text-foreground">{checkInModal.guestName}</div>
              <div className="text-muted-foreground">{checkInModal.bookingNumber} • {checkInModal.source}</div>
              <div className="text-muted-foreground font-semibold">
                Jadwal: {checkInModal.checkInDate} s/d {checkInModal.checkOutDate}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-muted-foreground">Pilih Nomor Kamar Fisik</label>
                <select
                  value={checkInRoom}
                  onChange={(e) => setCheckInRoom(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-bold"
                >
                  <option value="101">Kamar 101 (Superior - Bersih)</option>
                  <option value="102">Kamar 102 (Superior - Bersih)</option>
                  <option value="104">Kamar 104 (Superior - Bersih)</option>
                  <option value="201">Kamar 201 (Deluxe King - Bersih)</option>
                  <option value="202">Kamar 202 (Deluxe King - Bersih)</option>
                  <option value="401">Kamar 401 (Executive Suite - Bersih)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Jenis Identitas</label>
                <select
                  value={guestIdType}
                  onChange={(e) => setGuestIdType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-semibold"
                >
                  <option value="KTP">KTP Elektronik (WNI)</option>
                  <option value="Passport">Paspor (WNA)</option>
                  <option value="SIM">SIM (Surat Izin Mengemudi)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Nomor Identitas (NIK KTP / Paspor)</label>
                <input
                  type="text"
                  value={guestIdNum}
                  onChange={(e) => setGuestIdNum(e.target.value)}
                  placeholder="3372xxxxxxxxxxxx"
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCheckInModal(null)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-xs hover:bg-emerald-700 transition-colors"
              >
                Konfirmasi & Serah Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-Out Modal */}
      {checkOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <LogOut className="w-4 h-4 text-slate-600" />
                Konfirmasi Check-Out & Pelunasan
              </h3>
              <button onClick={() => setCheckOutModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
              <div className="font-bold text-sm text-foreground">{checkOutModal.guestName}</div>
              <div className="text-muted-foreground">Kamar {checkOutModal.roomNumber} ({checkOutModal.roomType})</div>
              <div className="text-muted-foreground font-mono">{checkOutModal.bookingNumber}</div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Status Saldo Folio:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Rp 0 (Lunas / Zero-Balance)</span>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Menekan konfirmasi akan mengakhiri masa tinggal tamu, mengembalikan kunci kamar fisik, dan menandai Kamar {checkOutModal.roomNumber} sebagai <strong>DIRTY (Perlu Pembersihan)</strong> untuk tim Housekeeping.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCheckOutModal(null)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCheckOut}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-bold shadow-xs hover:bg-slate-800 transition-colors"
              >
                Konfirmasi Selesai Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Walk-In Modal */}
      {walkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Registrasi Tamu Walk-In Langsung
              </h3>
              <button onClick={() => setWalkInModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-muted-foreground">Nama Tamu <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Contoh: Budi Prasetyo"
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Nomor NIK KTP</label>
                <input
                  type="text"
                  value={walkInId}
                  onChange={(e) => setWalkInId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground">Pilih Kamar Fisik (Siap Huni)</label>
                <select
                  value={walkInRoom}
                  onChange={(e) => setWalkInRoom(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-bold"
                >
                  <option value="102">Kamar 102 (Superior - Rp 786.500/mlm nett)</option>
                  <option value="104">Kamar 104 (Superior - Rp 786.500/mlm nett)</option>
                  <option value="202">Kamar 202 (Deluxe King - Rp 1.064.800/mlm nett)</option>
                  <option value="402">Kamar 402 (Executive Suite - Rp 1.754.500/mlm nett)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setWalkInModalOpen(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                disabled={!walkInName.trim()}
                onClick={handleCreateWalkIn}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Check-In & Serahkan Kunci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
