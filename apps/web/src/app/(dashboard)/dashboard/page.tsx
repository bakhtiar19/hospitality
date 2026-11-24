'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CalendarCheck,
  DoorOpen,
  LogIn,
  LogOut,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Calendar,
  Share2,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';

const PACE_DATA_7D = [
  { date: '18 Nov', revenue: 9800000, occupancyRate: 65, adr: 680000 },
  { date: '19 Nov', revenue: 10400000, occupancyRate: 70, adr: 700000 },
  { date: '20 Nov', revenue: 11200000, occupancyRate: 72, adr: 710000 },
  { date: '21 Nov', revenue: 13500000, occupancyRate: 85, adr: 750000 },
  { date: '22 Nov', revenue: 14800000, occupancyRate: 92, adr: 780000 },
  { date: '23 Nov', revenue: 10900000, occupancyRate: 72, adr: 710000 },
  { date: '24 Nov', revenue: 12450000, occupancyRate: 80, adr: 720000 },
];

const PACE_DATA_30D = [
  { date: 'Wk 1', revenue: 68000000, occupancyRate: 74, adr: 710000 },
  { date: 'Wk 2', revenue: 74500000, occupancyRate: 78, adr: 725000 },
  { date: 'Wk 3', revenue: 81200000, occupancyRate: 83, adr: 740000 },
  { date: 'Wk 4', revenue: 60900000, occupancyRate: 80, adr: 730000 },
];

const CHANNEL_SHARE_DATA = [
  { name: 'Agoda (OTA)', value: 45, count: 18, revenue: 5600000, color: '#f43f5e' },
  { name: 'Direct Website', value: 30, count: 12, revenue: 3750000, color: '#0284c7' },
  { name: 'Walk-In Desk', value: 15, count: 6, revenue: 1900000, color: '#8b5cf6' },
  { name: 'Booking.com', value: 10, count: 4, revenue: 1200000, color: '#059669' },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const [trendRange, setTrendRange] = useState<'7d' | '30d'>('7d');
  const [activeTab, setActiveTab] = useState<'pace' | 'channels'>('pace');

  const chartData = trendRange === '7d' ? PACE_DATA_7D : PACE_DATA_30D;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Announcement Banner */}
      <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Agoda OTA Sandbox Connected:</span>{' '}
            <span className="text-foreground/80">{t('dashboard.announcement')}</span>
          </div>
        </div>
        <Link
          href="/channels"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Inspect Sync Logs
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Revenue Summary Cards (Today / MTD / YTD with % vs prior period) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {t('dashboard.revenueSummary')}
            </h2>
            <div className="group relative cursor-pointer" title="Revenue figures exclude cancelled and no-show reservations. Minor unit integer precision.">
              <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Asia/Jakarta (WIB) • Currency: IDR
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.revenueToday')}</span>
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                +14.2% vs Yesterday
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(12450000)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Yesterday:</span>
              <span className="font-medium text-foreground">{formatCurrency(10900000)}</span>
            </div>
          </div>

          {/* MTD */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.revenueMtd')}</span>
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                +8.5% vs Prev Month
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(284600000)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Target:</span>
              <span className="font-medium text-foreground">{formatCurrency(350000000)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">(81.3%)</span>
            </div>
          </div>

          {/* YTD */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.revenueYtd')}</span>
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                +22.4% vs Prev Year
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(3140500000)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>ADR:</span>
              <span className="font-medium text-foreground">{formatCurrency(720000)}</span>
              <span className="ml-2">RevPAR:</span>
              <span className="font-medium text-foreground">{formatCurrency(540000)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bookings Overview (Bookings Today, Available Rooms, Check-ins, Check-outs) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {t('dashboard.bookingsOverview')}
            </h2>
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>
          <Link href="/front-office" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            Buka Front Desk & Tape Chart <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.bookingsToday')}</div>
              <div className="text-2xl font-bold text-foreground">18</div>
              <div className="text-[11px] text-muted-foreground">+4 from Agoda</div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.roomsAvailable')}</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">8 / 40</div>
              <div className="text-[11px] text-muted-foreground">80% Occupancy (32 Booked)</div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.checkIns')}</div>
              <div className="text-2xl font-bold text-foreground">12</div>
              <div className="text-[11px] text-muted-foreground">7 Checked In, 5 Due</div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.checkOuts')}</div>
              <div className="text-2xl font-bold text-foreground">9</div>
              <div className="text-[11px] text-muted-foreground">8 Completed, 1 Late</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Analytics Visuals (Recharts Pace & Channel Share) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue & Occupancy Pace Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Revenue & Occupancy Pace Trend
              </h3>
              <p className="text-xs text-muted-foreground">
                Daily actualized room revenue against hotel occupancy pace
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setTrendRange('7d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  trendRange === '7d' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTrendRange('30d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  trendRange === '30d' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <Tooltip
                  formatter={(val: any, name: any) => {
                    if (name === 'revenue') return [formatCurrency(val), 'Revenue'];
                    return [val, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Room Revenue
              </span>
              <span>Avg ADR: <strong>{formatCurrency(720000)}</strong></span>
            </div>
            <span className="font-medium text-foreground">Peak Occupancy: 92% (22 Nov)</span>
          </div>
        </div>

        {/* Right: Channel Share Donut Chart (1 col) */}
        <div className="bg-card border border-border rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-rose-500" />
                Channel Distribution
              </h3>
              <p className="text-xs text-muted-foreground">Share of reservations by source</p>
            </div>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CHANNEL_SHARE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CHANNEL_SHARE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#0f172a',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            {CHANNEL_SHARE_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-foreground font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{item.count} bkg</span>
                  <span className="font-bold text-foreground">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Main Grid: Recent Bookings Table + Side Widgets (Property Card, Error Status, Channels) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Bookings Table (2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">
                {t('dashboard.recentBookings')}
              </h3>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <Link
              href="/front-office"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Buka Front Desk & Reservasi <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Booking #</th>
                  <th className="px-4 py-3">Guest Name</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Room Type</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Agoda OTA Reservation */}
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      AGODA
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                    AGD-88291
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    Bambang Setyawan
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    24 Nov - 26 Nov
                  </td>
                  <td className="px-4 py-3.5 text-foreground">
                    Deluxe King (Room 201)
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {formatCurrency(1760000)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                      CONFIRMED
                    </span>
                  </td>
                </tr>

                {/* Direct Booking */}
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      DIRECT
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                    BK-2026-0042
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    Siti Rahmawati
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    24 Nov - 25 Nov
                  </td>
                  <td className="px-4 py-3.5 text-foreground">
                    Superior Twin (Room 104)
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {formatCurrency(750000)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600">
                      CHECKED_IN
                    </span>
                  </td>
                </tr>

                {/* Walk-in Booking */}
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      WALK-IN
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                    BK-2026-0043
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    Hendro Wijaya
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    24 Nov - 27 Nov
                  </td>
                  <td className="px-4 py-3.5 text-foreground">
                    Executive Suite (Room 302)
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {formatCurrency(3600000)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                      CONFIRMED
                    </span>
                  </td>
                </tr>

                {/* Agoda Unassigned Booking */}
                <tr className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      AGODA
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                    AGD-88292
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    Jessica Hartono
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    25 Nov - 28 Nov
                  </td>
                  <td className="px-4 py-3.5 text-amber-600 font-medium">
                    Family Suite (Unassigned)
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {formatCurrency(4800000)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                      UNASSIGNED
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Side Cards (Property Card, Error Status, Channels Status, Quick Access) */}
        <div className="space-y-4">
          {/* Active Property Card with Booking Engine Link */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('dashboard.propertyCard')}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <h4 className="mt-2 font-bold text-base text-foreground">
              Hotel Winotosastro AProject
            </h4>
            <p className="text-xs text-muted-foreground">
              Jl. Brigjend Slamet Riyadi, Surakarta (Solo), Central Java
            </p>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">40 Rooms • 4 Floors</span>
              <Link
                href="/book/hotel-winotosastro"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t('dashboard.directBookingLink')} <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Channels Status (Per OTA Health) */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('dashboard.channelStatus')}
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Agoda Extranet</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary font-semibold rounded">
                    MOCK/SANDBOX
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  38ms • OK
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg opacity-60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-foreground">Booking.com</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Pending Phase 6</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg opacity-60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  <span className="text-xs font-medium text-foreground">Traveloka</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Scheduled</span>
              </div>
            </div>
          </div>

          {/* Error Status Center */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('dashboard.errorCenter')}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              All inventory ledgers and ARI sync queues are operating normally. 0 active sync errors.
            </p>
          </div>

          {/* Quick Access Shortcuts */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              {t('dashboard.quickAccess')}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/front-office"
                className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium text-foreground transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                Reservasi Baru
              </Link>
              <Link
                href="/front-office"
                className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium text-foreground transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Tape & Operasional
              </Link>
              <Link
                href="/channels"
                className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium text-foreground transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-primary" />
                Push ARI
              </Link>
              <Link
                href="/rates"
                className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium text-foreground transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Rate Matrix
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
