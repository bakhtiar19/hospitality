export interface TapeChartBooking {
  id: string;
  bookingNumber: string;
  source: 'DIRECT' | 'AGODA' | 'WALK_IN' | 'CORPORATE';
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
}

export const initialBookings: TapeChartBooking[] = [
  {
    id: 'b-1',
    bookingNumber: 'BK-2026-1042',
    source: 'DIRECT',
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
  },
  {
    id: 'b-2',
    bookingNumber: 'AGD-88291',
    source: 'AGODA',
    guestName: 'Bambang S.',
    phone: '+628198765432',
    roomNumber: '201',
    roomType: 'Deluxe King',
    ratePlan: 'Bed & Breakfast',
    checkInDate: '2026-11-24', // Arrival Today!
    checkOutDate: '2026-11-28',
    status: 'CONFIRMED',
    totalAmount: 3194400,
    balance: 3194400,
  },
  {
    id: 'b-3',
    bookingNumber: 'BK-2026-1045',
    source: 'WALK_IN',
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
  },
  {
    id: 'b-4',
    bookingNumber: 'BK-2026-1048',
    source: 'DIRECT',
    guestName: 'Dewi Lestari',
    phone: '+628156789012',
    roomNumber: '104',
    roomType: 'Superior',
    ratePlan: 'Room Only',
    checkInDate: '2026-11-24', // Arrival Today!
    checkOutDate: '2026-11-29',
    status: 'CONFIRMED',
    totalAmount: 2359500,
    balance: 2359500,
  },
  {
    id: 'b-5',
    bookingNumber: 'BK-2026-1039',
    source: 'DIRECT',
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
  },
  {
    id: 'b-6',
    bookingNumber: 'BK-2027-0102',
    source: 'DIRECT',
    guestName: 'Prof. Bambang Sutrisno (Reservasi 2027)',
    phone: '+6281122334455',
    roomNumber: '401',
    roomType: 'Executive Suite',
    ratePlan: 'Room Only',
    checkInDate: '2027-01-15',
    checkOutDate: '2027-01-18',
    status: 'CONFIRMED',
    totalAmount: 5263500,
    balance: 5263500,
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
    return JSON.parse(raw);
  } catch {
    return initialBookings;
  }
}

export function saveStoredBookings(bookings: TapeChartBooking[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    window.dispatchEvent(new Event('pms_bookings_updated'));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}
