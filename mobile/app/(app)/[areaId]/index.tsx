import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoringType } from '@/types';

const TYPES: { type: MonitoringType; label: string; emoji: string; suffix: string }[] = [
  { type: 'hidrometro', label: 'Hidrômetros', emoji: '💧', suffix: 'medidores' },
  { type: 'pluviometro', label: 'Pluviômetros', emoji: '🌧️', suffix: 'medidores' },
  { type: 'corrego', label: 'Córregos', emoji: '🌊', suffix: 'pontos' },
];

export default function AreaScreen() {
  const { areaId } = useLocalSearchParams<{ areaId: string }>();
  const { areas, getItemsByAreaAndType } = useApp();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const area = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId]);

  useEffect(() => {
    if (area) navigation.setOptions({ title: area.name });
  }, [area]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[Typography.callout, styles.subtitle]}>
        Selecione o tipo de monitoramento
      </Text>

      {TYPES.map(({ type, label, emoji, suffix }) => {
        const count = getItemsByAreaAndType(areaId!, type).length;
        return (
          <Card
            key={type}
            onPress={() =>
              router.push({ pathname: '/(app)/[areaId]/[type]' as never, params: { areaId, type } })
            }
            style={styles.card}
          >
            <View style={styles.cardContent}>
              <View style={styles.emojiCircle}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[Typography.headline, { color: Colors.black }]}>{label}</Text>
                <Text style={[Typography.footnote, { color: Colors.gray500 }]}>
                  {count} {suffix}
                </Text>
              </View>
              <Text style={[Typography.title2, { color: Colors.gray400 }]}>›</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  subtitle: {
    color: Colors.gray500,
    marginBottom: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
});
