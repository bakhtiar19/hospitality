import { apiRequest, getStoredSession } from './api-client';

export interface HotelSettings {
  hotelName: string;
  propertyCode: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  npwpd: string;
  logoUrl?: string; // Base64 data URL or image path
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  pbjtRate: number; // 10%
  serviceChargeRate: number; // 10%
  pbjtEnabled: boolean;
  serviceChargeEnabled: boolean;
}

export const defaultHotelSettings: HotelSettings = {
  hotelName: 'Hotel Winotosastro AProject',
  propertyCode: 'WINOTOSASTRO-SOLO',
  address: 'Jl. Brigjend Slamet Riyadi No. 250, Surakarta, Jawa Tengah 57141',
  city: 'Surakarta (Solo)',
  country: 'Indonesia (ID)',
  phone: '+62 271 718899',
  email: 'info@winotosastro.co.id',
  npwpd: '33.72.01.284.910-001 (Bapenda Solo)',
  logoUrl: '',
  checkInTime: '14:00 WIB',
  checkOutTime: '12:00 WIB',
  currency: 'IDR',
  pbjtRate: 10,
  serviceChargeRate: 10,
  pbjtEnabled: true,
  serviceChargeEnabled: true,
};

export interface HotelTaxCalculation {
  baseAmount: number;
  serviceEnabled: boolean;
  pbjtEnabled: boolean;
  serviceRate: number;
  pbjtRate: number;
  serviceAmount: number;
  pbjtAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  effectivePercent: number;
}

/**
 * Computes Hotel Service Charge & PBJT tax dynamically based on hotel settings toggles.
 */
export function calculateHotelTax(
  baseAmount: number,
  settings?: Partial<Pick<HotelSettings, 'pbjtEnabled' | 'serviceChargeEnabled' | 'pbjtRate' | 'serviceChargeRate'>> | null
): HotelTaxCalculation {
  const serviceEnabled = settings?.serviceChargeEnabled !== false;
  const pbjtEnabled = settings?.pbjtEnabled !== false;
  const serviceRate = Math.max(0, Number(settings?.serviceChargeRate ?? 10));
  const pbjtRate = Math.max(0, Number(settings?.pbjtRate ?? 10));

  const serviceAmount = serviceEnabled ? Math.round(baseAmount * (serviceRate / 100)) : 0;
  const pbjtBase = baseAmount + serviceAmount;
  const pbjtAmount = pbjtEnabled ? Math.round(pbjtBase * (pbjtRate / 100)) : 0;
  const totalTaxAmount = serviceAmount + pbjtAmount;
  const grandTotal = baseAmount + totalTaxAmount;
  const effectivePercent =
    baseAmount > 0 ? Number(((totalTaxAmount / baseAmount) * 100).toFixed(1)) : 0;

  return {
    baseAmount,
    serviceEnabled,
    pbjtEnabled,
    serviceRate,
    pbjtRate,
    serviceAmount,
    pbjtAmount,
    totalTaxAmount,
    grandTotal,
    effectivePercent,
  };
}

const SETTINGS_STORAGE_KEY = 'hotel_winotosastro_settings';

export function getHotelSettings(): HotelSettings {
  if (typeof window === 'undefined') return defaultHotelSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultHotelSettings));
      return defaultHotelSettings;
    }
    return { ...defaultHotelSettings, ...JSON.parse(raw) };
  } catch {
    return defaultHotelSettings;
  }
}

export function saveHotelSettings(settings: Partial<HotelSettings>): HotelSettings {
  if (typeof window === 'undefined') return defaultHotelSettings;
  try {
    const current = getHotelSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('pms_settings_updated'));
    return updated;
  } catch (e) {
    console.error('Failed to save hotel settings', e);
    return defaultHotelSettings;
  }
}

export async function apiSaveHotelSettings(
  settings: Partial<HotelSettings>
): Promise<HotelSettings> {
  const localUpdated = saveHotelSettings(settings);
  if (!getStoredSession()) return localUpdated;
  const synced = await apiRequest<HotelSettings>('/pms/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return saveHotelSettings(synced);
}

/**
 * Compresses an uploaded image file client-side (max 420px width/height, WebP/PNG)
 * so hotel logos fit comfortably in PostgreSQL JSON without needing MinIO/S3.
 */
export function compressHotelLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        const maxDim = 420;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/webp', 0.85);
        resolve(compressed.startsWith('data:image/webp') ? compressed : canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
