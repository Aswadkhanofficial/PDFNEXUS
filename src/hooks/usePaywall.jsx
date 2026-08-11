import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUsageTracking, DAILY_LIMIT, GUEST_LIMIT } from './useUsageTracking';
import { activatePremium } from '../services/usageService';
import FreeLimit from '../components/FreeLimit';
import UpgradeModal from '../components/UpgradeModal';

/**
 * The interception wrapper every tool page plugs in with
 * `usePaywall('feature', 'label')`. It does NOT change tool logic:
 * pages keep calling `paywall.afterSuccess()` on success and reading
 * `paywall.isLocked` / `paywall.lockedByUser` for UI state.
 *
 * Guest policy: GUEST_LIMIT (3) free actions per feature, tracked in
 * localStorage by useUsageTracking; the FreeLimit signup gate replaces
 * the tool once the budget is exhausted, so the worker never runs again.
 * Member policy: DAILY_LIMIT (3) free actions per tool per day,
 * tracked in Supabase user_usage; the upgrade modal opens on lock.
 */
export function usePaywall(featureName) {
  const { user } = useAuth();
  const { used, remaining, locked, premium, track, refresh } = useUsageTracking(featureName);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const afterSuccess = async () => {
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

  const lockedByUser = !user && locked;

  return {
    used,
    remaining,
    maxUses: user ? DAILY_LIMIT : GUEST_LIMIT,
    isLocked: locked,
    isPremium: premium,
    lockedByUser,
    afterSuccess,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    guestLockScreen: lockedByUser ? <FreeLimit /> : null,
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