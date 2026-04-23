# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Start Expo development server
npm start

# Run on specific platforms
npm run android        # Android emulator
npm run ios           # iOS simulator
npm run web           # Web browser

# Code quality
npm run lint          # Run ESLint

# Reset to blank starter state
npm run reset-project
```

**Package Manager:** Bun (lock file: `bun.lock`), though npm commands work.

**Starting Development:**
1. `npm install` (or `bun install`)
2. `npm start`
3. Press `w` for web, `a` for Android, `i` for iOS, or scan QR with Expo Go

## Architecture

**Stack:** React Native 0.81 + Expo 54 + TypeScript + Expo Router (file-based routing)

### Routing Structure

Routes are defined by file structure in `/app`:
- `app/_layout.tsx` - Root layout with theme provider and stack navigation
- `app/(tabs)/` - Tab group containing bottom tab screens
- `app/(tabs)/_layout.tsx` - Tab navigator configuration
- `app/modal.tsx` - Modal screen presentation

### Theming System

- Light/dark mode support via `useColorScheme()` hook
- Theme colors defined in `constants/theme.ts`
- `useThemeColor()` hook resolves colors based on current theme
- Components `ThemedText` and `ThemedView` for consistent theming

### Platform-Specific Code

- Use `.ios.tsx` and `.web.ts` suffixes for platform-specific implementations
- Example: `components/ui/icon-symbol.tsx` (default) vs `icon-symbol.ios.tsx` (iOS-specific)
- Hooks have web variants: `hooks/use-color-scheme.web.ts`

### Component Organization

- `/components` - Reusable UI components
- `/components/ui` - Lower-level UI primitives (icons, collapsible)
- `/hooks` - Custom React hooks for theming and platform detection
- `/constants` - Theme colors and fonts

### Key Patterns

- Animations use `react-native-reanimated` (parallax scrolling, wave animation)
- Haptic feedback via `expo-haptics` (iOS only)
- External links open in-app browser on native via `expo-web-browser`
- Path alias `@/*` maps to project root

## Testing

No test infrastructure is currently configured. Tests would need to be added.
