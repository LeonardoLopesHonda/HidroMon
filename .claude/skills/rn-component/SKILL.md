# React Native Component Skill

Creates React Native components following this project's established patterns.

## Project Patterns

This project uses:
- TypeScript for all components
- `ThemedText` and `ThemedView` for themed components
- `useThemeColor()` hook for dynamic colors
- `useColorScheme()` for light/dark mode detection
- Theme colors defined in `constants/theme.ts`
- `react-native-reanimated` for animations
- Platform-specific files with `.ios.tsx`, `.android.tsx`, `.web.ts` suffixes

## Component Templates

### Basic Themed Component
```tsx
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface ComponentNameProps {
  title: string;
}

export function ComponentName({ title }: ComponentNameProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>{title}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Component with Custom Theme Colors
```tsx
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ComponentNameProps {
  title: string;
}

export function ComponentName({ title }: ComponentNameProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText style={{ color: textColor }}>{title}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

### Animated Component
```tsx
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';

interface AnimatedComponentProps {
  children: React.ReactNode;
}

export function AnimatedComponent({ children }: AnimatedComponentProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Platform-Specific Component
For components needing platform-specific implementations:
- `ComponentName.tsx` - Default/Android implementation
- `ComponentName.ios.tsx` - iOS-specific implementation
- `ComponentName.web.ts` - Web-specific implementation

## File Locations

- Reusable UI components: `/components/`
- Low-level UI primitives: `/components/ui/`
- Custom hooks: `/hooks/`

## Usage

When user invokes `/rn-component`:
1. Ask for component name and purpose
2. Determine if it needs theming, animation, or platform-specific code
3. Create the component file in appropriate directory
4. Follow project's existing patterns for imports and styling
5. Export from index file if one exists
