'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Building2,
  BedDouble,
  CalendarCheck,
  Users,
  Search,
  ExternalLink,
  Power,
  CheckCircle2,
  ArrowRight,
  Crown,
  RefreshCw,
  Plus,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';

export interface AdminPropertyRow {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  roomsCount: number;
  bookingsCount: number;
  usersCount: number;
}

export default function SuperAdminConsolePage() {
  const { isSuperAdmin, activePropertyId, switchProperty } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Create Client Hotel Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [superiorRooms, setSuperiorRooms] = useState(5);
  const [deluxeRooms, setDeluxeRooms] = useState(5);
  const [creating, setCreating] = useState(false);

  // Reset Owner Password Modal
  const [resetTarget, setResetTarget] = useState<AdminPropertyRow | null>(null);
  const [newOwnerPw, setNewOwnerPw] = useState('');
  const [resettingPw, setResettingPw] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadProperties = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await apiRequest<AdminPropertyRow[]>('/admin/properties');
      setProperties(rows || []);
    } catch (err) {
      console.error('Failed to fetch connected properties', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.ownerEmail.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
    );
  }, [properties, search]);

  const totals = useMemo(() => {
    return {
      totalHotels: properties.length,
      activeHotels: properties.filter((p) => p.isActive).length,
      pendingHotels: properties.filter((p) => !p.isActive).length,
      totalRooms: properties.reduce((sum, p) => sum + p.roomsCount, 0),
      totalBookings: properties.reduce((sum, p) => sum + p.bookingsCount, 0),
    };
  }, [properties]);

  const handleOpenProperty = async (prop: AdminPropertyRow) => {
    setSwitchingId(prop.id);
    try {
      await switchProperty(prop.id);
      router.push('/front-office');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleToggleStatus = async (prop: AdminPropertyRow) => {
    try {
      await apiRequest(`/admin/properties/${prop.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !prop.isActive }),
      });
      await loadProperties();
      showToast(
        !prop.isActive
          ? `Hotel ${prop.name} diaktifkan!`
          : `Hotel ${prop.name} ditangguhkan.`
      );
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status hotel.');
    }
  };

  const handleCreateClientHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiRequest<{ property: { name: string; code: string }; totalRooms: number }>(
        '/admin/properties',
        {
          method: 'POST',
          body: JSON.stringify({
            hotelName,
            city,
            address,
            phone,
            ownerName,
            email: ownerEmail,
            password: ownerPassword,
            superiorRooms: Number(superiorRooms),
            deluxeRooms: Number(deluxeRooms),
          }),
        }
      );
      setCreateOpen(false);
      setHotelName('');
      setCity('');
      setAddress('');
      setPhone('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      await loadProperties();
      showToast(
        `Hotel ${res.property.name} (${res.property.code}) dengan ${res.totalRooms} kamar berhasil dibuat & langsung aktif!`
      );
    } catch (err: any) {
      alert(err?.message || 'Gagal mendaftarkan hotel klien.');
    } finally {
      setCreating(false);
    }
  };

  const handleResetOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResettingPw(true);
    try {
      const res = await apiRequest<{ ownerEmail: string }>(
        `/admin/properties/${resetTarget.id}/reset-owner-password`,
        {
          method: 'POST',
          body: JSON.stringify({ newPassword: newOwnerPw }),
        }
      );
      showToast(`Password owner (${res.ownerEmail}) berhasil direset!`);
      setResetTarget(null);
      setNewOwnerPw('');
    } catch (err: any) {
      alert(err?.message || 'Gagal mereset password owner.');
    } finally {
      setResettingPw(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-card border border-destructive/30 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
        <h1 className="text-lg font-extrabold text-foreground">Akses Khusus Platform Super Admin</h1>
        <p className="text-xs text-muted-foreground">
          Akun Anda hanya memiliki akses untuk 1 properti hotel (1 User = 1 Property). Halaman ini khusus untuk
          pengelola platform SaaS AProject.
        </p>
      </div>
    );
  }

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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-extrabold mb-1.5">
            <Crown className="w-3.5 h-3.5" />
            PLATFORM SUPER ADMIN CONSOLE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Semua Properti Hotel Terhubung
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daftarkan klien hotel baru, setujui pendaftaran, reset password owner, atau buka dashboard hotel mana saja.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={loadProperties}
            className="px-3.5 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Hotel Klien
          </button>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Hotel Klien</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{totals.totalHotels}</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Hotel Aktif / Pending</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {totals.activeHotels}
            {totals.pendingHotels > 0 && (
              <span className="text-xs font-bold text-amber-600 ml-2">
                ({totals.pendingHotels} Pending)
              </span>
            )}
          </div>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Kamar Terkelola</span>
            <BedDouble className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{totals.totalRooms}</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Reservasi Lintas Hotel</span>
            <CalendarCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{totals.totalBookings}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama hotel, kota, kode properti, atau email pemilik..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {/* Properties List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Memuat daftar properti...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Tidak ada properti yang cocok.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((prop) => {
              const isSelected = activePropertyId === prop.id;
              return (
                <div
                  key={prop.id}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-foreground">{prop.name}</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] font-bold">
                        {prop.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          prop.isActive
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {prop.isActive ? 'AKTIF' : 'PENDING / NONAKTIF'}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                          SEDANG DIBUKA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Kota: <span className="font-semibold text-foreground">{prop.city}</span> • Owner:{' '}
                      <span className="font-semibold text-foreground">{prop.ownerName}</span> ({prop.ownerEmail})
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" /> {prop.roomsCount} Kamar
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5" /> {prop.bookingsCount} Reservasi
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {prop.usersCount} Akun Staf
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/book/${prop.code.toLowerCase()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Booking Link
                    </a>

                    <button
                      onClick={() => {
                        setResetTarget(prop);
                        setNewOwnerPw('');
                      }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      title="Reset password pemilik hotel jika lupa"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      Reset PW
                    </button>

                    <button
                      onClick={() => handleToggleStatus(prop)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                        prop.isActive
                          ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                          : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {prop.isActive ? 'Tangguhkan' : 'Setujui & Aktifkan'}
                    </button>

                    <button
                      onClick={() => handleOpenProperty(prop)}
                      disabled={switchingId === prop.id}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{switchingId === prop.id ? 'Membuka...' : 'Buka Dashboard'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Tambah Hotel Klien Real */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                Daftarkan Hotel Klien Baru (Langsung Aktif)
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClientHotel} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-muted-foreground block mb-1">Nama Hotel Klien *</label>
                  <input
                    required
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="Hotel Kusuma Jaya"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Kota *</label>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Yogyakarta"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Telepon Hotel</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-muted-foreground block mb-1">Alamat Lengkap</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Malioboro No. ..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Jumlah Kamar Superior</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={superiorRooms}
                    onChange={(e) => setSuperiorRooms(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Jumlah Kamar Deluxe</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={deluxeRooms}
                    onChange={(e) => setDeluxeRooms(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2 border-t border-border pt-2 font-bold text-foreground">
                  Akun Login Pemilik Hotel
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-muted-foreground block mb-1">Nama Owner *</label>
                  <input
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Hendra Wijaya"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Email Owner *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@hotelkusuma.com"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Password Awal (min 8) *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 bg-muted rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60"
                >
                  {creating ? 'Membuat Hotel...' : 'Buat & Aktifkan Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password Owner */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Reset Password Owner Hotel
              </div>
              <button onClick={() => setResetTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-muted-foreground">
              Hotel: <span className="font-bold text-foreground">{resetTarget.name}</span> ({resetTarget.ownerEmail})
            </p>
            <form onSubmit={handleResetOwnerPassword} className="space-y-3">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Password Baru (min. 8 karakter) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newOwnerPw}
                  onChange={(e) => setNewOwnerPw(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 bg-muted rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingPw}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  {resettingPw ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
