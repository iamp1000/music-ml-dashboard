// ============================================
// ENHANCED COMPONENTS WITH ADVANCED EFFECTS
// ============================================

// 1. ENHANCED BioOptimizationGraph
// ============================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

const EnhancedBioOptimizationGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{time: number, hr: number, reward: number}[]>([]);
  const [latestData, setLatestData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket("wss://music-ml-dashboard.onrender.com/ws/stream/live");
    let t = 0;
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.telemetry) {
        const newPoint = { time: t++, hr: parsed.telemetry.hr, reward: parsed.telemetry.reward };
        setLatestData(newPoint);
        setData(prev => {
          const newData = [...prev, newPoint];
          return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
        });
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(data, d => d.time) || 0;
    const xMax = d3.max(data, d => d.time) || 19;
    
    const xScale = d3.scaleLinear().domain([xMin, Math.max(xMax, 19)]).range([0, innerWidth]);
    const yHrScale = d3.scaleLinear().domain([50, 100]).range([innerHeight, 0]);
    const yRewardScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // GRADIENT DEFINITIONS
    const defs = svg.append('defs');
    
    // Reward gradient
    defs.append('linearGradient')
      .attr('id', 'rewardGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#8B5CF6', opacity: 0.6 },
        { offset: '100%', color: '#8B5CF6', opacity: 0 }
      ])
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)
      .attr('stop-opacity', d => d.opacity);

    // ANIMATED GRID
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yHrScale).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove());

    // LINE GENERATORS
    const hrLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yHrScale(d.hr));

    const rewardLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yRewardScale(d.reward));

    // REWARD LINE WITH GLOW (Primary)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8B5CF6')
      .attr('stroke-width', 4)
      .attr('d', rewardLine)
      .attr('filter', 'drop-shadow(0px 0px 12px rgba(139, 92, 246, 0.8))')
      .attr('opacity', 0.8);

    // AREA UNDER REWARD LINE
    const area = d3.area<any>()
      .x(d => xScale(d.time))
      .y0(innerHeight)
      .y1(d => yRewardScale(d.reward))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#rewardGradient)')
      .attr('d', area)
      .attr('opacity', 0.6);

    // HR LINE (Secondary - dashed)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10B981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8,4')
      .attr('d', hrLine)
      .attr('opacity', 0.7);

    // ANIMATED DATA POINTS ON REWARD LINE
    g.selectAll('.reward-point')
      .data(data.slice(-5))
      .join('circle')
      .attr('class', 'reward-point')
      .attr('cx', d => xScale(d.time))
      .attr('cy', d => yRewardScale(d.reward))
      .attr('r', (_, i) => 2 + (i * 1.5))
      .attr('fill', '#8B5CF6')
      .attr('opacity', 0.4 + (Math.random() * 0.6));

    // AXES
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(() => ''))
      .attr('color', '#3f3f46');

    g.append('g')
      .call(d3.axisLeft(yHrScale).ticks(5))
      .attr('color', '#10B981');

    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yRewardScale).ticks(5))
      .attr('color', '#8B5CF6');

  }, [data]);

  return (
    <motion.div 
      className="flex flex-col w-full h-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl pointer-events-none" />
      
      {/* Header with badges */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
          DRL Bio-Optimization
        </h3>
        <div className="flex gap-3">
          {latestData && (
            <>
              <motion.div
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
              >
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  {Math.round(latestData.hr)} BPM
                </span>
              </motion.div>
              <motion.div
                className="px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/50"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <span className="text-purple-400 font-bold text-xs flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                  {latestData.reward.toFixed(1)} Reward
                </span>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-grow w-full relative">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-xs mt-4 relative z-10">
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
          <span className="text-emerald-400">Heart Rate</span>
        </motion.div>
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"></div>
          <span className="text-purple-400">AI Reward</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EnhancedBioOptimizationGraph;


// 2. ENHANCED TopArtistsList WITH HOVER EFFECTS
// ============================================

'use client';

import React from "react";
import { motion } from 'framer-motion';
import { Star } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function EnhancedTopArtistsList({ artists }: { artists: any[] }) {
  const generateSparkline = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    const points = [];
    for (let i = 0; i < 7; i++) {
      const val = Math.abs(Math.sin(hash + i)) * 10 + 5;
      points.push(`${i * 12},${20 - val}`);
    }
    return points.join(" ");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-900/40 to-slate-900/20 border border-slate-700/30 rounded-2xl p-6 shadow-lg backdrop-blur-xl">
      {/* Animated header */}
      <motion.div 
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xs font-black text-white tracking-widest uppercase">
          Top Artists & Play Contributions
        </h3>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Star className="w-4 h-4 text-amber-300 fill-amber-300 drop-shadow-lg drop-shadow-amber-300/50" />
        </motion.div>
      </motion.div>

      {/* Column headers */}
      <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-slate-700/50 pb-2">
        <span>Artist</span>
        <div className="flex gap-6 mr-2">
          <span>Plays</span>
          <span>Trend</span>
        </div>
      </div>

      {/* Artists list with stagger animation */}
      <motion.div 
        className="space-y-3 overflow-y-auto scrollbar-thin pr-2 h-[260px]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {artists.map((artist, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{
              scale: 1.03,
              x: 12,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
            className="group relative overflow-hidden rounded-xl p-3 cursor-pointer"
          >
            {/* Animated background gradient on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent rounded-xl"
              initial={{ opacity: 0, x: -300 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            />

            {/* Border animation */}
            <motion.div
              className="absolute inset-0 rounded-xl border border-purple-500/0 group-hover:border-purple-500/30"
              whileHover={{
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
              }}
            />

            {/* Content */}
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                {/* Artist image with glow */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-500/30 shadow-lg">
                    {artist.image ? (
                      <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                        {artist.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-lg border border-purple-400/0 group-hover:border-purple-400/50"
                    whileHover={{
                      boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)',
                    }}
                  />
                </motion.div>

                {/* Artist info */}
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {artist.name}
                  </span>
                  <motion.div
                    className="h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Stats section */}
              <div className="flex items-center gap-6">
                <motion.span 
                  className="text-sm font-black text-white w-4 text-center"
                  initial={{ opacity: 0.5 }}
                  whileHover={{ opacity: 1, scale: 1.2 }}
                >
                  {artist.count}
                </motion.span>

                {/* Sparkline */}
                <svg width="60" height="24" viewBox="0 0 72 20" className="opacity-60 group-hover:opacity-100 transition-opacity">
                  <polyline
                    points={generateSparkline(artist.name)}
                    fill="none"
                    stroke="#D1F26D"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="drop-shadow(0 0 4px rgba(209, 242, 109, 0.5))"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}


// 3. ENHANCED REAL-TIME INDICATOR
// ============================================

import { motion } from 'framer-motion';

export function EnhancedRealtimeIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div className="relative inline-flex items-center gap-3">
      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-green-400/50"
        initial={{ scale: 1, opacity: 0.5 }}
        animate={isActive ? {
          scale: [1, 1.5, 1],
          opacity: [0.8, 0.2, 0.5],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Middle pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-green-400/30"
        initial={{ scale: 1 }}
        animate={isActive ? {
          scale: [1, 1.8],
          opacity: [0.6, 0],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
      />

      {/* Inner glowing dot */}
      <motion.div
        className="relative w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/80"
        animate={isActive ? {
          boxShadow: [
            '0 0 8px rgba(34, 197, 94, 0.8)',
            '0 0 20px rgba(34, 197, 94, 0.6)',
            '0 0 8px rgba(34, 197, 94, 0.8)',
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Status text */}
      <motion.span 
        className={`text-sm font-bold ${isActive ? 'text-green-400' : 'text-gray-500'}`}
        animate={isActive ? {
          opacity: [1, 0.7, 1],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isActive ? 'Live Sync' : 'Offline'}
      </motion.span>
    </div>
  );
}


// 4. ENHANCED LOADING SKELETON
// ============================================

export function EnhancedLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-16 rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}


// 5. ENHANCED DATA BADGE WITH ANIMATED VALUE
// ============================================

import { useEffect, useState } from 'react';

interface AnimatedBadgeProps {
  value: number;
  label: string;
  unit?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange';
  icon?: React.ReactNode;
}

export function EnhancedAnimatedBadge({
  value,
  label,
  unit = '',
  color = 'purple',
  icon
}: AnimatedBadgeProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const timer = setInterval(() => {
      start += Math.ceil(value / 20);
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [value]);

  const colorMap = {
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
  };

  const textColorMap = {
    purple: 'text-purple-300',
    blue: 'text-blue-300',
    green: 'text-green-300',
    orange: 'text-orange-300',
  };

  return (
    <motion.div
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-lg px-4 py-3 relative overflow-hidden group hover:scale-105 transition-transform`}
      whileHover={{
        boxShadow: `0 0 20px rgba(${color === 'purple' ? '168, 85, 247' : color === 'blue' ? '59, 130, 246' : color === 'green' ? '34, 197, 94' : '249, 115, 22'}, 0.3)`,
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <motion.span className={`text-2xl font-black ${textColorMap[color]}`}>
            {displayValue}
          </motion.span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}


// 6. ENHANCED MODAL WITH GLASSMORPHISM
// ============================================

import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface EnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function EnhancedModal({ isOpen, onClose, title, children }: EnhancedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="relative w-full max-w-md mx-4 pointer-events-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Animated border glow */}
              <motion.div
                className="absolute inset-0 rounded-2xl border border-purple-500/0"
                whileHover={{
                  borderColor: 'rgba(168, 85, 247, 0.3)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
                }}
              />

              {/* Header */}
              <div className="relative z-10 border-b border-slate-700/50 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="relative z-10 p-6">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


// 7. ENHANCED TOGGLE SWITCH
// ============================================

interface EnhancedToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function EnhancedToggle({ enabled, onChange, label }: EnhancedToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-gray-300">{label}</span>}
      <motion.button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          enabled
            ? 'bg-gradient-to-r from-purple-600 to-blue-600'
            : 'bg-slate-600'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Toggle circle */}
        <motion.div
          className="h-6 w-6 rounded-full bg-white shadow-lg"
          animate={{
            x: enabled ? 28 : 2,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: enabled
              ? '0 0 12px rgba(168, 85, 247, 0.5)'
              : 'none',
          }}
        />
      </motion.button>
    </div>
  );
}

