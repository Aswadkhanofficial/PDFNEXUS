import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

export default function GlobalAuthListener() {
  // StrictMode guard: Prevents the double-mount race condition
  const isSubscribed = useRef(false);

  useEffect(() => {
    let profileChannel = null;

    const nukeSession = async () => {
      console.log("☠️ NUKE TRIGGERED: Destroying session!");
      await supabase.auth.signOut();
      for (let key in localStorage) {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      }
      window.location.href = '/login'; 
    };

    const initListener = async () => {
      if (isSubscribed.current) return;
      isSubscribed.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await nukeSession();
        return;
      }

      console.log("🎧 Global Listener Active for User:", user.id);

      // 1. Get both is_banned AND location from the database
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, location')
        .eq('id', user.id)
        .single();

      if (profile?.is_banned && window.location.pathname !== '/banned') {
        window.location.href = '/banned';
        return;
      }

      // 2. 🔥 THE LOCATION FIX: Fetch and save location if it is missing in the database
      if (profile && !profile.location) {
        fetch('https://ipwho.is/')
          .then(res => res.json())
          .then(async (data) => {
            if (data.success && data.city && data.country) {
              const loc = `${data.city}, ${data.country}`;
              await supabase.from('profiles').update({ location: loc }).eq('id', user.id);
              console.log("📍 Location captured and saved to Database:", loc);
            }
          })
          .catch(err => console.warn("Location fetch blocked:", err.message));
      }

      const uniqueChannelName = `profile_watcher_${user.id}_${Date.now()}`;

      profileChannel = supabase.channel(uniqueChannelName)
        .on('postgres_changes', {
          event: '*', 
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log("🔥 REALTIME EVENT RECEIVED:", payload);
          if (payload.eventType === 'DELETE') {
            nukeSession();
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_banned === true && window.location.pathname !== '/banned') {
              window.location.href = '/banned';
            }
          }
        })
        .subscribe();
    };

    initListener();

    return () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      isSubscribed.current = false;
    };
  }, []);

  return null;
}