import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface BentoCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function BentoCard({ children, className = '', noPadding = false, ...props }: BentoCardProps) {
  return (
    <motion.div
      className={`os-card ${noPadding ? '' : 'p-6 lg:p-8'} ${className}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      {...props}
    >
      {/* 6-Layer depth is handled primarily by .os-card CSS class, 
          but we can add a subtle noise layer specific to the card if desired.
          Right now we rely on the global os-noise. */}
      
      {/* Highlight/glow layer on hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      />
      
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}
