import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function AppLayout() {
  const { user, isAuthLoading, isBootstrapping, bootstrapError, retryBootstrap } = useApp();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/auth' as never);
    }
  }, [user, isAuthLoading]);

  if (user && isBootstrapping) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.black} />
        <Text style={[Typography.body, { color: Colors.gray500, marginTop: Spacing.md }]}>
          Sincronizando dados iniciais…
        </Text>
      </View>
    );
  }

  if (user && bootstrapError) {
    return (
      <View style={styles.center}>
        <Text style={[Typography.headline, { color: Colors.black, marginBottom: Spacing.sm }]}>
          Falha ao carregar dados
        </Text>
        <Text
          style={[Typography.body, { color: Colors.gray500, textAlign: 'center', marginBottom: Spacing.lg }]}
        >
          {bootstrapError}
        </Text>
        <TouchableOpacity onPress={retryBootstrap} style={styles.retryBtn} activeOpacity={0.7}>
          <Text style={[Typography.headline, { color: Colors.white }]}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: '',
        headerShadowVisible: false,
        headerTintColor: Colors.black,
        headerStyle: { backgroundColor: Colors.white },
        headerTitleStyle: { color: Colors.black, fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray100 },
      }}
    >
      <Stack.Screen name="areas" options={{ headerShown: false }} />
      <Stack.Screen name="[areaId]/index" options={{ title: '' }} />
      <Stack.Screen name="[areaId]/[type]/index" options={{ title: '' }} />
      <Stack.Screen name="[areaId]/[type]/[itemId]/index" options={{ title: '' }} />
      <Stack.Screen name="[areaId]/[type]/[itemId]/form" options={{ title: 'Nova Leitura' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
  },
  retryBtn: {
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 10,
  },
});
