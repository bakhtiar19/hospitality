'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/sidebar';
import { Topbar } from '../../components/layout/topbar';
import { CommandDialog } from '../../components/command-menu/command-dialog';
import { useAuth } from '../../providers/auth-provider';
import { Hotel, ShieldCheck } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 animate-pulse">
          <Hotel className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Memverifikasi sesi keamanan hotel...
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Mengalihkan ke halaman login jika sesi belum aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Collapsible Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onOpenCommand={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/20">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandDialog open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
