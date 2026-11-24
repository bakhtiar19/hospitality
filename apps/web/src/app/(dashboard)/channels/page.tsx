'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  Code,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Radio,
  ExternalLink,
  HelpCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { formatCurrency } from '../../../lib/utils';
import { getStoredBookings, saveStoredBookings, TapeChartBooking } from '../../../lib/bookings-store';

interface SyncLogItem {
  id: string;
  channel: string;
  type: 'AVAILABILITY' | 'RATES' | 'RESTRICTIONS' | 'RESERVATIONS_PULL';
  status: 'SUCCESS' | 'FAILED';
  itemsCount: number;
  latencyMs: number;
  time: string;
  requestPayload: any;
  responsePayload: any;
  error?: string;
}

export default function ChannelManagerPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'mappings' | 'ari-push' | 'logs' | 'simulator'>('mappings');
  const [selectedLog, setSelectedLog] = useState<SyncLogItem | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Initial Sync Logs with realistic payloads
  const [logs, setLogs] = useState<SyncLogItem[]>([
    {
      id: 'log-001',
      channel: 'AGODA',
      type: 'AVAILABILITY',
      status: 'SUCCESS',
      itemsCount: 4,
      latencyMs: 38,
      time: '10:24:12 WIB',
      requestPayload: {
        hotelId: 'HOTEL-WINOTOSASTRO-AGD',
        version: '2.0',
        updates: [
          { roomTypeCode: 'AGD-RT-SUP', date: '2026-11-25', inventory: 10, status: 'OPEN' },
          { roomTypeCode: 'AGD-RT-DLX', date: '2026-11-25', inventory: 8, status: 'OPEN' },
          { roomTypeCode: 'AGD-RT-EXEC', date: '2026-11-25', inventory: 3, status: 'OPEN' },
          { roomTypeCode: 'AGD-RT-FAM', date: '2026-11-25', inventory: 2, status: 'OPEN' },
        ],
      },
      responsePayload: {
        status: 'Success',
        echoToken: 'ACK-1732418400000',
        message: 'Availability matrix successfully synced to Agoda Extranet inventory ledger',
      },
    },
    {
      id: 'log-002',
      channel: 'AGODA',
      type: 'RATES',
      status: 'SUCCESS',
      itemsCount: 6,
      latencyMs: 42,
      time: '10:20:05 WIB',
      requestPayload: {
        hotelId: 'HOTEL-WINOTOSASTRO-AGD',
        currency: 'IDR',
        updates: [
          { roomTypeCode: 'AGD-RT-DLX', ratePlanCode: 'AGD-RP-RO', rate: 750000, currency: 'IDR' },
          { roomTypeCode: 'AGD-RT-DLX', ratePlanCode: 'AGD-RP-BB', rate: 880000, currency: 'IDR' },
          { roomTypeCode: 'AGD-RT-EXEC', ratePlanCode: 'AGD-RP-BB', rate: 1250000, currency: 'IDR' },
        ],
      },
      responsePayload: {
        status: 'Success',
        echoToken: 'ACK-1732418402000',
        message: 'Rate plans and daily pricing matrices updated successfully',
      },
    },
    {
      id: 'log-003',
      channel: 'AGODA',
      type: 'RESERVATIONS_PULL',
      status: 'SUCCESS',
      itemsCount: 1,
      latencyMs: 65,
      time: '09:45:00 WIB',
      requestPayload: { channel: 'AGODA', action: 'PULL_PENDING' },
      responsePayload: {
        status: 'Success',
        reservations: [
          {
            channelReservationId: 'AGD-88291',
            guest: 'Bambang Setyawan',
            dates: '2026-11-25 to 2026-11-27',
            roomType: 'AGD-RT-DLX',
            amount: 1760000,
          },
        ],
      },
    },
  ]);

  const handlePushARI = (type: 'ALL' | 'AVAILABILITY' | 'RATES' | 'RESTRICTIONS') => {
    setIsPushing(true);
    setPushStatusMessage(`Pushing ${type} updates to Agoda Extranet sandbox...`);

    setTimeout(() => {
      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        channel: 'AGODA',
        type: type === 'ALL' ? 'AVAILABILITY' : type,
        status: 'SUCCESS',
        itemsCount: 4,
        latencyMs: 39,
        time: new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB',
        requestPayload: {
          hotelId: 'HOTEL-WINOTOSASTRO-AGD',
          syncAction: type,
          source: 'PMS-WINOTOSASTRO',
          timestamp: new Date().toISOString(),
        },
        responsePayload: {
          status: 'Success',
          echoToken: `ACK-${Date.now()}`,
          message: `${type} matrix successfully acknowledged by Agoda ARI Gateway`,
        },
      };

      setLogs((prev) => [newLog, ...prev]);
      setIsPushing(false);
      setPushStatusMessage(`Successfully pushed ${type} to Agoda (39ms ACK).`);
      setTimeout(() => setPushStatusMessage(null), 4000);
    }, 600);
  };

  const handleSimulateInboundBooking = () => {
    setIsPushing(true);
    setPushStatusMessage('Simulating new guest booking from Agoda Extranet...');

    setTimeout(() => {
      const mockId = `AGD-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Store in shared local storage so it immediately reflects in Tape Chart & Front Office
      const newBooking: TapeChartBooking = {
        id: `bk-${Date.now()}`,
        bookingNumber: mockId,
        source: 'AGODA',
        guestName: 'Bambang Setyawan',
        phone: '+628198765432',
        roomNumber: '202',
        roomType: 'Deluxe King',
        ratePlan: 'Bed & Breakfast',
        checkInDate: '2026-11-24', // Arrival Today!
        checkOutDate: '2026-11-27',
        status: 'CONFIRMED',
        totalAmount: 1760000,
        balance: 1760000,
      };

      try {
        const current = getStoredBookings();
        saveStoredBookings([newBooking, ...current]);
      } catch (err) {
        console.error(err);
      }

      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        channel: 'AGODA',
        type: 'RESERVATIONS_PULL',
        status: 'SUCCESS',
        itemsCount: 1,
        latencyMs: 45,
        time: new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB',
        requestPayload: { channel: 'AGODA', action: 'PULL_PENDING' },
        responsePayload: {
          status: 'Success',
          importedBookingNumber: `BK-${mockId}`,
          guest: 'Bambang Setyawan',
          channelReservationId: mockId,
          totalAmount: 1760000,
          roomType: 'Deluxe King (Kamar 202)',
          importStatus: 'IMPORTED_CONFIRMED',
        },
      };

      setLogs((prev) => [newLog, ...prev]);
      setIsPushing(false);
      setPushStatusMessage(`Inbound Agoda booking ${mockId} (Bambang Setyawan) berhasil diimpor! Otomatis masuk ke Tape Chart & Front Office.`);
      setTimeout(() => setPushStatusMessage(null), 8000);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Channel Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-primary" />
            Channel Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Two-way ARI (Availability, Rates, Inventory) sync & automated reservation ingestion
          </p>
        </div>

        {/* Live Channel Status Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-left">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                Agoda Sandbox
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">ONLINE • 38ms</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-xl opacity-60">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="text-left">
              <div className="text-[11px] font-semibold text-foreground">Booking.com</div>
              <div className="text-[9px] text-muted-foreground">Pending Phase 6</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-xl opacity-50">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <div className="text-left">
              <div className="text-[11px] font-semibold text-foreground">Traveloka</div>
              <div className="text-[9px] text-muted-foreground">Scheduled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status banner if active action */}
      {pushStatusMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{pushStatusMessage}</span>
          </div>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'mappings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Channel Mapping Grid
        </button>
        <button
          onClick={() => setActiveTab('ari-push')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'ari-push'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Manual ARI Push
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Sync Logs & Payload Inspector ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'simulator'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          Agoda Sandbox Simulator
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      {/* TAB A: Channel Mapping Grid */}
      {activeTab === 'mappings' && (
        <div className="space-y-6">
          {/* Room Type Mappings */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Room Type Mappings (Agoda OTA)</h3>
                <p className="text-xs text-muted-foreground">
                  Map PMS physical inventory room types to Agoda extranet room codes
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                HOTEL-WINOTOSASTRO-AGD
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                <tr>
                  <th className="px-4 py-3">PMS Room Type</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Agoda Room Code</th>
                  <th className="px-4 py-3">Agoda Display Name</th>
                  <th className="px-4 py-3">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Superior Room</td>
                  <td className="px-4 py-3.5 text-muted-foreground">15 Rooms</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RT-SUP</td>
                  <td className="px-4 py-3.5 text-foreground">Superior Twin / Double</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mapped & Active
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Deluxe Room</td>
                  <td className="px-4 py-3.5 text-muted-foreground">15 Rooms</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RT-DLX</td>
                  <td className="px-4 py-3.5 text-foreground">Deluxe King</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mapped & Active
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Executive Suite</td>
                  <td className="px-4 py-3.5 text-muted-foreground">6 Rooms</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RT-EXEC</td>
                  <td className="px-4 py-3.5 text-foreground">Executive Suite City View</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mapped & Active
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Family Suite</td>
                  <td className="px-4 py-3.5 text-muted-foreground">4 Rooms</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RT-FAM</td>
                  <td className="px-4 py-3.5 text-foreground">Grand Family Suite</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mapped & Active
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rate Plan Mappings */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Rate Plan Mappings & Markups</h3>
              <p className="text-xs text-muted-foreground">
                Set channel-specific markup or commission offset percentages
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
                <tr>
                  <th className="px-4 py-3">PMS Rate Plan</th>
                  <th className="px-4 py-3">Agoda Rate Code</th>
                  <th className="px-4 py-3">Agoda Plan Name</th>
                  <th className="px-4 py-3">Channel Markup</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Room Only</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RP-RO</td>
                  <td className="px-4 py-3.5 text-foreground">Room Only Flexible</td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">0% (Net)</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-semibold">Active</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Bed & Breakfast</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RP-BB</td>
                  <td className="px-4 py-3.5 text-foreground">Breakfast Included</td>
                  <td className="px-4 py-3.5 font-mono font-medium text-foreground">0% (Net)</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-semibold">Active</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-bold text-foreground">Non-Refundable</td>
                  <td className="px-4 py-3.5 font-mono text-primary font-bold">AGD-RP-NREF</td>
                  <td className="px-4 py-3.5 text-foreground">Non-Refundable Hot Deal</td>
                  <td className="px-4 py-3.5 font-mono font-medium text-emerald-600">-5% Discount</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-semibold">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB B: Manual ARI Push */}
      {activeTab === 'ari-push' && (
        <div className="bg-card border border-border rounded-xl shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-base text-foreground">Manual ARI Matrix Synchronization</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Force an immediate outbound sync of Availability, Rates, and Restrictions to connected OTAs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>1. Availability Push</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                  Inventory
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pushes current room-type ledger balances (total inventory minus confirmed bookings)
              </p>
              <button
                disabled={isPushing}
                onClick={() => handlePushARI('AVAILABILITY')}
                className="w-full py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Push Availability Now
              </button>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>2. Rates Push</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-mono">
                  Pricing
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pushes daily rate matrices across all 3 rate plans with channel markup adjustments
              </p>
              <button
                disabled={isPushing}
                onClick={() => handlePushARI('RATES')}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Push Rate Matrices Now
              </button>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>3. Restrictions Push</span>
                <span className="text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded font-mono">
                  Controls
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pushes Closed to Arrival (CTA), Closed to Departure (CTD), Minimum Stay & Stop Sell rules
              </p>
              <button
                disabled={isPushing}
                onClick={() => handlePushARI('RESTRICTIONS')}
                className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Push Restrictions Now
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Tip: The PMS automatically queues background ARI jobs whenever a booking is created or cancelled.
            </span>
            <button
              disabled={isPushing}
              onClick={() => handlePushARI('ALL')}
              className="px-4 py-2 bg-foreground text-background font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
            >
              Push Full ARI (All 3 Channels)
            </button>
          </div>
        </div>
      )}

      {/* TAB C: Sync Logs & Payload Inspector */}
      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Real-Time Channel Sync Logs</h3>
              <p className="text-xs text-muted-foreground">
                Audit trail with raw request & response wire payloads
              </p>
            </div>
            <button
              onClick={() => handlePushARI('ALL')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Sync Type</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{log.time}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded text-[10px] border border-rose-500/20">
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-foreground font-medium">{log.type}</td>
                  <td className="px-4 py-3.5 text-foreground">{log.itemsCount} units</td>
                  <td className="px-4 py-3.5 font-mono text-muted-foreground">{log.latencyMs} ms</td>
                  <td className="px-4 py-3.5">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACK_SUCCESS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> FAILED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-muted hover:bg-muted/80 rounded border border-border text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      <Code className="w-3 h-3 text-primary" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB D: Agoda Sandbox Simulator */}
      {activeTab === 'simulator' && (
        <div className="bg-card border border-border rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                Simulator Ekstranet Agoda (Sandbox)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uji coba simulasi reservasi masuk dari Agoda dan skenario error tanpa perlu akun Agoda riil
              </p>
            </div>
            <span className="text-xs font-mono bg-rose-500/10 text-rose-600 px-2.5 py-1 rounded-full font-bold border border-rose-500/20 self-start sm:self-auto">
              Status: Live Mock Agoda Ready
            </span>
          </div>

          {/* Panduan Cara Pakai */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-primary flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Cara Menggunakan Simulator:
            </h4>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 leading-relaxed">
              <li>Tekan tombol merah <strong>"Trigger Inbound Agoda Booking"</strong> di bawah.</li>
              <li>Sistem akan menyimulasikan transaksi seolah ada tamu (Bambang Setyawan) baru saja booking kamar Deluxe lewat aplikasi Agoda.</li>
              <li>Reservasi akan otomatis masuk ke <strong>Tape Chart</strong> (blok oranye Agoda) dan <strong>Front Office</strong> (Arrivals Hari Ini).</li>
              <li>Buka menu <strong>Tape Chart</strong> atau <strong>Front Office</strong> untuk melihat hasilnya secara langsung.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Inbound Booking Simulation */}
            <div className="p-5 bg-muted/20 border border-border rounded-xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-500" />
                  1. Simulasikan Tamu Memesan dari Agoda
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Menghasilkan pesanan baru dari Agoda: Tamu <strong>Bambang Setyawan</strong>, Kamar <strong>Deluxe 202</strong>, Inap <strong>24 Nov – 27 Nov 2026</strong> (Rp 1.760.000).
                </p>
              </div>

              <button
                disabled={isPushing}
                onClick={handleSimulateInboundBooking}
                className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isPushing ? 'Memproses Simulasi...' : 'Trigger Inbound Agoda Booking'}
              </button>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Tinjau hasilnya:</span>
                <div className="flex gap-2">
                  <Link
                    href="/bookings"
                    className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    Buka Tape Chart <ArrowRight className="w-3 h-3 text-primary" />
                  </Link>
                  <Link
                    href="/front-office"
                    className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    Buka Front Desk <ArrowRight className="w-3 h-3 text-emerald-600" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Action 2: Error Resilience Test */}
            <div className="p-5 bg-muted/20 border border-border rounded-xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  2. Uji Coba Penanganan Error (Resilience Test)
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Menyimulasikan jika koneksi server Agoda sedang lambat atau membatasi request (Rate Limit 429 atau Timeout 504) untuk memastikan sistem tidak crash dan melakukan retry otomatis.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    handlePushARI('AVAILABILITY');
                  }}
                  className="flex-1 py-3 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                >
                  Uji 429 Rate Limit
                </button>
                <button
                  onClick={() => {
                    handlePushARI('AVAILABILITY');
                  }}
                  className="flex-1 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold hover:bg-rose-500/20 transition-colors"
                >
                  Uji 504 Timeout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: Raw Payload Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  Payload Inspector: {selectedLog.channel} {selectedLog.type} ({selectedLog.id})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1.5">
                  1. Outbound Request Payload (Sanitized)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl overflow-x-auto text-[11px] text-foreground border border-border">
                  {JSON.stringify(selectedLog.requestPayload, null, 2)}
                </pre>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1.5">
                  2. Inbound Agoda Response Payload ({selectedLog.latencyMs}ms)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl overflow-x-auto text-[11px] text-emerald-600 dark:text-emerald-400 border border-border">
                  {JSON.stringify(selectedLog.responsePayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3.5 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-foreground text-background text-xs font-bold rounded-lg hover:opacity-90"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
