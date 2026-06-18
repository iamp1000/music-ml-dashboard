'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import EmotionalScatterPlot from '../../components/EmotionalScatterPlot';
import LiveSyncPlayer from '../../components/LiveSyncPlayer';

import BioOptimizationGraph from '../../components/BioOptimizationGraph';
import AttentionVisualizer from '../../components/AttentionVisualizer';
import DissonanceChart from '../../components/DissonanceChart';

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    
    tl.fromTo(titleRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    )
    .fromTo(plotRef.current,
      { opacity: 0, scale: 0.95, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'expo.out' },
      "-=0.5"
    )
    .fromTo(playerRef.current,
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 1, ease: 'power3.out' },
      "-=0.8"
    );
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-12 relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="flex justify-between items-center mb-12">
        <h1 ref={titleRef} className="text-3xl font-bold tracking-tight">
          Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500">Emotion Dashboard</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700"></div>
          <div className="text-sm font-medium text-zinc-400">User Profile</div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Scatter Plot & Dissonance Area */}
        <div className="lg:col-span-2 flex flex-col gap-8 z-10">
          <div 
            ref={plotRef} 
            className="bg-[#111] border border-zinc-800/50 rounded-3xl p-8 shadow-2xl relative h-[450px]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Valence & Arousal Mapping</h2>
              <div className="text-xs px-3 py-1 bg-zinc-800 rounded-full text-zinc-400">Past 7 Days</div>
            </div>
            <div className="w-full h-[300px] flex justify-center items-center">
              <EmotionalScatterPlot />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#111] border border-zinc-800/50 rounded-3xl p-6 shadow-2xl h-[250px]">
              <BioOptimizationGraph />
            </div>
            <div className="bg-[#111] border border-zinc-800/50 rounded-3xl p-6 shadow-2xl h-[250px]">
              <DissonanceChart />
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="flex flex-col gap-8 z-10">
          
          {/* Live Player Sync */}
          <div ref={playerRef}>
            <LiveSyncPlayer />
          </div>

          {/* Attention Visualizer */}
          <div className="bg-[#111] border border-zinc-800/50 rounded-3xl p-6 shadow-2xl flex-grow flex flex-col">
            <AttentionVisualizer />
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Real-time multi-head attention mapping via the HuBERT acoustic transformer architecture.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
