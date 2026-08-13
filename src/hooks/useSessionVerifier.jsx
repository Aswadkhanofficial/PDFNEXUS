import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export function useSessionVerifier() {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyActiveUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          await supabase.auth.signOut();
          navigate('/login');
        }
      }
    };

    verifyActiveUser();
  }, [navigate]);
}