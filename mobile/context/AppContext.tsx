import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { apiClient } from '@/lib/api/client';
import { supabase } from '@/lib/supabase';
import { pullAreas, pullItems, pullReadings } from '@/lib/sync/pull';
import { pushDirty } from '@/lib/sync/push';
import { Area, MonitoredItem, MonitoringType, Reading, ReadingStats, User } from '@/types';

type SyncStatus = 'idle' | 'syncing' | 'error';

function mergeById<T extends { id: string }>(local: T[], server: T[]): T[] {
  const map = new Map<string, T>(local.map((x) => [x.id, x]));
  for (const s of server) map.set(s.id, s);
  return Array.from(map.values());
}

function mergeReadings(local: Reading[], server: Reading[]): Reading[] {
  const map = new Map<string, Reading>(local.map((r) => [r.id, r]));
  for (const s of server) {
    const existing = map.get(s.id);
    // Single-writer invariant: keep local edits in-flight; server otherwise wins.
    if (existing?.isDirty) continue;
    map.set(s.id, { ...s, isDirty: false, syncedAt: s.updatedAt ?? null });
  }
  return Array.from(map.values());
}

function maxUpdatedAt(rows: { updatedAt?: string }[]): string | null {
  let max: string | null = null;
  for (const r of rows) {
    if (r.updatedAt && (!max || r.updatedAt > max)) max = r.updatedAt;
  }
  return max;
}

const STORAGE_KEYS = {
  areas: '@telos_areas',
  items: '@telos_items',
  readings: '@telos_readings',
  lastSyncedAt: '@telos_lastSyncedAt',
} as const;

function getPrimaryKey(item: MonitoredItem): string {
  if (item.type === 'corrego') return item.corregoMethod === 'tambor' ? 'avg' : 'nivel';
  return 'valor';
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function countWorkdaysInMonth(year: number, month: number): number {
  const days = getDaysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) count++; // exclude Sundays
  }
  return count;
}

interface AppContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthLoading: boolean;

  areas: Area[];
  items: MonitoredItem[];
  readings: Reading[];
  isDataLoading: boolean;

  sync: () => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  dirtyCount: number;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  readingsLoading: boolean;
  retryBootstrap: () => void;

  addReading: (reading: Omit<Reading, 'id' | 'isDirty' | 'syncedAt'>) => Promise<void>;
  updateReading: (id: string, patch: Partial<Omit<Reading, 'id'>>) => Promise<void>;

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

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);

  // Auth: hydrate from supabase-js session, subscribe to changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setUser(s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null);
      setIsAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Data load on user change. First login (no cache) blocks on master data, streams readings.
  useEffect(() => {
    if (!user) {
      setIsDataLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const pairs = await AsyncStorage.multiGet([
        STORAGE_KEYS.areas,
        STORAGE_KEYS.items,
        STORAGE_KEYS.readings,
        STORAGE_KEYS.lastSyncedAt,
      ]);
      if (cancelled) return;

      const rawAreas = pairs[0][1];
      const rawItems = pairs[1][1];
      const rawReadings = pairs[2][1];
      const rawCursor = pairs[3][1];
      if (rawCursor) setLastSyncedAt(rawCursor);

      if (rawAreas && rawItems) {
        setAreas(JSON.parse(rawAreas));
        setItems(JSON.parse(rawItems));
        setReadings(rawReadings ? JSON.parse(rawReadings) : []);
        setIsDataLoading(false);
        return;
      }

      // First login — bootstrap: pull master data synchronously, stream readings.
      setIsBootstrapping(true);
      setBootstrapError(null);
      try {
        const [serverAreas, serverItems] = await Promise.all([
          pullAreas(apiClient, null),
          pullItems(apiClient, null),
        ]);
        if (cancelled) return;
        setAreas(serverAreas);
        setItems(serverItems);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.areas, JSON.stringify(serverAreas)],
          [STORAGE_KEYS.items, JSON.stringify(serverItems)],
        ]);
        setIsBootstrapping(false);
        setIsDataLoading(false);

        setReadingsLoading(true);
        pullReadings(apiClient, null)
          .then(async (serverReadings) => {
            if (cancelled) return;
            const merged = serverReadings.map((r) => ({
              ...r,
              isDirty: false,
              syncedAt: r.updatedAt ?? null,
            }));
            setReadings(merged);
            const newCursor = maxUpdatedAt([...serverAreas, ...serverItems, ...merged]);
            const writes: [string, string][] = [
              [STORAGE_KEYS.readings, JSON.stringify(merged)],
            ];
            if (newCursor) writes.push([STORAGE_KEYS.lastSyncedAt, newCursor]);
            await AsyncStorage.multiSet(writes);
            if (newCursor) setLastSyncedAt(newCursor);
          })
          .catch(() => {
            // Readings stream failure is non-fatal — surface via syncError on next manual sync.
          })
          .finally(() => {
            if (!cancelled) setReadingsLoading(false);
          });
      } catch (e) {
        if (cancelled) return;
        setBootstrapError(e instanceof Error ? e.message : 'Erro ao carregar dados iniciais');
        setIsBootstrapping(false);
        setIsDataLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, bootstrapNonce]);

  const retryBootstrap = useCallback(() => setBootstrapNonce((n) => n + 1), []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.areas,
      STORAGE_KEYS.items,
      STORAGE_KEYS.readings,
      STORAGE_KEYS.lastSyncedAt,
    ]);
    setAreas([]);
    setItems([]);
    setReadings([]);
  }, []);

  const addReading = useCallback(
    async (reading: Omit<Reading, 'id' | 'isDirty' | 'syncedAt'>) => {
      const newReading: Reading = {
        ...reading,
        id: Crypto.randomUUID(),
        isDirty: true,
        syncedAt: null,
      };
      const updated = [...readings, newReading];
      setReadings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.readings, JSON.stringify(updated));
    },
    [readings]
  );

  const updateReading = useCallback(
    async (id: string, patch: Partial<Omit<Reading, 'id'>>) => {
      // Preserve syncedAt on edit — it routes a PUT (vs POST for new rows).
      // Only flip isDirty: true. Date is frozen per ADR 0005; we don't touch it.
      const updated = readings.map((r) =>
        r.id === id ? { ...r, ...patch, isDirty: true } : r
      );
      setReadings(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.readings, JSON.stringify(updated));
    },
    [readings]
  );

  const sync = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      // 1. Push dirty readings first.
      const dirty = readings.filter((r) => r.isDirty);
      const pushResult =
        dirty.length > 0
          ? await pushDirty(apiClient, dirty)
          : { succeeded: [], failed: [] };

      const successMap = new Map(pushResult.succeeded.map((s) => [s.id, s.updatedAt]));
      const cleanedReadings = readings.map((r) => {
        const updatedAt = successMap.get(r.id);
        return updatedAt
          ? { ...r, isDirty: false, syncedAt: updatedAt, updatedAt }
          : r;
      });

      // 2. Pull deltas since the global cursor.
      const [serverAreas, serverItems, serverReadings] = await Promise.all([
        pullAreas(apiClient, lastSyncedAt),
        pullItems(apiClient, lastSyncedAt),
        pullReadings(apiClient, lastSyncedAt),
      ]);

      const mergedAreas = mergeById(areas, serverAreas);
      const mergedItems = mergeById(items, serverItems);
      const mergedReadings = mergeReadings(cleanedReadings, serverReadings);

      const newCursor =
        maxUpdatedAt([...mergedAreas, ...mergedItems, ...mergedReadings]) ?? lastSyncedAt;

      setAreas(mergedAreas);
      setItems(mergedItems);
      setReadings(mergedReadings);
      if (newCursor) setLastSyncedAt(newCursor);

      const writes: [string, string][] = [
        [STORAGE_KEYS.areas, JSON.stringify(mergedAreas)],
        [STORAGE_KEYS.items, JSON.stringify(mergedItems)],
        [STORAGE_KEYS.readings, JSON.stringify(mergedReadings)],
      ];
      if (newCursor) writes.push([STORAGE_KEYS.lastSyncedAt, newCursor]);
      await AsyncStorage.multiSet(writes);

      if (pushResult.failed.length > 0) {
        setSyncStatus('error');
        setSyncError(`${pushResult.failed.length} leitura(s) falharam ao enviar`);
      } else {
        setSyncStatus('idle');
      }
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : 'Erro de sincronização');
    } finally {
      syncInFlight.current = false;
    }
  }, [areas, items, readings, lastSyncedAt]);

  const dirtyCount = useMemo(() => readings.filter((r) => r.isDirty).length, [readings]);

  // Auto-sync triggers (ADR 0007): NetInfo offline→online, AppState foreground re-entry.
  // Debounce: skip if a trigger fired within DEBOUNCE_MS.
  const lastTriggerAt = useRef(0);
  const DEBOUNCE_MS = 2000;
  const triggerSync = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerAt.current < DEBOUNCE_MS) return;
    lastTriggerAt.current = now;
    void sync();
  }, [sync]);

  useEffect(() => {
    if (!user || isDataLoading) return;

    let wasOnline: boolean | null = null;
    const netSub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      if (wasOnline === false && online) triggerSync();
      wasOnline = online;
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') triggerSync();
    });

    return () => {
      netSub();
      appSub.remove();
    };
  }, [user, isDataLoading, triggerSync]);

  // Push-on-dirty: any local mutation that leaves rows dirty kicks a sync.
  // Also catches pending rows left over from a previous session at startup.
  useEffect(() => {
    if (!user || isDataLoading) return;
    if (dirtyCount === 0) return;
    triggerSync();
  }, [dirtyCount, user, isDataLoading, triggerSync]);

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
      const primaryKey = item ? getPrimaryKey(item) : 'leitura';
      const area = areas.find((a) => a.id === item?.areaId);
      const isWeekly = area?.frequency === 'weekly';

      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const monthReadings = readings
        .filter((r) => r.itemId === itemId && r.date.startsWith(prefix))
        .sort((a, b) => a.date.localeCompare(b.date)); // chronological

      // Extract the primary value per reading (tambor uses derived avg)
      const values = monthReadings.map((r) => {
        if (item?.corregoMethod === 'tambor') {
          const { t1 = 0, t2 = 0, t3 = 0 } = r.values;
          return t1 > 0 && t2 > 0 && t3 > 0 ? (t1 + t2 + t3) / 3 : 0;
        }
        if (type === 'corrego') return r.values.nivel ?? 0;
        return r.values.valor ?? 0;
      });

      let total = 0;
      if (type === 'hidrometro') {
        // Cumulative odometer: monthly consumption = last reading − first reading
        total = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
      } else if (type === 'pluviometro') {
        total = values.reduce((s, v) => s + v, 0);
      }
      const sum = values.reduce((s, v) => s + v, 0);
      const media = values.length > 0 ? sum / values.length : 0;
      const maximo = values.length > 0 ? Math.max(...values) : 0;
      const minimo = values.length > 0 ? Math.min(...values) : 0;

      const daysWithReading = new Set(monthReadings.map((r) => r.date)).size;
      let diasSemLeitura: number | null = null;
      if (!isWeekly) {
        diasSemLeitura = Math.max(0, countWorkdaysInMonth(year, month) - daysWithReading);
      }

      // Horímetro: hours operated this month = last − first counter reading.
      // Independent of monthlyCap — measured hours never feed the permit cap.
      let horasOperadas: number | null = null;
      if (item?.hasHorimetro) {
        const horas = monthReadings
          .map((r) => r.values.horimetro)
          .filter((h): h is number => typeof h === 'number');
        horasOperadas = horas.length >= 2 ? horas[horas.length - 1] - horas[0] : 0;
      }

      const limiteOutorgado = item?.limiteOutorgado ?? 0;
      const monthlyCap =
        item?.type === 'hidrometro' && limiteOutorgado > 0
          ? limiteOutorgado * (item?.horasOperacao ?? 24) * 30
          : 0;

      return {
        total: type === 'corrego' ? null : Math.round(total * 100) / 100,
        media:  type === 'hidrometro' ? null : Math.round(media * 100) / 100,
        maximo: type === 'hidrometro' ? null : Math.round(maximo * 100) / 100,
        minimo: type === 'hidrometro' ? null : Math.round(minimo * 100) / 100,
        diasSemLeitura,
        horasOperadas: horasOperadas === null ? null : Math.round(horasOperadas * 100) / 100,
        limiteOutorgado,
        monthlyCap: Math.round(monthlyCap * 100) / 100,
        unit: item?.unit ?? '',
        primaryKey,
      };
    },
    [areas, items, readings]
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
      sync,
      syncStatus,
      lastSyncedAt,
      syncError,
      dirtyCount,
      isBootstrapping,
      bootstrapError,
      readingsLoading,
      retryBootstrap,
      addReading,
      updateReading,
      getItemsByAreaAndType,
      getReadingsByItem,
      getLastReadingByItem,
      getLastReadingByArea,
      getStats,
    }),
    [
      user, login, logout, isAuthLoading,
      areas, items, readings, isDataLoading,
      sync, syncStatus, lastSyncedAt, syncError, dirtyCount,
      isBootstrapping, bootstrapError, readingsLoading, retryBootstrap,
      addReading, updateReading, getItemsByAreaAndType, getReadingsByItem,
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
