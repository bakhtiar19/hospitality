export type ReservationTimeFrame = 'WALK_IN' | 'FIT' | 'OTA' | 'CORPORATE';

export type PaymentMethod =
  | 'CASH'
  | 'EDC'
  | 'CITY_LEDGER'
  | 'OTA_VOUCHER'
  | 'BANK_TRANSFER';

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  date: string;
}

export interface TapeChartBooking {
  id: string;
  bookingNumber: string;
  source: 'DIRECT' | 'AGODA' | 'WALK_IN' | 'CORPORATE';
  reservationType?: ReservationTimeFrame;
  guestName: string;
  phone?: string;
  roomNumber: string; // or 'UNASSIGNED'
  roomType: string;
  ratePlan: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  status: 'CONFIRMED' | 'IN_HOUSE' | 'CHECKED_OUT';
  totalAmount: number;
  balance?: number;
  idNumber?: string;
  idType?: string;
  payments?: PaymentRecord[];
  notes?: string;
}

export const initialBookings: TapeChartBooking[] = [
  {
    id: 'b-1',
    bookingNumber: 'BK-2026-1042',
    source: 'DIRECT',
    reservationType: 'FIT',
    guestName: 'Siti Rahma',
    phone: '+628123456789',
    roomNumber: '101',
    roomType: 'Superior',
    ratePlan: 'Room Only',
    checkInDate: '2026-11-23',
    checkOutDate: '2026-11-25',
    status: 'IN_HOUSE',
    totalAmount: 1573000,
    balance: 0,
    idNumber: '3372010101900001',
    idType: 'KTP',
    payments: [
      {
        id: 'pay-1',
        amount: 1573000,
        method: 'EDC',
        reference: 'BCA-EDC-881920',
        notes: 'Pelunasan saat check-in',
        date: '2026-11-23',
      },
    ],
  },
  {
    id: 'b-2',
    bookingNumber: 'AGD-88291',
    source: 'AGODA',
    reservationType: 'OTA',
    guestName: 'Bambang S.',
    phone: '+628198765432',
    roomNumber: '201',
    roomType: 'Deluxe King',
    ratePlan: 'Bed & Breakfast',
    checkInDate: '2026-11-24', // Arrival Today!
    checkOutDate: '2026-11-28',
    status: 'CONFIRMED',
    totalAmount: 3194400,
    balance: 0,
    payments: [
      {
        id: 'pay-2',
        amount: 3194400,
        method: 'OTA_VOUCHER',
        reference: 'AGD-VOUCHER-9921',
        notes: 'Agoda Collect - Prepaid Voucher',
        date: '2026-11-20',
      },
    ],
  },
  {
    id: 'b-3',
    bookingNumber: 'BK-2026-1045',
    source: 'WALK_IN',
    reservationType: 'WALK_IN',
    guestName: 'Hendro Wijaya',
    phone: '+628134567890',
    roomNumber: '401',
    roomType: 'Executive Suite',
    ratePlan: 'Non-Refundable',
    checkInDate: '2026-11-23',
    checkOutDate: '2026-11-26',
    status: 'IN_HOUSE',
    totalAmount: 3946800,
    balance: 150000,
    idNumber: '3372020202850002',
    idType: 'KTP',
    payments: [
      {
        id: 'pay-3',
        amount: 3796800,
        method: 'CASH',
        reference: 'CASH-REC-019',
        notes: 'DP Tunai Resepsionis',
        date: '2026-11-23',
      },
    ],
  },
  {
    id: 'b-4',
    bookingNumber: 'BK-2026-1048',
    source: 'DIRECT',
    reservationType: 'FIT',
    guestName: 'Dewi Lestari',
    phone: '+628156789012',
    roomNumber: '104',
    roomType: 'Superior',
    ratePlan: 'Room Only',
    checkInDate: '2026-11-24', // Arrival Today!
    checkOutDate: '2026-11-29',
    status: 'CONFIRMED',
    totalAmount: 2359500,
    balance: 1000000,
    payments: [
      {
        id: 'pay-4',
        amount: 1359500,
        method: 'BANK_TRANSFER',
        reference: 'MANDIRI-TF-991823',
        notes: 'DP Transfer Mandiri',
        date: '2026-11-22',
      },
    ],
  },
  {
    id: 'b-5',
    bookingNumber: 'BK-2026-1039',
    source: 'CORPORATE',
    reservationType: 'FIT',
    guestName: 'Ahmad Fauzi',
    phone: '+628167890123',
    roomNumber: '301',
    roomType: 'Deluxe King',
    ratePlan: 'Room Only',
    checkInDate: '2026-11-22',
    checkOutDate: '2026-11-24', // Departure Today!
    status: 'IN_HOUSE',
    totalAmount: 1452000,
    balance: 0,
    idNumber: '3372030303920003',
    idType: 'KTP',
    payments: [
      {
        id: 'pay-5',
        amount: 1452000,
        method: 'CITY_LEDGER',
        reference: 'GL-CORP-PLN-089',
        notes: 'Guarantee Letter PT PLN Surakarta',
        date: '2026-11-22',
      },
    ],
  },
  {
    id: 'b-6',
    bookingNumber: 'BK-2027-0102',
    source: 'DIRECT',
    reservationType: 'FIT',
    guestName: 'Prof. Bambang Sutrisno',
    phone: '+6281122334455',
    roomNumber: '401',
    roomType: 'Executive Suite',
    ratePlan: 'Room Only',
    checkInDate: '2027-01-15',
    checkOutDate: '2027-01-18',
    status: 'CONFIRMED',
    totalAmount: 5263500,
    balance: 5263500,
    payments: [],
  },
];

const STORAGE_KEY = 'hotel_winotosastro_pms_bookings';

export function getStoredBookings(): TapeChartBooking[] {
  if (typeof window === 'undefined') return initialBookings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBookings));
      return initialBookings;
    }
    const parsed: TapeChartBooking[] = JSON.parse(raw);
    // Ensure backwards compatibility with payments & reservationType
    return parsed.map((b) => ({
      ...b,
      reservationType: b.reservationType || (b.source === 'WALK_IN' ? 'WALK_IN' : b.source === 'AGODA' ? 'OTA' : 'FIT'),
      payments: b.payments || (b.balance !== undefined && b.balance < b.totalAmount
        ? [
            {
              id: `pay-gen-${b.id}`,
              amount: b.totalAmount - (b.balance ?? 0),
              method: 'EDC',
              date: b.checkInDate,
              notes: 'Pembayaran tercatat',
            },
          ]
        : []),
    }));
  } catch {
    return initialBookings;
  }
}

export function calculateBookingBalance(booking: TapeChartBooking): number {
  if (!booking) return 0;
  const totalPaid = (booking.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  if (booking.payments && booking.payments.length > 0) {
    return Math.max(0, booking.totalAmount - totalPaid);
  }
  if (typeof booking.balance === 'number') {
    return Math.max(0, booking.balance);
  }
  return Math.max(0, booking.totalAmount);
}

export function saveStoredBookings(bookings: TapeChartBooking[]): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = bookings.map((b) => {
      const bal = calculateBookingBalance(b);
      return {
        ...b,
        balance: bal,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('pms_bookings_updated'));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function addPaymentToBooking(bookingId: string, payment: PaymentRecord): TapeChartBooking[] {
  const current = getStoredBookings();
  const updated = current.map((b) => {
    if (b.id !== bookingId) return b;
    const existingPayments = b.payments || [];
    const newPayments = [...existingPayments, payment];
    const totalPaid = newPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const newBalance = Math.max(0, b.totalAmount - totalPaid);
    return {
      ...b,
      payments: newPayments,
      balance: newBalance,
    };
  });
  saveStoredBookings(updated);
  return updated;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Cash (Tunai)';
    case 'EDC':
      return 'EDC (Debit / CC / QRIS)';
    case 'CITY_LEDGER':
      return 'City Ledger / Guarantee Letter';
    case 'OTA_VOUCHER':
      return 'Voucher Travel (OTA)';
    case 'BANK_TRANSFER':
      return 'Bank Transfer';
    default:
      return method;
  }
}
