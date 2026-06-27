import { Variants } from 'framer-motion';

export const AnimationPresets = {
  // Container animations
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },

  // Item animations
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },

  itemScale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },

  itemSlideRight: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },

  // Chart animations
  chartPath: {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 2, ease: 'easeInOut' },
    },
  },

  // Data point animations
  dataPoint: {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 12,
      },
    },
  },

  // Glow pulse
  glowPulse: {
    animate: {
      boxShadow: [
        '0 0 10px rgba(168, 85, 247, 0.5)',
        '0 0 30px rgba(168, 85, 247, 0.8)',
        '0 0 10px rgba(168, 85, 247, 0.5)',
      ],
    },
    transition: { duration: 2, repeat: Infinity },
  },

  // Bounce in
  bounceIn: {
    hidden: { scale: 0.3, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  },
} as Record<string, Variants>;

// Spring transitions for natural motion
export const SpringTransitions = {
  gentle: { type: 'spring', stiffness: 100, damping: 15 },
  bouncy: { type: 'spring', stiffness: 300, damping: 10 },
  molasses: { type: 'spring', stiffness: 50, damping: 20 },
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
};
