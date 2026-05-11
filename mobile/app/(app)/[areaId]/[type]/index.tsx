import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoredItem, MonitoringType } from '@/types';

const TYPE_LABELS: Record<MonitoringType, string> = {
  hidrometro: 'Hidrômetros',
  pluviometro: 'Pluviômetros',
  corrego: 'Córregos',
};

const VALUE_LABELS: Record<MonitoringType, (values: Record<string, number>) => string> = {
  hidrometro: (v) => `${v.leitura ?? '—'} m³`,
  pluviometro: (v) => `${v.precipitacao ?? '—'} mm`,
  corrego: (v) => `${v.nivel ?? '—'} cm  ·  ${v.vazao ?? '—'} m³/s`,
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function TypeScreen() {
  const { areaId, type } = useLocalSearchParams<{ areaId: string; type: MonitoringType }>();
  const { getItemsByAreaAndType, getLastReadingByItem } = useApp();
  const navigation = useNavigation();

  const items = useMemo(
    () => getItemsByAreaAndType(areaId!, type!),
    [areaId, type, getItemsByAreaAndType]
  );

  useEffect(() => {
    if (type) navigation.setOptions({ title: TYPE_LABELS[type] });
  }, [type]);

  const renderItem = ({ item }: { item: MonitoredItem }) => {
    const last = getLastReadingByItem(item.id);
    return (
      <Card
        onPress={() =>
          router.push({
            pathname: '/(app)/[areaId]/[type]/[itemId]' as never,
            params: { areaId, type, itemId: item.id },
          })
        }
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <Text style={[Typography.headline, { color: Colors.black }]}>{item.name}</Text>
            {last ? (
              <Text style={[Typography.footnote, { color: Colors.gray500, marginTop: 4 }]}>
                {VALUE_LABELS[type!]?.(last.values)}  ·  {formatDate(last.date)}
              </Text>
            ) : (
              <Text style={[Typography.footnote, { color: Colors.gray400, marginTop: 4 }]}>
                Sem leituras
              </Text>
            )}
          </View>
          <Text style={[Typography.title2, { color: Colors.gray400 }]}>›</Text>
        </View>
      </Card>
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[Typography.body, { color: Colors.gray400 }]}>Nenhum item cadastrado</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    flexGrow: 1,
  },
  card: {},
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
});
