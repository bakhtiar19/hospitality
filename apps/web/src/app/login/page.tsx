'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hotel, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';

export default function LoginPage() {
  const { login, isAuthenticated, isSuperAdmin } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(isSuperAdmin ? '/admin' : '/front-office');
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      router.replace(loggedUser.role === 'SUPER_ADMIN' ? '/admin' : '/front-office');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal masuk. Periksa kembali email, password, atau koneksi API.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
            <Hotel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground tracking-tight">Hospitality PMS</h1>
            <p className="text-xs text-muted-foreground">by AProject • Multi-Tenant Hotel Platform</p>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">Masuk ke Panel Manajemen Hotel</h2>
          <p className="text-xs text-muted-foreground">
            Setiap hotel memiliki ruang data terisolasi & aman dengan kontrol akses staf (RBAC).
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1.5">Email Staff / Owner</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="owner@hotelanda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-xs"
          >
            <span>{submitting ? 'Memverifikasi...' : 'Masuk ke PMS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-border space-y-3">
          <Link
            href="/register"
            className="w-full py-2.5 px-4 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <Building2 className="w-4 h-4 text-primary" />
            Pemilik Hotel Baru? Daftarkan Hotel Anda
          </Link>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dilindungi JWT Auth, Multi-Tenant Isolation & PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
