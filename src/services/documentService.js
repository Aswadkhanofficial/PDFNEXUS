import { supabase } from './supabaseClient';

const BUCKET = 'documents';

const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to save documents.');
  return user.id;
};

export const saveDocument = async (file, displayName) => {
  const userId = await getCurrentUserId();
  const safeName = displayName.replace(/[^\w.-]+/g, '_');
  const filePath = `${userId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from('user_documents')
    .insert({ user_id: userId, file_name: displayName, file_url: filePath, file_size: file.size });
  if (insertError) throw insertError;

  return filePath;
};

export const listDocuments = async () => {
  const { data, error } = await supabase
    .from('user_documents')
    .select('id, file_name, file_size, file_url, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const downloadDocument = async (doc) => {
  const { data, error } = await supabase.storage.from(BUCKET).download(doc.file_url);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.file_name;
  link.click();
  URL.revokeObjectURL(url);
};

export const deleteDocument = async (doc) => {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.file_url]);
  if (storageError) throw storageError;

  const { error: dbError } = await supabase.from('user_documents').delete().eq('id', doc.id);
  if (dbError) throw dbError;
};