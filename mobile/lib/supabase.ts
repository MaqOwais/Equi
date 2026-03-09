import { DEV_MODE } from '../constants/dev';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: any;

if (DEV_MODE) {
  // Local SQLite client — no network or OTP needed during development
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _supabase = require('./dev-db').devClient;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local',
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = _supabase;
