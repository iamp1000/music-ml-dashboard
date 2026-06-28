"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BentoCard } from '../effects/BentoCard';

export function AIInsightHero({ history }: { history?: any[] }) {
  const { headline, subtitle } = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        headline: "Awaiting Neural Data",
        subtitle: "Play some tracks and your AI pattern insights will appear here."
      };
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let todayValenceSum = 0, todayCount = 0;
    let yesterdayValenceSum = 0, yesterdayCount = 0;
    
    const artistCounts: Record<string, number> = {};
    let todayEnergySum = 0;

    history.forEach(t => {
      const d = new Date(t.time);
      if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) {
        todayValenceSum += (t.valence ?? 0.5);
        todayEnergySum += (t.energy ?? 0.5);
        todayCount++;
        if (t.artist_name) artistCounts[t.artist_name] = (artistCounts[t.artist_name] || 0) + 1;
      } else if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) {
        yesterdayValenceSum += (t.valence ?? 0.5);
        yesterdayCount++;
      }
    });

    const topArtist = Object.keys(artistCounts).length > 0 
      ? Object.entries(artistCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] 
      : "various artists";

    const avgTodayEnergy = todayCount > 0 ? todayEnergySum / todayCount : 0.5;
    const moodDesc = avgTodayEnergy > 0.7 ? "high-energy" : avgTodayEnergy < 0.3 ? "ambient & reflective" : "balanced";

    let hl = "perfectly consistent";
    if (todayCount > 0 && yesterdayCount > 0) {
      const vToday = todayValenceSum / todayCount;
      const vYesterday = yesterdayValenceSum / yesterdayCount;
      const diff = vToday - vYesterday;
      
      if (Math.abs(diff) < 0.05) hl = "perfectly consistent";
      else if (diff > 0) hl = `${Math.round(diff * 100)}% more upbeat`;
      else hl = `${Math.round(Math.abs(diff) * 100)}% calmer`;
    } else if (todayCount > 0) {
      hl = "establishing a baseline";
    }

    return {
      headline: hl,
      subtitle: `Gravitating toward ${topArtist} with a ${moodDesc} sonic profile.`
    };

  }, [history]);

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
            Your music today was <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{headline}</span>{headline !== "Awaiting Neural Data" && headline !== "establishing a baseline" && " than yesterday"}
          </h1>
        </motion.div>
        
        <motion.p 
          className="text-[var(--theme-text-muted)] text-lg md:text-xl max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {subtitle}
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
