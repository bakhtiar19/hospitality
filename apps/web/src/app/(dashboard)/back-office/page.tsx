'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  FileText,
  DollarSign,
  Download,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  Search,
  ArrowRight,
  Filter,
  Eye,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';
import {
  TapeChartBooking,
  getStoredBookings,
  initialBookings,
} from '../../../lib/bookings-store';

export default function BackOfficePage() {
  const { t } = useI18n();

  // Load Bookings from Shared PMS Store
  const [bookings, setBookings] = useState<TapeChartBooking[]>(initialBookings);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_OUT' | 'IN_HOUSE' | 'CONFIRMED'>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<TapeChartBooking>(initialBookings[0]);
  const [activeTab, setActiveTab] = useState<'preview' | 'archive'>('archive');

  useEffect(() => {
    const list = getStoredBookings();
    setBookings(list);
    if (list.length > 0) {
      // Prioritize checked out or latest booking
      const checkedOut = list.find((b) => b.status === 'CHECKED_OUT') || list[0];
      setSelectedBooking(checkedOut);
    }
    const handler = () => {
      const updated = getStoredBookings();
      setBookings(updated);
    };
    window.addEventListener('pms_bookings_updated', handler);
    return () => window.removeEventListener('pms_bookings_updated', handler);
  }, []);

  // Filter Bookings for Past Invoices Archive
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.guestName.toLowerCase().includes(q);
        const matchNumber = b.bookingNumber.toLowerCase().includes(q);
        const matchRoom = b.roomNumber.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchRoom) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  // Export CSV of All Past Invoices for Bapenda Surakarta
  const handleExportTaxCSV = () => {
    const headers = [
      'No. Invoice',
      'No. Booking',
      'Nama Tamu',
      'Kamar',
      'Tipe Kamar',
      'Check-In',
      'Check-Out',
      'Total DPP (Rp)',
      'Service Charge 10% (Rp)',
      'PBJT Pajak Hotel 10% (Rp)',
      'Grand Total (Rp)',
      'Status Pelunasan',
    ];

    const rows = bookings.map((b) => {
      const grandTotal = b.totalAmount;
      const baseNet = Math.round(grandTotal / 1.21);
      const service = Math.round(baseNet * 0.1);
      const pbjt = Math.round(baseNet * 0.1);
      return [
        `INV-${b.bookingNumber}`,
        b.bookingNumber,
        `"${b.guestName}"`,
        b.roomNumber,
        `"${b.roomType}"`,
        b.checkInDate,
        b.checkOutDate,
        baseNet,
        service,
        pbjt,
        grandTotal,
        (b.balance ?? 0) === 0 ? 'LUNAS (PAID)' : 'BELUM LUNAS',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Pajak_PBJT_Hotel_Winotosastro_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for Selected Folio Invoice
  const totalAmount = selectedBooking?.totalAmount || 0;
  const taxableBase = Math.round(totalAmount / 1.21); // Net before 10% Service + 10% PBJT
  const serviceCharge = Math.round(taxableBase * 0.1);
  const pbjtTax = Math.round(taxableBase * 0.1);
  const balanceDue = selectedBooking?.balance ?? 0;
  const isPaid = balanceDue === 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Back Office & Arsip Tagihan
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Finance & Past Invoices
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Pencarian & penerbitan ulang nota masa lalu, faktur pajak resmi PBJT Surakarta, dan rekapitulasi pembukuan hotel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTaxCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-card border border-border hover:bg-muted text-foreground shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Ekspor Rekap Pajak Bapenda (CSV)
          </button>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'archive'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Daftar Arsip Nota & Kwitansi Masa Lalu ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'preview'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Pratinjau Faktur Resmi: INV-{selectedBooking?.bookingNumber}
        </button>
      </div>

      {/* TAB 1: ARSIP SELURUH NOTA MASA LALU */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama tamu, no. invoice, atau no. kamar..."
                className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
              >
                <option value="ALL">Semua Nota Transaksi</option>
                <option value="CHECKED_OUT">Selesai Check-Out (Arsip Lampau)</option>
                <option value="IN_HOUSE">Tamu Menginap (In-House)</option>
                <option value="CONFIRMED">Terkonfirmasi (Prepaid / DP)</option>
              </select>
            </div>
          </div>

          {/* Past Invoices Table */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              {filteredBookings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Tidak ada nota yang sesuai dengan pencarian.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                    <tr>
                      <th className="px-4 py-3">No. Faktur / Invoice</th>
                      <th className="px-4 py-3">Nama Tamu</th>
                      <th className="px-4 py-3">Kamar</th>
                      <th className="px-4 py-3">Periode Menginap</th>
                      <th className="px-4 py-3">Sumber</th>
                      <th className="px-4 py-3">Total Tagihan</th>
                      <th className="px-4 py-3">Status Saldo</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredBookings.map((b) => {
                      const isZero = (b.balance ?? 0) === 0;
                      const isSelected = selectedBooking?.id === b.id;

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                            INV-{b.bookingNumber}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-foreground block">{b.guestName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{b.phone || '-'}</span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                            Kamar {b.roomNumber} ({b.roomType})
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground font-mono">
                            {b.checkInDate} s/d {b.checkOutDate}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.source === 'AGODA'
                                  ? 'bg-orange-500/10 text-orange-600'
                                  : b.source === 'WALK_IN'
                                  ? 'bg-teal-500/10 text-teal-600'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {b.source}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                            {formatCurrency(b.totalAmount)}
                          </td>
                          <td className="px-4 py-3.5">
                            {isZero ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                LUNAS (Rp 0)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                Sisa {formatCurrency(b.balance!)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedBooking(b);
                                setActiveTab('preview');
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-card border border-border hover:bg-muted text-foreground flex items-center gap-1.5 ml-auto shadow-2xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              Lihat & Cetak Nota
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRATINJAU & CETAK FAKTUR RESMI TERPILIH */}
      {activeTab === 'preview' && selectedBooking && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab('archive')}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              ← Kembali ke Daftar Seluruh Nota
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white shadow-xs hover:bg-primary/90 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / Simpan PDF Nota Ini
              </button>
            </div>
          </div>

          {/* Official Printable Folio Invoice */}
          <div className="p-8 bg-card border border-border rounded-2xl shadow-sm max-w-3xl mx-auto space-y-6">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-border pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white font-black flex items-center justify-center text-sm">
                    W
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                    Hotel Winotosastro AProject
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jl. Brigjend Slamet Riyadi No. 250, Surakarta (Solo), Jawa Tengah 57141
                </p>
                <p className="text-xs text-muted-foreground">
                  NPWPD: 33.72.01.284.910-001 (Bapenda Kota Surakarta) • Telp: (0271) 714-889
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-extrabold text-base text-primary">
                  INV-{selectedBooking.bookingNumber}
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  Tanggal Terbit: {selectedBooking.checkOutDate}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold ${
                  isPaid ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600'
                }`}>
                  {isPaid ? 'PAID IN FULL (LUNAS)' : `OUTSTANDING (${formatCurrency(balanceDue)})`}
                </span>
              </div>
            </div>

            {/* Guest & Stay Details */}
            <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-muted/20 border border-border rounded-xl">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">
                  Identitas Tamu (Billed To):
                </span>
                <div className="font-bold text-sm text-foreground mt-0.5">{selectedBooking.guestName}</div>
                <div className="text-muted-foreground font-mono">
                  {selectedBooking.idNumber ? `KTP: ${selectedBooking.idNumber}` : 'Identitas: Terverifikasi'}
                </div>
                <div className="text-muted-foreground font-mono">{selectedBooking.phone || '+62 812-xxxx-xxxx'}</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">
                  Detail Reservasi & Kamar:
                </span>
                <div className="font-bold text-sm text-foreground mt-0.5">
                  Kamar {selectedBooking.roomNumber} ({selectedBooking.roomType})
                </div>
                <div className="text-muted-foreground">
                  Menginap: {selectedBooking.checkInDate} s/d {selectedBooking.checkOutDate}
                </div>
                <div className="text-muted-foreground">Paket: {selectedBooking.ratePlan} ({selectedBooking.source})</div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div className="border border-border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Deskripsi Transaksi</th>
                    <th className="px-4 py-2.5">Kategori</th>
                    <th className="px-4 py-2.5 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  <tr>
                    <td className="px-4 py-2.5 text-foreground">
                      Sewa Kamar {selectedBooking.roomType} (Periode {selectedBooking.checkInDate} s/d {selectedBooking.checkOutDate})
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">ROOM</td>
                    <td className="px-4 py-2.5 font-mono text-right font-medium text-foreground">
                      {formatCurrency(taxableBase)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Itemized Tax Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-80 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Dasar Pengenaan Pajak (DPP Net):</span>
                  <span className="font-mono font-medium text-foreground">{formatCurrency(taxableBase)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                  <span>Biaya Layanan Hotel (Service 10%):</span>
                  <span className="font-mono font-medium">+{formatCurrency(serviceCharge)}</span>
                </div>
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span>PBJT Jasa Perhotelan Solo (10%):</span>
                  <span className="font-mono font-medium">+{formatCurrency(pbjtTax)}</span>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-extrabold text-foreground">
                  <span>Total Tagihan Resmi:</span>
                  <span className="font-mono text-primary text-base">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 font-bold pt-1">
                  <span>Pembayaran Diterima:</span>
                  <span className="font-mono">
                    -{formatCurrency(totalAmount - balanceDue)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold text-muted-foreground pt-1 border-t border-border">
                  <span>Sisa Saldo (Balance Due):</span>
                  <span className="font-mono text-emerald-600 font-extrabold">
                    {isPaid ? 'Rp 0 (LUNAS)' : formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
              <span className="italic">
                Faktur pajak sah sesuai UU HKPD No. 1/2022 Badan Pendapatan Daerah (Bapenda) Kota Surakarta.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Faktur Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
