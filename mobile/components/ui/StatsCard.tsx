import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ReadingStats } from '@/types';

interface Props {
  stats: ReadingStats;
}

function formatValue(value: number, unit: string): string {
  if (value === 0) return `0 ${unit}`;
  return `${value.toLocaleString('pt-BR')} ${unit}`;
}

function StatTile({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <View style={styles.tile}>
      <Text style={[Typography.caption, styles.tileLabel]}>{label}</Text>
      <Text
        style={[
          Typography.title2,
          { color: alert ? Colors.danger : Colors.black },
          styles.tileValue,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

export function StatsCard({ stats }: Props) {
  const capToCompare = stats.monthlyCap > 0 ? stats.monthlyCap : stats.limiteOutorgado;
  const overLimit = stats.total !== null && stats.total > capToCompare && capToCompare > 0;

  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        <StatTile
          label="Total"
          value={stats.total !== null ? formatValue(stats.total, stats.unit) : '—'}
          alert={overLimit}
        />
        <StatTile
          label="Média diária"
          value={stats.media !== null ? formatValue(stats.media, stats.unit) : '—'}
        />
        <StatTile label="Máximo" value={stats.maximo !== null ? formatValue(stats.maximo, stats.unit) : '—'} />
        <StatTile label="Mínimo" value={stats.minimo !== null ? formatValue(stats.minimo, stats.unit) : '—'} />
        <StatTile
          label="Dias sem leitura"
          value={stats.diasSemLeitura !== null ? `${stats.diasSemLeitura} dias` : '—'}
          alert={stats.diasSemLeitura !== null && stats.diasSemLeitura > 5}
        />
        <StatTile
          label="Cap. mensal"
          value={stats.monthlyCap > 0 ? formatValue(stats.monthlyCap, stats.unit) : '—'}
          alert={overLimit}
        />
        {stats.horasOperadas !== null && (
          <StatTile label="Horas operadas" value={formatValue(stats.horasOperadas, 'h')} />
        )}
      </View>
      {overLimit && (
        <View style={styles.alertBanner}>
          <Text style={[Typography.caption, { color: Colors.danger, fontWeight: '600' }]}>
            ⚠ Consumo acima do limite outorgado
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '50%',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.gray100,
  },
  tileLabel: {
    color: Colors.gray500,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  tileValue: {
    marginTop: 2,
  },
  alertBanner: {
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm + 4,
    alignItems: 'center',
  },
});
