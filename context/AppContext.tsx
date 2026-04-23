import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { MOCK_AREAS, MOCK_ITEMS, MOCK_READINGS } from '@/data/mockData';
import { Area, MonitoredItem, MonitoringType, Reading, ReadingStats, User } from '@/types';

const STORAGE_KEYS = {
  user: '@telos_user',
  areas: '@telos_areas',
  items: '@telos_items',
  readings: '@telos_readings',
} as const;

const MOCK_CREDENTIALS: Record<string, User> = {
  telos: { username: 'telos', name: 'Telos' },
};
const MOCK_PASSWORDS: Record<string, string> = {
  telos: 'telos2024',
};

const PRIMARY_VALUE_KEY: Record<MonitoringType, string> = {
  hidrometro: 'leitura',
  pluviometro: 'precipitacao',
  corrego: 'vazao',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface AppContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthLoading: boolean;

  areas: Area[];
  items: MonitoredItem[];
  readings: Reading[];
  isDataLoading: boolean;

  addReading: (reading: Omit<Reading, 'id'>) => Promise<void>;

  getItemsByAreaAndType: (areaId: string, type: MonitoringType) => MonitoredItem[];
  getReadingsByItem: (itemId: string) => Reading[];
  getLastReadingByItem: (itemId: string) => Reading | null;
  getLastReadingByArea: (areaId: string) => Reading | null;
  getStats: (itemId: string, year: number, month: number) => ReadingStats;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Auth check on mount (fast, separate from data load)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.user).then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setIsAuthLoading(false);
    });
  }, []);

  // Data load on mount
  useEffect(() => {
    const load = async () => {
      const pairs = await AsyncStorage.multiGet([
        STORAGE_KEYS.areas,
        STORAGE_KEYS.items,
        STORAGE_KEYS.readings,
      ]);

      const rawAreas = pairs[0][1];
      const rawItems = pairs[1][1];
      const rawReadings = pairs[2][1];

      if (rawAreas && rawItems && rawReadings) {
        setAreas(JSON.parse(rawAreas));
        setItems(JSON.parse(rawItems));
        setReadings(JSON.parse(rawReadings));
      } else {
        // First run: seed with mock data
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.areas, JSON.stringify(MOCK_AREAS)],
          [STORAGE_KEYS.items, JSON.stringify(MOCK_ITEMS)],
          [STORAGE_KEYS.readings, JSON.stringify(MOCK_READINGS)],
        ]);
        setAreas(MOCK_AREAS);
        setItems(MOCK_ITEMS);
        setReadings(MOCK_READINGS);
      }
      setIsDataLoading(false);
    };
    load();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const u = username.toLowerCase().trim();
    if (MOCK_PASSWORDS[u] === password) {
      const userData = MOCK_CREDENTIALS[u];
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      setUser(userData);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.user);
    setUser(null);
  }, []);

  const addReading = useCallback(
    async (reading: Omit<Reading, 'id'>) => {
      const newReading: Reading = { ...reading, id: Date.now().toString() };
      const updated = [...readings, newReading];
      setReadings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.readings, JSON.stringify(updated));
    },
    [readings]
  );

  const getItemsByAreaAndType = useCallback(
    (areaId: string, type: MonitoringType) =>
      items.filter((i) => i.areaId === areaId && i.type === type),
    [items]
  );

  const getReadingsByItem = useCallback(
    (itemId: string) =>
      readings.filter((r) => r.itemId === itemId).sort((a, b) => b.date.localeCompare(a.date)),
    [readings]
  );

  const getLastReadingByItem = useCallback(
    (itemId: string): Reading | null => {
      const sorted = readings
        .filter((r) => r.itemId === itemId)
        .sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0] ?? null;
    },
    [readings]
  );

  const getLastReadingByArea = useCallback(
    (areaId: string): Reading | null => {
      const areaItemIds = new Set(items.filter((i) => i.areaId === areaId).map((i) => i.id));
      const sorted = readings
        .filter((r) => areaItemIds.has(r.itemId))
        .sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0] ?? null;
    },
    [items, readings]
  );

  const getStats = useCallback(
    (itemId: string, year: number, month: number): ReadingStats => {
      const item = items.find((i) => i.id === itemId);
      const type = item?.type ?? 'hidrometro';
      const primaryKey = PRIMARY_VALUE_KEY[type];

      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const monthReadings = readings.filter(
        (r) => r.itemId === itemId && r.date.startsWith(prefix)
      );

      const values = monthReadings.map((r) => r.values[primaryKey] ?? 0);
      const total = values.reduce((s, v) => s + v, 0);
      const media = values.length > 0 ? total / values.length : 0;
      const maximo = values.length > 0 ? Math.max(...values) : 0;
      const minimo = values.length > 0 ? Math.min(...values) : 0;

      const daysWithReading = new Set(monthReadings.map((r) => r.date)).size;
      const daysInMonth = getDaysInMonth(year, month);
      const diasSemLeitura = daysInMonth - daysWithReading;

      return {
        total: Math.round(total * 100) / 100,
        media: Math.round(media * 100) / 100,
        maximo: Math.round(maximo * 100) / 100,
        minimo: Math.round(minimo * 100) / 100,
        diasSemLeitura,
        limiteOutorgado: item?.limiteOutorgado ?? 0,
        unit: item?.unit ?? '',
        primaryKey,
      };
    },
    [items, readings]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      login,
      logout,
      isAuthLoading,
      areas,
      items,
      readings,
      isDataLoading,
      addReading,
      getItemsByAreaAndType,
      getReadingsByItem,
      getLastReadingByItem,
      getLastReadingByArea,
      getStats,
    }),
    [
      user, login, logout, isAuthLoading,
      areas, items, readings, isDataLoading,
      addReading, getItemsByAreaAndType, getReadingsByItem,
      getLastReadingByItem, getLastReadingByArea, getStats,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
