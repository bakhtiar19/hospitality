'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Building2,
  Copy,
  Check,
  Power,
  KeyRound,
  AlertCircle,
  ExternalLink,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';
import { getHotelSettings } from '../../../lib/settings-store';

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  role: string;
  lastLoginAt?: string;
}

export default function AccountAndSecurityPage() {
  const { user, dbSynced } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add staff form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'FRONT_DESK' | 'HOUSEKEEPING' | 'ACCOUNTANT'>('FRONT_DESK');
  const [submitting, setSubmitting] = useState(false);

  // Change own password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingOwnPw, setChangingOwnPw] = useState(false);

  // Reset staff password modal
  const [resetStaffTarget, setResetStaffTarget] = useState<StaffMember | null>(null);
  const [staffNewPassword, setStaffNewPassword] = useState('');
  const [resettingStaff, setResettingStaff] = useState(false);

  const settings = getHotelSettings();
  const isOwnerOrManager =
    user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';
  const publicBookingSlug = (settings.propertyCode || 'winotosastro').toLowerCase();
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/book/${publicBookingSlug}`
      : `/book/${publicBookingSlug}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchStaff = async () => {
    if (!isOwnerOrManager || !dbSynced) return;
    setLoading(true);
    try {
      const list = await apiRequest<StaffMember[]>('/auth/staff');
      setStaff(list || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat daftar staf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [dbSynced, isOwnerOrManager]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await apiRequest('/auth/staff', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone, password, role }),
      });
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      await fetchStaff();
      showToast('Akun staf baru berhasil dibuat!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menambahkan akun staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      await apiRequest(`/auth/staff/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      await fetchStaff();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengubah status staf.');
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingOwnPw(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password akun Anda berhasil diperbarui!');
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah password.');
    } finally {
      setChangingOwnPw(false);
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaffTarget) return;
    setResettingStaff(true);
    try {
      await apiRequest(`/auth/staff/${resetStaffTarget.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: staffNewPassword }),
      });
      showToast(`Password untuk ${resetStaffTarget.fullName} berhasil direset!`);
      setResetStaffTarget(null);
      setStaffNewPassword('');
    } catch (err: any) {
      alert(err?.message || 'Gagal mereset password staf.');
    } finally {
      setResettingStaff(false);
    }
  };

  const copyBookingLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 bg-foreground text-background rounded-2xl shadow-2xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Akun Hotel, Staf & Keamanan (RBAC)
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola akses karyawan hotel Anda, ubah password, dan reset password staf.
        </p>
      </div>

      {/* Tenant Summary & Public Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            Identitas Tenant Properti
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Nama Properti</span>
              <span className="font-bold text-foreground">{settings.hotelName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Kode Properti</span>
              <span className="font-mono font-bold text-primary">{settings.propertyCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Pengguna Aktif</span>
              <span className="font-bold text-foreground">{user?.fullName} ({user?.role})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Status Database</span>
              <span className={`font-bold ${dbSynced ? 'text-emerald-600' : 'text-amber-600'}`}>
                {dbSynced ? 'Terhubung ke PostgreSQL' : 'Mode Cache Lokal'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Link Booking Engine Tamu (Publik)
          </div>
          <p className="text-xs text-muted-foreground">
            Bagikan link ini ke website / Instagram / WhatsApp hotel Anda agar tamu bisa memesan kamar langsung masuk ke PostgreSQL:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-mono text-foreground"
            />
            <button
              onClick={copyBookingLink}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-primary/90"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Disalin' : 'Salin'}
            </button>
            <a
              href={`/book/${publicBookingSlug}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-muted hover:bg-muted/80 rounded-xl border border-border"
              title="Buka Booking Engine"
            >
              <ExternalLink className="w-4 h-4 text-foreground" />
            </a>
          </div>
        </div>
      </div>

      {/* Change Own Password Card */}
      <form
        onSubmit={handleChangeOwnPassword}
        className="p-5 bg-card border border-border rounded-2xl space-y-3 text-xs"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
          <Lock className="w-4 h-4 text-primary" />
          Ubah Password Akun Saya ({user?.email})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Password Saat Ini *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Password lama"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-muted-foreground block mb-1">Password Baru (min. 8) *</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password baru"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={changingOwnPw || !dbSynced}
            className="py-2 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl"
          >
            {changingOwnPw ? 'Menyimpan...' : 'Perbarui Password'}
          </button>
        </div>
      </form>

      {/* Staff Management (OWNER / MANAGER only) */}
      {isOwnerOrManager && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateStaff}
            className="p-5 bg-card border border-border rounded-2xl space-y-3 text-xs h-fit"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
              <UserPlus className="w-4 h-4 text-primary" />
              Tambah Akun Staf Baru
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sari Resepsionis"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Email Staf *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fo@hotelanda.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Hak Akses (Role) *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg font-semibold"
              >
                <option value="FRONT_DESK">FRONT_DESK (Resepsionis / Check-In & Out)</option>
                <option value="HOUSEKEEPING">HOUSEKEEPING (Kebersihan Kamar)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Finance & Pajak)</option>
                <option value="MANAGER">MANAGER (Operasional Penuh)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">No. HP / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+6281..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Password Awal (min. 8) *</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !dbSynced}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl"
            >
              {submitting ? 'Menyimpan...' : 'Buat Akun Staf'}
            </button>
          </form>

          <div className="lg:col-span-2 p-5 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Users className="w-4 h-4 text-primary" />
                Daftar Akun Karyawan Hotel ({staff.length})
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Terisolasi per Hotel
              </span>
            </div>

            {loading ? (
              <div className="text-xs text-muted-foreground py-8 text-center">Memuat data staf...</div>
            ) : staff.length === 0 ? (
              <div className="text-xs text-muted-foreground py-8 text-center">
                Belum ada staf terdaftar atau server PostgreSQL belum tersambung.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {staff.map((m) => (
                  <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {m.fullName}
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                          {m.role}
                        </span>
                        {!m.isActive && (
                          <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] font-bold">
                            NONAKTIF
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground font-mono text-[11px]">{m.email}</div>
                    </div>

                    {m.id !== user?.sub && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setResetStaffTarget(m);
                            setStaffNewPassword('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg font-semibold border border-border hover:bg-muted flex items-center gap-1"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          Reset PW
                        </button>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 border ${
                            m.isActive
                              ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                              : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {m.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Reset Password Staff */}
      {resetStaffTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Reset Password Staf
              </div>
              <button onClick={() => setResetStaffTarget(null)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground">
              Staf: <span className="font-bold text-foreground">{resetStaffTarget.fullName}</span> ({resetStaffTarget.email})
            </p>
            <form onSubmit={handleResetStaffPassword} className="space-y-3">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Password Baru (min. 8) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffNewPassword}
                  onChange={(e) => setStaffNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetStaffTarget(null)}
                  className="px-4 py-2 bg-muted rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingStaff}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold"
                >
                  {resettingStaff ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
