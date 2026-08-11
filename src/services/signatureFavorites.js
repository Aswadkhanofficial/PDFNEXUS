import { supabase } from './supabaseClient';

export async function fetchFavoriteSignatures() {
  const { data, error } = await supabase
    .from('user_favorite_signatures')
    .select('id, text, style, image_base64, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveFavoriteSignature({ text, style, imageBase64 }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to save favorites.');
  const { data, error } = await supabase
    .from('user_favorite_signatures')
    .insert({ user_id: user.id, text, style, image_base64: imageBase64 })
    .select('id, text, style, image_base64, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFavoriteSignature(id) {
  const { error } = await supabase
    .from('user_favorite_signatures')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
