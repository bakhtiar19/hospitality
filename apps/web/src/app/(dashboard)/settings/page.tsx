'use client';

import React, { useState } from 'react';
import {
  Building2,
  Percent,
  BedDouble,
  Layers,
  TrendingUp,
  Plus,
  CheckCircle2,
  HelpCircle,
  Clock,
  MapPin,
  Globe2,
  Coins,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';

export default function SettingsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'property' | 'taxes' | 'roomTypes' | 'rooms' | 'ratePlans'>('property');

  // Room Types State
  const [roomTypes, setRoomTypes] = useState([
    {
      code: 'SUP-TWN',
      name: 'Superior Room',
      total: 15,
      sqm: '24 m²',
      occupancy: '2 Adults',
      baseRate: 650000,
      amenities: ['Wi-Fi', 'AC', 'TV 43"', 'Hot Shower', 'Safe'],
    },
    {
      code: 'DLX-KNG',
      name: 'Deluxe King',
      total: 15,
      sqm: '32 m²',
      occupancy: '2-3 Adults',
      baseRate: 880000,
      amenities: ['Wi-Fi', 'AC', 'Smart TV 50"', 'City View', 'Bathtub'],
    },
    {
      code: 'EXE-STE',
      name: 'Executive Suite',
      total: 6,
      sqm: '48 m²',
      occupancy: '2-4 Adults',
      baseRate: 1450000,
      amenities: ['Living Room', 'Espresso Machine', 'Bathtub', 'High Floor'],
    },
    {
      code: 'FAM-STE',
      name: 'Family Suite',
      total: 4,
      sqm: '60 m²',
      occupancy: '4-5 Adults',
      baseRate: 2100000,
      amenities: ['2 Bedrooms', 'Kitchenette', 'Dining Area', '2 Bathrooms'],
    },
  ]);

  const [isAddRoomTypeModalOpen, setIsAddRoomTypeModalOpen] = useState(false);
  const [newRtCode, setNewRtCode] = useState('PRS-STE');
  const [newRtName, setNewRtName] = useState('Presidential Suite');
  const [newRtTotal, setNewRtTotal] = useState(2);
  const [newRtSqm, setNewRtSqm] = useState('85 m²');
  const [newRtOccupancy, setNewRtOccupancy] = useState('2-4 Adults');
  const [newRtBaseRate, setNewRtBaseRate] = useState(3500000);
  const [newRtAmenities, setNewRtAmenities] = useState('Wi-Fi, Jacuzzi, Private Butler, City View, Espresso');
  const [rtSuccessMessage, setRtSuccessMessage] = useState<string | null>(null);

  const handleAddRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRtCode || !newRtName) return;

    const newRoomType = {
      code: newRtCode.toUpperCase().trim(),
      name: newRtName.trim(),
      total: Number(newRtTotal) || 1,
      sqm: newRtSqm.trim(),
      occupancy: newRtOccupancy.trim(),
      baseRate: Number(newRtBaseRate) || 1000000,
      amenities: newRtAmenities.split(',').map((a) => a.trim()).filter(Boolean),
    };

    setRoomTypes((prev) => [...prev, newRoomType]);
    setIsAddRoomTypeModalOpen(false);
    setRtSuccessMessage(`Tipe kamar "${newRoomType.name}" (${newRoomType.code}) berhasil ditambahkan ke inventaris!`);
    setTimeout(() => setRtSuccessMessage(null), 5000);
  };

  // Interactive Tax Calculator State
  const [calcBaseRate, setCalcBaseRate] = useState<number>(1000000);
  const serviceChargeAmount = Math.round(calcBaseRate * 0.1);
  const pbjtSubtotal = calcBaseRate + serviceChargeAmount;
  const pbjtAmount = Math.round(pbjtSubtotal * 0.1);
  const totalGrossAmount = pbjtSubtotal + pbjtAmount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('modules.settings')}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage property configuration, regional PBJT taxes, room inventory, and rate plans for Hotel Winotosastro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active: Surakarta (WIB)
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('property')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'property'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Property Profile
        </button>

        <button
          onClick={() => setActiveTab('taxes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'taxes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Percent className="w-4 h-4" />
          Taxes & Regional PBJT
          <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary rounded-full">Configurable</span>
        </button>

        <button
          onClick={() => setActiveTab('roomTypes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'roomTypes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Room Types ({roomTypes.length})
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          Rooms & Floors (40)
        </button>

        <button
          onClick={() => setActiveTab('ratePlans')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ratePlans'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rate Plans (3)
        </button>
      </div>

      {/* Tab 1: Property Profile */}
      {activeTab === 'property' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground">General Hotel Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Hotel Property Name</label>
                  <input
                    type="text"
                    defaultValue="Hotel Winotosastro AProject"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-medium"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Property Code</label>
                  <input
                    type="text"
                    defaultValue="WINOTOSASTRO-SOLO"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-mono text-xs"
                    readOnly
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground font-medium">Street Address</label>
                  <input
                    type="text"
                    defaultValue="Jl. Brigjend Slamet Riyadi No. 250, Surakarta, Jawa Tengah 57141"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">City / Regency</label>
                  <input
                    type="text"
                    defaultValue="Surakarta (Solo)"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Country</label>
                  <input
                    type="text"
                    defaultValue="Indonesia (ID)"
                    className="w-full mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground">Operational Times & Audit Policies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Check-In Standard Time</label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-semibold">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>14:00 WIB</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Check-Out Standard Time</label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-semibold">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>12:00 WIB</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Night Audit EOD Cutoff</label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-semibold text-emerald-600">
                    <Sparkles className="w-4 h-4" />
                    <span>02:00 WIB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
              <h4 className="font-bold text-sm text-foreground mb-3">Localization Context</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-primary" />
                    <span>Timezone</span>
                  </div>
                  <span className="font-mono font-bold">Asia/Jakarta (UTC+7)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span>Base Currency</span>
                  </div>
                  <span className="font-mono font-bold">IDR (Rupiah)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Jurisdiction</span>
                  </div>
                  <span className="font-bold">Bapenda Kota Surakarta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Configurable Taxes & Regional PBJT */}
      {activeTab === 'taxes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Configured Taxes & Fees</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Indonesian hotel taxes are regional PBJT (Law No. 1/2022 HKPD). Fully configurable per rate plan.
                  </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Tax
                </button>
              </div>

              <div className="space-y-3">
                {/* Tax 1: Service Charge */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                      #1
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        Hotel Service Charge
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                          SERVICE-CHARGE
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Applied first on base room rate. Exclusive.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-foreground">10.0%</span>
                    <div className="text-[11px] text-emerald-600 font-semibold">Active • All Plans</div>
                  </div>
                </div>

                {/* Tax 2: PBJT Regional Hotel Tax */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      #2
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        PBJT Jasa Perhotelan Kota Surakarta
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                          PBJT-HOTEL-SOLO
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Regional Hotel Tax levied on (Base Rate + Service Charge). Compounding.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-foreground">10.0%</span>
                    <div className="text-[11px] text-emerald-600 font-semibold">Active • Regional</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Tax Calculation Inspector */}
          <div className="space-y-4">
            <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Live Tax Preview Inspector
                </span>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Sample Base Room Rate</label>
                  <input
                    type="number"
                    value={calcBaseRate}
                    onChange={(e) => setCalcBaseRate(Number(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 bg-muted/40 border border-border rounded-lg font-bold font-mono text-sm"
                  />
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base Room Rate:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(calcBaseRate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span>+ Service Charge (10%):</span>
                    <span className="font-semibold">+{formatCurrency(serviceChargeAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                    <span>+ PBJT Surakarta (10% of Subtotal):</span>
                    <span className="font-semibold">+{formatCurrency(pbjtAmount)}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">Gross Guest Total:</span>
                    <span className="font-extrabold text-foreground font-mono">{formatCurrency(totalGrossAmount)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  *Effective tax/fee addition: +21.0% ("plus-plus"), matching standard Indonesian hospitality.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Room Types */}
      {activeTab === 'roomTypes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-foreground">Master Room Types Inventory</h3>
              <p className="text-xs text-muted-foreground">
                Daftar kategori tipe kamar fisik hotel, kapasitas dasar, dimensi, dan tarif acuan
              </p>
            </div>
            <button
              onClick={() => setIsAddRoomTypeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-xs self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Tipe Kamar Baru
            </button>
          </div>

          {/* Alert Notification */}
          {rtSuccessMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {rtSuccessMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypes.map((rt) => (
              <div key={rt.code} className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{rt.name}</h4>
                    <span className="text-xs font-mono text-muted-foreground">{rt.code} • {rt.sqm}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {rt.total} Rooms
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Base Occupancy: <span className="font-semibold text-foreground">{rt.occupancy}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rt.amenities.map((a, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {a}
                    </span>
                  ))}
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Base Nightly Rate:</span>
                  <span className="font-bold text-sm text-foreground font-mono">{formatCurrency(rt.baseRate)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal: Tambah Tipe Kamar Baru */}
          {isAddRoomTypeModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <BedDouble className="w-5 h-5" />
                    <h3 className="text-base text-foreground">Tambah Tipe Kamar Baru</h3>
                  </div>
                  <button onClick={() => setIsAddRoomTypeModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddRoomType} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Nama Tipe Kamar *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Presidential Suite"
                        value={newRtName}
                        onChange={(e) => setNewRtName(e.target.value)}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Kode Unik (Code) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: PRS-STE"
                        value={newRtCode}
                        onChange={(e) => setNewRtCode(e.target.value)}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Jumlah Unit *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newRtTotal}
                        onChange={(e) => setNewRtTotal(Number(e.target.value))}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Luas Kamar</label>
                      <input
                        type="text"
                        value={newRtSqm}
                        onChange={(e) => setNewRtSqm(e.target.value)}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Kapasitas Tamu</label>
                      <input
                        type="text"
                        value={newRtOccupancy}
                        onChange={(e) => setNewRtOccupancy(e.target.value)}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">Tarif Dasar per Malam (IDR) *</label>
                    <input
                      type="number"
                      step="50000"
                      min="100000"
                      required
                      value={newRtBaseRate}
                      onChange={(e) => setNewRtBaseRate(Number(e.target.value))}
                      className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">Fasilitas (Pisahkan dengan koma)</label>
                    <input
                      type="text"
                      value={newRtAmenities}
                      onChange={(e) => setNewRtAmenities(e.target.value)}
                      placeholder="Wi-Fi, Jacuzzi, Balcony, Minibar"
                      className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground"
                    />
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddRoomTypeModalOpen(false)}
                      className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
                    >
                      Simpan Tipe Kamar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Rooms & Floors Grid */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          {[
            {
              floor: 1,
              name: 'Lantai 1',
              rooms: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110'],
              type: 'Superior Room',
            },
            {
              floor: 2,
              name: 'Lantai 2',
              rooms: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'],
              type: '5 Superior / 5 Deluxe King',
            },
            {
              floor: 3,
              name: 'Lantai 3',
              rooms: ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310'],
              type: 'Deluxe King',
            },
            {
              floor: 4,
              name: 'Lantai 4',
              rooms: ['401', '402', '403', '404', '405', '406', '407', '408', '409', '410'],
              type: '6 Executive Suite / 4 Family Suite',
            },
          ].map((fl) => (
            <div key={fl.floor} className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{fl.name}</h4>
                  <span className="text-xs text-muted-foreground">({fl.type})</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600">10 Rooms Active</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {fl.rooms.map((num) => (
                  <div
                    key={num}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-border bg-muted/30 hover:border-primary cursor-pointer transition-colors"
                  >
                    <span className="font-mono font-bold text-xs text-foreground">{num}</span>
                    <span className="text-[9px] font-semibold text-emerald-600 mt-0.5">CLEAN</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Rate Plans */}
      {activeTab === 'ratePlans' && (
        <div className="space-y-4">
          {[
            {
              code: 'RO',
              name: 'Room Only (Flexible)',
              desc: 'Standard flexible room rate without breakfast. Free cancellation up to 24h prior to arrival.',
              isDerived: false,
              discount: 'Base Rate (100%)',
            },
            {
              code: 'BB',
              name: 'Bed & Breakfast',
              desc: 'Includes traditional Surakarta breakfast buffet for up to 2 guests per room.',
              isDerived: true,
              discount: 'Base + Rp 75.000 / pax',
            },
            {
              code: 'NR',
              name: 'Non-Refundable (Save 10%)',
              desc: 'Discounted promotional rate. Non-cancellable, 100% pre-payment required upon booking.',
              isDerived: true,
              discount: '-10% off Room Only',
            },
          ].map((plan) => (
            <div key={plan.code} className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center font-mono">
                    {plan.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-base text-foreground">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-foreground">
                  {plan.discount}
                </span>
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Taxes Bound: Service Charge (10%) + PBJT Surakarta (10%)</span>
                <span className="text-emerald-600 font-semibold">Active for Direct & Agoda OTA</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
