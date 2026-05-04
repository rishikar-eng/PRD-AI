/**
 * SPEC: db.js
 * Purpose: Supabase client singleton for all database operations
 * Inputs: None — reads SUPABASE_URL and SUPABASE_SERVICE_KEY from env
 * Outputs: Exports createClient instance
 * Side effects: None
 * Error states: Throws if env vars missing when client is used
 */
import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!supabaseClient) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
      }
      supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    }
    return supabaseClient[prop];
  }
});
