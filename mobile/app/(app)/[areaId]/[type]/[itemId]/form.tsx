import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { MonitoringType } from '@/types';

interface FieldConfig {
  key: string;
  label: string;
  keyboardType: 'numeric' | 'default';
  placeholder?: string;
}

const FIELD_CONFIGS: Record<MonitoringType, FieldConfig[]> = {
  hidrometro: [{ key: 'leitura', label: 'Leitura (m³)', keyboardType: 'numeric', placeholder: '0.0' }],
  pluviometro: [{ key: 'precipitacao', label: 'Precipitação (mm)', keyboardType: 'numeric', placeholder: '0.0' }],
  corrego: [
    { key: 'nivel', label: "Nível d'água (cm)", keyboardType: 'numeric', placeholder: '0.0' },
    { key: 'vazao', label: 'Vazão (m³/s)', keyboardType: 'numeric', placeholder: '0.000' },
  ],
};

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function FormScreen() {
  const { areaId, type, itemId } = useLocalSearchParams<{
    areaId: string;
    type: MonitoringType;
    itemId: string;
  }>();
  const { addReading, getReadingsByItem } = useApp();
  const navigation = useNavigation();

  const [date, setDate] = useState(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fields = FIELD_CONFIGS[type!] ?? [];

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} hitSlop={12}>
          <Text style={[Typography.headline, { color: Colors.black }]}>Salvar</Text>
        </Pressable>
      ),
    });
  }, [date, fieldValues, observacoes]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const raw = fieldValues[field.key] ?? '';
      if (!raw.trim()) {
        errors[field.key] = 'Campo obrigatório';
      } else {
        const num = parseFloat(raw.replace(',', '.'));
        if (isNaN(num) || num < 0) {
          errors[field.key] = 'Informe um número válido';
        }
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const dateStr = toDateString(date);

    // Warn on duplicate date
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
      values[field.key] = parseFloat((fieldValues[field.key] ?? '0').replace(',', '.'));
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

  const maxDate = new Date();

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
        {/* Date Section */}
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

        {/* Dynamic Fields */}
        <View style={styles.section}>
          <Text style={[Typography.caption, styles.sectionLabel]}>DADOS</Text>
          {fields.map((field) => (
            <AppTextInput
              key={field.key}
              label={field.label}
              variant="outlined"
              keyboardType={field.keyboardType}
              placeholder={field.placeholder}
              value={fieldValues[field.key] ?? ''}
              onChangeText={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
              error={fieldErrors[field.key]}
              returnKeyType="next"
            />
          ))}
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

        <Button
          label="Cancelar"
          variant="ghost"
          onPress={() => router.back()}
        />
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
  saveButton: {
    marginBottom: Spacing.sm,
  },
});
