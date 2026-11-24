'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  Sparkles,
  Building,
  Clock,
  Shield,
  Coffee,
  Wifi,
  Car,
  Tv,
  Bath,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../../providers/intl-provider';

export default function OtaContentPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'descriptions' | 'policies' | 'amenities' | 'photos'>('descriptions');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Content state
  const [descId, setDescId] = useState(
    'Hotel Winotosastro AProject adalah akomodasi bintang 3 modern yang terletak di jantung Kota Surakarta (Solo), Jawa Tengah. Menawarkan 40 kamar berdesain elegan, akses Wi-Fi berkecepatan tinggi gratis, layanan meja depan 24 jam, serta restoran yang menyajikan hidangan otentik khas Solo dan internasional. Terletak strategis hanya beberapa menit dari Keraton Surakarta Hadiningrat, Pasar Klewer, dan Stasiun Solo Balapan.',
  );
  const [descEn, setDescEn] = useState(
    'Hotel Winotosastro AProject is a modern boutique hotel located in the heart of Surakarta (Solo), Central Java. Featuring 40 elegantly appointed rooms, complimentary high-speed Wi-Fi, 24-hour reception, and an on-site restaurant serving authentic Javanese and international specialties. Strategically positioned minutes away from the Royal Palace (Keraton Surakarta), Klewer Traditional Batik Market, and Solo Balapan Station.',
  );

  const [policies, setPolicies] = useState({
    checkInTime: '14:00 WIB',
    checkOutTime: '12:00 WIB',
    cancellationRule: 'Free cancellation up to 24 hours prior to check-in date. Late cancellation incurs 1 night fee.',
    childPolicy: 'Children aged 0-5 stay free using existing bedding. Extra bed available at Rp 250.000/night.',
    depositPolicy: 'Security deposit of Rp 500.000 required at check-in (cash or credit card authorization).',
  });

  const [amenities, setAmenities] = useState([
    { name: 'High-Speed Wi-Fi in all rooms & public areas', category: 'Connectivity', active: true },
    { name: '24-Hour Front Desk & Concierge', category: 'Services', active: true },
    { name: 'Bistro & Lounge Restaurant', category: 'Dining', active: true },
    { name: 'Airport Shuttle (Adi Soemarmo SOC)', category: 'Transport', active: true },
    { name: 'Daily Housekeeping & Laundry Services', category: 'Services', active: true },
    { name: 'Secure On-Site Parking with Valet', category: 'Parking', active: true },
    { name: 'Meeting & Banquet Facility (Up to 100 pax)', category: 'Business', active: true },
  ]);

  const [photos, setPhotos] = useState([
    { id: 'p1', tag: 'Exterior', caption: 'Hotel Winotosastro Main Facade' },
    { id: 'p2', tag: 'Lobby', caption: 'Grand Reception & Guest Lounge' },
    { id: 'p3', tag: 'Deluxe King', caption: 'Deluxe King Room with Balcony' },
    { id: 'p4', tag: 'Superior Twin', caption: 'Superior Twin Room' },
    { id: 'p5', tag: 'Executive Suite', caption: 'Executive Suite Living Area & City View' },
    { id: 'p6', tag: 'Dining', caption: 'AProject Signature Bistro' },
  ]);

  const handleSyncContent = () => {
    setIsSyncing(true);
    setSyncMessage('Preparing and pushing updated descriptions, amenities, and photos to Agoda Extranet...');

    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('OTA Content synchronized successfully with Agoda Content API (Echo ACK: ACK-CNT-9912).');
      setTimeout(() => setSyncMessage(null), 5000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-primary" />
            OTA Content & Media Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized property descriptions, room amenities, policies, and photos for OTA distribution
          </p>
        </div>

        <button
          disabled={isSyncing}
          onClick={handleSyncContent}
          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 self-start"
        >
          <Share2 className="w-3.5 h-3.5" />
          {isSyncing ? 'Syncing Content...' : 'Push Content to Agoda'}
        </button>
      </div>

      {/* Sync Status Alert */}
      {syncMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {syncMessage}
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab('descriptions')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'descriptions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Bilingual Descriptions
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'policies'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Hotel Policies & Rules
        </button>
        <button
          onClick={() => setActiveTab('amenities')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'amenities'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          Amenities Checklist
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-4 py-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'photos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Photo Gallery ({photos.length})
        </button>
      </div>

      {/* 3. Tab Contents */}
      {/* TAB 1: Descriptions */}
      {activeTab === 'descriptions' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-sm text-foreground">Property Descriptions (Bilingual)</h3>
            <p className="text-xs text-muted-foreground">
              These descriptions are pushed to Agoda, Booking.com, and the direct booking engine
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Bahasa Indonesia (Indonesian Description)
              </label>
              <textarea
                rows={5}
                value={descId}
                onChange={(e) => setDescId(e.target.value)}
                className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                English (International OTA Description)
              </label>
              <textarea
                rows={5}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Policies */}
      {activeTab === 'policies' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-sm text-foreground">Policies & Standard Operating Rules</h3>
            <p className="text-xs text-muted-foreground">
              Synchronized with OTA cancellation engines and booking voucher terms
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Standard Check-In Time</label>
              <input
                type="text"
                value={policies.checkInTime}
                onChange={(e) => setPolicies({ ...policies, checkInTime: e.target.value })}
                className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Standard Check-Out Time</label>
              <input
                type="text"
                value={policies.checkOutTime}
                onChange={(e) => setPolicies({ ...policies, checkOutTime: e.target.value })}
                className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-muted-foreground block mb-1">Cancellation & No-Show Policy</label>
              <textarea
                rows={2}
                value={policies.cancellationRule}
                onChange={(e) => setPolicies({ ...policies, cancellationRule: e.target.value })}
                className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-muted-foreground block mb-1">Child & Extra Bed Policy</label>
              <textarea
                rows={2}
                value={policies.childPolicy}
                onChange={(e) => setPolicies({ ...policies, childPolicy: e.target.value })}
                className="w-full p-2.5 bg-muted/30 border border-border rounded-lg text-foreground"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Amenities */}
      {activeTab === 'amenities' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Centralized Amenities Checklist</h3>
              <p className="text-xs text-muted-foreground">
                OTA search filter attributes pushed across channels
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {amenities.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground block">{item.category}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  Active on OTAs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Photos */}
      {activeTab === 'photos' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Photo Gallery & Room Tagging</h3>
              <p className="text-xs text-muted-foreground">
                High-resolution photography categorized by room type and public facilities
              </p>
            </div>
            <button className="px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-primary/20">
              <Plus className="w-3.5 h-3.5" /> Upload Photo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <div className="h-28 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs font-mono">
                  [PHOTO: {photo.tag}]
                </div>
                <div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                    {photo.tag}
                  </span>
                  <div className="text-xs font-bold text-foreground mt-1">{photo.caption}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
