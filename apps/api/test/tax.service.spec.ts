import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxService } from '../src/modules/tax/tax.service.js';
import { prisma } from '@hospitality/database';

describe('TaxService (Configurable Regional PBJT & Service Engine)', () => {
  let taxService: TaxService;

  beforeEach(() => {
    taxService = new TaxService();
    vi.clearAllMocks();
  });

  it('should accurately calculate exclusive compounding taxes (Service 10% + PBJT 10% on Subtotal)', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const baseRoomRate = BigInt(1000000); // Rp 1.000.000

    // Mock two exclusive taxes: Order 1 Service Charge (10%), Order 2 PBJT (10%)
    vi.spyOn(prisma.taxConfiguration, 'findMany').mockResolvedValue([
      {
        id: 'tax-service',
        propertyId: mockPropertyId,
        code: 'SERVICE-CHARGE',
        name: 'Service Charge',
        ratePercentage: 10.0 as any,
        calculationOrder: 1,
        isInclusive: false,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'tax-pbjt',
        propertyId: mockPropertyId,
        code: 'PBJT-SOLO',
        name: 'PBJT Jasa Perhotelan Kota Surakarta',
        ratePercentage: 10.0 as any,
        calculationOrder: 2,
        isInclusive: false,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const result = await taxService.calculateTaxes(mockPropertyId, baseRoomRate);

    // Math verification:
    // Base = 1,000,000
    // Tax 1 (Service 10% on 1,000,000) = 100,000
    // Tax 2 (PBJT 10% on 1,100,000) = 110,000
    // Total Tax = 210,000 (Indonesian standard "21% plus-plus")
    // Gross = 1,210,000
    expect(result.baseAmount).toBe(BigInt(1000000));
    expect(result.netAmount).toBe(BigInt(1000000));
    expect(result.details[0].name).toBe('Service Charge');
    expect(result.details[0].amount).toBe(BigInt(100000));
    expect(result.details[1].name).toBe('PBJT Jasa Perhotelan Kota Surakarta');
    expect(result.details[1].amount).toBe(BigInt(110000));
    expect(result.totalTaxAmount).toBe(BigInt(210000));
    expect(result.grossAmount).toBe(BigInt(1210000));
  });

  it('should accurately back-calculate inclusive taxes (Nett rate Rp 1.210.000)', async () => {
    const mockPropertyId = 'prop-winotosastro';
    const grossRate = BigInt(1210000); // Rp 1.210.000 Nett

    vi.spyOn(prisma.taxConfiguration, 'findMany').mockResolvedValue([
      {
        id: 'tax-inclusive',
        propertyId: mockPropertyId,
        code: 'PBJT-NETT',
        name: 'PBJT All-in',
        ratePercentage: 21.0 as any,
        calculationOrder: 1,
        isInclusive: true,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const result = await taxService.calculateTaxes(mockPropertyId, grossRate);

    // 1,210,000 / 1.21 = 1,000,000 net, 210,000 tax
    expect(result.grossAmount).toBe(BigInt(1210000));
    expect(result.netAmount).toBe(BigInt(1000000));
    expect(result.totalTaxAmount).toBe(BigInt(210000));
  });

  it('should return zero tax when property has no active taxes', async () => {
    const mockPropertyId = 'prop-winotosastro';
    vi.spyOn(prisma.taxConfiguration, 'findMany').mockResolvedValue([]);

    const result = await taxService.calculateTaxes(mockPropertyId, BigInt(750000));

    expect(result.netAmount).toBe(BigInt(750000));
    expect(result.totalTaxAmount).toBe(BigInt(0));
    expect(result.grossAmount).toBe(BigInt(750000));
    expect(result.details).toHaveLength(0);
  });
});
