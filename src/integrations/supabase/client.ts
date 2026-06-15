import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createClient<Database>(url, key, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

// Proxy so all existing `supabase.auth.xxx` calls work without changes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
