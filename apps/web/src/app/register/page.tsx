'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Hotel,
  Building2,
  MapPin,
  Phone,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';

export default function RegisterHotelPage() {
  const { registerHotel } = useAuth();
  const router = useRouter();

  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPendingMsg(null);
    setSubmitting(true);
    try {
      const res = await registerHotel({
        hotelName,
        city,
        address,
        phone,
        ownerName,
        email,
        password,
      });
      if (res.pendingApproval) {
        setPendingMsg(
          res.message ||
            'Pendaftaran berhasil dikirim! Akun Anda menunggu aktivasi dari Admin AProject.'
        );
      } else {
        router.replace('/front-office');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Pendaftaran gagal. Pastikan seluruh kolom valid dan API aktif.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-foreground">Daftar Properti Hotel Baru</h1>
              <p className="text-[11px] text-muted-foreground">Hospitality PMS by AProject</p>
            </div>
          </div>
          <Link href="/login" className="text-xs font-bold text-primary hover:underline">
            Sudah punya akun?
          </Link>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Otomatis menyiapkan database kamar awal (10 kamar Superior & Deluxe), konfigurasi pajak PBJT + Service Charge,
            dan link Booking Engine khusus hotel Anda.
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {pendingMsg && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Pendaftaran Terkirim
            </div>
            <p>{pendingMsg}</p>
            <Link href="/login" className="inline-block font-bold text-primary hover:underline">
              Kembali ke Halaman Login →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-foreground block mb-1">Nama Hotel / Penginapan *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hotel Mawar Indah Solo"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Kota *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Surakarta / Yogyakarta"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Telepon Resepsionis</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+62 271 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-foreground block mb-1">Alamat Lengkap</label>
              <input
                type="text"
                placeholder="Jl. Slamet Riyadi No. ..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="sm:col-span-2 border-t border-border pt-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Akun Pemilik (Owner)</span>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-foreground block mb-1">Nama Pemilik Hotel *</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Budi Santoso"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Email Login *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="owner@hotel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Password (min. 8 karakter) *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <span>{submitting ? 'Menyiapkan Workspace Hotel...' : 'Buat Akun Hotel & Masuk'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
