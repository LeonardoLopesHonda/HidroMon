# React Native Debug Skill

Provides debugging commands and helps resolve common React Native + Expo issues.

## Debugging Tools

### Open React DevTools
```bash
npx react-devtools
```

### Open Debugger (in dev server)
Press `j` in the terminal running the dev server.

### View Logs

**Metro Bundler Logs:**
```bash
npx expo start
# Logs appear in terminal
```

**Android Logs:**
```bash
npx react-native log-android
# Or use adb:
adb logcat *:S ReactNative:V ReactNativeJS:V
```

**iOS Logs:**
```bash
npx react-native log-ios
```

## Common Issues and Solutions

### 1. Metro Bundler Cache Issues
**Symptoms:** Stale code, imports not found, unexpected behavior
```bash
# Clear Metro cache and restart
npx expo start --clear

# Nuclear option - clear all caches
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

### 2. Dependencies Issues
**Symptoms:** Module not found, version conflicts
```bash
# Reinstall dependencies
rm -rf node_modules
rm bun.lock  # or package-lock.json
bun install  # or npm install

# Check for Expo compatibility issues
npx expo-doctor
```

### 3. Android Emulator Issues
**Symptoms:** App not installing, emulator not detected
```bash
# List connected devices
adb devices

# Restart ADB server
adb kill-server
adb start-server

# Clear app data on device
adb shell pm clear com.yourapp.package
```

### 4. iOS Simulator Issues
**Symptoms:** Build failures, simulator not launching
```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reset iOS simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

### 5. TypeScript Errors
**Symptoms:** Type errors in IDE but app runs
```bash
# Run type check
npx tsc --noEmit

# Check for path alias issues in tsconfig.json
```

### 6. Hot Reload Not Working
**Symptoms:** Changes not reflecting
1. Shake device / Cmd+D (iOS) / Cmd+M (Android emulator)
2. Enable "Fast Refresh"
3. Try full reload with `r` in terminal

### 7. Network Request Failures
**Symptoms:** API calls failing on device
- Check if using `localhost` (won't work on physical devices)
- Use your machine's IP address instead
- For Android emulator, use `10.0.2.2` for localhost
- Check CORS settings for web

### 8. Expo Go Compatibility
**Symptoms:** Feature not working in Expo Go
```bash
# Check if using features requiring custom dev client
npx expo-doctor

# Create development build if needed
npx expo run:android
npx expo run:ios
```

## Performance Debugging

### Enable Performance Monitor
Shake device -> "Show Performance Monitor"

### Profile with Flipper
```bash
# Install Flipper desktop app
# Then in app, enable Flipper in dev menu
```

### Check Bundle Size
```bash
npx expo export --platform web
# Check .expo/web/dist folder size
```

## Project-Specific Checks

### Run Linter
```bash
npm run lint
```

### Check Expo SDK Compatibility
```bash
npx expo-doctor
```

### Verify Expo Config
```bash
npx expo config
```

## Usage

When user invokes `/rn-debug`:
1. Ask what issue they're experiencing
2. Suggest relevant debugging commands
3. Help interpret error messages
4. Provide step-by-step troubleshooting for common issues
5. Check logs and suggest fixes
