'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  LayoutDashboard,
  Settings,
  Share2,
  Sparkles,
  Users,
  Search,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

interface CommandDialogProps {
  open: boolean;
  onClose: () => void;
}

const commands = [
  { label: 'Go to Dashboard', icon: LayoutDashboard, href: '/dashboard', category: 'Navigation' },
  { label: 'View Tape Chart / Calendar', icon: CalendarCheck, href: '/bookings', category: 'Bookings' },
  { label: 'Channel Manager & Agoda Sync', icon: Share2, href: '/channels', category: 'Channel Manager' },
  { label: 'Housekeeping Board', icon: Sparkles, href: '/housekeeping', category: 'Operations' },
  { label: 'Property & Tax Settings', icon: Settings, href: '/settings', category: 'Settings' },
  { label: 'Guest CRM', icon: Users, href: '/crm', category: 'CRM' },
  { label: 'Payments & Billing', icon: CreditCard, href: '/payments', category: 'Finance' },
  { label: 'Direct Booking Engine', icon: Building, href: '/book/hotel-winotosastro', category: 'Public' },
];

export function CommandDialog({ open, onClose }: CommandDialogProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-popover text-popover-foreground rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type a command or search (e.g. tape chart, room 201, agoda)..."
            className="w-full h-12 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Navigation
          </div>
          {commands.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  onClose();
                  router.push(cmd.href);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted text-left transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">{cmd.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({cmd.category})</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border text-xs text-muted-foreground">
          <span>Tip: Use ↑ ↓ arrows to navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
