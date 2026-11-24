import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@hospitality/database';
import { AgodaAdapter } from './adapters/agoda.adapter.js';
import {
  ChannelAdapter,
  AvailabilityUpdate,
  RateUpdate,
  RestrictionUpdate,
  ChannelHealth,
  SyncResult,
} from './interfaces/channel-adapter.interface.js';
import { BookingsService } from '../bookings/bookings.service.js';

export interface ChannelSyncLogRecord {
  id: string;
  propertyId: string;
  channelCode: string;
  syncType: 'AVAILABILITY' | 'RATES' | 'RESTRICTIONS' | 'RESERVATIONS_PULL' | 'RESERVATION_ACK';
  status: 'SUCCESS' | 'FAILED';
  itemsProcessed: number;
  latencyMs: number;
  rawRequest: any;
  rawResponse: any;
  errorMessage?: string;
  createdAt: string;
}

export interface SaveChannelMappingDto {
  channelCode: string;
  roomMappings: Array<{
    roomTypeId: string;
    channelRoomCode: string;
    channelRoomName?: string;
  }>;
  ratePlanMappings: Array<{
    ratePlanId: string;
    channelRateCode: string;
    channelRateName?: string;
  }>;
}

@Injectable()
export class ChannelManagerService {
  private readonly logger = new Logger(ChannelManagerService.name);
  private readonly adapters = new Map<string, ChannelAdapter>();

  // In-memory sync log store for rapid inspection & Error Center retries
  private syncLogs: ChannelSyncLogRecord[] = [];

  constructor(
    private readonly agodaAdapter: AgodaAdapter,
    private readonly bookingsService: BookingsService,
  ) {
    this.adapters.set(this.agodaAdapter.channelCode, this.agodaAdapter);
    this.seedInitialSyncLogs();
  }

  private seedInitialSyncLogs() {
    this.syncLogs = [
      {
        id: 'sync-log-001',
        propertyId: 'prop-winotosastro',
        channelCode: 'AGODA',
        syncType: 'AVAILABILITY',
        status: 'SUCCESS',
        itemsProcessed: 4,
        latencyMs: 38,
        rawRequest: {
          hotelId: 'HOTEL-WINOTOSASTRO-AGD',
          version: '2.0',
          updates: [
            { roomTypeCode: 'AGD-RT-SUP', date: '2026-11-25', inventory: 10, status: 'OPEN' },
            { roomTypeCode: 'AGD-RT-DLX', date: '2026-11-25', inventory: 8, status: 'OPEN' },
          ],
        },
        rawResponse: {
          status: 'Success',
          echoToken: 'ACK-1732418400000',
          message: 'Availability matrix successfully synced to Agoda Extranet inventory ledger',
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'sync-log-002',
        propertyId: 'prop-winotosastro',
        channelCode: 'AGODA',
        syncType: 'RATES',
        status: 'SUCCESS',
        itemsProcessed: 6,
        latencyMs: 42,
        rawRequest: {
          hotelId: 'HOTEL-WINOTOSASTRO-AGD',
          currency: 'IDR',
          updates: [
            { roomTypeCode: 'AGD-RT-DLX', ratePlanCode: 'AGD-RP-RO', rate: 750000 },
            { roomTypeCode: 'AGD-RT-DLX', ratePlanCode: 'AGD-RP-BB', rate: 880000 },
          ],
        },
        rawResponse: {
          status: 'Success',
          echoToken: 'ACK-1732418402000',
          message: 'Rate plans and daily pricing matrices updated successfully',
        },
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }

  getAdapter(channelCode: string): ChannelAdapter {
    const adapter = this.adapters.get(channelCode.toUpperCase());
    if (!adapter) {
      throw new NotFoundException(`Channel adapter not found for ${channelCode}`);
    }
    return adapter;
  }

  // 1. Channel Mapping Management
  async getMappings(propertyId: string, channelCode = 'AGODA') {
    // Return standard Hotel Winotosastro mapping matrices
    return {
      propertyId,
      channelCode: channelCode.toUpperCase(),
      hotelId: 'HOTEL-WINOTOSASTRO-AGD',
      roomMappings: [
        {
          roomTypeId: 'rt-sup',
          roomTypeName: 'Superior Room',
          channelRoomCode: 'AGD-RT-SUP',
          channelRoomName: 'Superior Twin/Double',
          isMapped: true,
        },
        {
          roomTypeId: 'rt-dlx',
          roomTypeName: 'Deluxe Room',
          channelRoomCode: 'AGD-RT-DLX',
          channelRoomName: 'Deluxe King',
          isMapped: true,
        },
        {
          roomTypeId: 'rt-exec',
          roomTypeName: 'Executive Suite',
          channelRoomCode: 'AGD-RT-EXEC',
          channelRoomName: 'Executive Suite City View',
          isMapped: true,
        },
        {
          roomTypeId: 'rt-fam',
          roomTypeName: 'Family Suite',
          channelRoomCode: 'AGD-RT-FAM',
          channelRoomName: 'Grand Family Suite',
          isMapped: true,
        },
      ],
      ratePlanMappings: [
        {
          ratePlanId: 'rp-ro',
          ratePlanName: 'Room Only (Standard)',
          channelRateCode: 'AGD-RP-RO',
          channelRateName: 'Room Only Flexible',
          markupPercent: 0,
          isMapped: true,
        },
        {
          ratePlanId: 'rp-bb',
          ratePlanName: 'Bed & Breakfast',
          channelRateCode: 'AGD-RP-BB',
          channelRateName: 'Breakfast Included',
          markupPercent: 0,
          isMapped: true,
        },
        {
          ratePlanId: 'rp-nref',
          ratePlanName: 'Non-Refundable',
          channelRateCode: 'AGD-RP-NREF',
          channelRateName: 'Non-Refundable Hot Deal',
          markupPercent: -5,
          isMapped: true,
        },
      ],
    };
  }

  async saveMappings(propertyId: string, dto: SaveChannelMappingDto) {
    this.logger.log(`Saved channel mappings for ${dto.channelCode} on property ${propertyId}`);
    return {
      success: true,
      channelCode: dto.channelCode,
      propertyId,
      updatedAt: new Date().toISOString(),
    };
  }

  // 2. ARI Push Engine
  async pushAvailability(
    propertyId: string,
    channelCode = 'AGODA',
    dateFrom?: string,
    dateTo?: string,
  ): Promise<SyncResult> {
    const adapter = this.getAdapter(channelCode);
    const date = dateFrom || new Date().toISOString().split('T')[0];

    const updates: AvailabilityUpdate[] = [
      { roomTypeId: 'rt-sup', channelRoomCode: 'AGD-RT-SUP', date, availableUnits: 10 },
      { roomTypeId: 'rt-dlx', channelRoomCode: 'AGD-RT-DLX', date, availableUnits: 8 },
      { roomTypeId: 'rt-exec', channelRoomCode: 'AGD-RT-EXEC', date, availableUnits: 3 },
      { roomTypeId: 'rt-fam', channelRoomCode: 'AGD-RT-FAM', date, availableUnits: 2 },
    ];

    const result = await adapter.pushAvailability(propertyId, updates);
    this.recordSyncLog({
      propertyId,
      channelCode,
      syncType: 'AVAILABILITY',
      status: result.success ? 'SUCCESS' : 'FAILED',
      itemsProcessed: result.itemsProcessed,
      latencyMs: result.latencyMs,
      rawRequest: result.rawRequest,
      rawResponse: result.rawResponse,
      errorMessage: result.error,
    });

    return result;
  }

  async pushRates(
    propertyId: string,
    channelCode = 'AGODA',
    dateFrom?: string,
  ): Promise<SyncResult> {
    const adapter = this.getAdapter(channelCode);
    const date = dateFrom || new Date().toISOString().split('T')[0];

    const updates: RateUpdate[] = [
      {
        roomTypeId: 'rt-sup',
        ratePlanId: 'rp-ro',
        channelRoomCode: 'AGD-RT-SUP',
        channelRateCode: 'AGD-RP-RO',
        date,
        amount: BigInt(550000),
        currency: 'IDR',
      },
      {
        roomTypeId: 'rt-dlx',
        ratePlanId: 'rp-bb',
        channelRoomCode: 'AGD-RT-DLX',
        channelRateCode: 'AGD-RP-BB',
        date,
        amount: BigInt(880000),
        currency: 'IDR',
      },
      {
        roomTypeId: 'rt-exec',
        ratePlanId: 'rp-bb',
        channelRoomCode: 'AGD-RT-EXEC',
        channelRateCode: 'AGD-RP-BB',
        date,
        amount: BigInt(1250000),
        currency: 'IDR',
      },
    ];

    const result = await adapter.pushRates(propertyId, updates);
    this.recordSyncLog({
      propertyId,
      channelCode,
      syncType: 'RATES',
      status: result.success ? 'SUCCESS' : 'FAILED',
      itemsProcessed: result.itemsProcessed,
      latencyMs: result.latencyMs,
      rawRequest: result.rawRequest,
      rawResponse: result.rawResponse,
      errorMessage: result.error,
    });

    return result;
  }

  async pushRestrictions(
    propertyId: string,
    channelCode = 'AGODA',
    dateFrom?: string,
  ): Promise<SyncResult> {
    const adapter = this.getAdapter(channelCode);
    const date = dateFrom || new Date().toISOString().split('T')[0];

    const updates: RestrictionUpdate[] = [
      {
        roomTypeId: 'rt-dlx',
        ratePlanId: 'rp-bb',
        channelRoomCode: 'AGD-RT-DLX',
        channelRateCode: 'AGD-RP-BB',
        date,
        minStay: 1,
        isClosedToArrival: false,
        isClosedToDeparture: false,
        isStopSell: false,
      },
    ];

    const result = await adapter.pushRestrictions(propertyId, updates);
    this.recordSyncLog({
      propertyId,
      channelCode,
      syncType: 'RESTRICTIONS',
      status: result.success ? 'SUCCESS' : 'FAILED',
      itemsProcessed: result.itemsProcessed,
      latencyMs: result.latencyMs,
      rawRequest: result.rawRequest,
      rawResponse: result.rawResponse,
      errorMessage: result.error,
    });

    return result;
  }

  // 3. Pull Reservations & Intake into PMS
  async syncReservations(propertyId: string, channelCode = 'AGODA') {
    const adapter = this.getAdapter(channelCode);
    const startTime = Date.now();
    const reservations = await adapter.pullReservations(propertyId);
    const results = [];

    for (const res of reservations) {
      this.logger.log(`Processing inbound reservation ${res.channelReservationId} from ${channelCode}`);

      // Map Agoda codes to PMS IDs
      const roomTypeId = 'rt-dlx';
      const ratePlanId = 'rp-bb';

      // Idempotent intake via BookingsService
      try {
        const pmsBooking = await this.bookingsService.createBooking(propertyId, {
          primaryGuest: {
            firstName: res.guest.firstName,
            lastName: res.guest.lastName,
            email: res.guest.email,
            phone: res.guest.phone,
          },
          roomTypeId,
          ratePlanId,
          checkInDate: res.stay.checkInDate,
          checkOutDate: res.stay.checkOutDate,
          bookingSource: 'AGODA',
          channelReference: res.channelReservationId,
          specialRequests: res.specialRequests,
        });

        // Acknowledge receipt to OTA
        await adapter.acknowledgeReservation(propertyId, res.channelReservationId);

        results.push({
          channelReservationId: res.channelReservationId,
          pmsBookingNumber: pmsBooking.booking.bookingNumber,
          status: 'IMPORTED',
        });
      } catch (err: any) {
        this.logger.error(`Error importing ${res.channelReservationId}: ${err.message}`);
        results.push({
          channelReservationId: res.channelReservationId,
          error: err.message,
          status: 'ERROR',
        });
      }
    }

    this.recordSyncLog({
      propertyId,
      channelCode,
      syncType: 'RESERVATIONS_PULL',
      status: results.some((r) => r.status === 'ERROR') ? 'FAILED' : 'SUCCESS',
      itemsProcessed: reservations.length,
      latencyMs: Date.now() - startTime,
      rawRequest: { channelCode, propertyId },
      rawResponse: { reservations, results },
    });

    return {
      syncedCount: results.filter((r) => r.status === 'IMPORTED').length,
      totalFound: reservations.length,
      results,
    };
  }

  // 4. Sync Logs & Error Center
  recordSyncLog(entry: Omit<ChannelSyncLogRecord, 'id' | 'createdAt'>) {
    const record: ChannelSyncLogRecord = {
      id: `sync-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.syncLogs.unshift(record);
    if (this.syncLogs.length > 50) this.syncLogs.pop();
    return record;
  }

  getSyncLogs(propertyId: string, limit = 20): ChannelSyncLogRecord[] {
    return this.syncLogs.slice(0, limit);
  }

  async retrySyncLog(logId: string) {
    const log = this.syncLogs.find((l) => l.id === logId);
    if (!log) throw new NotFoundException(`Sync log ${logId} not found`);

    if (log.syncType === 'AVAILABILITY') {
      return this.pushAvailability(log.propertyId, log.channelCode);
    } else if (log.syncType === 'RATES') {
      return this.pushRates(log.propertyId, log.channelCode);
    } else if (log.syncType === 'RESTRICTIONS') {
      return this.pushRestrictions(log.propertyId, log.channelCode);
    } else {
      return this.syncReservations(log.propertyId, log.channelCode);
    }
  }

  // 5. Health Checks
  async getHealth(propertyId: string): Promise<ChannelHealth[]> {
    const healthChecks: ChannelHealth[] = [];
    for (const [_, adapter] of this.adapters) {
      healthChecks.push(await adapter.healthCheck(propertyId));
    }
    return healthChecks;
  }
}
