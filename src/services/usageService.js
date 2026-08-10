import { supabase } from './supabaseClient';

export const getUsage = async (feature) => {
  const { data, error } = await supabase.rpc('get_usage', { p_feature: feature });
  if (error) throw error;
  return data?.[0] ?? null;
};

export const trackUsage = async (feature) => {
  const { data, error } = await supabase.rpc('track_usage', { p_feature: feature });
  if (error) throw error;
  return data?.[0] ?? null;
};

export const activatePremium = async () => {
  const { data, error } = await supabase.rpc('activate_premium_trial');
  if (error) throw error;
  return data;
};