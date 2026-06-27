import { motion } from 'framer-motion';
import React from 'react';

interface GlowBorderProps {
  children: React.ReactNode;
  color?: 'purple' | 'blue' | 'pink' | 'cyan';
  className?: string;
}

export function GlowBorder({
  children,
  color = 'purple',
  className = '',
}: GlowBorderProps) {
  const colorMap = {
    purple: { outer: '#a855f7', inner: 'rgba(168, 85, 247, 0.2)' },
    blue: { outer: '#3b82f6', inner: 'rgba(59, 130, 246, 0.2)' },
    pink: { outer: '#ec4899', inner: 'rgba(236, 72, 153, 0.2)' },
    cyan: { outer: '#06b6d4', inner: 'rgba(6, 182, 212, 0.2)' },
  };

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{
        boxShadow: `0 0 30px ${colorMap[color].outer}`,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          boxShadow: [
            `0 0 20px ${colorMap[color].outer}`,
            `0 0 40px ${colorMap[color].outer}`,
            `0 0 20px ${colorMap[color].outer}`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
