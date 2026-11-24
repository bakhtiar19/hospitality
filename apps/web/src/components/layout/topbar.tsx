'use client';

import React, { useState } from 'react';
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  Building2,
  Check,
  UserCheck,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useI18n } from '../../providers/intl-provider';

interface TopbarProps {
  onOpenCommand: () => void;
}

const mockProperties = [
  { id: 'prop-1', name: 'Hotel Winotosastro AProject', city: 'Surakarta (Solo)', active: true },
  { id: 'prop-2', name: 'Grand Merdeka Boutique Hotel', city: 'Yogyakarta', active: false },
  { id: 'prop-3', name: 'Candi Heritage Resort', city: 'Magelang', active: false },
];

export function Topbar({ onOpenCommand }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(mockProperties[0]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-card border-b border-border shadow-xs">
      {/* Left: Property Switcher & Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {/* Multi-Property Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPropertyOpen(!propertyOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-semibold text-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <Building2 className="w-4 h-4 text-primary" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight truncate max-w-[190px]">
                {selectedProperty.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {selectedProperty.city}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {propertyOpen && (
            <div className="absolute left-0 mt-2 w-72 p-1.5 bg-popover border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Active Hotel Property
              </div>
              {mockProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => {
                    setSelectedProperty(prop);
                    setPropertyOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground">{prop.name}</div>
                    <div className="text-xs text-muted-foreground">{prop.city}</div>
                  </div>
                  {selectedProperty.id === prop.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
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

      {/* Right Controls: Language, Theme, Notifications, User */}
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
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground">AProject Admin</span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              OWNER / GENERAL MANAGER
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
