import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsageTracking, DAILY_LIMIT } from './useUsageTracking';
import { activatePremium } from '../services/usageService';
import FreeLimit from '../components/FreeLimit';
import UpgradeModal from '../components/UpgradeModal';

export const GUEST_FREE_ACTIONS = 1;
const STORAGE_KEY = 'pdfnexus_usage';

const readLocal = (featureName) => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const usageData = storedData ? JSON.parse(storedData) : {};
    return usageData[featureName] || 0;
  } catch {
    return 0;
  }
};

const writeLocal = (featureName, count) => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const usageData = storedData ? JSON.parse(storedData) : {};
    usageData[featureName] = count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usageData));
  } catch {
    /* storage unavailable - guest tracking is best-effort */
  }
};

/**
 * The interception wrapper every tool page plugs in with
 * `usePaywall('feature', 'label')`. It does NOT change tool logic:
 * pages keep calling `paywall.afterSuccess()` on success and reading
 * `paywall.isLocked` / `paywall.lockedByUser` for UI state.
 *
 * Guest policy: 1 free action, then the login/signup gate
 * (FreeLimit) replaces the tool on the next entry — the in-progress
 * result download is never yanked away.
 * Member policy: DAILY_LIMIT (3) free actions per tool per day,
 * tracked in Supabase user_usage; the upgrade modal opens on lock.
 */
export function usePaywall(featureName, featureLabel = 'uses') {
  const { user } = useAuth();
  const { used, remaining, locked, premium, track, refresh } = useUsageTracking(featureName);
  const [entryLocalCount] = useState(() => readLocal(featureName));
  const [localCount, setLocalCount] = useState(() => readLocal(featureName));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const afterSuccess = async () => {
    if (!user) {
      setLocalCount((prev) => {
        const next = prev + 1;
        writeLocal(featureName, next);
        return next;
      });
      return;
    }
    const u = await track();
    if (u?.locked) setIsModalOpen(true);
  };

  const upgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError('');
    try {
      await activatePremium();
      await refresh();
      setIsModalOpen(false);
    } catch (error) {
      setUpgradeError(error.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  const guestLockedOnEntry = !user && entryLocalCount >= GUEST_FREE_ACTIONS;

  return {
    used: user ? used : localCount,
    remaining: user ? remaining : Math.max(0, GUEST_FREE_ACTIONS - localCount),
    maxUses: user ? DAILY_LIMIT : GUEST_FREE_ACTIONS,
    isLocked: user ? locked : guestLockedOnEntry,
    isPremium: user ? premium : false,
    lockedByUser: guestLockedOnEntry,
    afterSuccess,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    guestLockScreen: guestLockedOnEntry ? <FreeLimit featureLabel={featureLabel} /> : null,
    premiumModal: user ? (
      <UpgradeModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpgrade={upgrade}
        isUpgrading={isUpgrading}
        upgradeError={upgradeError}
        isPremium={premium}
      />
    ) : null,
  };
}