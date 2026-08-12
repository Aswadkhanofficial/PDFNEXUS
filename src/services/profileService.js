import { supabase } from './supabaseClient';

export const AVATAR_BUCKET = 'avatars';

export const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  return user.id;
};

export const updateProfileName = async (fullName) => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId);
  if (error) throw error;
};

export const uploadAvatar = async (file, oldAvatarUrl = null) => {
  const userId = await getCurrentUserId();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  if (oldAvatarUrl && typeof oldAvatarUrl === 'string' && oldAvatarUrl.includes('/avatars/')) {
    const marker = '/avatars/';
    const oldPath = oldAvatarUrl.slice(oldAvatarUrl.indexOf(marker) + marker.length);
    await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId);
  if (dbError) throw dbError;

  return data.publicUrl;
};

export const removeAvatar = async (avatarUrl) => {
  const userId = await getCurrentUserId();
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.includes('/avatars/')) {
    const marker = '/avatars/';
    const oldPath = avatarUrl.slice(avatarUrl.indexOf(marker) + marker.length);
    await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
  }
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (error) throw error;
};