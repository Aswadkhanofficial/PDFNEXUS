import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://temohfwmgbzneehibgfv.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbW9oZndtZ2J6bmVlaGliZ2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDU4MzAsImV4cCI6MjEwMTkyMTgzMH0.c_jeWeBCflMwjC3AmK5b9vldeXJTKrXf4aBoNaqNOLQ';

export const REMEMBER_ME_KEY = 'pdfnexus_remember_me';

const isRemembered = () => localStorage.getItem(REMEMBER_ME_KEY) !== 'false';

function buildClient() {
  const remember = isRemembered();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: remember ? localStorage : sessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export let supabase = buildClient();

export function setRememberMe(remember) {
  localStorage.setItem(REMEMBER_ME_KEY, String(remember));
  if (!remember) {
    // Clear any legacy session left in localStorage so it can't survive the tab.
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`))
      .forEach((k) => localStorage.removeItem(k));
  }
  supabase = buildClient();
}