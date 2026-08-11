import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal, { AI_GATE_MESSAGE } from '../components/AuthModal';

/**
 * Strict auth gate for AI actions. Call `gate()` before running any AI
 * logic: it returns `true` only when a session exists. Guests get the
 * login/signup modal and the guarded code is never executed — no API
 * call, no logic. Pure gate; wire it into AI entry points as needed.
 */
export function useAIGate(message = AI_GATE_MESSAGE) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const gate = () => {
    if (user) return true;
    setOpen(true);
    return false;
  };

  return {
    isAuthed: !!user,
    gate,
    openGate: () => setOpen(true),
    closeGate: () => setOpen(false),
    gateModal: <AuthModal open={open} onClose={() => setOpen(false)} message={message} />,
  };
}