# Expo Start Skill

Manages Expo development server for this React Native 0.81 + Expo 54 project.

## Commands

### Start Development Server
```bash
npm start
# Or with bun:
bun start
```

### Platform-Specific Commands
After starting the dev server, use these keys:
- `w` - Open in web browser
- `a` - Open on Android emulator
- `i` - Open on iOS simulator
- `r` - Reload app
- `m` - Toggle menu
- `j` - Open debugger

### Direct Platform Commands
```bash
npm run web       # Start directly on web
npm run android   # Start directly on Android
npm run ios       # Start directly on iOS
```

### Clear Cache and Restart
```bash
npx expo start --clear
```

### Start with Tunnel (for physical devices on different networks)
```bash
npx expo start --tunnel
```

### Start on Specific Port
```bash
npx expo start --port 8082
```

## Troubleshooting

### Metro Bundler Issues
```bash
# Kill Metro and restart
npx expo start --clear

# If port is in use
npx expo start --port 8082
```

### Expo Go Connection Issues
1. Ensure device and computer are on same network
2. Use `--tunnel` flag for cross-network access
3. Check firewall settings

### Reset Project to Blank State
```bash
npm run reset-project
```

## Usage

When user invokes `/expo-start`:
1. Ask which platform they want to target (web/android/ios/all)
2. Check if they need cache clearing
3. Run the appropriate command
4. Provide QR code scanning instructions for physical devices
