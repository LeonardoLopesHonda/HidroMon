# Expo Build Skill

Handles local builds, EAS cloud builds, and OTA updates for this Expo 54 project.

## Local Development Builds

### Create Development Build (Local)
```bash
# Android
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

### Create Production Build (Local)
```bash
# Android APK
npx expo build:android -t apk

# Android App Bundle (for Play Store)
npx expo build:android -t app-bundle

# iOS (requires macOS)
npx expo build:ios
```

## EAS Build (Cloud)

### Prerequisites
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Initialize EAS in project
eas build:configure
```

### Cloud Builds
```bash
# Development build (includes dev tools)
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview build (for testing)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform android
eas build --profile production --platform ios

# Build for all platforms
eas build --platform all
```

### Check Build Status
```bash
eas build:list
```

## OTA Updates (EAS Update)

### Configure Updates
```bash
eas update:configure
```

### Publish Update
```bash
# Update to development channel
eas update --branch development --message "Description of changes"

# Update to preview channel
eas update --branch preview --message "Description of changes"

# Update to production channel
eas update --branch production --message "Description of changes"
```

### Check Update History
```bash
eas update:list
```

## Common Build Configurations

### eas.json Example
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## Usage

When user invokes `/expo-build`:
1. Ask what type of build they need (development/preview/production)
2. Ask which platform (android/ios/all)
3. Determine if local or EAS cloud build
4. Check if EAS is configured, help configure if needed
5. Run the appropriate build command
