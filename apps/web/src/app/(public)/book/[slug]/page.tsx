'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';

interface RoomSelection {
  id: string;
  name: string;
  size: string;
  bed: string;
  amenities: string[];
  basePrice: number;
  selectedRatePlan: 'RO' | 'BB';
  bbAddon: number;
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
  },
];

export default function PublicBookingEnginePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Search parameters
  const [checkIn, setCheckIn] = useState('2026-11-26');
  const [checkOut, setCheckOut] = useState('2026-11-28');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Selected room & add-ons
  const [selectedRoom, setSelectedRoom] = useState<RoomSelection>(AVAILABLE_ROOMS[1]); // Deluxe default
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
  const [confirmedBookingNumber, setConfirmedBookingNumber] = useState('');

  // Calculations
  const nights = 2; // 26 Nov to 28 Nov
  const baseRatePerNight = rateType === 'BB' ? selectedRoom.basePrice + selectedRoom.bbAddon : selectedRoom.basePrice;
  const roomSubtotal = baseRatePerNight * nights;
  const airportFee = addonAirport ? 150000 : 0;
  const extraBedFee = addonExtraBed ? 250000 * nights : 0;
  const taxableBase = roomSubtotal + airportFee + extraBedFee;

  // Surakarta PBJT Regional Hotel Tax (10%) & Service Charge (10%)
  const pbjtTax = Math.round(taxableBase * 0.1);
  const serviceCharge = Math.round(taxableBase * 0.1);
  const grandTotal = taxableBase + pbjtTax + serviceCharge;

  const handlePayNow = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setConfirmedBookingNumber(`BK-WIN-${Math.floor(100000 + Math.random() * 900000)}`);
      setBookingConfirmed(true);
      setStep(4);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex flex-col justify-between">
      {/* 1. Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg">
              W
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                Hotel Winotosastro by Athelu
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                  Direct Booking Guarantee
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                Jl. Brigjend Slamet Riyadi, Surakarta (Solo), Central Java
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
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
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Guests</label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-hidden"
                >
                  <option value={1}>1 Adult</option>
                  <option value={2}>2 Adults</option>
                  <option value={3}>3 Adults</option>
                  <option value={4}>4 Adults</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors">
                  Search Availability
                </button>
              </div>
            </div>

            {/* Room Type Cards */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Available Room Types ({AVAILABLE_ROOMS.length})</h2>

              <div className="grid grid-cols-1 gap-4">
                {AVAILABLE_ROOMS.map((room) => {
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
                              <span className="text-[10px] text-muted-foreground block">/ night (net)</span>
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
                              RECOMMENDED
                            </span>
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <Coffee className="w-3 h-3 text-amber-500" /> Breakfast Included
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-extrabold text-foreground">
                                {formatCurrency(priceBB)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">/ night (net)</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setStep(2);
                            }}
                            className="px-5 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
                          >
                            Select & Continue
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
                <h2 className="text-base font-bold text-foreground">Guest Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">First Name *</label>
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number (WhatsApp) *</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Special Requests</label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full px-3.5 py-2 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground"
                  />
                </div>
              </div>

              {/* Add-ons */}
              <div className="p-6 bg-card border border-border rounded-2xl shadow-xs space-y-3">
                <h2 className="text-base font-bold text-foreground">Enhance Your Stay</h2>

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
                        Airport Shuttle (Adi Soemarmo Airport SOC)
                      </div>
                      <div className="text-[11px] text-muted-foreground">Private air-conditioned car directly to hotel lobby</div>
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
                      <div className="text-xs font-bold text-foreground">Rollaway Extra Bed</div>
                      <div className="text-[11px] text-muted-foreground">Includes complimentary extra pillow & duvet</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground">{formatCurrency(250000)} / night</span>
                </label>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Rooms
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>

            {/* Price Breakdown Sidebar */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 h-fit">
              <h3 className="font-bold text-sm text-foreground">Booking Summary</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Room Type:</span>
                  <span className="font-semibold text-foreground">{selectedRoom.name}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Rate Plan:</span>
                  <span className="font-semibold text-foreground">
                    {rateType === 'BB' ? 'Bed & Breakfast' : 'Room Only'}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Duration:</span>
                  <span className="font-semibold text-foreground">{nights} Nights (26 - 28 Nov)</span>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Room Charge ({nights} nights):</span>
                  <span className="font-mono text-foreground">{formatCurrency(roomSubtotal)}</span>
                </div>
                {addonAirport && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Airport Transfer:</span>
                    <span className="font-mono text-foreground">{formatCurrency(airportFee)}</span>
                  </div>
                )}
                {addonExtraBed && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Extra Bed ({nights} nights):</span>
                    <span className="font-mono text-foreground">{formatCurrency(extraBedFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>PBJT Hotel Tax (10% Surakarta):</span>
                  <span className="font-mono text-foreground">{formatCurrency(pbjtTax)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge (10%):</span>
                  <span className="font-mono text-foreground">{formatCurrency(serviceCharge)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Total Due</span>
                  <span className="text-[10px] text-muted-foreground">Inclusive of 21% regional taxes</span>
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
              <div>
                <h2 className="text-lg font-bold text-foreground">Payment Method</h2>
                <p className="text-xs text-muted-foreground">
                  Midtrans Sandbox Gateway • Instant 24/7 Automated Confirmation
                </p>
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
                    <span className="text-[10px] text-muted-foreground">GoPay, OVO, BCA, Dana</span>
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
                    <span className="text-[10px] text-muted-foreground">Automatic Verification</span>
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
                    {/* Simulated SVG QR Code */}
                    <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-mono p-2 text-center">
                      [QRIS DYNAMIC QR]
                      <br />
                      HOTEL WINOTOSASTRO
                      <br />
                      {formatCurrency(grandTotal)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Scan using any Indonesian Banking / e-Wallet App</span>
                    <span className="text-[11px] text-muted-foreground">GoPay • BCA Mobile • ShopeePay • OVO • Dana • Livin</span>
                  </div>
                </div>
              )}

              {/* Virtual Account Display */}
              {paymentMethod.startsWith('VA') && (
                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                  <span className="text-xs text-muted-foreground">Virtual Account Number</span>
                  <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg font-mono text-sm font-bold text-foreground">
                    <span>{paymentMethod === 'VA_BCA' ? '70012891928374' : '88012983746152'}</span>
                    <button className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Expires in 15 minutes. Booking confirms automatically once payment completes.
                  </span>
                </div>
              )}

              {/* Total & Action */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Total Amount to Pay</span>
                  <span className="text-xl font-black text-primary font-mono">{formatCurrency(grandTotal)}</span>
                </div>
                <button
                  disabled={isProcessingPayment}
                  onClick={handlePayNow}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    'Processing Payment...'
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Simulate Instant Payment ({formatCurrency(grandTotal)})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Booking Confirmation Voucher */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6 text-center animate-in fade-in-50">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">
                Payment Settled & Confirmed
              </span>
              <h2 className="text-2xl font-black text-foreground mt-1">Thank You, {guestFirstName}!</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your reservation at Hotel Winotosastro by Athelu is confirmed. A receipt voucher has been sent to {guestEmail}.
              </p>
            </div>

            {/* Voucher Card */}
            <div className="p-5 bg-muted/30 border border-border rounded-2xl text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Booking Number:</span>
                <span className="font-bold text-primary">{confirmedBookingNumber}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Guest:</span>
                <span className="font-semibold text-foreground">{guestFirstName} {guestLastName}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Stay Dates:</span>
                <span className="text-foreground">26 Nov 2026 - 28 Nov 2026 (2 Nights)</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Room Type:</span>
                <span className="text-foreground">{selectedRoom.name} ({rateType === 'BB' ? 'Bed & Breakfast' : 'Room Only'})</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2.5">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(grandTotal)} (PAID)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="text-foreground">Midtrans Sandbox ({paymentMethod})</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-muted"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
              <Link
                href="/dashboard"
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
              >
                Return to PMS Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-border bg-card py-6 mt-12 text-center text-xs text-muted-foreground">
        <p>© 2026 Hotel Winotosastro by Athelu. Powered by Antigravity Cloud PMS & Channel Manager.</p>
        <p className="text-[11px] mt-1 text-muted-foreground/70">
          Complies with Indonesian HKPD Law No. 1/2022 (Surakarta PBJT Jasa Perhotelan 10% + Service Charge 10%).
        </p>
      </footer>
    </div>
  );
}
