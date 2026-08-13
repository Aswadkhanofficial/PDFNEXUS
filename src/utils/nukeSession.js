import { supabase } from '../services/supabaseClient';

export const nukeSession = async () => {
  await supabase.auth.signOut();

  for (let key in localStorage) {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  }

  window.location.href = '/login';
};