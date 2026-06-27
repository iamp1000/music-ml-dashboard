"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BentoCard } from '../effects/BentoCard';

export function AIInsightHero() {
  return (
    <BentoCard className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[400px] flex flex-col justify-center items-center relative overflow-hidden group">
      
      {/* Background glowing orb / Neural core */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-40 mix-blend-screen pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,1) 0%, rgba(59,130,246,0.5) 50%, rgba(0,0,0,0) 100%)"
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="z-10 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[var(--theme-accent)] text-xs font-bold tracking-[0.2em] uppercase mb-4 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            AI Pattern Detected
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Your music today was <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">34% calmer</span> than yesterday
          </h1>
        </motion.div>
        
        <motion.p 
          className="text-[var(--theme-text-muted)] text-lg md:text-xl max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Transitioning from high-energy EDM in the morning to ambient soundscapes. You are currently entering a deep focus state.
        </motion.p>
      </div>
      
      {/* Micro-particles floating around */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1
            }}
            animate={{
              y: [0, Math.random() * -100 - 50],
              x: [0, (Math.random() - 0.5) * 50],
              opacity: [0, Math.random() * 0.5 + 0.1, 0]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>
    </BentoCard>
  );
}
