import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/theme';

export default function AppLayout() {
  const { user, isAuthLoading } = useApp();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/auth' as never);
    }
  }, [user, isAuthLoading]);

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
