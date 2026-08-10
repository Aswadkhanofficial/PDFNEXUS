import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsage, trackUsage, activatePremium } from '../services/usageService';
import FreeLimit from '../components/FreeLimit';
import PremiumModal from '../components/PremiumModal';

const MAX_FREE_USES = 3;
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

export function usePaywall(featureName, featureLabel = 'uses') {
  const { user } = useAuth();
  const [localCount, setLocalCount] = useState(() => readLocal(featureName));
  const [usage, setUsage] = useState({ used: 0, remaining: MAX_FREE_USES, locked: false, premium: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  useEffect(() => {
    if (!user) return;
    getUsage(featureName)
      .then((u) => {
        if (!u) return;
        setUsage(u);
        if (u.locked) setIsModalOpen(true);
      })
      .catch(() => {});
  }, [user, featureName]);

  const afterSuccess = async () => {
    if (!user) {
      const next = localCount + 1;
      setLocalCount(next);
      writeLocal(featureName, next);
      return;
    }
    try {
      const u = await trackUsage(featureName);
      if (u) {
        setUsage(u);
        if (u.locked) setIsModalOpen(true);
      }
    } catch {
      /* server hiccup - never block the happy path */
    }
  };

  const upgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError('');
    try {
      await activatePremium();
      const u = await getUsage(featureName);
      if (u) setUsage(u);
    } catch (error) {
      setUpgradeError(error.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  const guestLocked = !user && localCount >= MAX_FREE_USES;
  const hasPremium = user ? usage.premium : false;

  return {
    used: user ? usage.used : localCount,
    remaining: user ? usage.remaining : Math.max(0, MAX_FREE_USES - localCount),
    maxUses: MAX_FREE_USES,
    isLocked: user ? usage.locked : guestLocked,
    isPremium: hasPremium,
    lockedByUser: guestLocked,
    afterSuccess,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    guestLockScreen: guestLocked ? <FreeLimit featureLabel={featureLabel} maxUses={MAX_FREE_USES} /> : null,
    premiumModal: user ? (
      <PremiumModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpgrade={upgrade}
        isUpgrading={isUpgrading}
        upgradeError={upgradeError}
        used={usage.used}
        maxUses={MAX_FREE_USES}
        isPremium={hasPremium}
      />
    ) : null,
  };
}