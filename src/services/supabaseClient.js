import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://temohfwmgbzneehibgfv.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbW9oZndtZ2J6bmVlaGliZ2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDU4MzAsImV4cCI6MjEwMTkyMTgzMH0.c_jeWeBCflMwjC3AmK5b9vldeXJTKrXf4aBoNaqNOLQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);