"use client";
import React, { ReactNode, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
  borderless?: boolean; // New prop for room mode
}

export const BentoCard = ({ children, className = '', delay = 0, noPadding = false, borderless = false }: BentoCardProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay, ease: "easeOut" }
    });
  }, [controls, delay]);

  const baseClasses = borderless 
    ? "relative w-full overflow-hidden transition-all duration-300"
    : "relative w-full bg-[var(--theme-panel)] rounded-3xl overflow-hidden border border-[var(--theme-border)] shadow-xl transition-all duration-300 hover:border-[var(--theme-accent)]/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
      className={`${baseClasses} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={borderless ? {} : { y: -2 }}
    >
      {/* Subtle 3D dynamic lighting effect behind content */}
      {isHovered && !borderless && (
        <div 
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100 z-0"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168, 85, 247, 0.1), transparent 40%)`,
          }}
        />
      )}
      
      {borderless && isHovered && (
         <div 
         className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 hover:opacity-100 z-0 mix-blend-screen"
         style={{
           background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.05), transparent 50%)`,
         }}
       />
      )}

      <div className={`relative z-10 w-full h-full ${noPadding ? '' : 'p-6 md:p-8'}`}>
        {children}
      </div>
    </motion.div>
  );
};
