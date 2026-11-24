'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  CalendarCheck,
  TrendingUp,
  Share2,
  ConciergeBell,
  Sparkles,
  Receipt,
  Globe,
  CreditCard,
  Users,
  Image as ImageIcon,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Hotel,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useI18n } from '../../providers/intl-provider';

interface NavItem {
  id: string;
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isExternal?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', nameKey: 'modules.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'settings', nameKey: 'modules.settings', href: '/settings', icon: Settings },
  { id: 'bookings', nameKey: 'modules.bookings', href: '/bookings', icon: CalendarCheck, badge: 'Tape' },
  { id: 'rates', nameKey: 'modules.rates', href: '/rates', icon: TrendingUp },
  { id: 'channels', nameKey: 'modules.channels', href: '/channels', icon: Share2, badge: 'Agoda' },
  { id: 'frontOffice', nameKey: 'modules.frontOffice', href: '/front-office', icon: ConciergeBell },
  { id: 'housekeeping', nameKey: 'modules.housekeeping', href: '/housekeeping', icon: Sparkles },
  { id: 'backOffice', nameKey: 'modules.backOffice', href: '/back-office', icon: Receipt },
  { id: 'bookingEngine', nameKey: 'modules.bookingEngine', href: '/book/hotel-winotosastro', icon: Globe, isExternal: true },
  { id: 'payments', nameKey: 'modules.payments', href: '/payments', icon: CreditCard },
  { id: 'crm', nameKey: 'modules.crm', href: '/crm', icon: Users },
  { id: 'otaContent', nameKey: 'modules.otaContent', href: '/ota-content', icon: ImageIcon },
  { id: 'reports', nameKey: 'modules.reports', href: '/reports', icon: BarChart3 },
  { id: 'account', nameKey: 'modules.account', href: '/account', icon: ShieldCheck },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-30 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-md flex-shrink-0">
            <Hotel className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight truncate text-white">
                Hospitality PMS
              </span>
              <span className="text-xs text-sidebar-foreground/60 truncate">
                by Athelu
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List mirroring Bookandlink Module Layout */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');

          return (
            <Link
              key={item.id}
              href={item.href}
              target={item.isExternal ? '_blank' : undefined}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent'
              )}
              title={collapsed ? t(item.nameKey) : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105',
                  isActive ? 'text-white' : 'text-sidebar-foreground/60 group-hover:text-white'
                )}
              />
              {!collapsed && (
                <span className="flex-1 truncate">
                  {t(item.nameKey)}
                </span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/20 text-primary-foreground border border-primary/30'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Status Pill */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border/60 bg-sidebar-accent/30 text-xs">
          <div className="flex items-center justify-between text-sidebar-foreground/70">
            <span className="font-semibold text-white">Channel Manager</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Agoda Live
            </span>
          </div>
          <p className="mt-1 text-[11px] text-sidebar-foreground/50 truncate">
            Winotosastro Surakarta
          </p>
        </div>
      )}
    </aside>
  );
}
