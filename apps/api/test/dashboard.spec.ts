import { describe, it, expect } from 'vitest';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';

describe('DashboardService (Hospitality Metrics & Analytics)', () => {
  const service = new DashboardService();

  it('should calculate percentage change correctly and avoid division by zero', () => {
    // Current 12.45M, Prior 10.9M -> +14.2%
    const pct1 = service.calculatePercentageChange(BigInt(12450000), BigInt(10900000));
    expect(pct1).toBe(14.2);

    // Negative change: Current 8M, Prior 10M -> -20.0%
    const pct2 = service.calculatePercentageChange(BigInt(8000000), BigInt(10000000));
    expect(pct2).toBe(-20);

    // Prior is 0
    const pct3 = service.calculatePercentageChange(BigInt(5000000), BigInt(0));
    expect(pct3).toBe(100);

    const pct4 = service.calculatePercentageChange(BigInt(0), BigInt(0));
    expect(pct4).toBe(0);
  });

  it('should format IDR currency accurately with minor units without decimals', () => {
    const formatted = service.formatIdr(BigInt(750000));
    expect(formatted).toContain('750.000');
  });

  it('should compute ADR and RevPAR matching mathematical formulas', async () => {
    const summary = await service.getSummary('prop-winotosastro', '2026-11-24');

    expect(summary.kpi.totalRooms).toBe(40);
    expect(summary.kpi.occupiedRooms).toBe(32);
    expect(summary.kpi.occupancyRate).toBe(80.0);

    // ADR = Room Revenue / Occupied Rooms
    // 12,450,000 / 32 = 389,062
    expect(summary.kpi.adr).toBe(BigInt(12450000) / BigInt(32));

    // RevPAR = Room Revenue / Total Rooms
    // 12,450,000 / 40 = 311,250
    expect(summary.kpi.revpar).toBe(BigInt(12450000) / BigInt(40));

    expect(summary.kpi.adrFormatted).toContain('389.062');
    expect(summary.kpi.revparFormatted).toContain('311.250');
  });

  it('should return recent bookings with valid status and source channels', async () => {
    const summary = await service.getSummary('prop-winotosastro', '2026-11-24');

    expect(summary.recentBookings.length).toBeGreaterThan(0);
    const agodaBooking = summary.recentBookings.find(b => b.source === 'AGODA');
    expect(agodaBooking).toBeDefined();
    expect(agodaBooking?.bookingNumber).toBe('AGD-88291');
    expect(agodaBooking?.guestName).toBe('Bambang Setyawan');
  });

  it('should return channel distribution with percentage totals', async () => {
    const summary = await service.getSummary('prop-winotosastro', '2026-11-24');

    const totalPct = summary.channelShare.reduce((acc, c) => acc + c.percentage, 0);
    expect(totalPct).toBe(100.0);
  });
});
