import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Area } from '@/types';

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Sem leituras';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function AreasScreen() {
  const { user, logout, areas, getLastReadingByArea } = useApp();
  const insets = useSafeAreaInsets();

  const areasWithLastReading = useMemo(
    () =>
      areas.map((area) => ({
        ...area,
        lastReading: getLastReadingByArea(area.id),
      })),
    [areas, getLastReadingByArea]
  );

  const handleLogout = async () => {
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
        <View>
          <Text style={[Typography.footnote, { color: Colors.gray500 }]}>Olá,</Text>
          <Text style={[Typography.title1, { color: Colors.black }]}>{user?.name ?? 'Usuário'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.avatar} activeOpacity={0.7}>
          <Text style={[Typography.headline, { color: Colors.white }]}>
            {(user?.name ?? 'T').charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
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
});
