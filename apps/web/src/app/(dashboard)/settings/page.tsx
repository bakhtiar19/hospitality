'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Image as ImageIcon,
  Trash2,
  Save,
  Printer,
  Phone,
  Mail,
  FileCheck,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';
import { formatCurrency, formatThousands, parseThousands } from '../../../lib/utils';
import {
  getHotelSettings,
  saveHotelSettings,
  apiSaveHotelSettings,
  compressHotelLogoFile,
  calculateHotelTax,
  HotelSettings,
} from '../../../lib/settings-store';

export default function SettingsPage() {
  const { t } = useI18n();
  const { dbSynced, refreshBootstrap } = useAuth();
  const [activeTab, setActiveTab] = useState<'property' | 'taxes' | 'roomTypes' | 'rooms' | 'ratePlans'>('property');

  // Hotel Branding & Settings State
  const [hotelSettings, setHotelSettings] = useState<HotelSettings>(getHotelSettings());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHotelSettings(getHotelSettings());
    const handler = () => setHotelSettings(getHotelSettings());
    window.addEventListener('pms_settings_updated', handler);
    return () => window.removeEventListener('pms_settings_updated', handler);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const compressedBase64 = await compressHotelLogoFile(file);
      const updated = await apiSaveHotelSettings({ logoUrl: compressedBase64 });
      setHotelSettings(updated);
      setSaveSuccessMsg('Logo hotel terkompresi berhasil disimpan ke database! Otomatis digunakan untuk setiap print nota/folio.');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Gagal mengunggah logo hotel.');
    }
  };

  const handleRemoveLogo = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus logo kustom dan kembali ke default?')) {
      try {
        const updated = await apiSaveHotelSettings({ logoUrl: '' });
        setHotelSettings(updated);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSaveSuccessMsg('Logo kustom berhasil dihapus dari database.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } catch (err: any) {
        alert(err?.message || 'Gagal menghapus logo hotel.');
      }
    }
  };

  const handleSavePropertyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiSaveHotelSettings(hotelSettings);
      setHotelSettings(updated);
      setSaveSuccessMsg('Informasi profil hotel & branding berhasil disimpan ke PostgreSQL!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan pengaturan hotel.');
    }
  };

  // Room Types, Physical Rooms & Rate Plans State (Synced with PostgreSQL)
  const [roomTypes, setRoomTypes] = useState<Array<{
    id?: string;
    code: string;
    name: string;
    total: number;
    sqm: string;
    occupancy: string;
    baseRate: number;
    amenities: string[];
  }>>([]);
  const [physicalRooms, setPhysicalRooms] = useState<Array<{
    id: string;
    number: string;
    roomTypeId: string;
    type: string;
    floor: number;
    floorName: string;
    operationalStatus: string;
    housekeepingStatus: string;
  }>>([]);
  const [dbRatePlans, setDbRatePlans] = useState<Array<{
    id: string;
    code: string;
    name: string;
    description: string;
  }>>([]);

  const loadRoomSetup = async () => {
    if (!dbSynced) return;
    try {
      const setup = await apiRequest<{
        roomTypes: any[];
        rooms: any[];
        ratePlans: any[];
      }>('/pms/room-setup');
      setRoomTypes(
        (setup.roomTypes || []).map((rt) => ({
          id: rt.id,
          code: rt.code,
          name: rt.name,
          total: rt.total || 0,
          sqm: '28 m²',
          occupancy: `2-${rt.maxOccupancy || 3} Adults`,
          baseRate: rt.baseRate || 650000,
          amenities: rt.amenities?.length ? rt.amenities : ['Wi-Fi', 'AC'],
        }))
      );
      setPhysicalRooms(setup.rooms || []);
      setDbRatePlans(setup.ratePlans || []);
    } catch (err) {
      console.error('Failed to load room setup from DB', err);
    }
  };

  useEffect(() => {
    loadRoomSetup();
  }, [dbSynced]);

  const [isAddRoomTypeModalOpen, setIsAddRoomTypeModalOpen] = useState(false);
  const [newRtCode, setNewRtCode] = useState('');
  const [newRtName, setNewRtName] = useState('');
  const [newRtTotal, setNewRtTotal] = useState(2);
  const [newRtSqm, setNewRtSqm] = useState('32 m²');
  const [newRtOccupancy, setNewRtOccupancy] = useState('2-3 Adults');
  const [newRtBaseRate, setNewRtBaseRate] = useState(950000);
  const [newRtAmenities, setNewRtAmenities] = useState('Wi-Fi, AC, Smart TV, Coffee Maker');
  const [newRtFloor, setNewRtFloor] = useState(1);
  const [newRtStartNumber, setNewRtStartNumber] = useState(106);
  const [rtSuccessMessage, setRtSuccessMessage] = useState<string | null>(null);

  // Add physical room form
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRtCode || !newRtName) return;

    try {
      if (dbSynced) {
        await apiRequest('/pms/room-types', {
          method: 'POST',
          body: JSON.stringify({
            code: newRtCode.toUpperCase().trim(),
            name: newRtName.trim(),
            maxOccupancy: 3,
            baseRate: Number(newRtBaseRate) || 750000,
            amenities: newRtAmenities.split(',').map((a) => a.trim()).filter(Boolean),
            generateUnits: Number(newRtTotal) || 0,
            floorNumber: Number(newRtFloor) || 1,
            startRoomNumber: Number(newRtStartNumber) || 101,
          }),
        });
        await loadRoomSetup();
        await refreshBootstrap();
      }
      setIsAddRoomTypeModalOpen(false);
      setRtSuccessMessage(
        `Tipe kamar "${newRtName.trim()}" (${newRtCode.toUpperCase()}) & ${newRtTotal} unit kamar berhasil disimpan ke PostgreSQL!`
      );
      setNewRtCode('');
      setNewRtName('');
      setTimeout(() => setRtSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan tipe kamar.');
    }
  };

  const handleAddPhysicalRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTypeId = newRoomTypeId || roomTypes[0]?.id;
    if (!newRoomNum.trim() || !targetTypeId) return;
    try {
      await apiRequest('/pms/rooms', {
        method: 'POST',
        body: JSON.stringify({
          roomNumber: newRoomNum.trim(),
          roomTypeId: targetTypeId,
          floorNumber: Number(newRoomFloor) || 1,
        }),
      });
      setNewRoomNum('');
      await loadRoomSetup();
      await refreshBootstrap();
      setSaveSuccessMsg(`Kamar ${newRoomNum.trim()} berhasil ditambahkan ke PostgreSQL!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menambah kamar.');
    }
  };

  const handleDeletePhysicalRoom = async (roomId: string, roomNumber: string) => {
    if (!confirm(`Hapus kamar nomor ${roomNumber} dari properti ini?`)) return;
    try {
      await apiRequest(`/pms/rooms/${roomId}`, { method: 'DELETE' });
      await loadRoomSetup();
      await refreshBootstrap();
      setSaveSuccessMsg(`Kamar ${roomNumber} berhasil dihapus.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus kamar.');
    }
  };

  // Interactive Tax Calculator State (follows ON/OFF toggles & configured rates)
  const [calcBaseRate, setCalcBaseRate] = useState<number>(1000000);
  const taxPreview = calculateHotelTax(calcBaseRate, hotelSettings);
  const serviceChargeAmount = taxPreview.serviceAmount;
  const pbjtAmount = taxPreview.pbjtAmount;
  const totalGrossAmount = taxPreview.grandTotal;

  const handleToggleTax = async (field: 'serviceChargeEnabled' | 'pbjtEnabled', nextValue: boolean) => {
    const next = { ...hotelSettings, [field]: nextValue };
    setHotelSettings(next);
    try {
      const updated = await apiSaveHotelSettings({
        [field]: nextValue,
        pbjtRate: Number(next.pbjtRate ?? 10),
        serviceChargeRate: Number(next.serviceChargeRate ?? 10),
      });
      setHotelSettings(updated);
      setSaveSuccessMsg(
        `${field === 'pbjtEnabled' ? 'PBJT Pajak Hotel' : 'Service Charge'} berhasil ${
          nextValue ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'
        } dan disimpan ke database.`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan pengaturan pajak.');
    }
  };

  const handleSaveTaxSettings = async () => {
    try {
      const updated = await apiSaveHotelSettings({
        pbjtEnabled: hotelSettings.pbjtEnabled !== false,
        serviceChargeEnabled: hotelSettings.serviceChargeEnabled !== false,
        pbjtRate: Math.max(0, Math.min(100, Number(hotelSettings.pbjtRate ?? 10))),
        serviceChargeRate: Math.max(0, Math.min(100, Number(hotelSettings.serviceChargeRate ?? 10))),
      });
      setHotelSettings(updated);
      setSaveSuccessMsg('Konfigurasi tarif & status ON/OFF PBJT & Service Charge berhasil disimpan!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan tarif pajak.');
    }
  };

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
          Rooms & Floors ({physicalRooms.length})
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
          Rate Plans ({dbRatePlans.length})
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="flex-1">{saveSuccessMsg}</span>
          <button onClick={() => setSaveSuccessMsg(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Property Profile & Logo Branding */}
      {activeTab === 'property' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Logo Upload & Print Out Branding Card */}
            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Logo Hotel (Kop Surat & Print Out Nota / Folio)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload logo resmi hotel Anda. Logo ini otomatis dicantumkan di setiap cetak nota pelunasan, receipt tamu, dan invoice resmi.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-file-input"
                  />
                  <label
                    htmlFor="logo-file-input"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {hotelSettings.logoUrl ? 'Ganti Logo' : 'Unggah Logo Baru'}
                  </label>
                  {hotelSettings.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-lg hover:bg-destructive/20 transition-colors"
                      title="Hapus logo kustom"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Logo Preview & Print Simulation */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-muted/30 border border-dashed border-border rounded-xl min-h-[140px] text-center">
                  {hotelSettings.logoUrl ? (
                    <div className="space-y-2">
                      <img
                        src={hotelSettings.logoUrl}
                        alt="Logo Hotel"
                        className="max-h-24 max-w-full object-contain mx-auto rounded shadow-xs bg-white p-2"
                      />
                      <span className="text-[11px] font-semibold text-emerald-600 block">✓ Logo Aktif</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold block text-foreground">Belum ada logo kustom</span>
                      <span className="text-[10px] text-muted-foreground block">Format: PNG, JPG, SVG, WebP (Maks 3MB)</span>
                    </div>
                  )}
                </div>

                {/* Printout Header Simulation */}
                <div className="sm:col-span-8 p-4 bg-card border border-border rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pb-1 border-b border-border">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Printer className="w-3.5 h-3.5" />
                      Simulasi Kop Surat Cetak (Print Out Header)
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                      PREVIEW FOLIO
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-sm text-foreground">
                        {hotelSettings.hotelName || 'Hotel Winotosastro AProject'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {hotelSettings.address || 'Jl. Brigjend Slamet Riyadi No. 250, Surakarta'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        NPWPD: {hotelSettings.npwpd || '33.72.01.284.910-001'} | Telp: {hotelSettings.phone || '+62 271 718899'}
                      </div>
                    </div>
                    {hotelSettings.logoUrl ? (
                      <img
                        src={hotelSettings.logoUrl}
                        alt="Logo Preview"
                        className="h-10 w-auto max-w-[120px] object-contain flex-shrink-0 bg-white p-1 rounded border border-border/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        LOGO
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* General Hotel Information Form */}
            <form onSubmit={handleSavePropertyInfo} className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">General Hotel & Buyer Information</h3>
                <span className="text-xs text-muted-foreground">Dapat disesuaikan oleh pembeli aplikasi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Hotel Property Name</label>
                  <input
                    type="text"
                    value={hotelSettings.hotelName}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, hotelName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Contoh: Hotel Grand Sahid Surakarta"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Property Code</label>
                  <input
                    type="text"
                    value={hotelSettings.propertyCode}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, propertyCode: e.target.value.toUpperCase() })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground font-medium">Street Address (Untuk Kop Surat)</label>
                  <input
                    type="text"
                    value={hotelSettings.address}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, address: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">City / Regency</label>
                  <input
                    type="text"
                    value={hotelSettings.city}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, city: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Country</label>
                  <input
                    type="text"
                    value={hotelSettings.country}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, country: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Nomor NPWPD (Pajak Daerah Hotel)</label>
                  <input
                    type="text"
                    value={hotelSettings.npwpd}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, npwpd: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="33.72.01.284.910-001"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Telepon Kontak Resmi</label>
                  <input
                    type="text"
                    value={hotelSettings.phone}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="+62 271 718899"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Simpan Profil & Branding Hotel
                </button>
              </div>
            </form>

            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground">Operational Times & Audit Policies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Check-In Standard Time</label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-semibold">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{hotelSettings.checkInTime || '14:00 WIB'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Check-Out Standard Time</label>
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-muted/30 border border-border rounded-lg font-semibold">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{hotelSettings.checkOutTime || '12:00 WIB'}</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Configured Taxes & Fees (ON / OFF)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owner dapat mengaktifkan atau menonaktifkan perhitungan serta tampilan Service Charge & PBJT sesuai kebijakan hotel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveTaxSettings}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors self-start"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Pengaturan Pajak
                </button>
              </div>

              <div className="space-y-3">
                {/* Tax 1: Service Charge */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl transition-colors ${
                  hotelSettings.serviceChargeEnabled !== false
                    ? 'bg-muted/20 border-border'
                    : 'bg-muted/10 border-border/60 opacity-75'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      #1
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                        Hotel Service Charge
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                          SERVICE-CHARGE
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          hotelSettings.serviceChargeEnabled !== false
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {hotelSettings.serviceChargeEnabled !== false ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Applied first on base room rate. {hotelSettings.serviceChargeEnabled !== false ? 'Dihitung & ditampilkan pada reservasi/nota.' : 'Tidak dihitung & tidak ditampilkan.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={hotelSettings.serviceChargeEnabled === false}
                        value={hotelSettings.serviceChargeRate ?? 10}
                        onChange={(e) =>
                          setHotelSettings({
                            ...hotelSettings,
                            serviceChargeRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-16 px-2 py-1 text-right bg-background border border-border rounded-lg font-extrabold text-sm font-mono disabled:opacity-50"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hotelSettings.serviceChargeEnabled !== false}
                      onClick={() =>
                        handleToggleTax('serviceChargeEnabled', !(hotelSettings.serviceChargeEnabled !== false))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        hotelSettings.serviceChargeEnabled !== false ? 'bg-emerald-600' : 'bg-muted-foreground/30'
                      }`}
                      title="Aktif / Nonaktifkan Service Charge"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hotelSettings.serviceChargeEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Tax 2: PBJT Regional Hotel Tax */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl transition-colors ${
                  hotelSettings.pbjtEnabled !== false
                    ? 'bg-muted/20 border-border'
                    : 'bg-muted/10 border-border/60 opacity-75'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      #2
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                        PBJT Jasa Perhotelan (Pajak Daerah)
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                          PBJT-HOTEL
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          hotelSettings.pbjtEnabled !== false
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {hotelSettings.pbjtEnabled !== false ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Pajak Hotel (UU HKPD). {hotelSettings.pbjtEnabled !== false ? 'Dihitung & ditampilkan pada reservasi/nota.' : 'Tidak dihitung & tidak ditampilkan.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={hotelSettings.pbjtEnabled === false}
                        value={hotelSettings.pbjtRate ?? 10}
                        onChange={(e) =>
                          setHotelSettings({
                            ...hotelSettings,
                            pbjtRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-16 px-2 py-1 text-right bg-background border border-border rounded-lg font-extrabold text-sm font-mono disabled:opacity-50"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hotelSettings.pbjtEnabled !== false}
                      onClick={() =>
                        handleToggleTax('pbjtEnabled', !(hotelSettings.pbjtEnabled !== false))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        hotelSettings.pbjtEnabled !== false ? 'bg-emerald-600' : 'bg-muted-foreground/30'
                      }`}
                      title="Aktif / Nonaktifkan PBJT"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hotelSettings.pbjtEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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
                  <label className="text-[11px] font-semibold text-muted-foreground">Sample Base Room Rate (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                    <input
                      type="text"
                      value={formatThousands(calcBaseRate)}
                      onChange={(e) => setCalcBaseRate(parseThousands(e.target.value))}
                      className="w-full mt-1 pl-9 pr-3 py-1.5 bg-muted/40 border border-border rounded-lg font-bold font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base Room Rate:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(calcBaseRate)}</span>
                  </div>
                  {taxPreview.serviceEnabled && (
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span>+ Service Charge ({taxPreview.serviceRate}%):</span>
                      <span className="font-semibold">+{formatCurrency(serviceChargeAmount)}</span>
                    </div>
                  )}
                  {taxPreview.pbjtEnabled && (
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                      <span>+ PBJT Hotel ({taxPreview.pbjtRate}%):</span>
                      <span className="font-semibold">+{formatCurrency(pbjtAmount)}</span>
                    </div>
                  )}
                  {!taxPreview.serviceEnabled && !taxPreview.pbjtEnabled && (
                    <div className="text-[11px] text-muted-foreground italic">
                      Service Charge & PBJT sedang NONAKTIF (harga Nett).
                    </div>
                  )}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">Gross Guest Total:</span>
                    <span className="font-extrabold text-foreground font-mono">{formatCurrency(totalGrossAmount)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  *Effective tax/fee addition: +{taxPreview.effectivePercent.toFixed(1)}%
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
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                      <input
                        type="text"
                        required
                        value={formatThousands(newRtBaseRate)}
                        onChange={(e) => setNewRtBaseRate(parseThousands(e.target.value))}
                        className="w-full pl-9 pr-2.5 py-2 bg-muted/30 border border-border rounded-lg text-foreground font-mono font-bold"
                      />
                    </div>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Lantai Kamar</label>
                      <input
                        type="number"
                        min={1}
                        value={newRtFloor}
                        onChange={(e) => setNewRtFloor(Number(e.target.value))}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Mulai Nomor Kamar</label>
                      <input
                        type="number"
                        min={100}
                        value={newRtStartNumber}
                        onChange={(e) => setNewRtStartNumber(Number(e.target.value))}
                        className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-mono"
                      />
                    </div>
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

      {/* Tab 4: Rooms & Floors Grid (Synced with PostgreSQL) */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddPhysicalRoom}
            className="p-4 bg-card border border-border rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
          >
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Nomor Kamar *</label>
              <input
                type="text"
                required
                placeholder="Contoh: 106 atau VILLA-1"
                value={newRoomNum}
                onChange={(e) => setNewRoomNum(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Tipe Kamar *</label>
              <select
                value={newRoomTypeId || roomTypes[0]?.id || ''}
                onChange={(e) => setNewRoomTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-semibold"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id || rt.code} value={rt.id}>
                    {rt.name} ({rt.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Lantai *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Unit Kamar
            </button>
          </form>

          {Array.from(new Set(physicalRooms.map((r) => r.floor)))
            .sort((a, b) => a - b)
            .map((floorNum) => {
              const floorRooms = physicalRooms.filter((r) => r.floor === floorNum);
              return (
                <div key={floorNum} className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">Lantai {floorNum}</h4>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">
                      {floorRooms.length} Kamar Terdaftar
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2">
                    {floorRooms.map((rm) => (
                      <div
                        key={rm.id}
                        className="group relative flex flex-col items-center justify-center p-2.5 rounded-lg border border-border bg-muted/30 hover:border-primary transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleDeletePhysicalRoom(rm.id, rm.number)}
                          title="Hapus kamar ini"
                          className="hidden group-hover:flex absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white items-center justify-center text-[9px]"
                        >
                          ×
                        </button>
                        <span className="font-mono font-bold text-xs text-foreground">{rm.number}</span>
                        <span className="text-[9px] text-muted-foreground truncate max-w-full">{rm.type}</span>
                        <span className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                          {rm.housekeepingStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tab 5: Rate Plans */}
      {activeTab === 'ratePlans' && (
        <div className="space-y-4">
          {dbRatePlans.map((plan) => (
            <div key={plan.id} className="p-5 bg-card border border-border rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center font-mono">
                    {plan.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-base text-foreground">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground">{plan.description || 'Rate plan aktif di PostgreSQL'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                  DB Active
                </span>
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Taxes Bound: Service Charge (10%) + PBJT Regional (10%)</span>
                <span className="text-emerald-600 font-semibold">Active for Direct & Channel Manager</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
