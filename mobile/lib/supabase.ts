import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo Web with `output: "static"` pre-renders in Node where `window` is undefined.
// AsyncStorage's web build then crashes ("window is not defined"). Detect Node SSR
// and substitute a no-op storage — real storage is restored in Hermes + browser.
const isNodeSSR =
  typeof window === 'undefined' &&
  typeof document === 'undefined' &&
  typeof process !== 'undefined' &&
  typeof (process as { versions?: { node?: string } }).versions?.node === 'string';

const noopStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
};

const storage = isNodeSSR ? noopStorage : AsyncStorage;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check mobile/.env.'
  );
}

// @supabase/realtime-js v2 throws at constructor time if no WebSocket is available
// (Node < 22 in SSR/static-render passes). We don't use realtime, so feed it a no-op
// when WebSocket isn't globally defined. Browsers + Hermes have real WebSocket.
class NoopWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 3;
  url: string;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

const wsTransport: unknown =
  typeof WebSocket !== 'undefined' ? WebSocket : NoopWebSocket;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: !isNodeSSR,
    persistSession: !isNodeSSR,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: wsTransport as never,
  },
});
