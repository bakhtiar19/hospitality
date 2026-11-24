'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Topbar } from '../../components/layout/topbar';
import { CommandDialog } from '../../components/command-menu/command-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Collapsible Left Sidebar mirroring Bookandlink */}
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
