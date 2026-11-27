'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  MapPin,
  Star,
  Wifi,
  Coffee,
  Car,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Printer,
  Copy,
  Clock,
  ExternalLink,
  Key,
  Lock,
  Unlock,
  Share2,
  FileText,
  Smartphone,
  Bed,
  Phone,
  Info,
  Check,
  LogOut,
  AlertTriangle,
  X,
} from 'lucide-react';
import { formatCurrency, getTodayJakarta, addDaysIso } from '../../../../lib/utils';
import { apiRequest } from '../../../../lib/api-client';
import { calculateHotelTax } from '../../../../lib/settings-store';
import {
  TapeChartBooking,
  getStoredBookings,
  saveStoredBookings,
} from '../../../../lib/bookings-store';

interface RoomSelection {
  id: string;
  name: string;
  size: string;
  bed: string;
  amenities: string[];
  basePrice: number;
  selectedRatePlan: 'RO' | 'BB';
  bbAddon: number;
  roomNumber: string;
  floor: string;
}

const AVAILABLE_ROOMS: RoomSelection[] = [
  {
    id: 'rt-sup',
    name: 'Superior Room',
    size: '26 m²',
    bed: '1 King Bed or 2 Single Beds',
    amenities: ['High-speed Wi-Fi', 'Smart TV 43"', 'Rain Shower', 'City View', 'Air Conditioning'],
    basePrice: 550000,
    selectedRatePlan: 'BB',
    bbAddon: 130000,
    roomNumber: '102',
    floor: 'Lantai 1 - Sayap Barat',
  },
  {
    id: 'rt-dlx',
    name: 'Deluxe Room',
    size: '34 m²',
    bed: '1 Super King Bed',
    amenities: ['Free High-Speed Wi-Fi', 'Smart TV 55"', 'Bathtub & Shower', 'Balcony', 'Nespresso Coffee'],
    basePrice: 750000,
    selectedRatePlan: 'BB',
    bbAddon: 130000,
    roomNumber: '204',
    floor: 'Lantai 2 - Sayap Timur',
  },
  {
    id: 'rt-exec',
    name: 'Executive Suite',
    size: '48 m²',
    bed: '1 Super King Bed + Living Area',
    amenities: ['Executive Lounge Access', 'Bathtub & Rain Shower', 'Work Desk', 'Free Mini Bar', 'Butler Service'],
    basePrice: 1250000,
    selectedRatePlan: 'BB',
    bbAddon: 150000,
    roomNumber: '402',
    floor: 'Lantai 4 - Penthouse Floor',
  },
  {
    id: 'rt-fam',
    name: 'Family Suite',
    size: '62 m²',
    bed: '2 King Beds (Up to 4 Guests)',
    amenities: ['2 Separate Bedrooms', 'Spacious Living Room', '2 En-suite Bathrooms', 'Dining Area', 'Free Mini Bar'],
    basePrice: 1850000,
    selectedRatePlan: 'BB',
    bbAddon: 200000,
    roomNumber: '302',
    floor: 'Lantai 3 - Family Wing',
  },
];

export default function PublicBookingEnginePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [hotelBrand, setHotelBrand] = useState<{
    hotelName: string;
    address: string;
    phone: string;
    logoUrl?: string;
  }>({
    hotelName: 'Hotel Winotosastro AProject',
    address: 'Jl. Brigjend Slamet Riyadi, Surakarta (Solo), Central Java',
    phone: '+62 271 718899',
  });
  const [roomsList, setRoomsList] = useState<RoomSelection[]>(AVAILABLE_ROOMS);
  const [taxConfig, setTaxConfig] = useState<{
    pbjtEnabled: boolean;
    serviceChargeEnabled: boolean;
    pbjtRate: number;
    serviceChargeRate: number;
  }>({
    pbjtEnabled: true,
    serviceChargeEnabled: true,
    pbjtRate: 10,
    serviceChargeRate: 10,
  });

  // Search parameters (Real-Time Jakarta Date)
  const [checkIn, setCheckIn] = useState(() => getTodayJakarta());
  const [checkOut, setCheckOut] = useState(() => addDaysIso(getTodayJakarta(), 2));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Selected room & add-ons
  const [selectedRoom, setSelectedRoom] = useState<RoomSelection>(AVAILABLE_ROOMS[1]);

  useEffect(() => {
    const slug =
      typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(Boolean).pop() || 'winotosastro'
        : 'winotosastro';

    apiRequest<{
      hotelName: string;
      address: string;
      city: string;
      phone: string;
      logoUrl?: string;
      pbjtRate?: number;
      serviceChargeRate?: number;
      pbjtEnabled?: boolean;
      serviceChargeEnabled?: boolean;
      roomTypes: Array<{ code: string; name: string; baseRate: number; maxCapacity: number }>;
    }>(`/public/hotels/${slug}`, { skipAuth: true })
      .then((info) => {
        if (!info?.hotelName) return;
        setHotelBrand({
          hotelName: info.hotelName,
          address: info.address || info.city,
          phone: info.phone,
          logoUrl: info.logoUrl,
        });
        setTaxConfig({
          pbjtEnabled: info.pbjtEnabled !== false,
          serviceChargeEnabled: info.serviceChargeEnabled !== false,
          pbjtRate: Number(info.pbjtRate ?? 10),
          serviceChargeRate: Number(info.serviceChargeRate ?? 10),
        });
        if (Array.isArray(info.roomTypes) && info.roomTypes.length > 0) {
          const mapped: RoomSelection[] = info.roomTypes.map((rt, idx) => ({
            id: rt.code,
            name: rt.name,
            size: '28 m²',
            bed: `${rt.maxCapacity || 2} Guests Max`,
            amenities: ['Free High-Speed Wi-Fi', 'Smart TV', 'AC', 'Hot Shower'],
            basePrice: rt.baseRate || 650000,
            selectedRatePlan: 'BB',
            bbAddon: 100000,
            roomNumber: `${idx + 1}01`,
            floor: `Lantai ${idx + 1}`,
          }));
          setRoomsList(mapped);
          setSelectedRoom(mapped[0]);
        }
      })
      .catch(() => {});
  }, []);
  const [rateType, setRateType] = useState<'RO' | 'BB'>('BB');
  const [addonAirport, setAddonAirport] = useState(false);
  const [addonExtraBed, setAddonExtraBed] = useState(false);

  // Guest details
  const [guestFirstName, setGuestFirstName] = useState('Dewi');
  const [guestLastName, setGuestLastName] = useState('Lestari');
  const [guestEmail, setGuestEmail] = useState('dewi.lestari@example.id');
  const [guestPhone, setGuestPhone] = useState('+62 812 3456 7890');
  const [specialRequests, setSpecialRequests] = useState('Quiet room on high floor, non-smoking.');

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'VA_BCA' | 'VA_MANDIRI'>('QRIS');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Confirmation & Room Access Data
  const [confirmedBookingNumber, setConfirmedBookingNumber] = useState('');
  const [midtransTrxId, setMidtransTrxId] = useState('');
  const [paidTimestamp, setPaidTimestamp] = useState('');
  const [doorLockPin, setDoorLockPin] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDoorUnlocked, setIsDoorUnlocked] = useState(false);
  const [unlockCountdown, setUnlockCountdown] = useState(0);
  const [activeTabAfterPayment, setActiveTabAfterPayment] = useState<'access' | 'receipt'>('access');
  const [isGuestCheckedOut, setIsGuestCheckedOut] = useState(false);
  const [showSelfCOModal, setShowSelfCOModal] = useState(false);

  // Self Check-Out Handler (Early Check-Out by Guest)
  const handleGuestSelfCheckOut = () => {
    setIsGuestCheckedOut(true);
    setShowSelfCOModal(false);
    try {
      const currentList = getStoredBookings();
      const updated = currentList.map((b) =>
        b.bookingNumber === confirmedBookingNumber
          ? {
              ...b,
              status: 'CHECKED_OUT' as const,
              checkOutDate: getTodayJakarta(), // Diset ke tanggal hari ini
            }
          : b
      );
      saveStoredBookings(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic Stay Calculation
  const nights = useMemo(() => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  }, [checkIn, checkOut]);

  const baseRatePerNight = rateType === 'BB' ? selectedRoom.basePrice + selectedRoom.bbAddon : selectedRoom.basePrice;
  const roomSubtotal = baseRatePerNight * nights;
  const airportFee = addonAirport ? 150000 : 0;
  const extraBedFee = addonExtraBed ? 250000 * nights : 0;
  const taxableBase = roomSubtotal + airportFee + extraBedFee;

  // Dynamic Hotel Tax Calculation (respects ON/OFF toggles & configured rates)
  const taxBreakdown = calculateHotelTax(taxableBase, taxConfig);
  const pbjtTax = taxBreakdown.pbjtAmount;
  const serviceCharge = taxBreakdown.serviceAmount;
  const grandTotal = taxBreakdown.grandTotal;

  // Simulate Instant Midtrans Payment & Direct PostgreSQL / PMS Synchronization
  const handlePayNow = async () => {
    setIsProcessingPayment(true);
    const slug =
      typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(Boolean).pop() || 'winotosastro'
        : 'winotosastro';

    let bookingNo = `BK-WIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const trxId = `TRX-MID-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;
    let pin = `*${Math.floor(100000 + Math.random() * 900000)}#`;
    let assignedRoomNo = selectedRoom.roomNumber;

    try {
      const apiRes = await apiRequest<{
        bookingNumber: string;
        roomNumber: string;
        doorPin: string;
      }>(`/public/hotels/${slug}/book`, {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          roomTypeCode: selectedRoom.name,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(adults) || 2,
          guestName: `${guestFirstName} ${guestLastName}`.trim(),
          email: guestEmail || undefined,
          phone: guestPhone,
          paymentMethod: paymentMethod || 'QRIS',
          paymentReference: trxId,
        }),
      });
      if (apiRes?.bookingNumber) bookingNo = apiRes.bookingNumber;
      if (apiRes?.roomNumber) assignedRoomNo = apiRes.roomNumber;
      if (apiRes?.doorPin) pin = `*${apiRes.doorPin}#`;
    } catch {
      // Fallback to local store when backend DB is offline
    }

    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    setConfirmedBookingNumber(bookingNo);
    setMidtransTrxId(trxId);
    setDoorLockPin(pin);
    setPaidTimestamp(nowStr);

    try {
      const currentList = getStoredBookings();
      const newRecord: TapeChartBooking = {
        id: `b-${Date.now()}`,
        bookingNumber: bookingNo,
        source: 'DIRECT',
        guestName: `${guestFirstName} ${guestLastName}`.trim(),
        phone: guestPhone,
        roomNumber: assignedRoomNo,
        roomType: selectedRoom.name,
        ratePlan: rateType === 'BB' ? 'Bed & Breakfast' : 'Room Only',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: 'CONFIRMED',
        totalAmount: grandTotal,
        balance: 0,
        idNumber: '3372' + Math.floor(100000000000 + Math.random() * 900000000000),
      };
      saveStoredBookings([newRecord, ...currentList]);
    } catch (err) {
      console.error('Failed to sync booking to PMS store:', err);
    }

    setIsProcessingPayment(false);
    setBookingConfirmed(true);
    setStep(4);
  };

  // Simulate Smart Lock Door Unlock
  const handleSimulateUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      setIsUnlocking(false);
      setIsDoorUnlocked(true);
      setUnlockCountdown(10);

      const timer = setInterval(() => {
        setUnlockCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsDoorUnlocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 900);
  };

  const copyDoorPin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(doorLockPin.replace(/[*#]/g, ''));
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // Generate WhatsApp Share Message for Receipt & Key
  const generateWhatsAppLink = () => {
    const text = `*BUKTI PEMBAYARAN & KUNCI KAMAR HOTEL WINOTOSASTRO APROJECT*
----------------------------------------
*Status:* LUNAS (PAID)
*No. Reservasi:* ${confirmedBookingNumber}
*No. Transaksi Midtrans:* ${midtransTrxId}
*Waktu Bayar:* ${paidTimestamp}

*Data Tamu:*
Nama: ${guestFirstName} ${guestLastName}
No. HP: ${guestPhone}

*Detail Reservasi:*
Kamar: ${selectedRoom.name}
Nomor Kamar: *${selectedRoom.roomNumber} (${selectedRoom.floor})*
PIN Pintu Digital: *${doorLockPin}*
Check-In: ${checkIn} (14:00 WIB)
Check-Out: ${checkOut} (12:00 WIB)
Durasi: ${nights} Malam
Paket: ${rateType === 'BB' ? 'Termasuk Sarapan' : 'Room Only'}

*Rincian Biaya:*
Total Dibayar: *${formatCurrency(grandTotal)}*
${
  taxBreakdown.pbjtEnabled || taxBreakdown.serviceEnabled
    ? `(${[
        taxBreakdown.pbjtEnabled ? `Termasuk PBJT ${taxBreakdown.pbjtRate}%` : '',
        taxBreakdown.serviceEnabled ? `Service Charge ${taxBreakdown.serviceRate}%` : '',
      ]
        .filter(Boolean)
        .join(' & ')})`
    : '(Harga Nett / Tanpa Service Charge & PBJT)'
}

*Wi-Fi Kamar:*
SSID: Hotel_Winotosastro_AProject
Password: winotosastro2026

Terima kasih atas kunjungan Anda!`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = guestPhone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encoded}`;
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex flex-col justify-between">
      {/* 1. Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-xs">
              W
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                {hotelBrand.hotelName}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                  Direct Booking Guarantee
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {hotelBrand.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"
            >
              Staff Portal <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Booking Engine Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        {/* Progress Stepper */}
        {!bookingConfirmed && (
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-semibold">
              <button
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 ${step >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  1
                </span>
                Dates & Rooms
              </button>
              <span className="w-12 h-0.5 bg-border" />
              <button
                onClick={() => setStep(2)}
                className={`flex items-center gap-1.5 ${step >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  2
                </span>
                Guest Details
              </button>
              <span className="w-12 h-0.5 bg-border" />
              <button
                onClick={() => setStep(3)}
                className={`flex items-center gap-1.5 ${step >= 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  3
                </span>
                Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Search, Room Selection & Rate Plan */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Check-In</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Check-Out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Guests & Stay</label>
                <div className="px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground flex items-center justify-between">
                  <span>{adults} Dewasa ({nights} Malam)</span>
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  Cari Ketersediaan
                </button>
              </div>
            </div>

            {/* Room Type Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Available Room Types ({roomsList.length})</h2>
                <span className="text-xs text-muted-foreground font-medium">Periode: {checkIn} s/d {checkOut} ({nights} malam)</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {roomsList.map((room) => {
                  const isSelected = selectedRoom.id === room.id;
                  const priceRO = room.basePrice;
                  const priceBB = room.basePrice + room.bbAddon;

                  return (
                    <div
                      key={room.id}
                      className={`p-5 bg-card border rounded-2xl shadow-xs transition-all ${
                        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">{room.name}</h3>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {room.size} • {room.bed}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
                              Kamar Siap Masuk: {room.roomNumber}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {room.amenities.map((amenity, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2.5 py-1 bg-muted/40 text-muted-foreground rounded-md flex items-center gap-1 font-medium"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Rate Plan Selector */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          {/* Option 1: Room Only */}
                          <div
                            onClick={() => {
                              setSelectedRoom(room);
                              setRateType('RO');
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between w-44 ${
                              isSelected && rateType === 'RO'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-muted/20 hover:bg-muted/40'
                            }`}
                          >
                            <span className="text-xs font-semibold text-foreground">Room Only</span>
                            <div className="mt-2">
                              <span className="text-sm font-extrabold text-foreground">
                                {formatCurrency(priceRO)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">/ malam (net)</span>
                            </div>
                          </div>

                          {/* Option 2: Bed & Breakfast */}
                          <div
                            onClick={() => {
                              setSelectedRoom(room);
                              setRateType('BB');
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between w-44 relative ${
                              isSelected && rateType === 'BB'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-muted/20 hover:bg-muted/40'
                            }`}
                          >
                            <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-bold rounded">
                              TERMASUK SARAPAN
                            </span>
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <Coffee className="w-3 h-3 text-amber-500" /> Bed & Breakfast
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-extrabold text-foreground">
                                {formatCurrency(priceBB)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">/ malam (net)</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setStep(2);
                            }}
                            className="px-5 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
                          >
                            Pilih Kamar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Guest Details & Add-ons */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Guest Form */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-4">
                <h2 className="text-base font-bold text-foreground">Data Identitas Tamu (Self Check-in Otomatis)</h2>
                <p className="text-xs text-muted-foreground">
                  Data ini digunakan untuk penerbitan Bukti Pembayaran Resmi (Invoice) dan Akses Kunci Kamar Digital.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Nama Depan *</label>
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Nama Belakang</label>
                    <input
                      type="text"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Alamat Email *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Nomor WhatsApp *</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Permintaan Khusus</label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Add-ons */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-3">
                <h2 className="text-base font-bold text-foreground">Layanan Tambahan (Add-ons)</h2>

                <label className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/50 rounded-xl cursor-pointer border border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addonAirport}
                      onChange={(e) => setAddonAirport(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-primary" />
                        Antar-Jemput Bandara Adi Soemarmo (SOC)
                      </div>
                      <div className="text-[11px] text-muted-foreground">Mobil pribadi AC langsung ke lobi Hotel Winotosastro</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground">{formatCurrency(150000)}</span>
                </label>

                <label className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/50 rounded-xl cursor-pointer border border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addonExtraBed}
                      onChange={(e) => setAddonExtraBed(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Bed className="w-3.5 h-3.5 text-primary" />
                        Extra Bed Tambahan ({nights} malam)
                      </div>
                      <div className="text-[11px] text-muted-foreground">Termasuk bantal & duvet ekstra</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground">{formatCurrency(250000 * nights)}</span>
                </label>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Kamar
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  Lanjut ke Pembayaran <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Price Breakdown Sidebar */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 h-fit">
              <h3 className="font-bold text-sm text-foreground">Ringkasan Reservasi</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tipe Kamar:</span>
                  <span className="font-semibold text-foreground">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Alokasi Kamar:</span>
                  <span className="font-semibold text-primary font-mono">{selectedRoom.roomNumber} ({selectedRoom.floor})</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paket:</span>
                  <span className="font-semibold text-foreground">
                    {rateType === 'BB' ? 'Bed & Breakfast' : 'Room Only'}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Durasi Menginap:</span>
                  <span className="font-semibold text-foreground">{nights} Malam ({checkIn} s/d {checkOut})</span>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tarif Kamar ({nights} malam):</span>
                  <span className="font-mono text-foreground">{formatCurrency(roomSubtotal)}</span>
                </div>
                {addonAirport && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shuttle Bandara:</span>
                    <span className="font-mono text-foreground">{formatCurrency(airportFee)}</span>
                  </div>
                )}
                {addonExtraBed && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Extra Bed ({nights} malam):</span>
                    <span className="font-mono text-foreground">{formatCurrency(extraBedFee)}</span>
                  </div>
                )}
                {taxBreakdown.pbjtEnabled && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>PBJT Pajak Hotel ({taxBreakdown.pbjtRate}%):</span>
                    <span className="font-mono text-foreground">{formatCurrency(pbjtTax)}</span>
                  </div>
                )}
                {taxBreakdown.serviceEnabled && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Charge ({taxBreakdown.serviceRate}%):</span>
                    <span className="font-mono text-foreground">{formatCurrency(serviceCharge)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Total Tagihan</span>
                  <span className="text-[10px] text-muted-foreground">
                    {taxBreakdown.pbjtEnabled || taxBreakdown.serviceEnabled
                      ? `Termasuk Pajak & Layanan (${taxBreakdown.effectivePercent.toFixed(1)}%)`
                      : 'Harga Nett (Tanpa Pajak & Service)'}
                  </span>
                </div>
                <span className="text-lg font-black text-primary font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Checkout (QRIS & Virtual Account Sandbox) */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Metode Pembayaran Online</h2>
                  <p className="text-xs text-muted-foreground">
                    Midtrans Payment Gateway • Konfirmasi Otomatis Instan 24/7
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-600 font-bold rounded-full border border-emerald-500/20">
                  Instant Room Pass
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'QRIS'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                      INSTANT
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-foreground block">QRIS</span>
                    <span className="text-[10px] text-muted-foreground">BCA, GoPay, OVO, Dana</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('VA_BCA')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'VA_BCA'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <Building className="w-5 h-5 text-blue-600" />
                  <div className="mt-3">
                    <span className="text-xs font-bold text-foreground block">BCA Virtual Account</span>
                    <span className="text-[10px] text-muted-foreground">Verifikasi Otomatis</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('VA_MANDIRI')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === 'VA_MANDIRI'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <Building className="w-5 h-5 text-amber-600" />
                  <div className="mt-3">
                    <span className="text-xs font-bold text-foreground block">Mandiri VA</span>
                    <span className="text-[10px] text-muted-foreground">Livin' by Mandiri</span>
                  </div>
                </button>
              </div>

              {/* QRIS Display Container */}
              {paymentMethod === 'QRIS' && (
                <div className="p-6 bg-muted/30 border border-border rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                    <div className="w-full h-full bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white text-[11px] font-mono p-2 text-center leading-relaxed">
                      <QrCode className="w-12 h-12 text-emerald-400 mb-1" />
                      <span className="font-bold text-white">QRIS STANDAR BI</span>
                      <span className="text-[9px] text-slate-300">HOTEL WINOTOSASTRO</span>
                      <span className="text-xs font-black text-emerald-300 mt-1">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Scan dengan Aplikasi Perbankan / Dompet Digital</span>
                    <span className="text-[11px] text-muted-foreground">BCA Mobile • GoPay • ShopeePay • OVO • Dana • Livin</span>
                  </div>
                </div>
              )}

              {/* Virtual Account Display */}
              {paymentMethod.startsWith('VA') && (
                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                  <span className="text-xs text-muted-foreground">Nomor Virtual Account</span>
                  <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg font-mono text-sm font-bold text-foreground">
                    <span>{paymentMethod === 'VA_BCA' ? '70012891928374' : '88012983746152'}</span>
                    <button className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                      <Copy className="w-3.5 h-3.5" /> Salin No. VA
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Batas waktu 15 menit. Pembayaran akan diverifikasi secara otomatis oleh sistem.
                  </span>
                </div>
              )}

              {/* Total & Action */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Total Tagihan Lunas</span>
                  <span className="text-xl font-black text-primary font-mono">{formatCurrency(grandTotal)}</span>
                </div>
                <button
                  disabled={isProcessingPayment}
                  onClick={handlePayNow}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    'Memproses Pembayaran...'
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Bayar Sekarang ({formatCurrency(grandTotal)})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETE EXPERIENCE - BUKTI BAYAR & AKSES MASUK RUANGAN */}
        {step === 4 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50">
            {/* Top Success Banner */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm text-center space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary" />
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">
                  Pembayaran Berhasil & Kamar Siap Ditempati
                </span>
                <h2 className="text-2xl font-black text-foreground mt-1">
                  Selamat Datang, {guestFirstName} {guestLastName}!
                </h2>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-1">
                  Reservasi Anda di Hotel Winotosastro AProject telah lunas dan terdaftar di PMS Front Office. Anda dapat langsung menggunakan kunci digital untuk masuk ke kamar.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setActiveTabAfterPayment('access')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTabAfterPayment === 'access'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Kunci Masuk Ruangan & PIN Digital
                </button>
                <button
                  onClick={() => setActiveTabAfterPayment('receipt')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTabAfterPayment === 'receipt'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Bukti Pembayaran Resmi (Lunas)
                </button>
              </div>
            </div>

            {/* TAB 1: DIGITAL ROOM PASS & SMART LOCK ENTRY */}
            {activeTabAfterPayment === 'access' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Digital Key Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="space-y-6 relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          DIGITAL ROOM PASS • ACTIVE
                        </span>
                        <h3 className="text-xl font-black mt-1">Hotel Winotosastro AProject</h3>
                        <p className="text-xs text-slate-300">Self Check-In Room Access Card</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">No. Reservasi</span>
                        <span className="text-sm font-mono font-bold text-amber-400">{confirmedBookingNumber}</span>
                      </div>
                    </div>

                    {/* Room & PIN Highlight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10">
                      <div>
                        <span className="text-[11px] text-slate-300 block">Nomor Kamar Fisik</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-black text-white font-mono">{selectedRoom.roomNumber}</span>
                          <span className="text-xs text-emerald-300 font-semibold">{selectedRoom.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 block">{selectedRoom.floor}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-300 block">PIN Smart Door Lock</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-black tracking-widest text-amber-300 font-mono">
                            {doorLockPin}
                          </span>
                          <button
                            onClick={copyDoorPin}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors flex items-center gap-1 text-slate-200"
                            title="Salin PIN"
                          >
                            {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Tekan {doorLockPin} pada keypad handle pintu</span>
                      </div>
                    </div>

                    {/* Interactive Door Unlock Button */}
                    <div className="bg-slate-950/60 border border-white/10 p-5 rounded-2xl text-center space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Simulasi Akses Masuk Kamar
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Buka kunci otomatis menggunakan Bluetooth / IoT Room Lock
                          </span>
                        </div>
                        {isDoorUnlocked ? (
                          <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full animate-bounce">
                            TERBUKA ({unlockCountdown}s)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-white/10 text-slate-300 text-xs font-medium rounded-full">
                            Terkunci
                          </span>
                        )}
                      </div>

                      {isGuestCheckedOut ? (
                        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center space-y-1">
                          <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm">
                            <CheckCircle2 className="w-5 h-5" />
                            CHECK-OUT SELESAI (KAMAR TELAH DIKOSONGKAN)
                          </div>
                          <p className="text-xs text-slate-200">
                            Terima kasih telah menginap di Hotel Winotosastro AProject. Kunci kamar digital telah dinonaktifkan dan tim Housekeeping telah diberi tahu.
                          </p>
                        </div>
                      ) : isDoorUnlocked ? (
                        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center space-y-1">
                          <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm">
                            <Unlock className="w-5 h-5 animate-pulse" />
                            PINTU KAMAR {selectedRoom.roomNumber} TERBUKA!
                          </div>
                          <p className="text-xs text-slate-200">
                            Silakan tekan handle dan dorong pintu untuk masuk. Kunci akan otomatis mengunci dalam {unlockCountdown} detik.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={handleSimulateUnlock}
                            disabled={isUnlocking}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isUnlocking ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin" />
                                Mengirim Sinyal ke Smart Lock...
                              </>
                            ) : (
                              <>
                                <Key className="w-4 h-4" />
                                TAP UNTUK BUKA PINTU KAMAR (SIMULASI MASUK)
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setShowSelfCOModal(true)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5 text-amber-400" />
                            Selesai Menginap / Check-Out Lebih Awal (Self Check-Out)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Self Check-Out Confirmation Modal */}
                  {showSelfCOModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
                      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl text-left space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-amber-500" />
                            Konfirmasi Check-Out Lebih Awal
                          </h3>
                          <button onClick={() => setShowSelfCOModal(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                          <p className="font-bold text-foreground">{guestFirstName} {guestLastName}</p>
                          <p className="text-muted-foreground">Kamar {selectedRoom.roomNumber} ({selectedRoom.name})</p>
                          <p className="text-[11px] text-muted-foreground">Jadwal Asli: {checkIn} s/d {checkOut}</p>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                          <span className="font-bold text-amber-700 dark:text-amber-400 block">Check-Out Sebelum Waktunya</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Apakah Anda ingin menyelesaikan masa menginap sekarang? PIN kunci digital akan segera dinonaktifkan dan kamar Anda akan ditandai selesai di sistem Front Office hotel.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => setShowSelfCOModal(false)}
                            className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg font-semibold transition-colors text-foreground"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleGuestSelfCheckOut}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                          >
                            Ya, Check-Out Sekarang
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Bottom Info */}
                  <div className="pt-4 border-t border-white/10 mt-6 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                    <div className="flex items-center gap-3">
                      <span>Check-In: <strong>{checkIn} (14:00)</strong></span>
                      <span>•</span>
                      <span>Check-Out: <strong>{checkOut} (12:00)</strong></span>
                    </div>
                    <span className="text-slate-300 font-mono">Tamu: {guestFirstName} {guestLastName}</span>
                  </div>
                </div>

                {/* Facilities & Quick Guides */}
                <div className="space-y-4">
                  {/* QR Code Pass */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-xs text-center space-y-3">
                    <span className="text-xs font-bold text-foreground block">QR Reader Pass</span>
                    <div className="w-36 h-36 bg-white p-2.5 rounded-xl shadow-xs border border-border mx-auto flex flex-col items-center justify-center">
                      <div className="w-full h-full bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white text-[9px] font-mono p-1">
                        <QrCode className="w-16 h-16 text-emerald-400 mb-1" />
                        <span>ROOM-{selectedRoom.roomNumber}</span>
                        <span>{confirmedBookingNumber}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Dapat di-scan di reader pintu kamar atau di self check-in kiosk lobi hotel.
                    </p>
                  </div>

                  {/* Wi-Fi & Facilities Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
                    <span className="text-xs font-bold text-foreground block flex items-center gap-1.5">
                      <Wifi className="w-4 h-4 text-primary" />
                      Koneksi Wi-Fi Kamar
                    </span>
                    <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">SSID:</span>
                        <span className="font-bold text-foreground">Hotel_Winotosastro</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">Password:</span>
                        <span className="font-bold text-primary">winotosastro2026</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-1 pt-1">
                      <div className="flex items-start gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>Sarapan: 06:00 - 10:00 WIB di AProject Signature Bistro (Lt. 1)</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>Check-out maksimal jam 12:00 WIB</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link to Front Office */}
                  <Link
                    href="/front-office"
                    className="w-full py-2.5 bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Buka di Front Office Staff <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: OFFICIAL PROOF OF PAYMENT (BUKTI BAYAR LUNAS / FOLIO INVOICE) */}
            {activeTabAfterPayment === 'receipt' && (
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                {/* Invoice Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary text-white font-black flex items-center justify-center text-sm">
                        W
                      </div>
                      <h3 className="text-lg font-black text-foreground">Hotel Winotosastro AProject</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jl. Brigjend Slamet Riyadi, Surakarta (Solo), Jawa Tengah
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      NPWPD: 33.72.01.284.910-001 • Telp: (0271) 714-889 • Email: info@winotosastro.co.id
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-lg tracking-wider uppercase mb-1 shadow-xs">
                      BUKTI BAYAR LUNAS (PAID)
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      No. Bukti: <span className="font-bold text-foreground">{midtransTrxId}</span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      No. Reservasi: <span className="font-bold text-primary">{confirmedBookingNumber}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Waktu Bayar: {paidTimestamp}
                    </div>
                  </div>
                </div>

                {/* Billed To & Stay Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 border border-border rounded-2xl text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                      Ditagihkan Kepada (Guest Details)
                    </span>
                    <p className="font-bold text-foreground text-sm">{guestFirstName} {guestLastName}</p>
                    <p className="text-muted-foreground">{guestPhone}</p>
                    <p className="text-muted-foreground">{guestEmail}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                      Rincian Menginap (Stay Details)
                    </span>
                    <p className="text-foreground">
                      <strong>Kamar:</strong> {selectedRoom.name} (No. {selectedRoom.roomNumber} - {selectedRoom.floor})
                    </p>
                    <p className="text-foreground">
                      <strong>Check-In:</strong> {checkIn} (14:00 WIB)
                    </p>
                    <p className="text-foreground">
                      <strong>Check-Out:</strong> {checkOut} (12:00 WIB)
                    </p>
                    <p className="text-foreground">
                      <strong>Durasi:</strong> {nights} Malam • {rateType === 'BB' ? 'Bed & Breakfast' : 'Room Only'}
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2.5">Deskripsi Transaksi</th>
                        <th className="py-2.5 text-center">Qty</th>
                        <th className="py-2.5 text-right">Harga Satuan</th>
                        <th className="py-2.5 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      <tr>
                        <td className="py-3">
                          <span className="font-bold text-foreground block">{selectedRoom.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Paket {rateType === 'BB' ? 'Bed & Breakfast (Sarapan Pagi)' : 'Room Only (Tanpa Sarapan)'}
                          </span>
                        </td>
                        <td className="py-3 text-center">{nights} Malam</td>
                        <td className="py-3 text-right font-mono">{formatCurrency(baseRatePerNight)}</td>
                        <td className="py-3 text-right font-mono font-bold text-foreground">{formatCurrency(roomSubtotal)}</td>
                      </tr>

                      {addonAirport && (
                        <tr>
                          <td className="py-3">
                            <span className="font-bold text-foreground block">Shuttle Bandara Adi Soemarmo</span>
                            <span className="text-[11px] text-muted-foreground">Mobil pribadi AC antar jemput</span>
                          </td>
                          <td className="py-3 text-center">1 Layanan</td>
                          <td className="py-3 text-right font-mono">{formatCurrency(150000)}</td>
                          <td className="py-3 text-right font-mono font-bold text-foreground">{formatCurrency(airportFee)}</td>
                        </tr>
                      )}

                      {addonExtraBed && (
                        <tr>
                          <td className="py-3">
                            <span className="font-bold text-foreground block">Rollaway Extra Bed</span>
                            <span className="text-[11px] text-muted-foreground">Termasuk bantal & duvet ekstra</span>
                          </td>
                          <td className="py-3 text-center">{nights} Malam</td>
                          <td className="py-3 text-right font-mono">{formatCurrency(250000)}</td>
                          <td className="py-3 text-right font-mono font-bold text-foreground">{formatCurrency(extraBedFee)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculations Summary */}
                <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between gap-6">
                  <div className="text-xs text-muted-foreground space-y-1.5 max-w-sm">
                    <p className="font-semibold text-foreground">Metode Pembayaran:</p>
                    <p className="font-mono text-primary font-bold">
                      Midtrans Payment Gateway ({paymentMethod === 'QRIS' ? 'QRIS Standar BI' : paymentMethod === 'VA_BCA' ? 'BCA Virtual Account' : 'Mandiri Virtual Account'})
                    </p>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Kuitansi ini adalah bukti pembayaran yang sah sesuai UU HKPD No. 1/2022 Pemerintah Kota Surakarta.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs w-full sm:w-72">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Dasar Pengenaan Pajak (DPP):</span>
                      <span className="font-mono text-foreground">{formatCurrency(taxableBase)}</span>
                    </div>
                    {taxBreakdown.pbjtEnabled && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>PBJT Jasa Perhotelan ({taxBreakdown.pbjtRate}%):</span>
                        <span className="font-mono text-foreground">{formatCurrency(pbjtTax)}</span>
                      </div>
                    )}
                    {taxBreakdown.serviceEnabled && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Biaya Layanan (Service Charge {taxBreakdown.serviceRate}%):</span>
                        <span className="font-mono text-foreground">{formatCurrency(serviceCharge)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between items-baseline">
                      <span className="font-bold text-foreground">Total Pembayaran (Lunas):</span>
                      <span className="text-base font-black text-emerald-600 font-mono">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Sisa Tagihan (Balance Due):</span>
                      <span className="font-bold text-emerald-600 font-mono">Rp 0 (LUNAS)</span>
                    </div>
                  </div>
                </div>

                {/* Receipt Actions */}
                <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF
                    </button>
                    <a
                      href={generateWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Kirim ke WhatsApp
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/bookings"
                      className="px-4 py-2 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cek Tape Chart PMS
                    </Link>
                    <button
                      onClick={() => setActiveTabAfterPayment('access')}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" /> Lihat Kunci Kamar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12 text-center text-xs text-muted-foreground">
        <p>© 2026 Hotel Winotosastro AProject. Powered by Antigravity Cloud PMS & Channel Manager.</p>
        <p className="text-[11px] mt-1 text-muted-foreground/70">
          {hotelBrand.hotelName} • Direct Reservation Engine
        </p>
      </footer>
    </div>
  );
}
