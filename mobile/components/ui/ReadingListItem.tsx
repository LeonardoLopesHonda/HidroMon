import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoredItem, MonitoringType, Reading } from '@/types';

interface Props {
  reading: Reading;
  type: MonitoringType;
  corregoMethod?: MonitoredItem['corregoMethod'];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function tamborAvgLs(values: Record<string, number>): { avg: string; ls: string } | null {
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

export function ReadingListItem({ reading, type, corregoMethod }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dateBlock}>
        <Text style={[Typography.footnote, { color: Colors.gray500 }]}>
          {formatDate(reading.date)}
        </Text>
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
          <Text style={[Typography.headline, { color: Colors.black }]}>
            {type === 'hidrometro'
              ? `${reading.values.leitura ?? '—'} m³`
              : `${reading.values.precipitacao ?? '—'} mm`}
          </Text>
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
