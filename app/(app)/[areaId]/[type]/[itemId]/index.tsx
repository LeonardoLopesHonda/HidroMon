import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FAB } from '@/components/ui/FAB';
import { MonthSelector } from '@/components/ui/MonthSelector';
import { ReadingListItem } from '@/components/ui/ReadingListItem';
import { StatsCard } from '@/components/ui/StatsCard';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoringType, Reading } from '@/types';

const now = new Date();

export default function ItemDetailScreen() {
  const { areaId, type, itemId } = useLocalSearchParams<{
    areaId: string;
    type: MonitoringType;
    itemId: string;
  }>();
  const { items, getReadingsByItem, getStats } = useApp();
  const navigation = useNavigation();

  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const item = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);

  useEffect(() => {
    if (item) navigation.setOptions({ title: item.name });
  }, [item]);

  const allReadings = useMemo(() => getReadingsByItem(itemId!), [itemId, getReadingsByItem]);

  const filteredReadings = useMemo(() => {
    const prefix = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
    return allReadings.filter((r) => r.date.startsWith(prefix));
  }, [allReadings, selectedMonth]);

  const stats = useMemo(
    () => getStats(itemId!, selectedMonth.year, selectedMonth.month),
    [itemId, selectedMonth, getStats]
  );

  const ListHeader = (
    <View>
      <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} />
      <View style={styles.statsWrapper}>
        <StatsCard stats={stats} />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={[Typography.headline, { color: Colors.black }]}>Leituras</Text>
        <Text style={[Typography.footnote, { color: Colors.gray500 }]}>
          {filteredReadings.length} registros
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReadings}
        keyExtractor={(item: Reading) => item.id}
        renderItem={({ item: reading }) => (
          <ReadingListItem reading={reading} type={type!} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[Typography.body, { color: Colors.gray400 }]}>
              Nenhuma leitura neste mês
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
      <FAB
        onPress={() =>
          router.push({
            pathname: '/(app)/[areaId]/[type]/[itemId]/form' as never,
            params: { areaId, type, itemId },
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  list: {
    paddingBottom: 100,
  },
  statsWrapper: {
    paddingTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
});
