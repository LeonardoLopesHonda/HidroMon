import React, { useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = 72;
const ITEM_MARGIN = 6;

interface MonthOption {
  year: number;
  month: number; // 1-12
}

interface Props {
  selected: MonthOption;
  onChange: (option: MonthOption) => void;
}

function buildMonths(): MonthOption[] {
  const now = new Date();
  const months: MonthOption[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

const MONTHS = buildMonths();

export function MonthSelector({ selected, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const idx = MONTHS.findIndex(
      (m) => m.year === selected.year && m.month === selected.month
    );
    if (idx !== -1) {
      const x = idx * (ITEM_WIDTH + ITEM_MARGIN * 2) - SCREEN_WIDTH / 2 + ITEM_WIDTH / 2;
      scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
  }, [selected]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {MONTHS.map((m) => {
        const isSelected = m.year === selected.year && m.month === selected.month;
        return (
          <TouchableOpacity
            key={`${m.year}-${m.month}`}
            onPress={() => onChange(m)}
            style={[styles.item, isSelected && styles.itemSelected]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                Typography.footnote,
                { color: isSelected ? Colors.white : Colors.gray500 },
                isSelected && { fontWeight: '600' },
              ]}
            >
              {MONTH_NAMES[m.month - 1]}
            </Text>
            {m.year !== currentYear && (
              <Text
                style={[
                  Typography.caption,
                  { color: isSelected ? Colors.gray200 : Colors.gray400 },
                ]}
              >
                {m.year}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: ITEM_MARGIN * 2,
  },
  item: {
    width: ITEM_WIDTH,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    backgroundColor: Colors.black,
  },
});
