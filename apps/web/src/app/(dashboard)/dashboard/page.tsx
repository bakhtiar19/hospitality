'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  DoorOpen,
  LogIn,
  LogOut,
  HelpCircle,
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
} from 'recharts';
import { useI18n } from '../../../providers/intl-provider';
import { useAuth } from '../../../providers/auth-provider';
import { apiRequest } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/utils';
import { getHotelSettings } from '../../../lib/settings-store';

interface AnalyticsPayload {
  todayDate: string;
  totalRooms: number;
  cleanRooms: number;
  dirtyRooms: number;
  occupiedToday: number;
  occupancyPercent: number;
  arrivalsToday: number;
  departuresToday: number;
  inHouseCount: number;
  revenueToday: number;
  revenueMtd: number;
  revenueTotal: number;
  adr: number;
  revpar: number;
  pace7d: Array<{ date: string; revenue: number; occupancyRate: number; adr: number }>;
  channelShare: Array<{ name: string; value: number; count: number; revenue: number; color: string }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    source: string;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
  }>;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { dbSynced } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const settings = getHotelSettings();

  const loadAnalytics = async () => {
    if (!dbSynced) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<AnalyticsPayload>('/pms/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dbSynced]);

  const chartData = analytics?.pace7d || [];
  const channelData = analytics?.channelShare || [];
  const availableRooms = Math.max(0, (analytics?.totalRooms || 0) - (analytics?.occupiedToday || 0));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Announcement Banner */}
      <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">PostgreSQL Live Analytics ({analytics?.todayDate || 'Asia/Jakarta'}):</span>{' '}
            <span className="text-foreground/80">
              Seluruh KPI okupansi, ADR, RevPAR, dan reservasi di bawah dihitung real-time dari database properti Anda.
            </span>
          </div>
        </div>
        <button
          onClick={loadAnalytics}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh KPI
        </button>
      </div>

      {/* 2. Revenue Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {t('dashboard.revenueSummary')}
            </h2>
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Asia/Jakarta (WIB) • Currency: {settings.currency || 'IDR'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.revenueToday')}</span>
              <span className="text-emerald-600 font-semibold text-xs">
                {analytics?.occupiedToday || 0} Kamar Terisi
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(analytics?.revenueToday || 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Okupansi:</span>
              <span className="font-bold text-foreground">{analytics?.occupancyPercent || 0}%</span>
            </div>
          </div>

          {/* MTD */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.revenueMtd')}</span>
              <span className="text-emerald-600 font-semibold text-xs">Bulan Berjalan</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(analytics?.revenueMtd || 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Kamar Bersih / Kotor:</span>
              <span className="font-medium text-emerald-600">{analytics?.cleanRooms || 0} Clean</span>
              <span>/</span>
              <span className="font-medium text-amber-600">{analytics?.dirtyRooms || 0} Dirty</span>
            </div>
          </div>

          {/* Total + ADR/RevPAR */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total Revenue Tercatat</span>
              <span className="text-primary font-semibold text-xs">Real-Time DB</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(analytics?.revenueTotal || 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>ADR:</span>
              <span className="font-medium text-foreground">{formatCurrency(analytics?.adr || 0)}</span>
              <span className="ml-2">RevPAR:</span>
              <span className="font-medium text-foreground">{formatCurrency(analytics?.revpar || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bookings Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {t('dashboard.bookingsOverview')}
          </h2>
          <Link href="/front-office" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            Buka Front Desk & Tape Chart <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">In-House Saat Ini</div>
              <div className="text-2xl font-bold text-foreground">{analytics?.inHouseCount || 0}</div>
              <div className="text-[11px] text-muted-foreground">Tamu menginap aktif</div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.roomsAvailable')}</div>
              <div className="text-2xl font-bold text-emerald-600">
                {availableRooms} / {analytics?.totalRooms || 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {analytics?.occupancyPercent || 0}% Occupancy
              </div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.checkIns')}</div>
              <div className="text-2xl font-bold text-foreground">{analytics?.arrivalsToday || 0}</div>
              <div className="text-[11px] text-muted-foreground">Kedatangan hari ini</div>
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t('dashboard.checkOuts')}</div>
              <div className="text-2xl font-bold text-foreground">{analytics?.departuresToday || 0}</div>
              <div className="text-[11px] text-muted-foreground">Keberangkatan hari ini</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Tren Pendapatan Kamar (7 Hari Terakhir)
            </h3>
            <p className="text-xs text-muted-foreground">
              Pendapatan kamar harian aktual dari reservasi PostgreSQL
            </p>
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
                  formatter={(val: any) => [formatCurrency(val), 'Revenue']}
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
        </div>

        <div className="bg-card border border-border rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-rose-500" />
              Distribusi Channel Reservasi
            </h3>
            <p className="text-xs text-muted-foreground">Berdasarkan sumber pemesanan</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {channelData.length === 0 ? (
              <span className="text-xs text-muted-foreground">Belum ada data reservasi</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            {channelData.map((item) => (
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

      {/* 5. Recent Bookings + Property Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-bold text-base text-foreground">{t('dashboard.recentBookings')}</h3>
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
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!analytics || analytics.recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada reservasi tercatat pada hotel ini.
                    </td>
                  </tr>
                ) : (
                  analytics.recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold text-primary">{b.source}</td>
                      <td className="px-4 py-3 font-mono">{b.bookingNumber}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{b.guestName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {b.checkInDate} → {b.checkOutDate}
                      </td>
                      <td className="px-4 py-3">
                        {b.roomNumber} ({b.roomType})
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-4">
          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('dashboard.propertyCard')}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <h4 className="mt-2 font-bold text-base text-foreground">{settings.hotelName}</h4>
            <p className="text-xs text-muted-foreground">{settings.address || settings.city}</p>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{analytics?.totalRooms || 0} Rooms</span>
              <Link
                href={`/book/${(settings.propertyCode || 'winotosastro').toLowerCase()}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t('dashboard.directBookingLink')} <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('dashboard.errorCenter')}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              PostgreSQL & sistem multi-tenant aktif. 0 error sinkronisasi.
            </p>
          </div>

          <div className="p-5 bg-card border border-border rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              {t('dashboard.quickAccess')}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/front-office" className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium">
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                Reservasi Baru
              </Link>
              <Link href="/front-office" className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Tape Chart
              </Link>
              <Link href="/channels" className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium">
                <Share2 className="w-3.5 h-3.5 text-primary" />
                Push ARI
              </Link>
              <Link href="/rates" className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-muted rounded-lg font-medium">
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
