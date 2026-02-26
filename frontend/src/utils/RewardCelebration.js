import confetti from 'canvas-confetti';
import { toast } from 'react-toastify';
import { BADGES } from './gamificationConstants';

export const triggerConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    );
  }, 250);
};

export const handleGamificationReward = (gamification) => {
  if (!gamification) return;

  if (gamification.xpGained > 0 && gamification.xpGained > 10) {
      toast.success(`🎉 +${gamification.xpGained} XP Earned!`, { icon: '✨' });
  }

  if (gamification.levelUp) {
      triggerConfetti();
      toast.success(`🏆 Level Up! You are now Level ${gamification.newLevel}!`, { duration: 5000, icon: '🌟' });
  }

  if (gamification.newBadges && gamification.newBadges.length > 0) {
      triggerConfetti();
      gamification.newBadges.forEach(badgeId => {
          const badgeInfo = BADGES.find(b => b.id === badgeId);
          if (badgeInfo) {
              toast.success(`🏅 New Badge Unlocked: ${badgeInfo.name} ${badgeInfo.icon}`, { duration: 5000 });
          }
      });
  }
};
