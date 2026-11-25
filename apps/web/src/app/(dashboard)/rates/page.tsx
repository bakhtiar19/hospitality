'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Plus,
  CheckCircle2,
  RefreshCw,
  Save,
  BedDouble,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';
import { formatCurrency, formatThousands, parseThousands } from '../../../lib/utils';

interface RateRoomType {
  id: string;
  code: string;
  name: string;
  totalRooms: number;
}

interface RatePlanItem {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface RatePriceCell {
  roomTypeId: string;
  ratePlanId: string;
  basePrice: number;
}

export default function RatesMatrixPage() {
  const { dbSynced, refreshBootstrap } = useAuth();
  const [roomTypes, setRoomTypes] = useState<RateRoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlanItem[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New rate plan form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const cellKey = (rtId: string, rpId: string) => `${rtId}::${rpId}`;

  const loadMatrix = async () => {
    if (!dbSynced) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{
        roomTypes: RateRoomType[];
        ratePlans: RatePlanItem[];
        prices: RatePriceCell[];
      }>('/pms/rates');
      setRoomTypes(data.roomTypes || []);
      setRatePlans(data.ratePlans || []);
      const map: Record<string, number> = {};
      (data.prices || []).forEach((p) => {
        map[cellKey(p.roomTypeId, p.ratePlanId)] = p.basePrice;
      });
      setPrices(map);
    } catch (err) {
      console.error('Failed to load rates matrix', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [dbSynced]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSaveCell = async (rtId: string, rpId: string) => {
    const val = prices[cellKey(rtId, rpId)] || 650000;
    try {
      await apiRequest('/pms/rates/price', {
        method: 'PUT',
        body: JSON.stringify({ roomTypeId: rtId, ratePlanId: rpId, basePrice: val }),
      });
      await refreshBootstrap();
      showToast(`Tarif kamar (${formatCurrency(val)}) berhasil disimpan ke PostgreSQL!`);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan tarif.');
    }
  };

  const handleCreateRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    try {
      await apiRequest('/pms/rates/plans', {
        method: 'POST',
        body: JSON.stringify({ code: newCode, name: newName, description: newDesc }),
      });
      setNewCode('');
      setNewName('');
      setNewDesc('');
      await loadMatrix();
      showToast('Rate plan baru berhasil ditambahkan!');
    } catch (err: any) {
      alert(err?.message || 'Gagal membuat rate plan.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 bg-foreground text-background rounded-2xl shadow-2xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Matriks Tarif Kamar & Rate Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur harga dasar setiap tipe kamar & paket menginap langsung ke PostgreSQL (berlaku untuk Front Office & Booking Engine).
          </p>
        </div>

        <button
          onClick={loadMatrix}
          className="px-3.5 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Pricing Matrix Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px]">
                <th className="p-4 font-bold">Tipe Kamar</th>
                {ratePlans.map((rp) => (
                  <th key={rp.id} className="p-4 font-bold">
                    <div>{rp.name}</div>
                    <div className="text-[10px] font-mono text-primary">{rp.code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roomTypes.map((rt) => (
                <tr key={rt.id} className="hover:bg-muted/20">
                  <td className="p-4">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-primary" />
                      {rt.name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">{rt.code}</div>
                  </td>
                  {ratePlans.map((rp) => {
                    const key = cellKey(rt.id, rp.id);
                    const val = prices[key] ?? 650000;
                    return (
                      <td key={rp.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={formatThousands(val)}
                              onChange={(e) =>
                                setPrices((prev) => ({
                                  ...prev,
                                  [key]: parseThousands(e.target.value),
                                }))
                              }
                              className="w-full pl-8 pr-2.5 py-1.5 bg-background border border-border rounded-lg font-mono font-bold text-xs"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveCell(rt.id, rp.id)}
                            className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-colors"
                            title="Simpan harga"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rate Plan */}
      <form
        onSubmit={handleCreateRatePlan}
        className="p-5 bg-card border border-border rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
      >
        <div>
          <label className="font-semibold text-muted-foreground block mb-1">Kode Rate Plan *</label>
          <input
            required
            placeholder="CORP / PROMO"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono uppercase"
          />
        </div>
        <div>
          <label className="font-semibold text-muted-foreground block mb-1">Nama Paket *</label>
          <input
            required
            placeholder="Corporate Rate"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
        <div>
          <label className="font-semibold text-muted-foreground block mb-1">Keterangan</label>
          <input
            placeholder="Harga khusus instansi"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
        <button
          type="submit"
          className="py-2 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tambah Rate Plan
        </button>
      </form>
    </div>
  );
}
