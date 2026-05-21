import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Area } from '@/types';

function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'Agora';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Agora há pouco';
  if (min < 60) return `${min} min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h atrás`;
  const day = Math.floor(hr / 24);
  return `${day} d atrás`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Sem leituras';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function ConnectivityBadge({ isOnline }: { isOnline: boolean | null }) {
  if (isOnline === null) return null;
  return (
    <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
      <View style={[styles.badgeDot, { backgroundColor: isOnline ? '#22C55E' : '#EF4444' }]} />
      <Text style={[Typography.caption, { color: isOnline ? '#15803D' : '#B91C1C', fontWeight: '600' }]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

export default function AreasScreen() {
  const {
    user, logout, areas, getLastReadingByArea,
    sync, syncStatus, lastSyncedAt, syncError, dirtyCount,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const lastErrorShown = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  // Drive spinning icon while syncing.
  useEffect(() => {
    if (syncStatus === 'syncing') {
      spin.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [syncStatus, spin]);

  // Surface sync errors once each.
  useEffect(() => {
    if (syncStatus === 'error' && syncError && syncError !== lastErrorShown.current) {
      lastErrorShown.current = syncError;
      Alert.alert('Sincronização', syncError);
    }
    if (syncStatus !== 'error') lastErrorShown.current = null;
  }, [syncStatus, syncError]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const [, forceRender] = useState(0);

  // Re-render every 30s to keep "Última sync" relative time fresh.
  useEffect(() => {
    const t = setInterval(() => forceRender((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const areasWithLastReading = useMemo(
    () =>
      areas.map((area) => ({
        ...area,
        lastReading: getLastReadingByArea(area.id),
      })),
    [areas, getLastReadingByArea]
  );

  const handleLogout = async () => {
    if (dirtyCount > 0) {
      Alert.alert(
        'Sair',
        `${dirtyCount} leitura${dirtyCount === 1 ? '' : 's'} não sincronizada${dirtyCount === 1 ? '' : 's'} serão perdidas — sair mesmo assim?`,
        [
          { text: 'Sincronizar', onPress: () => sync() },
          {
            text: 'Sair mesmo assim',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/auth' as never);
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }
    await logout();
    router.replace('/auth' as never);
  };

  const renderArea = ({ item }: { item: Area & { lastReading: ReturnType<typeof getLastReadingByArea> } }) => (
    <Card
      onPress={() => router.push({ pathname: '/(app)/[areaId]' as never, params: { areaId: item.id } })}
      style={styles.card}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={[Typography.title2, { color: Colors.black }]}>{item.name}</Text>
          <Text style={[Typography.footnote, { color: Colors.gray500, marginTop: 4 }]}>
            {item.lastReading
              ? `Última leitura: ${formatDate(item.lastReading.date)}`
              : 'Sem leituras registradas'}
          </Text>
        </View>
        <Text style={[Typography.title2, { color: Colors.gray400 }]}>›</Text>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.footnote, { color: Colors.gray500 }]}>Olá,</Text>
          <Text style={[Typography.title1, { color: Colors.black }]} numberOfLines={1}>
            {user?.email ?? 'Usuário'}
          </Text>
          <Text style={[Typography.caption, { color: Colors.gray400, marginTop: 2 }]}>
            Última sync: {formatRelative(lastSyncedAt)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <ConnectivityBadge isOnline={isOnline} />
          <TouchableOpacity
            onPress={() => sync()}
            disabled={syncStatus === 'syncing'}
            style={styles.syncBtn}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="sync" size={22} color={Colors.black} />
            </Animated.View>
            {dirtyCount > 0 && (
              <View style={styles.dirtyBadge}>
                <Text style={styles.dirtyBadgeText}>{dirtyCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.avatar} activeOpacity={0.7}>
            <Text style={[Typography.headline, { color: Colors.white }]}>
              {(user?.email ?? 'T').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[Typography.callout, { color: Colors.gray500, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }]}>
        Áreas monitoradas
      </Text>

      <FlatList
        data={areasWithLastReading}
        keyExtractor={(item) => item.id}
        renderItem={renderArea}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeOnline: {
    backgroundColor: '#F0FDF4',
  },
  badgeOffline: {
    backgroundColor: '#FEF2F2',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  card: {
    minHeight: 80,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
  },
  syncBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
