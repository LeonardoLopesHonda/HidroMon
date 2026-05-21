import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function AuthScreen() {
  const { login } = useApp();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    let valid = true;
    if (!email.trim()) {
      setEmailError('Informe o email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Email inválido');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Informe a senha');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const ok = await login(email, password);
    setIsSubmitting(false);
    if (ok) {
      router.replace('/(app)/areas' as never);
    } else {
      setPasswordError('Email ou senha incorretos');
      shake();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('@/assets/images/telos-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.header}>
          <Text style={[Typography.title1, { color: Colors.black }]}>Bem-vindo à Telos</Text>
          <Text style={[Typography.body, { color: Colors.gray500, marginTop: Spacing.xs }]}>
            Entre com sua conta para continuar
          </Text>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateX: shakeX }] }]}>
          <AppTextInput
            label="Email"
            variant="underline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            error={emailError}
          />
          <AppTextInput
            ref={passwordRef}
            label="Senha"
            variant="underline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={passwordError}
          />
        </Animated.View>

        <Button
          label="Entrar"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.button}
        />

        <TouchableOpacity style={styles.hint} activeOpacity={0.6}>
          <Text style={[Typography.footnote, { color: Colors.gray400 }]}>
            Acesso somente para colaboradores Telos
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  form: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  button: {
    marginBottom: Spacing.md,
  },
  hint: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});
