"use client";

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

let _client: SupabaseClient | null = null;

// Cookie-based storage so server actions and middleware can read the session.
// The supabase-js default (localStorage) is invisible to the server.
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const encoded = encodeURIComponent(key);
    for (const part of document.cookie.split('; ')) {
      if (part.startsWith(`${encoded}=`) || part.startsWith(`${key}=`)) {
        const raw = part.slice(part.indexOf('=') + 1);
        try { return decodeURIComponent(raw); } catch { return raw; }
      }
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${key}=${encodeURIComponent(value)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax${secure}`;
  },
  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${key}=; max-age=0; path=/; SameSite=Lax`;
  },
};

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createClient<Database>(url, key, {
      auth: {
        storage: cookieStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
