'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Star,
  UserCheck,
  Ban,
  Tag,
  Merge,
  History,
  Phone,
  Mail,
  CreditCard,
  ChevronRight,
  Plus,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
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
  preferences: string[];
  notes: string;
}

const INITIAL_GUESTS: GuestRecord[] = [
  {
    id: 'gst-001',
    name: 'Bambang Setyawan',
    email: 'bambang.setyawan@example.id',
    phone: '+62 812-3456-7890',
    idNumber: '3372011234560001 (KTP)',
    vipStatus: 'VIP',
    totalStays: 6,
    lifetimeSpend: 9840000,
    lastStay: '24 Nov 2026',
    preferences: ['High Floor', 'Quiet Room', 'Feather Pillow', 'Morning Newspaper'],
    notes: 'Key corporate account from Jakarta. Prefers Room 201 or 301.',
  },
  {
    id: 'gst-002',
    name: 'Dewi Lestari',
    email: 'dewi.lestari@example.id',
    phone: '+62 812-9876-5432',
    idNumber: '3372019876540002 (KTP)',
    vipStatus: 'VIP',
    totalStays: 4,
    lifetimeSpend: 6200000,
    lastStay: '15 Oct 2026',
    preferences: ['King Bed', 'Bathtub', 'Balcony View', 'Late Check-out'],
    notes: 'Leisure traveler. Frequently reserves Bed & Breakfast rate.',
  },
  {
    id: 'gst-003',
    name: 'Hendro Wijaya',
    email: 'hendro.wijaya@example.com',
    phone: '+62 813-1122-3344',
    idNumber: '9201928374 (SIM)',
    vipStatus: 'REGULAR',
    totalStays: 2,
    lifetimeSpend: 2450000,
    lastStay: '02 Sep 2026',
    preferences: ['Non-Smoking', 'Twin Bed'],
    notes: 'Solo traveler attending Solo cultural and batik expos.',
  },
  {
    id: 'gst-004',
    name: 'Agus Susanto',
    email: 'agus.susanto.temp@example.com',
    phone: '+62 812-3456-7890', // duplicate phone
    idNumber: '3372011234560001',
    vipStatus: 'REGULAR',
    totalStays: 1,
    lifetimeSpend: 880000,
    lastStay: '20 Jul 2026',
    preferences: ['High Floor'],
    notes: 'Potential duplicate profile from old Agoda reservation.',
  },
];

export default function GuestCrmPage() {
  const { t } = useI18n();
  const [guests, setGuests] = useState<GuestRecord[]>(INITIAL_GUESTS);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'VIP' | 'REGULAR' | 'BLACKLIST'>('ALL');
  const [selectedGuest, setSelectedGuest] = useState<GuestRecord>(INITIAL_GUESTS[0]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('gst-004');
  const [mergeSuccessMessage, setMergeSuccessMessage] = useState<string | null>(null);

  const filteredGuests = guests.filter((g) => {
    const matchesTag = filterTag === 'ALL' || g.vipStatus === filterTag;
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search) ||
      g.idNumber.includes(search);
    return matchesTag && matchesSearch;
  });

  const handleMerge = () => {
    const source = guests.find((g) => g.id === mergeSourceId);
    if (!source || source.id === selectedGuest.id) return;

    // Consolidate into selected guest
    const updatedTarget: GuestRecord = {
      ...selectedGuest,
      totalStays: selectedGuest.totalStays + source.totalStays,
      lifetimeSpend: selectedGuest.lifetimeSpend + source.lifetimeSpend,
      preferences: Array.from(new Set([...selectedGuest.preferences, ...source.preferences])),
      notes: `${selectedGuest.notes} | Merged from ${source.name} (${source.id})`,
    };

    const remainingGuests = guests.filter((g) => g.id !== source.id).map((g) => (g.id === selectedGuest.id ? updatedTarget : g));

    setGuests(remainingGuests);
    setSelectedGuest(updatedTarget);
    setIsMergeModalOpen(false);
    setMergeSuccessMessage(`Successfully merged profile ${source.name} (${source.id}) into ${selectedGuest.name}!`);
    setTimeout(() => setMergeSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Guest CRM & Profiles
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Guest stay histories, VIP tiers, loyalty preferences, and duplicate profile deduplication
          </p>
        </div>

        <button
          onClick={() => setIsMergeModalOpen(true)}
          className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors self-start"
        >
          <Merge className="w-3.5 h-3.5" />
          Merge Duplicate Guests
        </button>
      </div>

      {/* Success Notification */}
      {mergeSuccessMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {mergeSuccessMessage}
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, KTP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs font-semibold">
          <button
            onClick={() => setFilterTag('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTag === 'ALL' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All Guests ({guests.length})
          </button>
          <button
            onClick={() => setFilterTag('VIP')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              filterTag === 'VIP' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Star className="w-3 h-3 fill-current" /> VIP
          </button>
          <button
            onClick={() => setFilterTag('REGULAR')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterTag === 'REGULAR' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Regular
          </button>
          <button
            onClick={() => setFilterTag('BLACKLIST')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              filterTag === 'BLACKLIST' ? 'bg-rose-500 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Ban className="w-3 h-3" /> Blacklist
          </button>
        </div>
      </div>

      {/* 3. Main Grid: Guest List (Left) + Selected Guest Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Guest Directory Table (2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Guest Directory</h3>
            <span className="text-xs text-muted-foreground">{filteredGuests.length} profiles found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                <tr>
                  <th className="px-4 py-3">Guest Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Stays</th>
                  <th className="px-4 py-3">Lifetime Spend</th>
                  <th className="px-4 py-3">Last Stay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredGuests.map((guest) => {
                  const isSelected = selectedGuest.id === guest.id;
                  return (
                    <tr
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
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
                      <td className="px-4 py-3.5 font-bold text-foreground">{guest.totalStays} stays</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-primary">
                        {formatCurrency(guest.lifetimeSpend)}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{guest.lastStay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Guest Dossier & Stay History (1 col) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Guest Dossier
              </span>
              <h3 className="font-bold text-base text-foreground mt-0.5">{selectedGuest.name}</h3>
            </div>
            {selectedGuest.vipStatus === 'VIP' && (
              <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Star className="w-4 h-4 fill-current" />
              </span>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-muted/30 rounded-xl">
              <span className="text-muted-foreground text-[10px] block">Lifetime Value</span>
              <span className="text-sm font-extrabold text-foreground font-mono">
                {formatCurrency(selectedGuest.lifetimeSpend)}
              </span>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl">
              <span className="text-muted-foreground text-[10px] block">Completed Stays</span>
              <span className="text-sm font-extrabold text-foreground">{selectedGuest.totalStays} Stays</span>
            </div>
          </div>

          {/* Contact Details */}
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

          {/* Guest Preferences Tags */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Preferences & Perks
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedGuest.preferences.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Staff Notes */}
          <div className="space-y-1 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Internal Front Desk Notes
            </span>
            <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
              {selectedGuest.notes}
            </p>
          </div>
        </div>
      </div>

      {/* 4. MODAL: Merge Duplicate Guests */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Merge className="w-5 h-5" />
                <h3 className="text-base text-foreground">Merge Duplicate Profiles</h3>
              </div>
              <button onClick={() => setIsMergeModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Consolidate duplicate OTA or direct profiles into a single primary guest. All past stays, spend,
              and preferences will be transferred into the target record.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Target Profile (Primary Record to Keep):
                </label>
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg font-bold text-foreground">
                  {selectedGuest.name} ({selectedGuest.id}) • {selectedGuest.totalStays} Stays
                </div>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Source Profile (Duplicate to Merge & Archive):
                </label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground"
                >
                  {guests
                    .filter((g) => g.id !== selectedGuest.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.id}) • {g.totalStays} Stays • {formatCurrency(g.lifetimeSpend)}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
              >
                Confirm Profile Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
