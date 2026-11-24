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
};

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
