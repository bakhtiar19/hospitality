import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@hospitality/database';

export interface GuestProfile {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  idType: string | null;
  idNumber: string | null;
  nationality: string;
  vipStatus: string; // VIP, REGULAR, BLACKLIST
  notes: string | null;
  preferences: string[];
  totalStays: number;
  lifetimeSpend: bigint;
  lifetimeSpendFormatted: string;
  lastStayDate: string | null;
  createdAt: string;
}

export interface MergeGuestsDto {
  sourceGuestId: string;
  targetGuestId: string;
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  // In-memory guest store with rich mock profiles for Hotel Winotosastro
  private guests: GuestProfile[] = [
    {
      id: 'gst-001',
      propertyId: 'prop-winotosastro',
      firstName: 'Bambang',
      lastName: 'Setyawan',
      email: 'bambang.setyawan@example.id',
      phone: '+6281234567890',
      idType: 'KTP',
      idNumber: '3372011234560001',
      nationality: 'ID',
      vipStatus: 'VIP',
      notes: 'Frequent corporate guest from Jakarta. Prefers quiet high-floor room.',
      preferences: ['High Floor', 'Quiet Room', 'Feather Pillow', 'Morning Newspaper'],
      totalStays: 6,
      lifetimeSpend: BigInt(9840000),
      lifetimeSpendFormatted: 'Rp 9.840.000',
      lastStayDate: '2026-11-24',
      createdAt: '2026-05-10T08:00:00Z',
    },
    {
      id: 'gst-002',
      propertyId: 'prop-winotosastro',
      firstName: 'Dewi',
      lastName: 'Lestari',
      email: 'dewi.lestari@example.id',
      phone: '+6281298765432',
      idType: 'KTP',
      idNumber: '3372019876540002',
      nationality: 'ID',
      vipStatus: 'VIP',
      notes: 'Loyal leisure guest. Always books Bed & Breakfast package.',
      preferences: ['King Bed', 'Bathtub', 'Balcony', 'Late Check-out'],
      totalStays: 4,
      lifetimeSpend: BigInt(6200000),
      lifetimeSpendFormatted: 'Rp 6.200.000',
      lastStayDate: '2026-10-15',
      createdAt: '2026-06-18T10:30:00Z',
    },
    {
      id: 'gst-003',
      propertyId: 'prop-winotosastro',
      firstName: 'Hendro',
      lastName: 'Wijaya',
      email: 'hendro.wijaya@example.com',
      phone: '+6281311223344',
      idType: 'SIM',
      idNumber: '9201928374',
      nationality: 'ID',
      vipStatus: 'REGULAR',
      notes: 'Solo traveler. Attends Solo batik exhibitions.',
      preferences: ['Non-Smoking', 'Twin Bed'],
      totalStays: 2,
      lifetimeSpend: BigInt(2450000),
      lifetimeSpendFormatted: 'Rp 2.450.000',
      lastStayDate: '2026-09-02',
      createdAt: '2026-08-01T14:00:00Z',
    },
    {
      id: 'gst-004',
      propertyId: 'prop-winotosastro',
      firstName: 'Agus',
      lastName: 'Susanto',
      email: 'agus.susanto.temp@example.com',
      phone: '+6281234567890', // duplicate phone of Bambang for merge testing
      idType: 'KTP',
      idNumber: '3372011234560001',
      nationality: 'ID',
      vipStatus: 'REGULAR',
      notes: 'Duplicate OTA booking intake from old Agoda reservation.',
      preferences: ['High Floor'],
      totalStays: 1,
      lifetimeSpend: BigInt(880000),
      lifetimeSpendFormatted: 'Rp 880.000',
      lastStayDate: '2026-07-20',
      createdAt: '2026-07-20T11:00:00Z',
    },
  ];

  async getGuests(propertyId: string, search?: string, tag?: string): Promise<GuestProfile[]> {
    let result = this.guests.filter((g) => g.propertyId === propertyId);

    if (tag && tag !== 'ALL') {
      result = result.filter((g) => g.vipStatus === tag.toUpperCase());
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.firstName.toLowerCase().includes(q) ||
          g.lastName?.toLowerCase().includes(q) ||
          g.email?.toLowerCase().includes(q) ||
          g.phone?.includes(q) ||
          g.idNumber?.includes(q),
      );
    }

    return result;
  }

  async getGuestProfile(propertyId: string, guestId: string) {
    const guest = this.guests.find((g) => g.id === guestId && g.propertyId === propertyId);
    if (!guest) throw new NotFoundException(`Guest ${guestId} not found`);

    // Simulated stay history
    const stays = [
      {
        bookingNumber: 'BK-2026-0042',
        source: 'DIRECT',
        checkInDate: '2026-11-24',
        checkOutDate: '2026-11-25',
        roomType: 'Deluxe King (Room 201)',
        amount: BigInt(880000),
        amountFormatted: 'Rp 880.000',
        status: 'CHECKED_IN',
      },
      {
        bookingNumber: 'AGD-88291',
        source: 'AGODA',
        checkInDate: '2026-09-12',
        checkOutDate: '2026-09-14',
        roomType: 'Superior Room (Room 104)',
        amount: BigInt(1550000),
        amountFormatted: 'Rp 1.550.000',
        status: 'CHECKED_OUT',
      },
    ];

    return {
      guest,
      stays,
    };
  }

  async updateGuest(propertyId: string, guestId: string, dto: Partial<GuestProfile>): Promise<GuestProfile> {
    const index = this.guests.findIndex((g) => g.id === guestId && g.propertyId === propertyId);
    if (index === -1) throw new NotFoundException(`Guest ${guestId} not found`);

    this.guests[index] = {
      ...this.guests[index],
      ...dto,
    };

    return this.guests[index];
  }

  async mergeGuests(propertyId: string, dto: MergeGuestsDto) {
    if (dto.sourceGuestId === dto.targetGuestId) {
      throw new BadRequestException('Cannot merge a guest profile into itself');
    }

    const sourceIndex = this.guests.findIndex((g) => g.id === dto.sourceGuestId && g.propertyId === propertyId);
    const targetIndex = this.guests.findIndex((g) => g.id === dto.targetGuestId && g.propertyId === propertyId);

    if (sourceIndex === -1 || targetIndex === -1) {
      throw new NotFoundException('Source or target guest not found');
    }

    const source = this.guests[sourceIndex];
    const target = this.guests[targetIndex];

    // Consolidate stays, spend, and preferences
    target.totalStays += source.totalStays;
    target.lifetimeSpend += source.lifetimeSpend;
    target.lifetimeSpendFormatted = `Rp ${new Intl.NumberFormat('id-ID').format(Number(target.lifetimeSpend))}`;
    target.preferences = Array.from(new Set([...target.preferences, ...source.preferences]));
    target.notes = `${target.notes || ''} | Merged from duplicate profile (${source.id}): ${source.notes || ''}`.trim();

    // Remove merged source profile
    this.guests.splice(sourceIndex, 1);

    this.logger.log(`Merged guest ${dto.sourceGuestId} into ${dto.targetGuestId}. Total stays now: ${target.totalStays}`);

    return {
      success: true,
      mergedTargetProfile: target,
      transferredStaysCount: source.totalStays,
    };
  }
}
