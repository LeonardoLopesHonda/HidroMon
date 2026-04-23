import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoringType, Reading } from '@/types';

interface Props {
  reading: Reading;
  type: MonitoringType;
}

const UNITS: Record<MonitoringType, string | null> = {
  hidrometro: 'm³',
  pluviometro: 'mm',
  corrego: null,
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function ReadingListItem({ reading, type }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dateBlock}>
        <Text style={[Typography.footnote, { color: Colors.gray500 }]}>
          {formatDate(reading.date)}
        </Text>
      </View>

      <View style={styles.valuesBlock}>
        {type === 'corrego' ? (
          <>
            <View style={styles.valueRow}>
              <Text style={[Typography.caption, { color: Colors.gray500 }]}>Nível  </Text>
              <Text style={[Typography.subhead, { color: Colors.black }]}>
                {reading.values.nivel ?? '—'} cm
              </Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={[Typography.caption, { color: Colors.gray500 }]}>Vazão  </Text>
              <Text style={[Typography.subhead, { color: Colors.black }]}>
                {reading.values.vazao ?? '—'} m³/s
              </Text>
            </View>
          </>
        ) : (
          <Text style={[Typography.headline, { color: Colors.black }]}>
            {type === 'hidrometro'
              ? `${reading.values.leitura ?? '—'} m³`
              : `${reading.values.precipitacao ?? '—'} mm`}
          </Text>
        )}
        {reading.observacoes ? (
          <Text style={[Typography.caption, { color: Colors.gray400, marginTop: 2 }]} numberOfLines={1}>
            {reading.observacoes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  dateBlock: {
    width: 80,
  },
  valuesBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
