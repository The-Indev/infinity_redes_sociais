import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let client = null;

export function getSupabase() {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Supabase não configurado. Em dev defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env; em produção, SUPABASE_URL / SUPABASE_ANON_KEY no container.'
    );
  }
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    db: { schema: config.supabaseSchema },
    auth: { persistSession: false }
  });
  return client;
}
