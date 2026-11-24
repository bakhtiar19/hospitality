import { describe, it, expect, beforeEach } from 'vitest';
import { CrmService } from '../src/modules/crm/crm.service.js';

describe('CrmService (Guest Relationship Management & Merging)', () => {
  let service: CrmService;
  const propertyId = 'prop-winotosastro';

  beforeEach(() => {
    service = new CrmService();
  });

  it('should filter guests by search query and VIP tier', async () => {
    const vipGuests = await service.getGuests(propertyId, undefined, 'VIP');
    expect(vipGuests.length).toBeGreaterThanOrEqual(2);
    expect(vipGuests.every((g) => g.vipStatus === 'VIP')).toBe(true);

    const searchResults = await service.getGuests(propertyId, 'Bambang');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].firstName).toBe('Bambang');
    expect(searchResults[0].preferences).toContain('Feather Pillow');
  });

  it('should retrieve guest profile with complete stay history', async () => {
    const profile = await service.getGuestProfile(propertyId, 'gst-001');

    expect(profile.guest.id).toBe('gst-001');
    expect(profile.guest.totalStays).toBe(6);
    expect(profile.stays.length).toBe(2);
    expect(profile.stays[0].bookingNumber).toBe('BK-2026-0042');
  });

  it('should update guest preferences and VIP status', async () => {
    const updated = await service.updateGuest(propertyId, 'gst-003', {
      vipStatus: 'VIP',
      preferences: ['Non-Smoking', 'Twin Bed', 'Airport Pickup'],
    });

    expect(updated.vipStatus).toBe('VIP');
    expect(updated.preferences).toContain('Airport Pickup');
  });

  it('should merge duplicate guest profile, consolidating stays, spend, and preferences', async () => {
    // Merge gst-004 (Agus, 1 stay, 880k) into gst-001 (Bambang, 6 stays, 9.84M)
    const initialTarget = (await service.getGuests(propertyId)).find((g) => g.id === 'gst-001');
    expect(initialTarget?.totalStays).toBe(6);

    const mergeResult = await service.mergeGuests(propertyId, {
      sourceGuestId: 'gst-004',
      targetGuestId: 'gst-001',
    });

    expect(mergeResult.success).toBe(true);
    expect(mergeResult.mergedTargetProfile.totalStays).toBe(7); // 6 + 1
    expect(mergeResult.mergedTargetProfile.lifetimeSpend).toBe(BigInt(9840000) + BigInt(880000));
    expect(mergeResult.mergedTargetProfile.notes).toContain('Merged from duplicate profile (gst-004)');

    // Verify source profile is removed
    const allGuests = await service.getGuests(propertyId);
    expect(allGuests.find((g) => g.id === 'gst-004')).toBeUndefined();
  });

  it('should reject merging a guest profile into itself', async () => {
    await expect(
      service.mergeGuests(propertyId, {
        sourceGuestId: 'gst-001',
        targetGuestId: 'gst-001',
      }),
    ).rejects.toThrow('Cannot merge a guest profile into itself');
  });
});
