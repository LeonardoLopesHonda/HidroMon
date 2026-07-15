import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoredItem, MonitoringType, Reading, ReadingValues } from '@/types';

interface Props {
  reading: Reading;
  type: MonitoringType;
  corregoMethod?: MonitoredItem['corregoMethod'];
  onPress?: () => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function tamborAvgLs(values: ReadingValues): { avg: string; ls: string } | null {
  const { t1, t2, t3 } = values;
  if (!t1 || !t2 || !t3) return null;
  const avg = (t1 + t2 + t3) / 3;
  return { avg: avg.toFixed(1), ls: (200 / avg).toFixed(2) };
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.valueRow}>
      <Text style={[Typography.caption, { color: Colors.gray500 }]}>{label}  </Text>
      <Text style={[Typography.subhead, { color: Colors.black }]}>{value}</Text>
    </View>
  );
}

export function ReadingListItem({ reading, type, corregoMethod, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.dateBlock}>
        <Text style={[Typography.footnote, { color: Colors.gray500 }]}>
          {formatDate(reading.date)}
        </Text>
        {reading.isDirty && <View style={styles.dirtyDot} />}
      </View>

      <View style={styles.valuesBlock}>
        {type === 'corrego' ? (
          corregoMethod === 'tambor' ? (
            (() => {
              const derived = tamborAvgLs(reading.values);
              return derived ? (
                <>
                  <ValueRow label="Média" value={`${derived.avg} s`} />
                  <ValueRow label="Vazão" value={`${derived.ls} L/s`} />
                </>
              ) : (
                <Text style={[Typography.subhead, { color: Colors.gray400 }]}>—</Text>
              );
            })()
          ) : (
            <ValueRow label="Nível" value={`${reading.values.nivel ?? '—'} m`} />
          )
        ) : (
          <>
            <Text style={[Typography.headline, { color: Colors.black }]}>
              {type === 'hidrometro'
                ? `${reading.values.valor ?? '—'} m³`
                : `${reading.values.valor ?? '—'} mm`}
            </Text>
            {type === 'hidrometro' && reading.values.horimetro != null && (
              <Text style={[Typography.caption, { color: Colors.gray500, marginTop: 2 }]}>
                {reading.values.horimetro} h
              </Text>
            )}
          </>
        )}
        {reading.observacoes ? (
          <Text
            style={[Typography.caption, { color: Colors.gray400, marginTop: 2 }]}
            numberOfLines={1}
          >
            {reading.observacoes}
          </Text>
        ) : null}
      </View>
    </Pressable>
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
  rowPressed: {
    backgroundColor: Colors.gray50,
  },
  dateBlock: {
    width: 80,
    gap: 4,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
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
