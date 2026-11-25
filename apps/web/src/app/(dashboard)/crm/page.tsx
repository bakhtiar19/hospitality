'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Star,
  Ban,
  Merge,
  Phone,
  Mail,
  CreditCard,
  Plus,
  CheckCircle2,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';

interface GuestRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  vipStatus: 'VIP' | 'REGULAR' | 'BLACKLIST';
  totalStays: number;
  lifetimeSpend: number;
  lastStay: string;
  notes: string;
}

export default function GuestCrmPage() {
  const { dbSynced } = useAuth();
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'VIP' | 'REGULAR' | 'BLACKLIST'>('ALL');
  const [selectedGuest, setSelectedGuest] = useState<GuestRecord | null>(null);
  const [editVip, setEditVip] = useState<'VIP' | 'REGULAR' | 'BLACKLIST'>('REGULAR');
  const [editNotes, setEditNotes] = useState('');

  // Merge modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add Guest modal
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [newVip, setNewVip] = useState<'VIP' | 'REGULAR' | 'BLACKLIST'>('REGULAR');
  const [newNotes, setNewNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadGuests = async () => {
    if (!dbSynced) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<GuestRecord[]>('/pms/guests');
      setGuests(data || []);
      if (data && data.length > 0) {
        const currentSel = data.find((g) => g.id === selectedGuest?.id) || data[0];
        setSelectedGuest(currentSel);
        setEditVip(currentSel.vipStatus);
        setEditNotes(currentSel.notes || '');
      } else {
        setSelectedGuest(null);
      }
    } catch (err) {
      console.error('Failed to load guests CRM', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, [dbSynced]);

  const selectGuest = (g: GuestRecord) => {
    setSelectedGuest(g);
    setEditVip(g.vipStatus);
    setEditNotes(g.notes || '');
  };

  const filteredGuests = guests.filter((g) => {
    const matchesTag = filterTag === 'ALL' || g.vipStatus === filterTag;
    const q = search.toLowerCase();
    const matchesSearch =
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.includes(search) ||
      g.idNumber.includes(search);
    return matchesTag && matchesSearch;
  });

  const handleSaveDossier = async () => {
    if (!selectedGuest) return;
    try {
      await apiRequest(`/pms/guests/${selectedGuest.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ vipStatus: editVip, notes: editNotes }),
      });
      await loadGuests();
      showToast(`Profil tamu ${selectedGuest.name} berhasil disimpan ke PostgreSQL!`);
    } catch (err: any) {
      alert(err?.message || 'Gagal memperbarui profil tamu.');
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/pms/guests', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newName,
          phone: newPhone,
          email: newEmail,
          idNumber: newIdNumber,
          vipStatus: newVip,
          notes: newNotes,
        }),
      });
      setAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewIdNumber('');
      setNewNotes('');
      await loadGuests();
      showToast('Profil tamu baru berhasil ditambahkan ke database!');
    } catch (err: any) {
      alert(err?.message || 'Gagal menambah tamu.');
    }
  };

  const handleMerge = async () => {
    if (!selectedGuest || !mergeSourceId || mergeSourceId === selectedGuest.id) return;
    try {
      await apiRequest('/pms/guests/merge', {
        method: 'POST',
        body: JSON.stringify({
          targetGuestId: selectedGuest.id,
          sourceGuestId: mergeSourceId,
        }),
      });
      setIsMergeModalOpen(false);
      await loadGuests();
      showToast(`Profil duplikat berhasil digabungkan ke ${selectedGuest.name}!`);
    } catch (err: any) {
      alert(err?.message || 'Gagal menggabungkan profil tamu.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {toastMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Guest CRM & Profiles
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
              PostgreSQL Live
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Riwayat menginap tamu, status VIP / Blacklist, dan penggabungan profil duplikat di PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={loadGuests}
            className="px-3 py-2 bg-card hover:bg-muted border border-border text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {selectedGuest && guests.length > 1 && (
            <button
              onClick={() => {
                const other = guests.find((g) => g.id !== selectedGuest.id);
                setMergeSourceId(other?.id || '');
                setIsMergeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Merge className="w-3.5 h-3.5" />
              Merge Duplikat
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 bg-primary text-white hover:bg-primary/90 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Tamu
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, HP, email, KTP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs font-semibold">
          {(['ALL', 'VIP', 'REGULAR', 'BLACKLIST'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                filterTag === tag
                  ? tag === 'VIP'
                    ? 'bg-amber-500 text-white'
                    : tag === 'BLACKLIST'
                    ? 'bg-rose-500 text-white'
                    : 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tag === 'VIP' && <Star className="w-3 h-3 fill-current" />}
              {tag === 'BLACKLIST' && <Ban className="w-3 h-3" />}
              {tag === 'ALL' ? `Semua (${guests.length})` : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Direktori Tamu</h3>
            <span className="text-xs text-muted-foreground">{filteredGuests.length} profil ditemukan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                <tr>
                  <th className="px-4 py-3">Nama Tamu</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Menginap</th>
                  <th className="px-4 py-3">Total Belanja</th>
                  <th className="px-4 py-3">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada data tamu di database hotel ini. Tamu baru otomatis tersimpan saat reservasi dibuat.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => {
                    const isSelected = selectedGuest?.id === guest.id;
                    return (
                      <tr
                        key={guest.id}
                        onClick={() => selectGuest(guest)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/20'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground">{guest.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{guest.idNumber}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-foreground">{guest.phone}</div>
                          <div className="text-[11px] text-muted-foreground">{guest.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {guest.vipStatus === 'VIP' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Star className="w-2.5 h-2.5 fill-current" /> VIP
                            </span>
                          ) : guest.vipStatus === 'BLACKLIST' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              <Ban className="w-2.5 h-2.5" /> BLACKLIST
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              REGULAR
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-foreground">{guest.totalStays}x</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-primary">
                          {formatCurrency(guest.lifetimeSpend)}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground font-mono">{guest.lastStay}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guest Dossier */}
        {selectedGuest ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Guest Dossier
                </span>
                <h3 className="font-bold text-base text-foreground mt-0.5">{selectedGuest.name}</h3>
              </div>
              {selectedGuest.vipStatus === 'VIP' && (
                <Star className="w-5 h-5 text-amber-500 fill-current" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl">
                <span className="text-muted-foreground text-[10px] block">Lifetime Value</span>
                <span className="text-sm font-extrabold text-foreground font-mono">
                  {formatCurrency(selectedGuest.lifetimeSpend)}
                </span>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl">
                <span className="text-muted-foreground text-[10px] block">Total Menginap</span>
                <span className="text-sm font-extrabold text-foreground">{selectedGuest.totalStays}x</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">{selectedGuest.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">{selectedGuest.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">{selectedGuest.idNumber}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border text-xs">
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                Tier Tamu
              </label>
              <select
                value={editVip}
                onChange={(e) => setEditVip(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-bold"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="VIP">VIP</option>
                <option value="BLACKLIST">BLACKLIST</option>
              </select>

              <label className="text-[11px] font-bold text-muted-foreground uppercase block pt-1">
                Catatan Resepsionis
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Preferensi bantal, kamar favorit, atau catatan khusus..."
                className="w-full p-2.5 bg-background border border-border rounded-lg text-xs"
              />
              <button
                onClick={handleSaveDossier}
                className="w-full py-2 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/90"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Perubahan ke Database
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-xs text-muted-foreground h-fit">
            Pilih tamu untuk melihat detail & riwayatnya.
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Tambah Profil Tamu Baru</h3>
              <button onClick={() => setAddOpen(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreateGuest} className="space-y-3">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">No. HP / WA</label>
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">No. KTP / Paspor</label>
                  <input
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Tier</label>
                  <select
                    value={newVip}
                    onChange={(e) => setNewVip(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg font-bold"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="VIP">VIP</option>
                    <option value="BLACKLIST">BLACKLIST</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 bg-muted rounded-xl">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl">
                  Simpan Tamu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {isMergeModalOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Merge className="w-5 h-5" />
                <h3 className="text-base text-foreground">Gabungkan Profil Duplikat</h3>
              </div>
              <button onClick={() => setIsMergeModalOpen(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Profil Utama:</label>
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg font-bold text-foreground">
                {selectedGuest.name} • {selectedGuest.totalStays}x Menginap
              </div>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Profil Duplikat yang Digabung:</label>
              <select
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="w-full p-2.5 bg-muted/40 border border-border rounded-lg font-medium"
              >
                {guests
                  .filter((g) => g.id !== selectedGuest.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.phone}) • {g.totalStays}x
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsMergeModalOpen(false)} className="px-4 py-2 border rounded-lg">
                Batal
              </button>
              <button onClick={handleMerge} className="px-5 py-2 bg-primary text-white font-bold rounded-lg">
                Gabungkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
