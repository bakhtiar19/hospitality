'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  X,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Zap,
  Bed,
  Check,
  Building2,
  CalendarCheck,
  DollarSign,
  Phone,
  Receipt,
  Printer,
  ConciergeBell,
  LogIn,
  LogOut,
  CreditCard,
  Layers,
  List,
  RotateCcw,
  DoorClosed,
  ChevronDown,
  ShieldCheck,
  FileText,
  CalendarPlus,
  Tag,
  Building,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';
import { useAuth } from '../../../providers/auth-provider';
import { formatCurrency, formatThousands, parseThousands, getTodayJakarta, addDaysIso } from '../../../lib/utils';
import {
  TapeChartBooking,
  PaymentMethod,
  PaymentRecord,
  ReservationTimeFrame,
  getStoredBookings,
  saveStoredBookings,
  addPaymentToBooking,
  apiCreatePmsBooking,
  apiCheckInBooking,
  apiCheckOutBooking,
  apiExtendBookingStay,
  apiRecordBookingPayment,
  apiDeletePmsBooking,
  initialBookings,
  calculateBookingBalance,
  getPaymentMethodLabel,
} from '../../../lib/bookings-store';
import { getHotelSettings, HotelSettings } from '../../../lib/settings-store';

const defaultMockRooms = [
  // Lantai 1: Superior
  { number: '101', floor: 1, type: 'Superior', clean: true, baseRate: 650000 },
  { number: '102', floor: 1, type: 'Superior', clean: true, baseRate: 650000 },
  { number: '103', floor: 1, type: 'Superior', clean: false, baseRate: 650000 },
  { number: '104', floor: 1, type: 'Superior', clean: true, baseRate: 650000 },
  { number: '105', floor: 1, type: 'Superior', clean: true, baseRate: 650000 },
  // Lantai 2: Deluxe
  { number: '201', floor: 2, type: 'Deluxe King', clean: true, baseRate: 880000 },
  { number: '202', floor: 2, type: 'Deluxe King', clean: true, baseRate: 880000 },
  { number: '203', floor: 2, type: 'Deluxe King', clean: true, baseRate: 880000 },
  { number: '204', floor: 2, type: 'Deluxe King', clean: false, baseRate: 880000 },
  { number: '205', floor: 2, type: 'Deluxe King', clean: true, baseRate: 880000 },
  // Lantai 3: Deluxe King
  { number: '301', floor: 3, type: 'Deluxe King', clean: true, baseRate: 880000 },
  { number: '302', floor: 3, type: 'Deluxe King', clean: true, baseRate: 880000 },
  { number: '303', floor: 3, type: 'Deluxe King', clean: true, baseRate: 880000 },
  // Lantai 4: Executive & Family
  { number: '401', floor: 4, type: 'Executive Suite', clean: true, baseRate: 1450000 },
  { number: '402', floor: 4, type: 'Executive Suite', clean: true, baseRate: 1450000 },
  { number: '407', floor: 4, type: 'Family Suite', clean: true, baseRate: 2100000 },
];

export default function FrontDeskReservasiPage() {
  const { t } = useI18n();
  const { dbSynced, rooms: dbRooms } = useAuth();
  const today = getTodayJakarta();

  const mockRooms = useMemo(() => {
    if (dbSynced && dbRooms.length > 0) {
      return dbRooms.map((r) => ({
        number: r.number,
        floor: r.floor,
        type: r.type,
        clean: r.housekeepingStatus === 'CLEAN' || r.housekeepingStatus === 'INSPECTED',
        baseRate: r.baseRate,
      }));
    }
    return defaultMockRooms;
  }, [dbSynced, dbRooms]);

  // Primary View Mode: 'calendar' (Tape Chart) or 'list' (Operational List)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Bookings State (shared across all PMS modules)
  const [bookings, setBookings] = useState<TapeChartBooking[]>(initialBookings);
  const [hotelSettings, setHotelSettings] = useState<HotelSettings>(getHotelSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Bookings & Settings
  useEffect(() => {
    setBookings(getStoredBookings());
    setHotelSettings(getHotelSettings());

    const handleBookingsUpdate = () => setBookings(getStoredBookings());
    const handleSettingsUpdate = () => setHotelSettings(getHotelSettings());

    window.addEventListener('pms_bookings_updated', handleBookingsUpdate);
    window.addEventListener('pms_settings_updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('pms_bookings_updated', handleBookingsUpdate);
      window.removeEventListener('pms_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ----------------------------------------------------
  // CALENDAR / TAPE CHART STATE
  // ----------------------------------------------------
  const [chartStartDate, setChartStartDate] = useState(() => addDaysIso(getTodayJakarta(), -2));
  const [daysCount, setDaysCount] = useState<7 | 14 | 30>(14);
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [calendarSearch, setCalendarSearch] = useState('');

  // ----------------------------------------------------
  // LIST VIEW STATE & FILTERS
  // ----------------------------------------------------
  const [listTab, setListTab] = useState<'ALL' | 'ARRIVALS' | 'IN_HOUSE' | 'DEPARTURES' | 'WALK_IN' | 'FIT' | 'CHECKED_OUT'>('ALL');
  const [listSearch, setListSearch] = useState('');

  // ----------------------------------------------------
  // OPERATIONAL MODALS
  // ----------------------------------------------------
  // Selected Booking Drawer/Modal
  const [selectedBooking, setSelectedBooking] = useState<TapeChartBooking | null>(null);

  // 1. Create Reservation Modal (Walk-in vs FIT)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resTimeFrame, setResTimeFrame] = useState<'WALK_IN' | 'FIT'>('WALK_IN');
  const [formGuestName, setFormGuestName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIdNumber, setFormIdNumber] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('101');
  const [formRoomRate, setFormRoomRate] = useState<number>(650000);
  const [formCheckIn, setFormCheckIn] = useState(today);
  const [formCheckOut, setFormCheckOut] = useState(() => addDaysIso(today, 1));
  const [formRatePlan, setFormRatePlan] = useState('Room Only');
  const [formAutoCheckIn, setFormAutoCheckIn] = useState(true);
  const [formInitialPaymentMethod, setFormInitialPaymentMethod] = useState<PaymentMethod | 'NONE'>('NONE');
  const [formInitialPaymentAmount, setFormInitialPaymentAmount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  // 2. Extend Stay Modal
  const [extendModalBooking, setExtendModalBooking] = useState<TapeChartBooking | null>(null);
  const [newExtendCheckOut, setNewExtendCheckOut] = useState('');
  const [extendSelectedRoom, setExtendSelectedRoom] = useState<string>('');
  const [extendRoomRate, setExtendRoomRate] = useState<number>(0);
  const [extraNightCharge, setExtraNightCharge] = useState(0);

  // 3. Payment Modal
  const [paymentModalBooking, setPaymentModalBooking] = useState<TapeChartBooking | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('EDC');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // 4. Folio Print Modal
  const [printFolioBooking, setPrintFolioBooking] = useState<TapeChartBooking | null>(null);

  // ----------------------------------------------------
  // CALENDAR DATES GENERATION
  // ----------------------------------------------------
  const calendarDates = useMemo(() => {
    const base = new Date(chartStartDate);
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      const isToday = dayStr === today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
      return { dayStr, dayName, monthName, isToday, isWeekend, dayNum: d.getDate(), year: d.getFullYear() };
    });
  }, [chartStartDate, daysCount]);

  // Calendar Rooms Filtered
  const filteredRooms = useMemo(() => {
    return mockRooms.filter((r) => {
      if (floorFilter === 'DIRTY' && r.clean) return false;
      if (floorFilter !== 'ALL' && floorFilter !== 'DIRTY' && r.floor !== Number(floorFilter)) return false;
      if (calendarSearch.trim()) {
        const q = calendarSearch.toLowerCase();
        const matchesRoom = r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
        const matchesGuest = bookings.some(
          (b) => b.roomNumber === r.number && b.guestName.toLowerCase().includes(q)
        );
        if (!matchesRoom && !matchesGuest) return false;
      }
      return true;
    });
  }, [floorFilter, calendarSearch, bookings]);

  // List View Filtered Bookings
  const filteredListBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab filter
      if (listTab === 'ARRIVALS' && !(b.checkInDate === today && b.status === 'CONFIRMED')) return false;
      if (listTab === 'IN_HOUSE' && b.status !== 'IN_HOUSE') return false;
      if (listTab === 'DEPARTURES' && !(b.checkOutDate === today && b.status === 'IN_HOUSE')) return false;
      if (listTab === 'WALK_IN' && b.reservationType !== 'WALK_IN') return false;
      if (listTab === 'FIT' && b.reservationType !== 'FIT') return false;
      if (listTab === 'CHECKED_OUT' && b.status !== 'CHECKED_OUT') return false;

      // Search filter
      if (listSearch.trim()) {
        const q = listSearch.toLowerCase();
        const matchName = b.guestName.toLowerCase().includes(q);
        const matchNum = b.bookingNumber.toLowerCase().includes(q);
        const matchRoom = b.roomNumber.toLowerCase().includes(q);
        const matchPhone = (b.phone || '').includes(q);
        if (!matchName && !matchNum && !matchRoom && !matchPhone) return false;
      }
      return true;
    });
  }, [bookings, listTab, listSearch]);

  // Status Counts
  const counts = useMemo(() => {
    const arrivalsToday = bookings.filter((b) => b.checkInDate === today && b.status === 'CONFIRMED').length;
    const inHouse = bookings.filter((b) => b.status === 'IN_HOUSE').length;
    const departuresToday = bookings.filter((b) => b.checkOutDate === today && b.status === 'IN_HOUSE').length;
    const walkIns = bookings.filter((b) => b.reservationType === 'WALK_IN').length;
    const fitCount = bookings.filter((b) => b.reservationType === 'FIT').length;
    const checkedOut = bookings.filter((b) => b.status === 'CHECKED_OUT').length;
    return { arrivalsToday, inHouse, departuresToday, walkIns, fitCount, checkedOut };
  }, [bookings]);

  // Filtered available rooms specifically for the extension period [originalCheckOut -> newExtendCheckOut]
  const availableRoomsForExtend = useMemo(() => {
    if (!extendModalBooking || !newExtendCheckOut) return [];
    const extStart = extendModalBooking.checkOutDate;
    const extEnd = newExtendCheckOut;
    if (extEnd <= extStart) return [];

    return mockRooms.filter((rm) => {
      // Check if any other booking occupies this room between extStart and extEnd
      const hasConflict = bookings.some((b) => {
        if (b.id === extendModalBooking.id) return false;
        if (b.status === 'CHECKED_OUT') return false;
        if (b.roomNumber !== rm.number) return false;
        // Overlap: existing checkIn < newExtendCheckOut && existing checkOut > originalCheckOut
        return b.checkInDate < extEnd && b.checkOutDate > extStart;
      });
      return !hasConflict;
    });
  }, [extendModalBooking, newExtendCheckOut, bookings]);

  // Synchronize chosen room when available rooms change
  useEffect(() => {
    if (extendModalBooking && availableRoomsForExtend.length > 0) {
      const isCurrentSelectedValid = availableRoomsForExtend.some(
        (r) => r.number === extendSelectedRoom
      );
      if (!isCurrentSelectedValid) {
        // Prefer keeping current room if available, otherwise first available room
        const currentAvail = availableRoomsForExtend.find(
          (r) => r.number === extendModalBooking.roomNumber
        );
        const targetRoom = currentAvail || availableRoomsForExtend[0];
        setExtendSelectedRoom(targetRoom.number);
        setExtendRoomRate(targetRoom.baseRate);
      }
    }
  }, [availableRoomsForExtend, extendModalBooking, extendSelectedRoom]);

  // Availability check for new reservation based on formCheckIn and formCheckOut
  const newResRoomAvailability = useMemo(() => {
    if (!formCheckIn || !formCheckOut || formCheckOut <= formCheckIn) {
      return { availableRooms: mockRooms, conflictMap: new Map<string, TapeChartBooking>() };
    }

    const conflictMap = new Map<string, TapeChartBooking>();
    mockRooms.forEach((rm) => {
      const conflict = bookings.find((b) => {
        if (b.status === 'CHECKED_OUT') return false;
        if (b.roomNumber !== rm.number) return false;
        return b.checkInDate < formCheckOut && b.checkOutDate > formCheckIn;
      });
      if (conflict) {
        conflictMap.set(rm.number, conflict);
      }
    });

    const availableRooms = mockRooms.filter((rm) => !conflictMap.has(rm.number));
    return { availableRooms, conflictMap };
  }, [formCheckIn, formCheckOut, bookings]);

  // Cancel / Delete a booking
  const handleCancelBooking = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (!confirm(`Batalkan dan hapus reservasi atas nama ${target.guestName} (#${target.bookingNumber}) di Kamar ${target.roomNumber}?`)) return;

    try {
      if (dbSynced) {
        await apiDeletePmsBooking(bookingId);
        setBookings(getStoredBookings());
      } else {
        const updated = bookings.filter((b) => b.id !== bookingId);
        setBookings(updated);
        saveStoredBookings(updated);
      }
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(null);
      }
      triggerToast(`Reservasi ${target.guestName} (#${target.bookingNumber}) berhasil dibatalkan dan dihapus.`);
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus reservasi.');
    }
  };

  // ----------------------------------------------------
  // OPERATIONAL ACTIONS: CHECK-IN, CHECK-OUT, EXTEND, PAY
  // ----------------------------------------------------
  const handleExecuteCheckIn = async (booking: TapeChartBooking) => {
    try {
      const apiUpdated = dbSynced ? await apiCheckInBooking(booking.id) : null;
      if (apiUpdated) {
        setBookings(getStoredBookings());
        if (selectedBooking?.id === booking.id) setSelectedBooking(apiUpdated);
      } else {
        const updated = bookings.map((b) =>
          b.id === booking.id ? { ...b, status: 'IN_HOUSE' as const } : b
        );
        setBookings(updated);
        saveStoredBookings(updated);
        if (selectedBooking?.id === booking.id) {
          setSelectedBooking({ ...selectedBooking, status: 'IN_HOUSE' });
        }
      }
      triggerToast(`Check-In Berhasil! Tamu ${booking.guestName} kini IN-HOUSE di Kamar ${booking.roomNumber}.`);
    } catch (err: any) {
      alert(err?.message || 'Gagal melakukan check-in.');
    }
  };

  const handleExecuteCheckOut = async (booking: TapeChartBooking) => {
    const isEarly = booking.checkOutDate > today;
    try {
      const apiUpdated = dbSynced ? await apiCheckOutBooking(booking.id, today) : null;
      let checkedOutRecord: TapeChartBooking;
      if (apiUpdated) {
        setBookings(getStoredBookings());
        checkedOutRecord = apiUpdated;
      } else {
        const updated = bookings.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: 'CHECKED_OUT' as const,
                checkOutDate: isEarly ? today : b.checkOutDate,
              }
            : b
        );
        setBookings(updated);
        saveStoredBookings(updated);
        checkedOutRecord = {
          ...booking,
          status: 'CHECKED_OUT',
          checkOutDate: isEarly ? today : booking.checkOutDate,
        };
      }
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(checkedOutRecord);
      }
      triggerToast(
        isEarly
          ? `Early Check-Out selesai! Tamu ${booking.guestName} telah check-out dari Kamar ${booking.roomNumber}. Kamar siap dibersihkan.`
          : `Check-Out selesai! Tamu ${booking.guestName} telah keluar dari Kamar ${booking.roomNumber}. Nota pelunasan siap dicetak.`
      );
      setPrintFolioBooking(checkedOutRecord);
    } catch (err: any) {
      alert(err?.message || 'Gagal melakukan check-out.');
    }
  };

  // Open Create Modal with Preset
  const handleOpenCreateModal = (timeFrame: 'WALK_IN' | 'FIT', prefilledRoom?: string, prefilledDate?: string) => {
    setResTimeFrame(timeFrame);

    let checkIn = today;
    let checkOut = '';

    if (timeFrame === 'WALK_IN') {
      checkIn = today;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      checkOut = tomorrow.toISOString().split('T')[0];
      setFormAutoCheckIn(true);
    } else {
      checkIn = prefilledDate || addDaysIso(today, 1);
      const afterDay = new Date(checkIn);
      afterDay.setDate(afterDay.getDate() + 2);
      checkOut = afterDay.toISOString().split('T')[0];
      setFormAutoCheckIn(false);
    }

    setFormCheckIn(checkIn);
    setFormCheckOut(checkOut);

    // Pick room: prefer prefilledRoom, otherwise pick the first room that is actually free
    let roomToSelect = prefilledRoom;
    if (!roomToSelect) {
      const freeRoom = mockRooms.find((rm) => {
        return !bookings.some(
          (b) =>
            b.status !== 'CHECKED_OUT' &&
            b.roomNumber === rm.number &&
            b.checkInDate < checkOut &&
            b.checkOutDate > checkIn
        );
      });
      roomToSelect = freeRoom ? freeRoom.number : '101';
    }

    setFormRoomNumber(roomToSelect);
    const selectedRoom = mockRooms.find((rm) => rm.number === roomToSelect) || mockRooms[0];
    setFormRoomRate(selectedRoom.baseRate);

    setFormGuestName('');
    setFormPhone('');
    setFormIdNumber('');
    setFormInitialPaymentMethod('NONE');
    setFormInitialPaymentAmount(0);
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  // Calculate pricing for new reservation using editable room rate
  const calcNewResPricing = () => {
    const r = mockRooms.find((rm) => rm.number === formRoomNumber) || mockRooms[0];
    const d1 = new Date(formCheckIn);
    const d2 = new Date(formCheckOut);
    const nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    const ratePerNight = Number(formRoomRate) > 0 ? Number(formRoomRate) : r.baseRate;
    const subtotal = ratePerNight * nights;
    const service = Math.round(subtotal * 0.1);
    const pbjt = Math.round((subtotal + service) * 0.1);
    const total = subtotal + service + pbjt;
    return { nights, ratePerNight, subtotal, service, pbjt, total, room: r };
  };

  const handleSaveNewReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGuestName.trim()) {
      alert('Mohon masukkan nama tamu.');
      return;
    }

    // Anti-Double Booking / Overbooking Check
    const conflict = newResRoomAvailability.conflictMap.get(formRoomNumber);
    if (conflict) {
      alert(
        `Gagal Menyimpan Reservasi: Kamar ${formRoomNumber} Tidak Tersedia!\n\nKamar ini sudah dipesan oleh ${conflict.guestName} (${conflict.source} #${conflict.bookingNumber}) untuk periode ${conflict.checkInDate} s/d ${conflict.checkOutDate}.\n\nSilakan pilih kamar lain yang masih berstatus [Tersedia].`
      );
      return;
    }

    const { nights, ratePerNight, total, room } = calcNewResPricing();
    const cleanInitialPay = parseThousands(formInitialPaymentAmount);

    try {
      let createdBooking: TapeChartBooking;
      if (dbSynced) {
        const res = await apiCreatePmsBooking({
          guestName: formGuestName.trim(),
          phone: formPhone.trim() || undefined,
          idNumber: formIdNumber.trim() || undefined,
          idType: 'KTP',
          roomNumber: formRoomNumber,
          ratePlan: formRatePlan,
          checkInDate: formCheckIn,
          checkOutDate: formCheckOut,
          reservationType: resTimeFrame,
          source: resTimeFrame === 'WALK_IN' ? 'WALK_IN' : 'DIRECT',
          autoCheckIn: resTimeFrame === 'WALK_IN' && formAutoCheckIn,
          nightlyRate: ratePerNight,
          initialPaymentMethod: formInitialPaymentMethod,
          initialPaymentAmount: cleanInitialPay,
          notes: formNotes.trim() || undefined,
        });
        createdBooking = res!;
        setBookings(getStoredBookings());
      } else {
        const newId = `b-${Date.now()}`;
        const bNumber = resTimeFrame === 'WALK_IN' ? `WI-${Date.now().toString().slice(-6)}` : `FIT-${Date.now().toString().slice(-6)}`;
        const initialPayments: PaymentRecord[] = [];
        if (formInitialPaymentMethod !== 'NONE' && cleanInitialPay > 0) {
          initialPayments.push({
            id: `pay-${Date.now()}`,
            amount: cleanInitialPay,
            method: formInitialPaymentMethod,
            date: today,
            notes: resTimeFrame === 'WALK_IN' ? 'Pembayaran saat Walk-In Check-In' : 'Deposit / DP Pemesanan FIT',
          });
        }
        const totalPaid = initialPayments.reduce((acc, p) => acc + p.amount, 0);
        const balance = Math.max(0, total - totalPaid);
        createdBooking = {
          id: newId,
          bookingNumber: bNumber,
          source: resTimeFrame === 'WALK_IN' ? 'WALK_IN' : 'DIRECT',
          reservationType: resTimeFrame,
          guestName: formGuestName.trim(),
          phone: formPhone.trim() || undefined,
          idNumber: formIdNumber.trim() || undefined,
          idType: 'KTP',
          roomNumber: formRoomNumber,
          roomType: room.type,
          ratePlan: formRatePlan,
          checkInDate: formCheckIn,
          checkOutDate: formCheckOut,
          status: resTimeFrame === 'WALK_IN' && formAutoCheckIn ? 'IN_HOUSE' : 'CONFIRMED',
          totalAmount: total,
          balance,
          payments: initialPayments,
          notes: formNotes.trim() || undefined,
        };
        const updated = [createdBooking, ...bookings];
        setBookings(updated);
        saveStoredBookings(updated);
      }

      const finalBal = calculateBookingBalance(createdBooking);
      setIsCreateModalOpen(false);

      triggerToast(
        resTimeFrame === 'WALK_IN'
          ? `Walk-In Berhasil! Tamu ${createdBooking.guestName} langsung Check-In di Kamar ${createdBooking.roomNumber}. Sisa saldo: ${formatCurrency(finalBal)}.`
          : `Reservasi FIT Berhasil! Reservasi ${createdBooking.guestName} (${nights} malam) untuk tanggal ${formCheckIn} telah tercatat. Sisa saldo: ${formatCurrency(finalBal)}.`
      );
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan reservasi.');
    }
  };

  // Open Extend Stay Modal
  const handleOpenExtendModal = (booking: TapeChartBooking) => {
    setExtendModalBooking(booking);
    const curOut = new Date(booking.checkOutDate);
    curOut.setDate(curOut.getDate() + 1);
    const defNewOut = curOut.toISOString().split('T')[0];
    setNewExtendCheckOut(defNewOut);

    const rObj = mockRooms.find((rm) => rm.number === booking.roomNumber);
    setExtendSelectedRoom(booking.roomNumber);
    setExtendRoomRate(rObj ? rObj.baseRate : 650000);
  };

  const handleConfirmExtendStay = async () => {
    if (!extendModalBooking || !newExtendCheckOut || !extendSelectedRoom) return;
    if (newExtendCheckOut <= extendModalBooking.checkOutDate) {
      alert('Tanggal check-out baru harus lebih lambat dari tanggal check-out saat ini.');
      return;
    }

    const curD = new Date(extendModalBooking.checkOutDate);
    const newD = new Date(newExtendCheckOut);
    const extraNights = Math.max(1, Math.round((newD.getTime() - curD.getTime()) / (1000 * 60 * 60 * 24)));

    const chosenRoom = mockRooms.find((rm) => rm.number === extendSelectedRoom);
    const ratePerNight = Number(extendRoomRate) > 0 ? Number(extendRoomRate) : (chosenRoom?.baseRate || 650000);
    const subtotalExtra = ratePerNight * extraNights;
    const serviceExtra = Math.round(subtotalExtra * 0.1);
    const pbjtExtra = Math.round((subtotalExtra + serviceExtra) * 0.1);
    const totalExtra = subtotalExtra + serviceExtra + pbjtExtra;
    const isMoved = extendSelectedRoom !== extendModalBooking.roomNumber;

    try {
      if (dbSynced) {
        const res = await apiExtendBookingStay(extendModalBooking.id, {
          newCheckOutDate: newExtendCheckOut,
          roomNumber: extendSelectedRoom,
          nightlyRate: ratePerNight,
        });
        setBookings(getStoredBookings());
        if (selectedBooking?.id === extendModalBooking.id) {
          setSelectedBooking(res?.isMoved ? null : res?.booking || null);
        }
      } else {
        let updated: TapeChartBooking[];
        if (isMoved) {
          const extBooking: TapeChartBooking = {
            id: `bkg-ext-${Date.now()}`,
            bookingNumber: `${extendModalBooking.bookingNumber}-EXT`,
            source: extendModalBooking.source,
            reservationType: extendModalBooking.reservationType || 'FIT',
            guestName: extendModalBooking.guestName,
            phone: extendModalBooking.phone,
            idNumber: extendModalBooking.idNumber,
            idType: extendModalBooking.idType,
            roomNumber: extendSelectedRoom,
            roomType: chosenRoom ? chosenRoom.type : 'Deluxe Room',
            ratePlan: extendModalBooking.ratePlan,
            checkInDate: extendModalBooking.checkOutDate,
            checkOutDate: newExtendCheckOut,
            status: extendModalBooking.checkOutDate <= today ? 'IN_HOUSE' : 'CONFIRMED',
            totalAmount: totalExtra,
            balance: totalExtra,
            payments: [],
            notes: `Perpanjangan Inap (Pindah dari Kamar ${extendModalBooking.roomNumber})`,
          };
          updated = [extBooking, ...bookings];
        } else {
          const newTotalAmount = extendModalBooking.totalAmount + totalExtra;
          const currentBalance = extendModalBooking.balance ?? 0;
          const newBalance = currentBalance + totalExtra;
          updated = bookings.map((b) =>
            b.id === extendModalBooking.id
              ? {
                  ...b,
                  checkOutDate: newExtendCheckOut,
                  totalAmount: newTotalAmount,
                  balance: newBalance,
                }
              : b
          );
        }
        setBookings(updated);
        saveStoredBookings(updated);
        if (selectedBooking?.id === extendModalBooking.id) {
          if (isMoved) {
            setSelectedBooking(null);
          } else {
            setSelectedBooking({
              ...selectedBooking,
              checkOutDate: newExtendCheckOut,
              totalAmount: extendModalBooking.totalAmount + totalExtra,
              balance: (extendModalBooking.balance ?? 0) + totalExtra,
            });
          }
        }
      }
      setExtendModalBooking(null);
      triggerToast(
        isMoved
          ? `Extend & Pindah Kamar Berhasil! Tamu ${extendModalBooking.guestName} dibuatkan perpanjangan di Kamar ${extendSelectedRoom} (${chosenRoom?.type}) untuk ${extraNights} malam (${extendModalBooking.checkOutDate} s/d ${newExtendCheckOut}). Tagihan perpanjangan: ${formatCurrency(totalExtra)}.`
          : `Extend Stay Berhasil! Tamu ${extendModalBooking.guestName} tetap di Kamar ${extendModalBooking.roomNumber} diperpanjang +${extraNights} malam s/d ${newExtendCheckOut}. Biaya bertambah ${formatCurrency(totalExtra)}.`
      );
    } catch (err: any) {
      alert(err?.message || 'Gagal memperpanjang masa inap.');
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (booking: TapeChartBooking) => {
    setPaymentModalBooking(booking);
    const bal = calculateBookingBalance(booking);
    setPayAmount(bal > 0 ? bal : 0);
    setPayMethod('EDC');
    setPayReference('');
    setPayNotes('');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBooking) return;
    const cleanAmount = parseThousands(payAmount);
    if (cleanAmount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    try {
      let updatedBooking: TapeChartBooking | undefined;
      if (dbSynced) {
        const res = await apiRecordBookingPayment(paymentModalBooking.id, {
          amount: cleanAmount,
          method: payMethod,
          reference: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined,
          date: today,
        });
        setBookings(getStoredBookings());
        updatedBooking = res || undefined;
      } else {
        const newPayment: PaymentRecord = {
          id: `pay-${Date.now()}`,
          amount: cleanAmount,
          method: payMethod,
          reference: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined,
          date: today,
        };
        const updated = addPaymentToBooking(paymentModalBooking.id, newPayment);
        setBookings(updated);
        updatedBooking = updated.find((b) => b.id === paymentModalBooking.id);
      }

      if (updatedBooking) {
        if (selectedBooking?.id === updatedBooking.id) {
          setSelectedBooking(updatedBooking);
        }
        const newBal = calculateBookingBalance(updatedBooking);
        triggerToast(
          `Pembayaran ${formatCurrency(cleanAmount)} (${getPaymentMethodLabel(payMethod)}) untuk tamu ${updatedBooking.guestName} berhasil dicatat! Sisa saldo: ${formatCurrency(newBal)}.`
        );
      }
      setPaymentModalBooking(null);
    } catch (err: any) {
      alert(err?.message || 'Gagal mencatat pembayaran.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-3 p-4 bg-foreground text-background rounded-2xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-background/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Integrated View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ConciergeBell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Front Desk & Reservasi Terpadu
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Operasional Live
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pusat operasional lengkap: Reservasi (Walk-in & FIT), Check-In, Check-Out, Extend Inap, Pembayaran & Tape Chart.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher: Kalender vs List */}
          <div className="flex items-center p-1 bg-muted/60 border border-border rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              Tampilan Kalender (Tape)
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5 text-primary" />
              Tampilan List Operasional
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                {bookings.length}
              </span>
            </button>
          </div>

          {/* Single Unified Reservation Button */}
          <button
            onClick={() => handleOpenCreateModal('WALK_IN')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white shadow-xs hover:bg-primary/90 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            + Buat Reservasi
          </button>
        </div>
      </div>

      {/* KPI Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => { setViewMode('list'); setListTab('ARRIVALS'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'ARRIVALS' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Arrivals Hari Ini</span>
            <LogIn className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black mt-1 text-blue-600">{counts.arrivalsToday}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Siap Check-In</div>
        </button>

        <button
          onClick={() => { setViewMode('list'); setListTab('IN_HOUSE'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'IN_HOUSE' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">In-House</span>
            <Bed className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-1 text-emerald-600">{counts.inHouse}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Sedang Menginap</div>
        </button>

        <button
          onClick={() => { setViewMode('list'); setListTab('DEPARTURES'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'DEPARTURES' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Departures Hari Ini</span>
            <LogOut className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-1 text-amber-600">{counts.departuresToday}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Jadwal Check-Out</div>
        </button>

        <button
          onClick={() => { setViewMode('list'); setListTab('WALK_IN'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'WALK_IN' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Tamu Walk-In</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black mt-1 text-purple-600">{counts.walkIns}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Datang Langsung</div>
        </button>

        <button
          onClick={() => { setViewMode('list'); setListTab('FIT'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'FIT' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">FIT Individual</span>
            <User className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black mt-1 text-indigo-600">{counts.fitCount}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Pemesanan Mandiri</div>
        </button>

        <button
          onClick={() => { setViewMode('list'); setListTab('CHECKED_OUT'); }}
          className={`p-3.5 bg-card border rounded-xl text-left transition-all hover:border-primary/50 shadow-xs ${
            listTab === 'CHECKED_OUT' && viewMode === 'list' ? 'border-primary ring-2 ring-primary/10' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Checked-Out</span>
            <DoorClosed className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-black mt-1 text-slate-600">{counts.checkedOut}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Selesai Menginap</div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TAMPILAN KALENDER (TAPE CHART GRID)                               */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* Calendar Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Navigation */}
              <div className="flex items-center bg-muted/60 border border-border rounded-xl p-1">
                <button
                  onClick={() => {
                    const d = new Date(chartStartDate);
                    d.setDate(d.getDate() - 7);
                    setChartStartDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1.5 hover:bg-card rounded-lg text-foreground transition-colors"
                  title="Mundur 7 hari"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartStartDate(today)}
                  className="px-3 py-1 text-xs font-bold hover:bg-card rounded-lg text-primary transition-colors"
                >
                  Hari Ini ({today})
                </button>
                <button
                  onClick={() => {
                    const d = new Date(chartStartDate);
                    d.setDate(d.getDate() + 7);
                    setChartStartDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1.5 hover:bg-card rounded-lg text-foreground transition-colors"
                  title="Maju 7 hari"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Range Toggle: 7, 14, 30 days */}
              <div className="flex items-center bg-muted/60 border border-border rounded-xl p-1 text-xs">
                {([7, 14, 30] as const).map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setDaysCount(cnt)}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-colors ${
                      daysCount === cnt ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cnt} Hari
                  </button>
                ))}
              </div>

              {/* Jump to 2027 Button */}
              <button
                onClick={() => setChartStartDate('2027-01-15')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-muted border border-border hover:bg-muted/80 text-foreground transition-colors"
              >
                Tahun 2027 ↗
              </button>
            </div>

            {/* Right: Floor Filter & Search */}
            <div className="flex items-center gap-2.5">
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">Semua Lantai (1-4)</option>
                <option value="1">Lantai 1 (Superior)</option>
                <option value="2">Lantai 2 (Deluxe)</option>
                <option value="3">Lantai 3 (Deluxe King)</option>
                <option value="4">Lantai 4 (Suite)</option>
                <option value="DIRTY">Kamar Kotor</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari kamar / tamu..."
                  value={calendarSearch}
                  onChange={(e) => setCalendarSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 w-44"
                />
              </div>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="overflow-x-auto border border-border rounded-xl scrollbar-thin">
            <div className="min-w-[950px]">
              {/* Header Row: Room Number & Dates */}
              <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(55px,1fr))] bg-muted/40 border-b border-border sticky top-0 z-10 text-xs">
                <div className="p-3 font-bold border-r border-border bg-muted/60 text-muted-foreground flex items-center justify-between">
                  <span>Kamar</span>
                  <Bed className="w-3.5 h-3.5" />
                </div>
                {calendarDates.map((d) => (
                  <div
                    key={d.dayStr}
                    className={`p-2 text-center border-r border-border last:border-r-0 ${
                      d.isToday ? 'bg-primary/10 text-primary font-black' : d.isWeekend ? 'bg-muted/30 text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-wider">{d.dayName}</div>
                    <div className="text-sm font-extrabold">{d.dayNum}</div>
                    <div className="text-[9px] text-muted-foreground">{d.monthName}</div>
                  </div>
                ))}
              </div>

              {/* Rooms & Tape Bars Rows */}
              <div className="divide-y divide-border">
                {filteredRooms.map((room) => {
                  return (
                    <div
                      key={room.number}
                      className="grid grid-cols-[140px_repeat(auto-fit,minmax(55px,1fr))] items-stretch hover:bg-muted/10 transition-colors text-xs"
                    >
                      {/* Room Label Cell */}
                      <div className="p-2.5 border-r border-border bg-card/60 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            Kamar {room.number}
                            {!room.clean && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Kamar Kotor (Perlu Housekeeping)" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{room.type}</div>
                        </div>
                        <button
                          onClick={() => handleOpenCreateModal('WALK_IN', room.number)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded bg-muted hover:bg-primary hover:text-white transition-all"
                          title={`Buat reservasi di kamar ${room.number}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Date Cells & Booking Bars */}
                      {calendarDates.map((d) => {
                        // Find all active bookings covering this date
                        const cellBookings = bookings.filter(
                          (b) =>
                            b.roomNumber === room.number &&
                            d.dayStr >= b.checkInDate &&
                            d.dayStr < b.checkOutDate &&
                            b.status !== 'CHECKED_OUT'
                        );

                        const activeBooking = cellBookings[0];
                        const isOverbooked = cellBookings.length > 1;
                        const isStart = activeBooking && activeBooking.checkInDate === d.dayStr;

                        return (
                          <div
                            key={d.dayStr}
                            onClick={() => {
                              if (activeBooking) {
                                setSelectedBooking(activeBooking);
                              } else {
                                handleOpenCreateModal('FIT', room.number, d.dayStr);
                              }
                            }}
                            className={`min-h-[44px] p-1 border-r border-border last:border-r-0 relative cursor-pointer transition-colors ${
                              d.isToday ? 'bg-primary/[0.03]' : ''
                            } hover:bg-primary/5`}
                          >
                            {activeBooking && (
                              <div
                                className={`w-full h-full rounded-md p-1.5 flex flex-col justify-center text-[11px] font-bold shadow-xs truncate select-none ${
                                  isOverbooked
                                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 font-extrabold'
                                    : activeBooking.status === 'IN_HOUSE'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : activeBooking.status === 'CONFIRMED'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-500 text-white hover:bg-slate-600'
                                }`}
                                title={
                                  isOverbooked
                                    ? `⚠️ BENTROK OVERBOOKING (${cellBookings.length} Tamu):\n${cellBookings
                                        .map((cb) => `• ${cb.guestName} (${cb.source || cb.reservationType}) [${cb.checkInDate} s/d ${cb.checkOutDate}]`)
                                        .join('\n')}`
                                    : `${activeBooking.guestName} (${activeBooking.status}) - Klik untuk kelola`
                                }
                              >
                                {isOverbooked ? (
                                  <div className="truncate text-[10px] flex items-center gap-1 font-black">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">Bentrok ({cellBookings.length})</span>
                                  </div>
                                ) : isStart ? (
                                  <div className="truncate flex items-center gap-1">
                                    <span className="truncate">{activeBooking.guestName}</span>
                                    <span className="text-[9px] px-1 bg-black/20 rounded font-mono">
                                      {activeBooking.reservationType || activeBooking.source}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-full text-center opacity-60 text-[10px]">·</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tape Chart Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" />
                Confirmed / Reserved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600" />
                In-House (Checked-In)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-600 animate-pulse" />
                Overbooking (Bentrok Jadwal)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-500" />
                Checked-Out
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Kamar Kotor
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Tip: Klik pada blok reservasi untuk Check-In, Check-Out, Extend, atau Pembayaran. Klik sel kosong untuk buat booking.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TAMPILAN LIST OPERASIONAL                                         */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* List Toolbar & Sub-tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {[
                { id: 'ALL', label: 'Semua Reservasi', count: bookings.length },
                { id: 'ARRIVALS', label: 'Arrivals Hari Ini', count: counts.arrivalsToday },
                { id: 'IN_HOUSE', label: 'In-House (Menginap)', count: counts.inHouse },
                { id: 'DEPARTURES', label: 'Departures Hari Ini', count: counts.departuresToday },
                { id: 'WALK_IN', label: 'Walk-In', count: counts.walkIns },
                { id: 'FIT', label: 'FIT Individual', count: counts.fitCount },
                { id: 'CHECKED_OUT', label: 'Selesai (Checked-Out)', count: counts.checkedOut },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setListTab(tab.id as any)}
                  className={`px-3 py-1.5 font-bold rounded-xl transition-all ${
                    listTab === tab.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    listTab === tab.id ? 'bg-white/20 text-white' : 'bg-card text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* List Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama, no. booking, kamar, telp..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-muted/40 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Operational Data Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">No. Booking & Tipe</th>
                  <th className="p-3">Tamu & Kontak</th>
                  <th className="p-3">Kamar & Tipe</th>
                  <th className="p-3">Durasi Inap</th>
                  <th className="p-3 text-right">Total Tagihan</th>
                  <th className="p-3 text-center">Status Saldo</th>
                  <th className="p-3 text-center">Status Tamu</th>
                  <th className="p-3 text-center">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredListBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Tidak ada data reservasi yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredListBookings.map((b) => {
                    const balance = calculateBookingBalance(b);
                    const isFullyPaid = balance === 0;

                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        {/* No. Booking & Tipe */}
                        <td className="p-3 font-medium">
                          <div className="font-mono font-bold text-primary">{b.bookingNumber}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              b.reservationType === 'WALK_IN'
                                ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                : b.reservationType === 'FIT'
                                ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            }`}>
                              {b.reservationType || b.source}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{b.ratePlan}</span>
                          </div>
                        </td>

                        {/* Tamu & Kontak */}
                        <td className="p-3">
                          <div className="font-bold text-foreground text-sm">{b.guestName}</div>
                          <div className="text-muted-foreground text-[11px] font-mono">{b.phone || '-'}</div>
                          {b.idNumber && (
                            <div className="text-[10px] text-muted-foreground font-mono">KTP: {b.idNumber}</div>
                          )}
                        </td>

                        {/* Kamar & Tipe */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 font-bold text-foreground text-sm px-2 py-0.5 bg-muted rounded">
                            <Bed className="w-3.5 h-3.5 text-primary" />
                            Kamar {b.roomNumber}
                          </span>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{b.roomType}</div>
                        </td>

                        {/* Durasi Inap */}
                        <td className="p-3">
                          <div className="font-medium text-foreground">{b.checkInDate} s/d {b.checkOutDate}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {b.checkInDate === today && b.status === 'CONFIRMED' && (
                              <span className="text-blue-600 font-bold">● Tiba Hari Ini</span>
                            )}
                            {b.checkOutDate === today && b.status === 'IN_HOUSE' && (
                              <span className="text-amber-600 font-bold">● Check-Out Hari Ini</span>
                            )}
                          </div>
                        </td>

                        {/* Total Tagihan */}
                        <td className="p-3 text-right">
                          <div className="font-mono font-bold text-foreground">{formatCurrency(b.totalAmount)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Sudah Bayar: {formatCurrency(b.totalAmount - balance)}
                          </div>
                        </td>

                        {/* Status Saldo */}
                        <td className="p-3 text-center">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Kurang {formatCurrency(balance)}
                            </span>
                          )}
                        </td>

                        {/* Status Tamu */}
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            b.status === 'IN_HOUSE'
                              ? 'bg-emerald-600 text-white'
                              : b.status === 'CONFIRMED'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-500 text-white'
                          }`}>
                            {b.status}
                          </span>
                        </td>

                        {/* Action Buttons in Grid */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Check-In Action */}
                            {b.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleExecuteCheckIn(b)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors"
                                title="Check-In Tamu Sekarang"
                              >
                                <LogIn className="w-3 h-3" />
                                Check-In
                              </button>
                            )}

                            {/* Check-Out Action */}
                            {b.status === 'IN_HOUSE' && (
                              <button
                                onClick={() => handleExecuteCheckOut(b)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-colors"
                                title="Check-Out Tamu"
                              >
                                <LogOut className="w-3 h-3" />
                                Check-Out
                              </button>
                            )}

                            {/* Extend Stay Action */}
                            {b.status === 'IN_HOUSE' && (
                              <button
                                onClick={() => handleOpenExtendModal(b)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-[11px] border border-border transition-colors"
                                title="Perpanjang Durasi Inap (Extend Stay)"
                              >
                                <CalendarPlus className="w-3 h-3 text-primary" />
                                Extend
                              </button>
                            )}

                            {/* Payment Action (Kapanpun sebelum checkout) */}
                            {b.status !== 'CHECKED_OUT' && (
                              <button
                                onClick={() => handleOpenPaymentModal(b)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-[11px] border border-border transition-colors"
                                title="Catat Pembayaran (Cash, EDC, GL, OTA, Transfer)"
                              >
                                <CreditCard className="w-3 h-3 text-emerald-600" />
                                Bayar
                              </button>
                            )}

                            {/* Folio / Receipt Print Out with Hotel Logo */}
                            <button
                              onClick={() => setPrintFolioBooking(b)}
                              className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border transition-colors"
                              title="Cetak Nota / Folio Tamu dengan Logo Hotel"
                            >
                              <Printer className="w-3.5 h-3.5 text-primary" />
                            </button>

                            {/* Batalkan / Hapus Reservasi */}
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg border border-destructive/20 transition-colors"
                              title="Batalkan / Hapus Reservasi Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BUAT RESERVASI (WALK-IN vs FIT)                                   */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Buat Reservasi Baru
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Time Framing Selection: Walk-In vs FIT */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/40 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setResTimeFrame('WALK_IN');
                  setFormCheckIn(today);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setFormCheckOut(tomorrow.toISOString().split('T')[0]);
                  setFormAutoCheckIn(true);
                }}
                className={`flex flex-col items-start p-3 rounded-lg text-left transition-all ${
                  resTimeFrame === 'WALK_IN'
                    ? 'bg-card text-foreground shadow-xs border border-primary/40'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-purple-600">
                  <Zap className="w-3.5 h-3.5" />
                  Walk-In Reservation
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Tamu datang langsung hari ini & ingin check-in saat ini juga.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResTimeFrame('FIT');
                  const nextDay = addDaysIso(today, 1);
                  setFormCheckIn(nextDay);
                  const afterDay = new Date(nextDay);
                  afterDay.setDate(afterDay.getDate() + 2);
                  setFormCheckOut(afterDay.toISOString().split('T')[0]);
                  setFormAutoCheckIn(false);
                }}
                className={`flex flex-col items-start p-3 rounded-lg text-left transition-all ${
                  resTimeFrame === 'FIT'
                    ? 'bg-card text-foreground shadow-xs border border-primary/40'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-indigo-600">
                  <User className="w-3.5 h-3.5" />
                  FIT Reservation
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Tamu individual untuk hari esok / tanggal-tanggal selanjutnya.
                </div>
              </button>
            </div>

            {/* Reservation Form */}
            <form onSubmit={handleSaveNewReservation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Nama Lengkap Tamu <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="+62812345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">No. Identitas (KTP / Paspor)</label>
                  <input
                    type="text"
                    placeholder="3372010101900001"
                    value={formIdNumber}
                    onChange={(e) => setFormIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                {/* Live Availability Status Indicator */}
                <div className="sm:col-span-2">
                  {(() => {
                    const conflict = newResRoomAvailability.conflictMap.get(formRoomNumber);
                    if (conflict) {
                      return (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 space-y-1">
                          <div className="font-extrabold flex items-center gap-1.5 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            Kamar {formRoomNumber} Tidak Tersedia (Bentrok dengan Reservasi Lain)!
                          </div>
                          <div className="text-[11px] leading-relaxed">
                            Kamar ini sudah dipesan oleh <span className="font-bold underline">{conflict.guestName}</span> ({conflict.source || conflict.reservationType} #{conflict.bookingNumber}) dari tanggal <span className="font-mono font-bold">{conflict.checkInDate}</span> s/d <span className="font-mono font-bold">{conflict.checkOutDate}</span>.
                          </div>
                          <div className="text-[11px] font-semibold text-muted-foreground pt-0.5">
                            👉 Silakan pilih kamar lain yang bertanda <span className="text-emerald-600 font-bold">[Tersedia]</span> di dropdown bawah.
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Kamar {formRoomNumber} tersedia untuk periode tanggal ini.</span>
                        </div>
                        <span className="text-[10px] bg-emerald-600/15 px-2 py-0.5 rounded font-bold">
                          {newResRoomAvailability.availableRooms.length} Kamar Kosong
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Pilih Kamar & Tipe <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formRoomNumber}
                    onChange={(e) => {
                      const rmNum = e.target.value;
                      setFormRoomNumber(rmNum);
                      const rObj = mockRooms.find((rm) => rm.number === rmNum);
                      if (rObj) setFormRoomRate(rObj.baseRate);
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg text-xs outline-none focus:ring-2 font-bold ${
                      newResRoomAvailability.conflictMap.has(formRoomNumber)
                        ? 'border-destructive focus:ring-destructive/20 text-destructive'
                        : 'border-border focus:ring-primary/20'
                    }`}
                  >
                    {mockRooms.map((rm) => {
                      const conflict = newResRoomAvailability.conflictMap.get(rm.number);
                      return (
                        <option
                          key={rm.number}
                          value={rm.number}
                          disabled={!!conflict}
                          className={conflict ? 'text-destructive font-semibold bg-destructive/10' : ''}
                        >
                          Kamar {rm.number} - {rm.type}{' '}
                          {conflict
                            ? `[SUDAH DIPESAN: ${conflict.guestName} (${conflict.source}) ${conflict.checkInDate} s/d ${conflict.checkOutDate}]`
                            : `[Tersedia - ${formatCurrency(rm.baseRate)}/mlm]`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-muted-foreground font-semibold">
                      Tarif Kamar per Malam (Rp) <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[10px] text-primary font-bold">Bisa diedit</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                    <input
                      type="text"
                      required
                      value={formatThousands(formRoomRate)}
                      onChange={(e) => setFormRoomRate(parseThousands(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="650.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Paket / Rate Plan</label>
                  <select
                    value={formRatePlan}
                    onChange={(e) => setFormRatePlan(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Room Only">Room Only (Kamar Saja)</option>
                    <option value="Bed & Breakfast">Bed & Breakfast (Termasuk Sarapan)</option>
                    <option value="Corporate Rate">Corporate Negotiated Rate</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">
                    Tanggal Check-In {resTimeFrame === 'WALK_IN' ? '(Terkunci Hari Ini)' : ''}
                  </label>
                  <input
                    type="date"
                    required
                    readOnly={resTimeFrame === 'WALK_IN'}
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className={`w-full px-3 py-2 border border-border rounded-lg text-xs outline-none font-mono ${
                      resTimeFrame === 'WALK_IN' ? 'bg-muted text-muted-foreground' : 'bg-background focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Tanggal Check-Out</label>
                  <input
                    type="date"
                    required
                    min={formCheckIn}
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
              </div>

              {/* Automatic Check-In Checkbox for Walk-In */}
              {resTimeFrame === 'WALK_IN' && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="auto-checkin"
                    checked={formAutoCheckIn}
                    onChange={(e) => setFormAutoCheckIn(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <label htmlFor="auto-checkin" className="text-xs font-bold text-purple-900 dark:text-purple-300 cursor-pointer">
                    Langsung Check-In Tamu ke Kamar Sekarang (Status otomatis IN-HOUSE)
                  </label>
                </div>
              )}

              {/* Payment Section (Optional upfront payment) */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Pembayaran Awal / Deposit (Opsional)</span>
                  <span className="text-[10px] text-muted-foreground">Bisa dibayar kapanpun sebelum checkout</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={formInitialPaymentMethod}
                    onChange={(e) => {
                      const m = e.target.value as any;
                      setFormInitialPaymentMethod(m);
                      if (m !== 'NONE' && formInitialPaymentAmount === 0) {
                        setFormInitialPaymentAmount(calcNewResPricing().total);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="NONE">Belum Bayar (Bayar Nanti)</option>
                    <option value="CASH">Cash (Tunai)</option>
                    <option value="EDC">EDC (Debit / CC / QRIS)</option>
                    <option value="CITY_LEDGER">City Ledger / Guarantee Letter</option>
                    <option value="OTA_VOUCHER">Voucher Travel (OTA)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>

                  {formInitialPaymentMethod !== 'NONE' && (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                      <input
                        type="text"
                        placeholder="Nominal Rp"
                        value={formatThousands(formInitialPaymentAmount)}
                        onChange={(e) => setFormInitialPaymentAmount(parseThousands(e.target.value))}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Summary Box */}
              {(() => {
                const p = calcNewResPricing();
                return (
                  <div className="p-3 bg-card border border-border rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Durasi:</span>
                      <span className="font-bold text-foreground">{p.nights} Malam</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sewa Kamar ({p.room.type}):</span>
                      <span className="font-mono">{formatCurrency(p.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Service Charge 10% & PBJT 10%:</span>
                      <span className="font-mono">{formatCurrency(p.service + p.pbjt)}</span>
                    </div>
                    <div className="border-t border-border pt-1 flex justify-between font-bold text-sm">
                      <span className="text-foreground">Total Grand Total:</span>
                      <span className="font-mono text-primary">{formatCurrency(p.total)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={newResRoomAvailability.conflictMap.has(formRoomNumber)}
                  className={`px-5 py-2 font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                    newResRoomAvailability.conflictMap.has(formRoomNumber)
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {resTimeFrame === 'WALK_IN' ? 'Check-In Walk-In Tamu' : 'Simpan Reservasi FIT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EXTEND STAY (PERPANJANG INAP)                                     */}
      {/* ========================================================================= */}
      {extendModalBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Perpanjang Masa Inap (Extend Stay)
                </h3>
              </div>
              <button
                onClick={() => setExtendModalBooking(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5">
              <div className="font-bold text-foreground text-sm">{extendModalBooking.guestName}</div>
              <div className="text-muted-foreground">
                Kamar <span className="font-bold text-foreground">{extendModalBooking.roomNumber}</span> ({extendModalBooking.roomType})
              </div>
              <div className="text-muted-foreground">
                Check-Out Saat Ini: <span className="font-bold text-amber-600 font-mono">{extendModalBooking.checkOutDate}</span>
              </div>
            </div>

            {/* Quick Extension Buttons */}
            <div>
              <label className="text-muted-foreground font-semibold block mb-1.5">Pilihan Cepat Tambah Durasi:</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((nights) => (
                  <button
                    key={nights}
                    type="button"
                    onClick={() => {
                      const d = new Date(extendModalBooking.checkOutDate);
                      d.setDate(d.getDate() + nights);
                      setNewExtendCheckOut(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 border border-border rounded-xl hover:border-primary font-bold text-center bg-card hover:bg-primary/5 transition-colors"
                  >
                    +{nights} Malam
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Tanggal Check-Out Baru:</label>
              <input
                type="date"
                min={extendModalBooking.checkOutDate}
                value={newExtendCheckOut}
                onChange={(e) => setNewExtendCheckOut(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Room Availability Status & Room Selection (Available Rooms Only) */}
            <div className="space-y-3 pt-1 border-t border-border">
              {(() => {
                const currentRoomAvail = availableRoomsForExtend.some(
                  (r) => r.number === extendModalBooking.roomNumber
                );
                if (currentRoomAvail) {
                  return (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Kamar saat ini ({extendModalBooking.roomNumber}) tersedia untuk diperpanjang.</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Kamar {extendModalBooking.roomNumber} sudah dipesan tamu lain pada tanggal tersebut!</div>
                        <div className="text-[11px] font-normal mt-0.5">Tamu harus dipindahkan ke kamar lain yang masih tersedia di bawah ini.</div>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Available Rooms Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-muted-foreground font-semibold">
                    Pilih Kamar Perpanjangan (Hanya yang Available):
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {availableRoomsForExtend.length} Kamar Tersedia
                  </span>
                </div>

                {availableRoomsForExtend.length === 0 ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold">
                    Tidak ada kamar yang tersedia pada rentang tanggal perpanjangan ini. Silakan pilih tanggal check-out yang berbeda.
                  </div>
                ) : (
                  <select
                    value={extendSelectedRoom}
                    onChange={(e) => {
                      const rNum = e.target.value;
                      setExtendSelectedRoom(rNum);
                      const rObj = mockRooms.find((rm) => rm.number === rNum);
                      if (rObj) setExtendRoomRate(rObj.baseRate);
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {availableRoomsForExtend.map((rm) => (
                      <option key={rm.number} value={rm.number}>
                        Kamar {rm.number} - {rm.type} (Tarif: {formatCurrency(rm.baseRate)}/mlm)
                        {rm.number === extendModalBooking.roomNumber ? ' [Kamar Saat Ini]' : ' [Pindah Kamar]'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Editable Rate per night for extension */}
              {availableRoomsForExtend.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-muted-foreground font-semibold">
                      Tarif Kamar per Malam untuk Perpanjangan (Rp):
                    </label>
                    <span className="text-[10px] text-primary font-bold">Bisa diedit</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                    <input
                      type="text"
                      required
                      value={formatThousands(extendRoomRate)}
                      onChange={(e) => setExtendRoomRate(parseThousands(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="650.000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cost Preview */}
            {newExtendCheckOut > extendModalBooking.checkOutDate && availableRoomsForExtend.length > 0 && (
              (() => {
                const curD = new Date(extendModalBooking.checkOutDate);
                const newD = new Date(newExtendCheckOut);
                const extraNights = Math.max(1, Math.round((newD.getTime() - curD.getTime()) / (1000 * 60 * 60 * 24)));
                const chosenRoom = mockRooms.find((rm) => rm.number === extendSelectedRoom);
                const ratePerNight = Number(extendRoomRate) > 0 ? Number(extendRoomRate) : (chosenRoom?.baseRate || 650000);
                const subtotalExtra = ratePerNight * extraNights;
                const serviceExtra = Math.round(subtotalExtra * 0.1);
                const pbjtExtra = Math.round((subtotalExtra + serviceExtra) * 0.1);
                const totalExtra = subtotalExtra + serviceExtra + pbjtExtra;

                return (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Kamar Perpanjangan:</span>
                      <span className="font-bold text-foreground">
                        Kamar {extendSelectedRoom} ({chosenRoom?.type || '-'})
                        {extendSelectedRoom !== extendModalBooking.roomNumber && (
                          <span className="text-amber-600 font-bold ml-1">(Pindah Kamar)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Durasi Tambahan:</span>
                      <span className="font-bold text-primary">{extraNights} Malam</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tarif Tambahan per Malam:</span>
                      <span className="font-mono">{formatCurrency(ratePerNight)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Service 10% & PBJT 10%:</span>
                      <span className="font-mono">{formatCurrency(serviceExtra + pbjtExtra)}</span>
                    </div>
                    <div className="border-t border-border pt-1 flex justify-between font-bold text-sm">
                      <span className="text-foreground">Total Tambahan Tagihan:</span>
                      <span className="font-mono text-primary">{formatCurrency(totalExtra)}</span>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setExtendModalBooking(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmExtendStay}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-xs"
              >
                Konfirmasi Extend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KELOLA PEMBAYARAN (KAPANPUN SEBELUM CHECKOUT)                     */}
      {/* ========================================================================= */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Kelola Pembayaran & Folio Tagihan
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalBooking(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guest & Balance Summary */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-extrabold text-sm text-foreground">{paymentModalBooking.guestName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Kamar {paymentModalBooking.roomNumber} ({paymentModalBooking.roomType}) | {paymentModalBooking.bookingNumber}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Sisa Saldo</span>
                  <div className="text-base font-extrabold font-mono text-destructive">
                    {formatCurrency(calculateBookingBalance(paymentModalBooking))}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="border-t border-border pt-2 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Riwayat Pembayaran Sebelumnya:
                </span>
                {(!paymentModalBooking.payments || paymentModalBooking.payments.length === 0) ? (
                  <div className="text-[11px] text-muted-foreground italic">Belum ada catatan pembayaran.</div>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {paymentModalBooking.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] p-1.5 bg-background rounded border border-border/50">
                        <div>
                          <span className="font-bold text-foreground">{getPaymentMethodLabel(p.method)}</span>
                          {p.reference && <span className="text-muted-foreground font-mono ml-1">({p.reference})</span>}
                          <div className="text-[9px] text-muted-foreground">{p.date} {p.notes ? `• ${p.notes}` : ''}</div>
                        </div>
                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Tambah Pembayaran */}
            <form onSubmit={handleSavePayment} className="space-y-3">
              <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                Catat Transaksi Pembayaran Baru
              </div>

              {/* 5 Payment Types */}
              <div>
                <label className="text-muted-foreground font-semibold block mb-1">Pilih Metode Pembayaran:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash (Tunai)', desc: 'Pembayaran tunai di meja resepsionis' },
                    { id: 'EDC', label: 'EDC (Debit, CC, QRIS)', desc: 'Mesin EDC BCA / Mandiri / QRIS' },
                    { id: 'CITY_LEDGER', label: 'City Ledger / GL', desc: 'Guarantee letter instansi / piutang' },
                    { id: 'OTA_VOUCHER', label: 'Voucher Travel (OTA)', desc: 'Agoda / Traveloka Collect Voucher' },
                    { id: 'BANK_TRANSFER', label: 'Bank Transfer', desc: 'Transfer rekening resmi hotel' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        payMethod === m.id
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-card text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-muted-foreground font-semibold">Nominal Pembayaran (Rp):</label>
                    <button
                      type="button"
                      onClick={() => setPayAmount(calculateBookingBalance(paymentModalBooking))}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Bayar Lunas
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 500.000"
                      value={formatThousands(payAmount)}
                      onChange={(e) => setPayAmount(parseThousands(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">No. Referensi / No. Transaksi:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Approval 881920 / Ref 9912"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground font-semibold block mb-1">Catatan Tambahan (Opsional):</label>
                <input
                  type="text"
                  placeholder="Keterangan staff / tanda terima"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPaymentModalBooking(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CETAK NOTA / GUEST FOLIO RESMI DENGAN LOGO HOTEL                 */}
      {/* ========================================================================= */}
      {printFolioBooking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            {/* Header Dialog */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Nota Pelunasan / Guest Folio Resmi
                </h3>
              </div>
              <button
                onClick={() => setPrintFolioBooking(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Official Printable Folio Area */}
            <div id="printable-folio" className="p-5 bg-card border border-border rounded-xl space-y-3">
              {/* Letterhead with Custom Uploaded Hotel Logo */}
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-base text-foreground">
                    {hotelSettings.hotelName || 'Hotel Winotosastro AProject'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {hotelSettings.address || 'Jl. Brigjend Slamet Riyadi No. 250, Surakarta'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    NPWPD: {hotelSettings.npwpd || '33.72.01.284.910-001'} | Telp: {hotelSettings.phone || '+62 271 718899'}
                  </p>
                </div>
                {/* Custom Logo Display */}
                <div className="flex-shrink-0 text-right">
                  {hotelSettings.logoUrl ? (
                    <img
                      src={hotelSettings.logoUrl}
                      alt="Hotel Logo"
                      className="h-12 w-auto max-w-[140px] object-contain bg-white p-1 rounded border border-border/50 inline-block"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs inline-flex">
                      LOGO
                    </div>
                  )}
                  <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                    INV-{printFolioBooking.bookingNumber}
                  </div>
                </div>
              </div>

              {/* Guest & Room Details */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Tamu (Billed To)</span>
                  <div className="font-bold text-foreground text-sm">{printFolioBooking.guestName}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">{printFolioBooking.phone || '-'}</div>
                  {printFolioBooking.idNumber && (
                    <div className="text-[10px] text-muted-foreground font-mono">KTP: {printFolioBooking.idNumber}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Kamar & Durasi</span>
                  <div className="font-bold text-foreground">Kamar {printFolioBooking.roomNumber} ({printFolioBooking.roomType})</div>
                  <div className="text-muted-foreground text-[11px]">
                    {printFolioBooking.checkInDate} s/d {printFolioBooking.checkOutDate}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground inline-block mt-0.5">
                    Tipe: {printFolioBooking.reservationType || printFolioBooking.source}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-border pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sewa Kamar ({printFolioBooking.ratePlan}):</span>
                  <span className="font-mono text-foreground">{formatCurrency(printFolioBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Termasuk PBJT Hotel 10% & Service 10%:</span>
                  <span className="font-mono text-emerald-600 font-semibold">Tercakup</span>
                </div>

                {/* Payment History Breakdown */}
                {printFolioBooking.payments && printFolioBooking.payments.length > 0 && (
                  <div className="border-t border-border/60 pt-1.5 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Metode Pembayaran Tercatat:
                    </span>
                    {printFolioBooking.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground text-[11px]">
                        <span>• {getPaymentMethodLabel(p.method)} {p.reference ? `(${p.reference})` : ''}:</span>
                        <span className="font-mono text-emerald-600 font-semibold">-{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-foreground">Sisa Saldo (Balance Due):</span>
                  <span className={`font-mono ${calculateBookingBalance(printFolioBooking) === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {calculateBookingBalance(printFolioBooking) === 0 ? 'Rp 0 (LUNAS 100%)' : formatCurrency(calculateBookingBalance(printFolioBooking))}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Nota / Unduh PDF
              </button>
              <button
                onClick={() => setPrintFolioBooking(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold transition-colors text-foreground text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL DETAIL OPERASIONAL (Klik dari Kalender)                     */}
      {/* ========================================================================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ConciergeBell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Detail Operasional Reservasi
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-base font-extrabold text-foreground">{selectedBooking.guestName}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{selectedBooking.phone || '-'}</div>
                  {selectedBooking.idNumber && (
                    <div className="text-[10px] text-muted-foreground font-mono">No. Identitas: {selectedBooking.idNumber}</div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  selectedBooking.status === 'IN_HOUSE'
                    ? 'bg-emerald-600 text-white'
                    : selectedBooking.status === 'CONFIRMED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-500 text-white'
                }`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Kamar & Tipe</span>
                  <div className="font-bold text-foreground">Kamar {selectedBooking.roomNumber}</div>
                  <div className="text-[10px] text-muted-foreground">{selectedBooking.roomType}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Masa Inap</span>
                  <div className="font-bold text-foreground">{selectedBooking.checkInDate}</div>
                  <div className="text-[10px] text-muted-foreground">s/d {selectedBooking.checkOutDate}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Biaya</span>
                  <div className="font-mono font-bold text-foreground">{formatCurrency(selectedBooking.totalAmount)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Sisa Saldo</span>
                  <div className={`font-mono font-bold ${calculateBookingBalance(selectedBooking) === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {calculateBookingBalance(selectedBooking) === 0 ? 'LUNAS' : formatCurrency(calculateBookingBalance(selectedBooking))}
                  </div>
                </div>
              </div>
            </div>

            {/* Overbooking / Conflict Notice if another booking shares this room & dates */}
            {(() => {
              const conflicts = bookings.filter(
                (b) =>
                  b.id !== selectedBooking.id &&
                  b.status !== 'CHECKED_OUT' &&
                  b.roomNumber === selectedBooking.roomNumber &&
                  b.checkInDate < selectedBooking.checkOutDate &&
                  b.checkOutDate > selectedBooking.checkInDate
              );
              if (conflicts.length > 0) {
                return (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2 text-xs">
                    <div className="font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Perhatian: Kamar ini Terjadi Overbooking (Bentrok)!
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Kamar {selectedBooking.roomNumber} juga dipesan oleh tamu berikut pada tanggal yang sama:
                    </div>
                    {conflicts.map((cb) => (
                      <div key={cb.id} className="p-2 bg-background border border-border rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-foreground">{cb.guestName} ({cb.source || cb.reservationType})</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {cb.checkInDate} s/d {cb.checkOutDate} • #{cb.bookingNumber}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedBooking(cb)}
                          className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                        >
                          Buka
                        </button>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {selectedBooking.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleExecuteCheckIn(selectedBooking)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  Check-In Tamu Sekarang
                </button>
              )}

              {selectedBooking.status === 'IN_HOUSE' && (
                <button
                  onClick={() => handleExecuteCheckOut(selectedBooking)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Check-Out Tamu & Selesaikan Kamar
                </button>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleOpenExtendModal(selectedBooking)}
                  className="py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl border border-border flex items-center justify-center gap-1"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-primary" />
                  Extend
                </button>

                <button
                  onClick={() => handleOpenPaymentModal(selectedBooking)}
                  className="py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl border border-border flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Bayar
                </button>

                <button
                  onClick={() => setPrintFolioBooking(selectedBooking)}
                  className="py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl border border-border flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  Folio
                </button>
              </div>

              {/* Batalkan / Hapus Reservasi */}
              <button
                onClick={() => handleCancelBooking(selectedBooking.id)}
                className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold rounded-xl border border-destructive/20 flex items-center justify-center gap-1.5 transition-colors text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Batalkan / Hapus Reservasi Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
