'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const AttentionVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const blocks = containerRef.current.querySelectorAll('.attention-block');
    
    // Simulate Transformer Attention heads firing dynamically
    blocks.forEach((block) => {
      gsap.to(block, {
        opacity: () => Math.random() * 0.8 + 0.2,
        scale: () => Math.random() * 0.3 + 0.85,
        backgroundColor: () => {
          const colors = ['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981'];
          return Math.random() > 0.7 ? colors[Math.floor(Math.random() * colors.length)] : '#27272a';
        },
        duration: () => Math.random() * 1.5 + 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    });
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-4">HuBERT Attention Map</h3>
      <div 
        ref={containerRef} 
        className="flex-grow grid grid-cols-12 grid-rows-4 gap-1 p-2 bg-zinc-900 rounded-xl border border-zinc-800"
      >
        {Array.from({ length: 48 }).map((_, i) => (
          <div 
            key={i} 
            className="attention-block w-full h-full rounded-sm bg-zinc-800 opacity-50"
          ></div>
        ))}
      </div>
    </div>
  );
};

export default AttentionVisualizer;
