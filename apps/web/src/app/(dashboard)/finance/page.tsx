'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Printer,
  Check,
  Building,
  CreditCard,
  Layers,
  Sparkles,
  Receipt,
  Download,
  X,
  FileCheck,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { useAuth } from '../../../providers/auth-provider';
import { formatCurrency } from '../../../lib/utils';
import {
  OTASettlementTransaction,
  getStoredOTATransactions,
  saveStoredOTATransactions,
  settleOTATransaction,
  apiSettleOTATransactions,
  initialOTATransactions,
} from '../../../lib/finance-store';
import { getHotelSettings, HotelSettings } from '../../../lib/settings-store';

export default function FinanceOTASettlementPage() {
  const { t } = useI18n();
  const { dbSynced } = useAuth();

  // Transactions State
  const [transactions, setTransactions] = useState<OTASettlementTransaction[]>(initialOTATransactions);
  const [hotelSettings, setHotelSettings] = useState<HotelSettings>(getHotelSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters State
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Modal Detail Bukti Settle
  const [selectedProofTx, setSelectedProofTx] = useState<OTASettlementTransaction | null>(null);

  // Sync with Local Storage
  useEffect(() => {
    setTransactions(getStoredOTATransactions());
    setHotelSettings(getHotelSettings());

    const handleFinanceUpdate = () => setTransactions(getStoredOTATransactions());
    const handleSettingsUpdate = () => setHotelSettings(getHotelSettings());

    window.addEventListener('pms_finance_updated', handleFinanceUpdate);
    window.addEventListener('pms_settings_updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('pms_finance_updated', handleFinanceUpdate);
      window.removeEventListener('pms_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (channelFilter !== 'ALL' && tx.otaChannel !== channelFilter) return false;
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = tx.otaBookingCode.toLowerCase().includes(q);
        const matchGuest = tx.guestName.toLowerCase().includes(q);
        const matchRoom = tx.roomNumber.toLowerCase().includes(q);
        if (!matchCode && !matchGuest && !matchRoom) return false;
      }
      return true;
    });
  }, [transactions, channelFilter, statusFilter, searchQuery]);

  // Financial KPI Metrics
  const metrics = useMemo(() => {
    const totalGross = transactions.reduce((acc, tx) => acc + tx.grossAmount, 0);
    const pendingGross = transactions.filter((tx) => tx.status === 'PENDING').reduce((acc, tx) => acc + tx.grossAmount, 0);
    const pendingNet = transactions.filter((tx) => tx.status === 'PENDING').reduce((acc, tx) => acc + tx.netPayout, 0);
    const settledNet = transactions.filter((tx) => tx.status === 'SETTLED').reduce((acc, tx) => acc + tx.netPayout, 0);
    const pendingCount = transactions.filter((tx) => tx.status === 'PENDING').length;
    const settledCount = transactions.filter((tx) => tx.status === 'SETTLED').length;
    return { totalGross, pendingGross, pendingNet, settledNet, pendingCount, settledCount };
  }, [transactions]);

  // Single Settlement Action from Grid Button
  const handleSettleSingle = async (tx: OTASettlementTransaction) => {
    try {
      const apiUpdated = dbSynced ? await apiSettleOTATransactions([tx.id]) : null;
      const updated = apiUpdated || settleOTATransaction(tx.id);
      setTransactions(updated);
      triggerToast(
        `Settlement Berhasil! Transaksi ${tx.otaBookingCode} (${tx.otaChannel} - ${tx.guestName}) sebesar ${formatCurrency(tx.netPayout)} telah diselesaikan & terkreditkan.`
      );
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses settlement.');
    }
  };

  // Batch Settle for Selected Items
  const handleBatchSettle = async () => {
    if (selectedTxIds.length === 0) return;
    const count = selectedTxIds.length;
    try {
      const batchRef = `BATCH-SETTLE-${Math.floor(100000 + Math.random() * 900000)}`;
      const apiUpdated = dbSynced ? await apiSettleOTATransactions(selectedTxIds, batchRef) : null;
      if (apiUpdated) {
        setTransactions(apiUpdated);
      } else {
        const current = getStoredOTATransactions();
        const dateStr = new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB';

        const updated = current.map((tx) =>
          selectedTxIds.includes(tx.id)
            ? {
              ...tx,
              status: 'SETTLED' as const,
              settledAt: dateStr,
              settlementReference: batchRef,
            }
            : tx
        );

        saveStoredOTATransactions(updated);
        setTransactions(updated);
      }
      setSelectedTxIds([]);
      triggerToast(`Berhasil menyelesaikan ${count} transaksi OTA sekaligus!`);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses batch settlement.');
    }
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingFiltered = filteredTransactions.filter((tx) => tx.status === 'PENDING');
    if (selectedTxIds.length === pendingFiltered.length && pendingFiltered.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(pendingFiltered.map((tx) => tx.id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 bg-foreground text-background rounded-2xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-background/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Finance & Settlement OTA
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Penyelesaian dan rekonsiliasi dana transaksi pemesanan dari Online Travel Agents (Agoda, Traveloka, Booking.com, Tiket.com).
          </p>
        </div>

        {/* Batch Settle Action */}
        {selectedTxIds.length > 0 && (
          <button
            onClick={handleBatchSettle}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4" />
            Settle {selectedTxIds.length} Transaksi Terpilih
          </button>
        )}
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Volume Transaksi OTA</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">
            {formatCurrency(metrics.totalGross)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {transactions.length} reservasi OTA tercatat
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Menunggu Settlement (Pending)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">
            {formatCurrency(metrics.pendingNet)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.pendingCount} transaksi siap diselesaikan
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Sudah Selesai (Settled)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatCurrency(metrics.settledNet)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.settledCount} transaksi terkreditkan ke kas/bank
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Metode Payout Terbesar</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-foreground truncate">
            Virtual Credit Card (VCC)
          </div>
          <div className="text-[11px] text-muted-foreground">
            Agoda, Booking.com & Expedia auto-settle
          </div>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-4">
        {/* Toolbar: Filters & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter OTA Channel */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 bg-muted/50 border border-border rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">Semua Channel OTA</option>
              <option value="Agoda">Agoda</option>
              <option value="Booking.com">Booking.com</option>
              <option value="Traveloka">Traveloka</option>
              <option value="Tiket.com">Tiket.com</option>
              <option value="Expedia">Expedia</option>
            </select>

            {/* Filter Status */}
            <div className="flex items-center p-1 bg-muted/60 border border-border rounded-xl">
              {[
                { id: 'ALL', label: 'Semua Status' },
                { id: 'PENDING', label: `Menunggu (${metrics.pendingCount})` },
                { id: 'SETTLED', label: `Selesai (${metrics.settledCount})` },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1 font-bold rounded-lg transition-all ${statusFilter === st.id
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari kode booking OTA, tamu, kamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-muted/40 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-border">
            <thead className="bg-muted/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 w-8 text-center">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      selectedTxIds.length > 0 &&
                      selectedTxIds.length === filteredTransactions.filter((tx) => tx.status === 'PENDING').length
                    }
                    className="w-3.5 h-3.5 rounded text-primary cursor-pointer"
                    title="Pilih semua yang pending"
                  />
                </th>
                <th className="p-3">Channel & No. Booking OTA</th>
                <th className="p-3">Tamu & Kamar</th>
                <th className="p-3">Periode Inap</th>
                <th className="p-3 text-right">Nilai Gross</th>
                <th className="p-3 text-right">Komisi OTA</th>
                <th className="p-3 text-right">Net Payout Hotel</th>
                <th className="p-3">Metode Payout</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center font-bold">Aksi Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Tidak ada transaksi OTA yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPending = tx.status === 'PENDING';
                  const isSelected = selectedTxIds.includes(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTx(tx.id)}
                            className="w-3.5 h-3.5 rounded text-primary cursor-pointer"
                          />
                        ) : (
                          <span className="text-muted-foreground text-[10px]">✓</span>
                        )}
                      </td>

                      {/* Channel & No. Booking */}
                      <td className="p-3 font-medium">
                        <div className="font-mono font-bold text-foreground">{tx.otaBookingCode}</div>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${tx.otaChannel === 'Agoda'
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : tx.otaChannel === 'Traveloka'
                              ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                              : tx.otaChannel === 'Booking.com'
                                ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                          {tx.otaChannel}
                        </span>
                      </td>

                      {/* Tamu & Kamar */}
                      <td className="p-3">
                        <div className="font-bold text-foreground text-sm">{tx.guestName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Kamar {tx.roomNumber} ({tx.roomType})
                        </div>
                      </td>

                      {/* Periode Inap */}
                      <td className="p-3">
                        <div className="text-foreground">{tx.checkInDate} s/d {tx.checkOutDate}</div>
                      </td>

                      {/* Nilai Gross */}
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(tx.grossAmount)}
                      </td>

                      {/* Komisi OTA */}
                      <td className="p-3 text-right">
                        <div className="font-mono text-destructive">
                          -{formatCurrency(tx.commissionAmount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">({tx.commissionPercent}%)</div>
                      </td>

                      {/* Net Payout Hotel */}
                      <td className="p-3 text-right">
                        <div className="font-mono font-extrabold text-emerald-600 text-sm">
                          {formatCurrency(tx.netPayout)}
                        </div>
                      </td>

                      {/* Metode Payout */}
                      <td className="p-3 text-muted-foreground text-[11px]">
                        <span className="font-medium text-foreground">{tx.payoutMethod}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            PENDING
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              SETTLED
                            </span>
                            {tx.settledAt && (
                              <div className="text-[9px] text-muted-foreground font-mono">{tx.settledAt}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* ACTION BUTTON IN GRID (Tombol dalam grid supaya simpel) */}
                      <td className="p-3 text-center">
                        {isPending ? (
                          <button
                            onClick={() => handleSettleSingle(tx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                            title="Proses settle dan konfirmasi pencairan dana dari OTA"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Settle Transaksi
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedProofTx(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs border border-border transition-colors"
                            title="Lihat Bukti Settlement & Rekonsiliasi"
                          >
                            <Receipt className="w-3 h-3 text-primary" />
                            Bukti Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BUKTI SETTLEMENT & REKONSILIASI                                    */}
      {/* ========================================================================= */}
      {selectedProofTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Bukti Settlement Transaksi OTA
                </h3>
              </div>
              <button
                onClick={() => setSelectedProofTx(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Letterhead with Hotel Logo */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
              <div className="flex justify-between items-start border-b border-border pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    {hotelSettings.hotelName || 'Hotel Winotosastro AProject'}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">Finance & Revenue Reconciliation</p>
                </div>
                {hotelSettings.logoUrl && (
                  <img
                    src={hotelSettings.logoUrl}
                    alt="Logo"
                    className="h-8 w-auto max-w-[100px] object-contain bg-white p-0.5 rounded border border-border/40"
                  />
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saluran OTA:</span>
                  <span className="font-bold text-primary">{selectedProofTx.otaChannel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kode Booking OTA:</span>
                  <span className="font-mono font-bold text-foreground">{selectedProofTx.otaBookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nama Tamu & Kamar:</span>
                  <span className="font-bold text-foreground">
                    {selectedProofTx.guestName} (Kmr {selectedProofTx.roomNumber})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode Settlement:</span>
                  <span className="text-foreground">{selectedProofTx.payoutMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu Penyelesaian:</span>
                  <span className="font-mono text-foreground">{selectedProofTx.settledAt || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Referensi Bank/VCC:</span>
                  <span className="font-mono text-foreground font-bold">{selectedProofTx.settlementReference || '-'}</span>
                </div>
              </div>

              <div className="border-t border-border pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Nilai Booking OTA:</span>
                  <span className="font-mono">{formatCurrency(selectedProofTx.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Potongan Komisi OTA ({selectedProofTx.commissionPercent}%):</span>
                  <span className="font-mono">-{formatCurrency(selectedProofTx.commissionAmount)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between font-bold text-sm">
                  <span className="text-foreground">Net Dana Terkreditkan:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(selectedProofTx.netPayout)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-primary text-white font-bold rounded-xl shadow-xs hover:bg-primary/90 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Bukti Settle
              </button>
              <button
                onClick={() => setSelectedProofTx(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold transition-colors"
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
