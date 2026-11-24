/**
 * ============================================================================
 * AGODA PAYLOAD MAPPER (CHANNEL MANAGER INTEGRATION LAYER)
 * ============================================================================
 * 
 * ARCHITECTURAL SPECIFICATION & CONNECTIVITY ROUTE NOTES:
 * 1. ASSUMPTION NOTICE: All wire formats (XML / JSON ARI structures, attribute
 *    names, and envelope shapes) defined in this mapper are baseline assumptions
 *    modeled after the Agoda Connectivity ARI v2 / YCS specifications.
 * 2. AGODA CONNECTIVITY ROUTE STATUS: Agoda offers multiple connectivity routes:
 *    - Route A: Direct Agoda Innovative Partner API (XML ARI / OTA 2014B style)
 *    - Route B: Agoda YCS Extranet API (JSON REST-based partner endpoint)
 *    - Route C: Agoda Channel Connectivity Partner Switch (e.g. DerbySoft / SiteMinder bridge)
 *    The exact route and production endpoint URLs are currently pending final
 *    commercial approval from Agoda's connectivity partner team.
 * 3. ZERO CORE IMPACT GUARANTEE: All schema, attribute naming, and wire protocol
 *    details are strictly confined inside this mapper. When official Agoda credentials
 *    and WSDL/OpenAPI specs are provided, this single file can be updated to match
 *    the exact production spec with ZERO modifications to the PMS core, inventory
 *    ledger, or booking engine.
 * ============================================================================
 */

import {
  AvailabilityUpdate,
  RateUpdate,
  RestrictionUpdate,
  ChannelReservation,
} from '../interfaces/channel-adapter.interface.js';

export class AgodaPayloadMapper {
  /**
   * ASSUMPTION: Formats PMS availability ledger records into Agoda ARI format.
   */
  static toAgodaAvailabilityPayload(hotelId: string, updates: AvailabilityUpdate[]) {
    return {
      hotelId,
      source: 'PMS-WINOTOSASTRO',
      version: '2.0',
      timestamp: new Date().toISOString(),
      updates: updates.map((u) => ({
        roomTypeCode: u.channelRoomCode,
        date: u.date,
        inventory: u.availableUnits,
        status: u.availableUnits > 0 ? 'OPEN' : 'CLOSED',
      })),
    };
  }

  /**
   * ASSUMPTION: Formats PMS rate plan pricing matrices into Agoda ARI format.
   * Agoda requires standard ISO 4217 currency code (IDR) and integer amounts.
   */
  static toAgodaRatePayload(hotelId: string, updates: RateUpdate[]) {
    return {
      hotelId,
      source: 'PMS-WINOTOSASTRO',
      version: '2.0',
      currency: updates[0]?.currency || 'IDR',
      timestamp: new Date().toISOString(),
      updates: updates.map((u) => ({
        roomTypeCode: u.channelRoomCode,
        ratePlanCode: u.channelRateCode,
        date: u.date,
        rate: Number(u.amount),
        currency: u.currency,
      })),
    };
  }

  /**
   * ASSUMPTION: Formats PMS restrictions (CTA, CTD, MinStay, StopSell) into Agoda format.
   */
  static toAgodaRestrictionPayload(hotelId: string, updates: RestrictionUpdate[]) {
    return {
      hotelId,
      source: 'PMS-WINOTOSASTRO',
      version: '2.0',
      timestamp: new Date().toISOString(),
      updates: updates.map((u) => ({
        roomTypeCode: u.channelRoomCode,
        ratePlanCode: u.channelRateCode,
        date: u.date,
        minStay: u.minStay,
        closedToArrival: u.isClosedToArrival,
        closedToDeparture: u.isClosedToDeparture,
        stopSell: u.isStopSell,
      })),
    };
  }

  /**
   * ASSUMPTION: Maps an inbound Agoda reservation response payload into standard PMS ChannelReservation.
   */
  static fromAgodaReservation(rawPayload: any): ChannelReservation {
    return {
      channelReservationId: rawPayload.channelReservationId || rawPayload.id || `AGD-${Date.now()}`,
      hotelId: rawPayload.hotelId || 'HOTEL-WINOTOSASTRO-AGD',
      roomTypeCode: rawPayload.roomTypeCode || 'AGD-RT-DLX',
      ratePlanCode: rawPayload.ratePlanCode || 'AGD-RP-BB',
      guest: {
        firstName: rawPayload.guest?.firstName || 'Guest',
        lastName: rawPayload.guest?.lastName || '',
        email: rawPayload.guest?.email || '',
        phone: rawPayload.guest?.phone || '',
        nationality: rawPayload.guest?.nationality || 'ID',
      },
      stay: {
        checkInDate: rawPayload.stay?.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: rawPayload.stay?.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        nights: rawPayload.stay?.nights || 1,
        adults: rawPayload.stay?.adults || 2,
        children: rawPayload.stay?.children || 0,
      },
      pricing: {
        currency: rawPayload.pricing?.currency || 'IDR',
        totalAmount: Number(rawPayload.pricing?.totalAmount || 0),
        dailyRates: rawPayload.pricing?.dailyRates || [],
      },
      status: rawPayload.status || 'CONFIRMED',
      action: rawPayload.action || 'NEW_BOOKING',
      specialRequests: rawPayload.specialRequests,
      createdAt: rawPayload.createdAt || new Date().toISOString(),
    };
  }
}
