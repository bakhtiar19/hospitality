'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Building2,
  UserCheck,
  LogOut,
  Database,
  WifiOff,
  ChevronDown,
  Check,
  Crown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useI18n } from '../../providers/intl-provider';
import { useAuth } from '../../providers/auth-provider';
import { getHotelSettings, HotelSettings } from '../../lib/settings-store';
import { apiRequest } from '../../lib/api-client';

interface TopbarProps {
  onOpenCommand: () => void;
}

interface AdminPropSummary {
  id: string;
  name: string;
  city: string;
  code: string;
  isActive: boolean;
}

export function Topbar({ onOpenCommand }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { user, isSuperAdmin, activePropertyId, switchProperty, dbSynced, logout } = useAuth();
  const router = useRouter();
  const [hotelSettings, setHotelSettings] = useState<HotelSettings>(getHotelSettings());
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [adminProperties, setAdminProperties] = useState<AdminPropSummary[]>([]);

  useEffect(() => {
    setHotelSettings(getHotelSettings());
    const handler = () => setHotelSettings(getHotelSettings());
    window.addEventListener('pms_settings_updated', handler);
    return () => window.removeEventListener('pms_settings_updated', handler);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiRequest<AdminPropSummary[]>('/admin/properties')
      .then((rows) => setAdminProperties(rows || []))
      .catch(() => {});
  }, [isSuperAdmin, activePropertyId]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-card border-b border-border shadow-xs">
      {/* Left: Active Tenant Hotel Badge (Switcher only for SUPER_ADMIN) & Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative">
          {isSuperAdmin ? (
            <button
              onClick={() => setPropertyOpen(!propertyOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-foreground bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight truncate max-w-[190px]">
                  {hotelSettings.hotelName || user?.propertyName || 'Pilih Properti'}
                </span>
                <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[190px]">
                  {hotelSettings.city || 'Super Admin'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-foreground bg-muted/60 border border-border rounded-lg">
              <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight truncate max-w-[190px]">
                  {hotelSettings.hotelName || user?.propertyName || 'Hotel PMS'}
                </span>
                <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[190px]">
                  {hotelSettings.city || 'Surakarta'}
                </span>
              </div>
              {dbSynced ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 text-[9px] font-bold"
                  title="Data tersinkronisasi langsung dengan PostgreSQL Server"
                >
                  <Database className="w-2.5 h-2.5" />
                  DB Live
                </span>
              ) : (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[9px] font-bold"
                  title="Mode cache lokal (API belum tersambung)"
                >
                  <WifiOff className="w-2.5 h-2.5" />
                  Local
                </span>
              )}
            </div>
          )}

          {isSuperAdmin && propertyOpen && (
            <div className="absolute left-0 mt-2 w-80 p-1.5 bg-popover border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider border-b border-border mb-1">
                <span>Switch Properti Terhubung</span>
                <Link
                  href="/admin"
                  onClick={() => setPropertyOpen(false)}
                  className="text-primary hover:underline"
                >
                  Console Admin
                </Link>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {adminProperties.map((prop) => (
                  <button
                    key={prop.id}
                    onClick={async () => {
                      await switchProperty(prop.id);
                      setPropertyOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-foreground truncate">{prop.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {prop.city} • {prop.code}
                      </div>
                    </div>
                    {activePropertyId === prop.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Command Menu / Search trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center justify-between flex-1 px-3.5 py-2 text-sm text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="truncate">{t('common.search')}</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium font-mono text-muted-foreground bg-card border border-border rounded shadow-xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Language, Theme, Notifications, User & Logout */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="flex items-center p-1 bg-muted/60 border border-border rounded-lg text-xs font-semibold">
          <button
            onClick={() => setLocale('id')}
            className={`px-2 py-1 rounded transition-colors ${
              locale === 'id' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ID
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded transition-colors ${
              locale === 'en' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
            {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-500" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground">
              {user?.fullName || 'Hotel Staff'}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                isSuperAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {user?.role || 'OWNER'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg border border-transparent hover:border-destructive/20 transition-colors"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
