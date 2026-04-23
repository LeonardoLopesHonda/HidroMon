# React Native Screen Skill

Creates screens and routes using Expo Router's file-based routing system.

## Project Routing Structure

This project uses Expo Router with file-based routing:
- `app/_layout.tsx` - Root layout with theme provider and stack navigation
- `app/(tabs)/` - Tab group containing bottom tab screens
- `app/(tabs)/_layout.tsx` - Tab navigator configuration
- `app/modal.tsx` - Modal screen presentation

## Screen Templates

### Basic Tab Screen
Location: `app/(tabs)/screen-name.tsx`
```tsx
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ScreenNameScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Screen Title</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Screen with ScrollView
```tsx
import { StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ScreenNameScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">Screen Title</ThemedText>
        {/* Screen content */}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
```

### Modal Screen
Location: `app/modal-name.tsx`
```tsx
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ModalNameModal() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Modal Title</ThemedText>
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style="light" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Dynamic Route Screen
Location: `app/[id].tsx` or `app/(tabs)/[slug].tsx`
```tsx
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function DynamicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Item {id}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

## Adding a Tab to Navigation

Edit `app/(tabs)/_layout.tsx`:
```tsx
<Tabs.Screen
  name="screen-name"
  options={{
    title: 'Screen Title',
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="icon.name" color={color} />,
  }}
/>
```

## Navigation

```tsx
import { Link, router } from 'expo-router';

// Link component
<Link href="/screen-name">Go to Screen</Link>

// Programmatic navigation
router.push('/screen-name');
router.replace('/screen-name');
router.back();

// Navigate to modal
router.push('/modal-name');

// Navigate with params
router.push(`/details/${itemId}`);
```

## Usage

When user invokes `/rn-screen`:
1. Ask for screen name and purpose
2. Determine screen type (tab screen, modal, dynamic route, or standalone)
3. Create the screen file in appropriate location
4. If it's a tab screen, offer to update the tab navigator layout
5. Follow project's existing patterns for theming and styling
