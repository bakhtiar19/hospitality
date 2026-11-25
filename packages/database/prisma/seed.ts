import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed() {
  console.log('--- Starting Seed for Hotel Winotosastro AProject (Surakarta) ---');

  // 1. Create Property
  const property = await prisma.property.upsert({
    where: { code: 'WINOTOSASTRO-SOLO' },
    update: {},
    create: {
      code: 'WINOTOSASTRO-SOLO',
      name: 'Hotel Winotosastro AProject',
      city: 'Surakarta (Solo)',
      address: 'Jl. Brigjend Slamet Riyadi No. 250, Surakarta, Jawa Tengah 57141',
      timezone: 'Asia/Jakarta',
      defaultCurrency: 'IDR',
      settings: {
        checkInTime: '14:00',
        checkOutTime: '12:00',
        nightAuditCutoff: '02:00',
      },
      isActive: true,
    },
  });
  console.log(`[Seed] Property: ${property.name} (${property.id})`);

  // 2. Configurable Taxes (No hardcoded PPN 11% / Service 10% - configurable regional PBJT)
  const pbjtTax = await prisma.taxConfiguration.upsert({
    where: {
      propertyId_code: {
        propertyId: property.id,
        code: 'PBJT-HOTEL-SOLO',
      },
    },
    update: {},
    create: {
      propertyId: property.id,
      code: 'PBJT-HOTEL-SOLO',
      name: 'PBJT Jasa Perhotelan Kota Surakarta',
      ratePercentage: 10.0,
      calculationOrder: 2,
      isInclusive: false,
      isActive: true,
    },
  });

  const serviceCharge = await prisma.taxConfiguration.upsert({
    where: {
      propertyId_code: {
        propertyId: property.id,
        code: 'SERVICE-CHARGE',
      },
    },
    update: {},
    create: {
      propertyId: property.id,
      code: 'SERVICE-CHARGE',
      name: 'Hotel Service Charge',
      ratePercentage: 10.0,
      calculationOrder: 1,
      isInclusive: false,
      isActive: true,
    },
  });
  console.log(`[Seed] Configured Taxes: ${serviceCharge.name} (10%), ${pbjtTax.name} (10%)`);

  // 3. Permissions & System Roles
  const permissionsList = [
    { code: 'property:read', module: 'PROPERTY', description: 'View property settings' },
    { code: 'property:update', module: 'PROPERTY', description: 'Update property settings' },
    { code: 'tax:manage', module: 'TAX', description: 'Manage tax rates and PBJT' },
    { code: 'booking:read', module: 'BOOKING', description: 'View bookings and tape chart' },
    { code: 'booking:create', module: 'BOOKING', description: 'Create reservations' },
    { code: 'booking:update', module: 'BOOKING', description: 'Modify reservations' },
    { code: 'booking:cancel', module: 'BOOKING', description: 'Cancel reservations' },
    { code: 'rates:view', module: 'RATES', description: 'View rate matrices' },
    { code: 'rates:update', module: 'RATES', description: 'Update rate matrices' },
    { code: 'channel:view', module: 'CHANNEL', description: 'View channel sync status' },
    { code: 'channel:sync', module: 'CHANNEL', description: 'Trigger manual ARI push' },
    { code: 'front_desk:checkin', module: 'FRONT_OFFICE', description: 'Check-in guests' },
    { code: 'front_desk:checkout', module: 'FRONT_OFFICE', description: 'Check-out guests' },
    { code: 'folio:charge', module: 'FOLIO', description: 'Post extra charges' },
    { code: 'folio:payment', module: 'FOLIO', description: 'Record payments' },
    { code: 'night_audit:execute', module: 'AUDIT', description: 'Execute end of day audit' },
    { code: 'housekeeping:view', module: 'HOUSEKEEPING', description: 'View room cleanliness status' },
    { code: 'housekeeping:update', module: 'HOUSEKEEPING', description: 'Update room clean/dirty' },
    { code: 'reports:view', module: 'REPORTS', description: 'View revenue and occupancy reports' },
  ];

  for (const p of permissionsList) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  const ownerRole = await prisma.role.upsert({
    where: { propertyId_name: { propertyId: property.id, name: 'OWNER' } },
    update: {},
    create: {
      propertyId: property.id,
      name: 'OWNER',
      description: 'Full hotel ownership with unrestricted operational access',
      isSystem: true,
    },
  });

  const frontDeskRole = await prisma.role.upsert({
    where: { propertyId_name: { propertyId: property.id, name: 'FRONT_DESK' } },
    update: {},
    create: {
      propertyId: property.id,
      name: 'FRONT_DESK',
      description: 'Front desk reception, check-in, check-out, and folio management',
      isSystem: true,
    },
  });

  const housekeepingRole = await prisma.role.upsert({
    where: { propertyId_name: { propertyId: property.id, name: 'HOUSEKEEPING' } },
    update: {},
    create: {
      propertyId: property.id,
      name: 'HOUSEKEEPING',
      description: 'Housekeeping board inspection and room maintenance',
      isSystem: true,
    },
  });

  // Assign permissions to front desk
  const frontDeskPermissions = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'booking:read',
          'booking:create',
          'booking:update',
          'front_desk:checkin',
          'front_desk:checkout',
          'folio:charge',
          'folio:payment',
          'housekeeping:view',
        ],
      },
    },
  });

  for (const perm of frontDeskPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: frontDeskRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: frontDeskRole.id, permissionId: perm.id },
    });
  }

  // 4. Create Demo Staff Users (Password: Password123!)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@winotosastro.com' },
    update: {},
    create: {
      propertyId: property.id,
      email: 'owner@winotosastro.com',
      passwordHash,
      fullName: 'AProject Owner',
      phone: '+6281234567890',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: ownerUser.id, roleId: ownerRole.id },
  });

  const frontDeskUser = await prisma.user.upsert({
    where: { email: 'frontdesk@winotosastro.com' },
    update: {},
    create: {
      propertyId: property.id,
      email: 'frontdesk@winotosastro.com',
      passwordHash,
      fullName: 'Rian Santoso',
      phone: '+6281298765432',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: frontDeskUser.id, roleId: frontDeskRole.id } },
    update: {},
    create: { userId: frontDeskUser.id, roleId: frontDeskRole.id },
  });

  // Platform Super Admin (Akses semua properti terhubung)
  const superAdminHash = await bcrypt.hash('AdminAProject2026!', 12);
  await prisma.user.upsert({
    where: { email: 'superadmin@aproject.id' },
    update: { isSuperAdmin: true, isActive: true },
    create: {
      propertyId: property.id,
      email: 'superadmin@aproject.id',
      passwordHash: superAdminHash,
      fullName: 'AProject Super Admin',
      phone: '+6285155177341',
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log('[Seed] Users seeded: superadmin@aproject.id, owner@winotosastro.com, frontdesk@winotosastro.com');

  // 5. Floors (1 to 4)
  const floorMap = new Map<number, string>();
  for (let f = 1; f <= 4; f++) {
    const floor = await prisma.floor.upsert({
      where: { propertyId_floorNumber: { propertyId: property.id, floorNumber: f } },
      update: {},
      create: {
        propertyId: property.id,
        floorNumber: f,
        name: `Lantai ${f}`,
      },
    });
    floorMap.set(f, floor.id);
  }

  // 6. Room Types (Superior, Deluxe King, Executive Suite, Family Suite)
  const roomTypesData = [
    {
      code: 'SUP-TWN',
      name: 'Superior Room',
      description: 'Kamar nyaman 24 m² dengan pilihan kasur queen atau twin, Wi-Fi gratis, dan AC.',
      totalRooms: 15,
      baseOccupancy: 2,
      maxOccupancy: 2,
      amenities: ['Wi-Fi', 'AC', 'TV 43"', 'Hot Shower', 'Safe Deposit Box'],
      basePrice: BigInt(650000), // Rp 650.000
    },
    {
      code: 'DLX-KNG',
      name: 'Deluxe King',
      description: 'Kamar elegan 32 m² dengan kasur king-size, pemandangan kota Surakarta, dan meja kerja.',
      totalRooms: 15,
      baseOccupancy: 2,
      maxOccupancy: 3,
      amenities: ['Wi-Fi', 'AC', 'Smart TV 50"', 'Minibar', 'City View', 'Bathtub'],
      basePrice: BigInt(880000), // Rp 880.000
    },
    {
      code: 'EXE-STE',
      name: 'Executive Suite',
      description: 'Suite mewah 48 m² dengan ruang tamu terpisah, bathtub marmer, dan mesin kopi espresso.',
      totalRooms: 6,
      baseOccupancy: 2,
      maxOccupancy: 4,
      amenities: ['Living Room', 'Espresso Machine', 'Bathtub', 'High Floor View', 'Complimentary Minibar'],
      basePrice: BigInt(1450000), // Rp 1.450.000
    },
    {
      code: 'FAM-STE',
      name: 'Family Suite',
      description: 'Suite keluarga 60 m² dengan 2 kamar tidur, kitchenette, dan ruang makan keluarga.',
      totalRooms: 4,
      baseOccupancy: 4,
      maxOccupancy: 5,
      amenities: ['2 Bedrooms', 'Kitchenette', 'Dining Area', '2 Bathrooms', 'Washing Machine'],
      basePrice: BigInt(2100000), // Rp 2.100.000
    },
  ];

  const roomTypeMap = new Map<string, string>();
  for (const rt of roomTypesData) {
    const roomType = await prisma.roomType.upsert({
      where: { propertyId_code: { propertyId: property.id, code: rt.code } },
      update: {},
      create: {
        propertyId: property.id,
        code: rt.code,
        name: rt.name,
        description: rt.description,
        totalRooms: rt.totalRooms,
        baseOccupancy: rt.baseOccupancy,
        maxOccupancy: rt.maxOccupancy,
        amenities: rt.amenities,
      },
    });
    roomTypeMap.set(rt.code, roomType.id);
  }

  // 7. Rate Plans (Room Only, Bed & Breakfast, Non-Refundable)
  const ratePlansData = [
    { code: 'RO', name: 'Room Only (Flexible)', description: 'Tarif dasar kamar tanpa sarapan, pembatalan gratis hingga H-1.' },
    { code: 'BB', name: 'Bed & Breakfast', description: 'Termasuk sarapan prasmanan hidangan khas Solo untuk 2 orang.' },
    { code: 'NR', name: 'Non-Refundable (Hemat 10%)', description: 'Tarif hemat tanpa opsi pengembalian dana.' },
  ];

  const ratePlanMap = new Map<string, string>();
  for (const rp of ratePlansData) {
    const ratePlan = await prisma.ratePlan.upsert({
      where: { propertyId_code: { propertyId: property.id, code: rp.code } },
      update: {},
      create: {
        propertyId: property.id,
        code: rp.code,
        name: rp.name,
        description: rp.description,
      },
    });
    ratePlanMap.set(rp.code, ratePlan.id);

    // Bind configurable taxes to rate plan
    await prisma.ratePlanTax.upsert({
      where: { ratePlanId_taxConfigurationId: { ratePlanId: ratePlan.id, taxConfigurationId: serviceCharge.id } },
      update: {},
      create: { ratePlanId: ratePlan.id, taxConfigurationId: serviceCharge.id },
    });

    await prisma.ratePlanTax.upsert({
      where: { ratePlanId_taxConfigurationId: { ratePlanId: ratePlan.id, taxConfigurationId: pbjtTax.id } },
      update: {},
      create: { ratePlanId: ratePlan.id, taxConfigurationId: pbjtTax.id },
    });
  }

  // 8. Physical Rooms (40 rooms across 4 floors)
  // Floor 1: 101-110 (10 Superior)
  // Floor 2: 201-205 (5 Superior), 206-210 (5 Deluxe King)
  // Floor 3: 301-310 (10 Deluxe King)
  // Floor 4: 401-406 (6 Executive Suites), 407-410 (4 Family Suites)
  const physicalRooms = [
    ...Array.from({ length: 10 }, (_, i) => ({ num: `10${i + 1}`, floor: 1, type: 'SUP-TWN' })),
    ...Array.from({ length: 5 }, (_, i) => ({ num: `20${i + 1}`, floor: 2, type: 'SUP-TWN' })),
    ...Array.from({ length: 5 }, (_, i) => ({ num: `20${i + 6}`, floor: 2, type: 'DLX-KNG' })),
    ...Array.from({ length: 10 }, (_, i) => ({ num: `30${i + 1}`, floor: 3, type: 'DLX-KNG' })),
    ...Array.from({ length: 6 }, (_, i) => ({ num: `40${i + 1}`, floor: 4, type: 'EXE-STE' })),
    ...Array.from({ length: 4 }, (_, i) => ({ num: `40${i + 7}`, floor: 4, type: 'FAM-STE' })),
  ];

  for (const r of physicalRooms) {
    const floorId = floorMap.get(r.floor)!;
    const roomTypeId = roomTypeMap.get(r.type)!;

    await prisma.room.upsert({
      where: { propertyId_roomNumber: { propertyId: property.id, roomNumber: r.num } },
      update: {},
      create: {
        propertyId: property.id,
        roomNumber: r.num,
        floorId,
        roomTypeId,
        operationalStatus: 'AVAILABLE',
        housekeepingStatus: 'CLEAN',
        isClean: true,
      },
    });
  }
  console.log(`[Seed] 40 physical rooms created across 4 floors`);

  // 9. Agoda Channel Account (Sandbox Mode)
  await prisma.channelAccount.upsert({
    where: { propertyId_channelCode: { propertyId: property.id, channelCode: 'AGODA' } },
    update: {},
    create: {
      propertyId: property.id,
      channelCode: 'AGODA',
      credentialsEncrypted: JSON.stringify({
        hotelId: 'AGODA-SOLO-99120',
        apiKey: 'sandbox_mock_agoda_key',
        endpoint: 'http://localhost:4001/agoda',
      }),
      isActive: true,
      isMock: true,
    },
  });
  console.log('[Seed] Agoda Sandbox Channel Account configured');

  console.log('--- Seed Completed Successfully for Hotel Winotosastro AProject ---');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
