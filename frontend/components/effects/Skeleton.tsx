import { motion } from 'framer-motion';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundImage: `linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 50%,
          transparent 100%
        )`,
        backgroundSize: '200% 100%',
      }}
    />
  );
}
