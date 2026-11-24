export interface OTASettlementTransaction {
  id: string;
  otaChannel: 'Agoda' | 'Booking.com' | 'Traveloka' | 'Tiket.com' | 'Expedia';
  otaBookingCode: string;
  guestName: string;
  roomType: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  grossAmount: number;
  commissionPercent: number; // e.g. 15%
  commissionAmount: number;
  netPayout: number;
  payoutMethod: 'Virtual Credit Card (VCC)' | 'Bank Transfer (B2B)' | 'Direct e-Collect';
  status: 'PENDING' | 'SETTLED';
  settledAt?: string;
  settlementReference?: string;
}

export const initialOTATransactions: OTASettlementTransaction[] = [
  {
    id: 'ota-tx-1',
    otaChannel: 'Agoda',
    otaBookingCode: 'AGD-88291',
    guestName: 'Bambang S.',
    roomType: 'Deluxe King',
    roomNumber: '201',
    checkInDate: '2026-11-24',
    checkOutDate: '2026-11-28',
    grossAmount: 3194400,
    commissionPercent: 15,
    commissionAmount: 479160,
    netPayout: 2715240,
    payoutMethod: 'Virtual Credit Card (VCC)',
    status: 'PENDING',
  },
  {
    id: 'ota-tx-2',
    otaChannel: 'Traveloka',
    otaBookingCode: 'TVL-9041284',
    guestName: 'Anindya Putri',
    roomType: 'Superior',
    roomNumber: '102',
    checkInDate: '2026-11-21',
    checkOutDate: '2026-11-23',
    grossAmount: 1450000,
    commissionPercent: 12,
    commissionAmount: 174000,
    netPayout: 1276000,
    payoutMethod: 'Bank Transfer (B2B)',
    status: 'SETTLED',
    settledAt: '2026-11-23 15:30 WIB',
    settlementReference: 'TVL-SETTLE-88192',
  },
  {
    id: 'ota-tx-3',
    otaChannel: 'Booking.com',
    otaBookingCode: 'BKCOM-449102',
    guestName: 'Michael Tan',
    roomType: 'Executive Suite',
    roomNumber: '401',
    checkInDate: '2026-11-20',
    checkOutDate: '2026-11-22',
    grossAmount: 2900000,
    commissionPercent: 15,
    commissionAmount: 435000,
    netPayout: 2465000,
    payoutMethod: 'Virtual Credit Card (VCC)',
    status: 'SETTLED',
    settledAt: '2026-11-22 11:15 WIB',
    settlementReference: 'VCC-CHARGED-0941',
  },
  {
    id: 'ota-tx-4',
    otaChannel: 'Tiket.com',
    otaBookingCode: 'TKT-7719203',
    guestName: 'Rudi Hartono',
    roomType: 'Superior',
    roomNumber: '105',
    checkInDate: '2026-11-24',
    checkOutDate: '2026-11-26',
    grossAmount: 1300000,
    commissionPercent: 13,
    commissionAmount: 169000,
    netPayout: 1131000,
    payoutMethod: 'Bank Transfer (B2B)',
    status: 'PENDING',
  },
  {
    id: 'ota-tx-5',
    otaChannel: 'Agoda',
    otaBookingCode: 'AGD-99014',
    guestName: 'Agus Pratama',
    roomType: 'Deluxe King',
    roomNumber: '202',
    checkInDate: '2026-11-25',
    checkOutDate: '2026-11-27',
    grossAmount: 2129600,
    commissionPercent: 15,
    commissionAmount: 319440,
    netPayout: 1810160,
    payoutMethod: 'Virtual Credit Card (VCC)',
    status: 'PENDING',
  },
  {
    id: 'ota-tx-6',
    otaChannel: 'Expedia',
    otaBookingCode: 'EXP-129048',
    guestName: 'Sarah Jenkins',
    roomType: 'Family Suite',
    roomNumber: '407',
    checkInDate: '2026-11-19',
    checkOutDate: '2026-11-22',
    grossAmount: 4200000,
    commissionPercent: 18,
    commissionAmount: 756000,
    netPayout: 3444000,
    payoutMethod: 'Virtual Credit Card (VCC)',
    status: 'SETTLED',
    settledAt: '2026-11-22 17:00 WIB',
    settlementReference: 'EXP-VCC-99410',
  },
];

const FINANCE_STORAGE_KEY = 'hotel_winotosastro_finance_ota';

export function getStoredOTATransactions(): OTASettlementTransaction[] {
  if (typeof window === 'undefined') return initialOTATransactions;
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(initialOTATransactions));
      return initialOTATransactions;
    }
    return JSON.parse(raw);
  } catch {
    return initialOTATransactions;
  }
}

export function saveStoredOTATransactions(txs: OTASettlementTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(txs));
    window.dispatchEvent(new Event('pms_finance_updated'));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function settleOTATransaction(
  id: string,
  reference?: string
): OTASettlementTransaction[] {
  const current = getStoredOTATransactions();
  const dateStr = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  const updated = current.map((tx) =>
    tx.id === id
      ? {
          ...tx,
          status: 'SETTLED' as const,
          settledAt: dateStr,
          settlementReference: reference || `SETTLE-${tx.otaChannel.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
        }
      : tx
  );
  saveStoredOTATransactions(updated);
  return updated;
}
