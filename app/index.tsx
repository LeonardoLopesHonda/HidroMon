import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { useApp } from '@/context/AppContext';

const MIN_DISPLAY_MS = 2200;

export default function SplashScreen() {
  const { user, isAuthLoading } = useApp();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const navigated = useRef(false);

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 8, bounciness: 6, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (isAuthLoading || navigated.current) return;

    const navigate = () => {
      if (navigated.current) return;
      navigated.current = true;

      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        if (user) {
          router.replace('/(app)/areas' as never);
        } else {
          router.replace('/auth' as never);
        }
      });
    };

    const timer = setTimeout(navigate, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [isAuthLoading, user]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={require('@/assets/images/telos-logo.png')}
          style={styles.logo}
          tintColor="white"
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});
