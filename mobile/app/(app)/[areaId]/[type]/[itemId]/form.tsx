import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MonitoredItem, MonitoringType } from '@/types';

// ── Field config ────────────────────────────────────────────────────────────

interface FieldConfig {
  key: string;
  label: string;
  placeholder?: string;
}

function getFieldConfigs(item: MonitoredItem): FieldConfig[] {
  switch (item.type) {
    case 'hidrometro':
      return [{ key: 'leitura', label: 'Leitura (m³)', placeholder: '0.0' }];
    case 'pluviometro':
      return [{ key: 'precipitacao', label: 'Precipitação (mm)', placeholder: '0.0' }];
    case 'corrego':
      if (item.corregoMethod === 'tambor') {
        return [
          { key: 't1', label: '1ª medição (s)', placeholder: '0.0' },
          { key: 't2', label: '2ª medição (s)', placeholder: '0.0' },
          { key: 't3', label: '3ª medição (s)', placeholder: '0.0' },
        ];
      }
      return [{ key: 'nivel', label: "Nível d'água (m)", placeholder: '0.00' }];
  }
}

// ── Live preview helpers ─────────────────────────────────────────────────────

function computeReguaPreview(nivelStr: string): string | null {
  const nivel = parseFloat(nivelStr.replace(',', '.'));
  if (!nivel || nivel <= 0) return null;
  const q = 1.8 * 0.6 * Math.pow(nivel, 1.5);
  return `Vazão estimada: ${q.toFixed(4)} m³/s · ${(q * 1000).toFixed(2)} L/s`;
}

function computeTamborPreview(t1s: string, t2s: string, t3s: string): string | null {
  const t1 = parseFloat(t1s.replace(',', '.'));
  const t2 = parseFloat(t2s.replace(',', '.'));
  const t3 = parseFloat(t3s.replace(',', '.'));
  if (!t1 || !t2 || !t3 || t1 <= 0 || t2 <= 0 || t3 <= 0) return null;
  const avg = (t1 + t2 + t3) / 3;
  const ls = 200 / avg;
  return `Média: ${avg.toFixed(1)} s · Vazão: ${ls.toFixed(2)} L/s · ${(ls / 1000).toFixed(5)} m³/s`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function parseNum(str: string): number {
  return parseFloat((str ?? '0').replace(',', '.'));
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function FormScreen() {
  const { areaId, type, itemId } = useLocalSearchParams<{
    areaId: string;
    type: MonitoringType;
    itemId: string;
  }>();
  const { items, addReading, getReadingsByItem, getLastReadingByItem } = useApp();
  const navigation = useNavigation();

  const item = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);
  const fields = useMemo(() => (item ? getFieldConfigs(item) : []), [item]);
  const lastReading = useMemo(
    () => (itemId ? getLastReadingByItem(itemId) : null),
    [itemId, getLastReadingByItem]
  );
  const lastLeitura = lastReading?.values.leitura ?? null;

  const [date, setDate] = useState(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} hitSlop={12}>
          <Text style={[Typography.headline, { color: Colors.black }]}>Salvar</Text>
        </Pressable>
      ),
    });
  }, [date, fieldValues, observacoes]);

  // ── Live preview ────────────────────────────────────────────────────────────

  const preview = useMemo(() => {
    if (item?.type !== 'corrego') return null;
    if (item.corregoMethod === 'tambor') {
      return computeTamborPreview(
        fieldValues.t1 ?? '',
        fieldValues.t2 ?? '',
        fieldValues.t3 ?? ''
      );
    }
    return computeReguaPreview(fieldValues.nivel ?? '');
  }, [item, fieldValues]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const raw = fieldValues[field.key] ?? '';
      if (!raw.trim()) {
        errors[field.key] = 'Campo obrigatório';
      } else {
        const num = parseNum(raw);
        if (isNaN(num) || num < 0) {
          errors[field.key] = 'Informe um número válido';
        }
      }
    }

    // Hidrômetro: new reading must be ≥ last reading
    if (item?.type === 'hidrometro' && lastLeitura !== null) {
      const nova = parseNum(fieldValues.leitura ?? '');
      if (!isNaN(nova) && nova < lastLeitura) {
        errors.leitura = `Deve ser ≥ ${lastLeitura.toLocaleString('pt-BR')} m³ (última leitura)`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    const dateStr = toDateString(date);
    const existingReadings = getReadingsByItem(itemId!);
    const duplicate = existingReadings.find((r) => r.date === dateStr);

    if (duplicate) {
      Alert.alert(
        'Leitura duplicada',
        `Já existe uma leitura para ${formatDisplayDate(date)}. Deseja substituir?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar mesmo assim', onPress: () => doSave(dateStr) },
        ]
      );
      return;
    }

    await doSave(dateStr);
  };

  const doSave = async (dateStr: string) => {
    setIsSaving(true);
    const values: Record<string, number> = {};
    for (const field of fields) {
      values[field.key] = parseNum(fieldValues[field.key] ?? '0');
    }
    await addReading({
      itemId: itemId!,
      date: dateStr,
      values,
      observacoes: observacoes.trim() || undefined,
    });
    setIsSaving(false);
    router.back();
  };

  const handleDateChange = (_: unknown, selected?: Date) => {
    setShowAndroidPicker(false);
    if (selected) setDate(selected);
  };

  const setField = (key: string, value: string) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const maxDate = new Date();
  const isTambor = item?.corregoMethod === 'tambor';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <View style={styles.section}>
          <Text style={[Typography.caption, styles.sectionLabel]}>DATA</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="inline"
              maximumDate={maxDate}
              onChange={handleDateChange}
              locale="pt-BR"
              accentColor={Colors.black}
              style={styles.iosPicker}
            />
          ) : (
            <>
              <Pressable
                onPress={() => setShowAndroidPicker(true)}
                style={styles.androidDateButton}
              >
                <Text style={[Typography.body, { color: Colors.black }]}>
                  {formatDisplayDate(date)}
                </Text>
              </Pressable>
              {showAndroidPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  maximumDate={maxDate}
                  onChange={handleDateChange}
                />
              )}
            </>
          )}
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <Text style={[Typography.caption, styles.sectionLabel]}>
            {isTambor ? 'DADOS — TAMBOR (200 L)' : 'DADOS'}
          </Text>

          {/* Tambor: 3 fields side by side */}
          {isTambor ? (
            <View style={styles.tamborRow}>
              {fields.map((field) => (
                <View key={field.key} style={styles.tamborField}>
                  <AppTextInput
                    label={field.label}
                    variant="outlined"
                    keyboardType="numeric"
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ''}
                    onChangeText={(v) => setField(field.key, v)}
                    error={fieldErrors[field.key]}
                  />
                </View>
              ))}
            </View>
          ) : (
            fields.map((field) => (
              <AppTextInput
                key={field.key}
                label={field.label}
                variant="outlined"
                keyboardType="numeric"
                placeholder={field.placeholder}
                value={fieldValues[field.key] ?? ''}
                onChangeText={(v) => setField(field.key, v)}
                error={fieldErrors[field.key]}
                returnKeyType="next"
              />
            ))
          )}

          {/* Hidrômetro: last reading hint */}
          {item?.type === 'hidrometro' && lastLeitura !== null && (
            <View style={styles.hintBox}>
              <Text style={[Typography.caption, { color: Colors.gray600 }]}>
                Última leitura: {lastLeitura.toLocaleString('pt-BR')} m³
              </Text>
            </View>
          )}

          {/* Córrego: live flow preview */}
          {preview !== null && (
            <View style={styles.previewBox}>
              <Text style={[Typography.caption, { color: Colors.success }]}>{preview}</Text>
              <Text style={[Typography.caption, { color: Colors.success, opacity: 0.7, marginTop: 2 }]}>
                Apenas visualização — não salvo
              </Text>
            </View>
          )}
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <AppTextInput
            label="Observações (opcional)"
            variant="outlined"
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.sm }}
          />
        </View>

        <Button
          label={isSaving ? 'Salvando…' : 'Salvar leitura'}
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />
        <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    color: Colors.gray500,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  iosPicker: {
    marginHorizontal: -Spacing.sm,
  },
  androidDateButton: {
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  tamborRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tamborField: {
    flex: 1,
  },
  hintBox: {
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  previewBox: {
    backgroundColor: Colors.successLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  saveButton: {
    marginBottom: Spacing.sm,
  },
});
