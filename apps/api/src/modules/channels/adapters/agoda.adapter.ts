import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelAdapter,
  AvailabilityUpdate,
  RateUpdate,
  RestrictionUpdate,
  ChannelReservation,
  SyncResult,
  ChannelHealth,
} from '../interfaces/channel-adapter.interface.js';
import { AgodaPayloadMapper } from '../mappers/agoda-payload.mapper.js';

@Injectable()
export class AgodaAdapter implements ChannelAdapter {
  readonly channelCode = 'AGODA';
  private readonly logger = new Logger(AgodaAdapter.name);
  private readonly baseUrl = process.env.AGODA_MOCK_URL || 'http://localhost:4001';
  private readonly hotelId = process.env.AGODA_HOTEL_ID || 'HOTEL-WINOTOSASTRO-AGD';

  async pushAvailability(
    propertyId: string,
    updates: AvailabilityUpdate[],
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const payload = AgodaPayloadMapper.toAgodaAvailabilityPayload(this.hotelId, updates);

    try {
      const response = await fetch(`${this.baseUrl}/agoda/ari/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Property-Id': propertyId,
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;
      const resJson = await response.json();

      if (!response.ok) {
        return {
          success: false,
          itemsProcessed: 0,
          latencyMs,
          rawRequest: payload,
          rawResponse: resJson,
          error: resJson.message || `Agoda ARI returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        itemsProcessed: updates.length,
        latencyMs,
        rawRequest: payload,
        rawResponse: resJson,
      };
    } catch (err: any) {
      return {
        success: false,
        itemsProcessed: 0,
        latencyMs: Date.now() - startTime,
        rawRequest: payload,
        rawResponse: null,
        error: err.message || 'Network error connecting to Agoda Extranet API',
      };
    }
  }

  async pushRates(propertyId: string, updates: RateUpdate[]): Promise<SyncResult> {
    const startTime = Date.now();
    const payload = AgodaPayloadMapper.toAgodaRatePayload(this.hotelId, updates);

    try {
      const response = await fetch(`${this.baseUrl}/agoda/ari/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Property-Id': propertyId,
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;
      const resJson = await response.json();

      if (!response.ok) {
        return {
          success: false,
          itemsProcessed: 0,
          latencyMs,
          rawRequest: payload,
          rawResponse: resJson,
          error: resJson.message || `Agoda Rate ARI returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        itemsProcessed: updates.length,
        latencyMs,
        rawRequest: payload,
        rawResponse: resJson,
      };
    } catch (err: any) {
      return {
        success: false,
        itemsProcessed: 0,
        latencyMs: Date.now() - startTime,
        rawRequest: payload,
        rawResponse: null,
        error: err.message || 'Network error connecting to Agoda Rate API',
      };
    }
  }

  async pushRestrictions(
    propertyId: string,
    updates: RestrictionUpdate[],
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const payload = AgodaPayloadMapper.toAgodaRestrictionPayload(this.hotelId, updates);

    try {
      const response = await fetch(`${this.baseUrl}/agoda/ari/restrictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Property-Id': propertyId,
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;
      const resJson = await response.json();

      if (!response.ok) {
        return {
          success: false,
          itemsProcessed: 0,
          latencyMs,
          rawRequest: payload,
          rawResponse: resJson,
          error: resJson.message || `Agoda Restrictions returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        itemsProcessed: updates.length,
        latencyMs,
        rawRequest: payload,
        rawResponse: resJson,
      };
    } catch (err: any) {
      return {
        success: false,
        itemsProcessed: 0,
        latencyMs: Date.now() - startTime,
        rawRequest: payload,
        rawResponse: null,
        error: err.message || 'Network error connecting to Agoda Restrictions API',
      };
    }
  }

  async pullReservations(propertyId: string): Promise<ChannelReservation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/agoda/reservations/pending`, {
        headers: {
          'X-Property-Id': propertyId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to pull Agoda reservations: HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data.reservations) ? data.reservations : [];

      return rawList.map((raw: any) => AgodaPayloadMapper.fromAgodaReservation(raw));
    } catch (err: any) {
      this.logger.error(`Agoda pullReservations failed: ${err.message}`);
      return [];
    }
  }

  async acknowledgeReservation(
    propertyId: string,
    channelReservationId: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/agoda/reservations/${channelReservationId}/ack`,
        {
          method: 'POST',
          headers: {
            'X-Property-Id': propertyId,
          },
        },
      );

      if (!response.ok) return false;
      const data = await response.json();
      return !!data.acknowledged;
    } catch (err: any) {
      this.logger.error(`Agoda acknowledgeReservation failed for ${channelReservationId}: ${err.message}`);
      return false;
    }
  }

  async healthCheck(propertyId: string): Promise<ChannelHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/agoda/health`, {
        headers: { 'X-Property-Id': propertyId },
      });
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          channelCode: this.channelCode,
          status: 'OFFLINE',
          latencyMs,
          message: `Health check returned HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        channelCode: this.channelCode,
        status: 'ONLINE',
        latencyMs,
        message: 'Agoda Mock Extranet connection healthy (ARI v2)',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        channelCode: this.channelCode,
        status: 'OFFLINE',
        latencyMs: Date.now() - startTime,
        message: err.message || 'Cannot reach Agoda endpoint',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
