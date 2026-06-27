"use client";

import React from "react";

interface SonicPerformanceChartProps {
    listeningTime: number;
    tracksPlayed: number;
}

export default function SonicPerformanceChart({ listeningTime, tracksPlayed }: SonicPerformanceChartProps) {
    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[350px]">
            {/* Header */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                    SONIC PERFORMANCE <span className="text-[var(--theme-text-muted)] font-normal capitalize tracking-normal">(Last Year)</span>
                </h3>
            </div>

            {/* Gauge Graphic */}
            <div className="relative mt-8 flex items-center justify-center w-full aspect-square max-w-[280px]">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90 drop-shadow-2xl">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="50%" stopColor="#22C55E" />
                            <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="#22C55E" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>

                    {/* Outer track dashes */}
                    <circle 
                        cx="100" cy="100" r="90" 
                        fill="none" 
                        stroke="#282B33" 
                        strokeWidth="4" 
                        strokeDasharray="4 6"
                    />

                    {/* Outer glowing track filled */}
                    <circle 
                        cx="100" cy="100" r="90" 
                        fill="none" 
                        stroke="url(#glowGradient)" 
                        strokeWidth="8" 
                        strokeDasharray="4 6"
                        strokeDashoffset="0"
                        style={{ strokeDasharray: '400', strokeDashoffset: '100' }}
                    />

                    {/* Inner glowing track filled */}
                    <circle 
                        cx="100" cy="100" r="82" 
                        fill="none" 
                        stroke="url(#gaugeGradient)" 
                        strokeWidth="4"
                        style={{ strokeDasharray: '515', strokeDashoffset: '150' }}
                        strokeLinecap="round"
                    />
                    
                    {/* Inner dim track */}
                    <circle 
                        cx="100" cy="100" r="82" 
                        fill="none" 
                        stroke="#282B33" 
                        strokeWidth="4"
                        style={{ strokeDasharray: '515', strokeDashoffset: '-365' }}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
                    <p className="text-[10px] text-[var(--theme-text-muted)] font-bold mb-1">Total Listening Time</p>
                    <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-3xl font-black text-white">{listeningTime}</span>
                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">min</span>
                    </div>
                    
                    <svg width="80" height="20" viewBox="0 0 80 20" className="my-2 opacity-80">
                        <path d="M0 10 Q 10 5, 20 10 T 40 10 T 60 10 T 80 10" fill="none" stroke="#D1F26D" strokeWidth="1.5" />
                    </svg>

                    <p className="text-[10px] text-[var(--theme-text-muted)] font-bold mt-1">Total Tracks Played</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-2 w-16 bg-[#282B33] rounded-full overflow-hidden">
                            <div className="h-full bg-white/40 w-[60%] rounded-full" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-2xl font-black text-white">{tracksPlayed}</span>
                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">plays</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
