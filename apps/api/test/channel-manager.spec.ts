import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgodaPayloadMapper } from '../src/modules/channels/mappers/agoda-payload.mapper.js';
import { AgodaAdapter } from '../src/modules/channels/adapters/agoda.adapter.js';

describe('ChannelManager (Agoda ARI & Payload Mapper)', () => {
  const adapter = new AgodaAdapter();
  const propertyId = 'prop-winotosastro';

  it('should transform PMS availability updates into Agoda ARI format (ASSUMPTION)', () => {
    const payload = AgodaPayloadMapper.toAgodaAvailabilityPayload('HOTEL-WINOTOSASTRO-AGD', [
      {
        roomTypeId: 'rt-dlx',
        channelRoomCode: 'AGD-RT-DLX',
        date: '2026-11-25',
        availableUnits: 8,
      },
      {
        roomTypeId: 'rt-sup',
        channelRoomCode: 'AGD-RT-SUP',
        date: '2026-11-25',
        availableUnits: 0,
      },
    ]);

    expect(payload.hotelId).toBe('HOTEL-WINOTOSASTRO-AGD');
    expect(payload.version).toBe('2.0');
    expect(payload.updates.length).toBe(2);

    expect(payload.updates[0].roomTypeCode).toBe('AGD-RT-DLX');
    expect(payload.updates[0].inventory).toBe(8);
    expect(payload.updates[0].status).toBe('OPEN');

    expect(payload.updates[1].roomTypeCode).toBe('AGD-RT-SUP');
    expect(payload.updates[1].inventory).toBe(0);
    expect(payload.updates[1].status).toBe('CLOSED');
  });

  it('should transform PMS rates into Agoda pricing matrices', () => {
    const payload = AgodaPayloadMapper.toAgodaRatePayload('HOTEL-WINOTOSASTRO-AGD', [
      {
        roomTypeId: 'rt-dlx',
        ratePlanId: 'rp-bb',
        channelRoomCode: 'AGD-RT-DLX',
        channelRateCode: 'AGD-RP-BB',
        date: '2026-11-25',
        amount: BigInt(880000),
        currency: 'IDR',
      },
    ]);

    expect(payload.currency).toBe('IDR');
    expect(payload.updates[0].rate).toBe(880000);
    expect(payload.updates[0].ratePlanCode).toBe('AGD-RP-BB');
  });

  it('should parse inbound Agoda reservation into standard PMS ChannelReservation', () => {
    const rawAgodaPayload = {
      channelReservationId: 'AGD-99881',
      hotelId: 'HOTEL-WINOTOSASTRO-AGD',
      roomTypeCode: 'AGD-RT-DLX',
      ratePlanCode: 'AGD-RP-BB',
      guest: {
        firstName: 'Dewi',
        lastName: 'Lestari',
        email: 'dewi.lestari@example.id',
        phone: '+628123456789',
        nationality: 'ID',
      },
      stay: {
        checkInDate: '2026-11-26',
        checkOutDate: '2026-11-28',
        nights: 2,
        adults: 2,
        children: 0,
      },
      pricing: {
        currency: 'IDR',
        totalAmount: 1760000,
      },
      status: 'CONFIRMED',
      action: 'NEW_BOOKING',
    };

    const parsed = AgodaPayloadMapper.fromAgodaReservation(rawAgodaPayload);
    expect(parsed.channelReservationId).toBe('AGD-99881');
    expect(parsed.guest.firstName).toBe('Dewi');
    expect(parsed.stay.nights).toBe(2);
    expect(parsed.pricing.totalAmount).toBe(1760000);
    expect(parsed.action).toBe('NEW_BOOKING');
  });

  it('should execute health check against running Agoda mock server', async () => {
    const health = await adapter.healthCheck(propertyId);
    expect(health.channelCode).toBe('AGODA');
    expect(health.status).toBe('ONLINE');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should successfully push availability to Agoda mock server and receive ACK', async () => {
    const result = await adapter.pushAvailability(propertyId, [
      {
        roomTypeId: 'rt-dlx',
        channelRoomCode: 'AGD-RT-DLX',
        date: '2026-11-25',
        availableUnits: 8,
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.itemsProcessed).toBe(1);
    expect(result.rawResponse.status).toBe('Success');
  });

  it('should handle simulated error response gracefully', async () => {
    // Set mock to error mode
    await fetch('http://localhost:4001/agoda/simulate/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'RATE_LIMIT_429' }),
    });

    const errorResult = await adapter.pushAvailability(propertyId, [
      {
        roomTypeId: 'rt-dlx',
        channelRoomCode: 'AGD-RT-DLX',
        date: '2026-11-25',
        availableUnits: 8,
      },
    ]);

    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toContain('Too many requests');

    // Reset back to NONE
    await fetch('http://localhost:4001/agoda/simulate/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'NONE' }),
    });
  });
});
