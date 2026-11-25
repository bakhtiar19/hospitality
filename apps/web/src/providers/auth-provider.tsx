'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiRequest,
  AuthSession,
  AuthUser,
  getStoredSession,
  saveStoredSession,
} from '../lib/api-client';
import { saveStoredBookings, TapeChartBooking } from '../lib/bookings-store';
import { saveStoredOTATransactions, OTASettlementTransaction } from '../lib/finance-store';
import { saveHotelSettings, HotelSettings } from '../lib/settings-store';

export interface RegisterHotelPayload {
  hotelName: string;
  city: string;
  address?: string;
  phone?: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface BootstrapRoom {
  id: string;
  number: string;
  type: string;
  floor: number;
  baseRate: number;
  housekeepingStatus: string;
  operationalStatus: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  activePropertyId: string | null;
  isLoading: boolean;
  dbSynced: boolean;
  rooms: BootstrapRoom[];
  login: (email: string, password: string) => Promise<AuthUser>;
  registerHotel: (
    payload: RegisterHotelPayload
  ) => Promise<{ pendingApproval?: boolean; message?: string; user?: AuthUser }>;
  switchProperty: (propertyId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbSynced, setDbSynced] = useState(false);
  const [rooms, setRooms] = useState<BootstrapRoom[]>([]);

  const refreshBootstrap = useCallback(async () => {
    const active = getStoredSession();
    if (!active) {
      setDbSynced(false);
      return;
    }

    try {
      const data = await apiRequest<{
        settings: HotelSettings;
        rooms: BootstrapRoom[];
        bookings: TapeChartBooking[];
        settlements: OTASettlementTransaction[];
      }>('/pms/bootstrap');

      if (data?.settings) saveHotelSettings(data.settings);
      if (Array.isArray(data?.bookings)) saveStoredBookings(data.bookings);
      if (Array.isArray(data?.settlements)) saveStoredOTATransactions(data.settlements);
      if (Array.isArray(data?.rooms)) setRooms(data.rooms);
      setDbSynced(true);
    } catch {
      setDbSynced(false);
    }
  }, []);

  useEffect(() => {
    const current = getStoredSession();
    setSession(current);
    setIsLoading(false);
    if (current) {
      refreshBootstrap();
    }

    const onAuthChanged = () => {
      const latest = getStoredSession();
      setSession(latest);
    };
    window.addEventListener('pms_auth_changed', onAuthChanged);
    return () => window.removeEventListener('pms_auth_changed', onAuthChanged);
  }, [refreshBootstrap]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const result = await apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    const withActive: AuthSession = {
      ...result,
      activePropertyId: result.user.propertyId,
    };
    saveStoredSession(withActive);
    setSession(withActive);
    await refreshBootstrap();
    return result.user;
  };

  const registerHotel = async (
    payload: RegisterHotelPayload
  ): Promise<{ pendingApproval?: boolean; message?: string; user?: AuthUser }> => {
    const result = await apiRequest<
      AuthSession | { pendingApproval: true; message: string }
    >('/auth/register-hotel', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    if ('pendingApproval' in result && result.pendingApproval) {
      return { pendingApproval: true, message: result.message };
    }
    const authRes = result as AuthSession;
    const withActive: AuthSession = {
      ...authRes,
      activePropertyId: authRes.user.propertyId,
    };
    saveStoredSession(withActive);
    setSession(withActive);
    await refreshBootstrap();
    return { pendingApproval: false, user: authRes.user };
  };

  const switchProperty = async (propertyId: string): Promise<void> => {
    const current = getStoredSession();
    if (!current || current.user.role !== 'SUPER_ADMIN') return;
    const updated: AuthSession = {
      ...current,
      activePropertyId: propertyId,
    };
    saveStoredSession(updated);
    setSession(updated);
    await refreshBootstrap();
  };

  const logout = async () => {
    try {
      if (getStoredSession()?.accessToken) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch {
      // ignore network error during logout
    } finally {
      saveStoredSession(null);
      setSession(null);
      setDbSynced(false);
    }
  };

  const activePropertyId =
    session?.user?.role === 'SUPER_ADMIN'
      ? session.activePropertyId || session.user.propertyId
      : session?.user?.propertyId || null;

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        isAuthenticated: !!session?.accessToken,
        isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
        activePropertyId,
        isLoading,
        dbSynced,
        rooms,
        login,
        registerHotel,
        switchProperty,
        logout,
        refreshBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
