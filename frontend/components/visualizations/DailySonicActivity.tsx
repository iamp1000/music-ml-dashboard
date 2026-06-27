"use client";

import React, { useState } from "react";
import { Clock, Smile, Activity, Shield } from "lucide-react";

export default function DailySonicActivity() {
    const [timeRange, setTimeRange] = useState<"7D" | "30D">("7D");
    const [variable, setVariable] = useState(true);

    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col relative overflow-hidden h-full min-h-[350px]">
            {/* Header */}
            <div className="flex justify-between items-start z-10 mb-4">
                <div>
                    <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                        DAILY SONIC ACTIVITY
                    </h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] font-normal mt-1">
                        Listening patterns over time
                    </p>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    {/* 7D / 30D Toggle */}
                    <div className="flex bg-[#282B33] rounded-lg p-0.5 border border-[#3A3D46]">
                        <button 
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors ${timeRange === "7D" ? "bg-white/10 text-white" : "text-[var(--theme-text-muted)]"}`}
                            onClick={() => setTimeRange("7D")}
                        >
                            7D
                        </button>
                        <button 
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors ${timeRange === "30D" ? "bg-white/10 text-white" : "text-[var(--theme-text-muted)]"}`}
                            onClick={() => setTimeRange("30D")}
                        >
                            30D
                        </button>
                    </div>

                    {/* Variable Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">Variable</span>
                        <div 
                            className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${variable ? "bg-white/20" : "bg-[#282B33]"}`}
                            onClick={() => setVariable(!variable)}
                        >
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${variable ? "translate-x-3" : "translate-x-0"}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Ribbon Chart SVG */}
            <div className="flex-1 w-full relative mt-4">
                
                {/* Y-Axis Labels */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] text-[var(--theme-text-muted)] z-20 py-4">
                    <div className="flex items-center gap-2"><span>Time</span></div>
                    <div className="flex items-center gap-2"><span>Mood</span></div>
                    <div className="flex items-center gap-2"><span>Energy</span></div>
                </div>

                {/* X-Axis Labels & Vertical Lines */}
                <div className="absolute left-16 right-4 top-0 bottom-0 flex justify-between z-0">
                    {["Jun 24", "Jun 25", "Jun 27"].map((date, i) => (
                        <div key={i} className="flex flex-col items-center h-full relative">
                            <div className="w-[1px] h-[calc(100%-24px)] border-l border-dashed border-[#282B33]" />
                            <span className="text-[10px] text-[var(--theme-text-muted)] absolute bottom-0 font-medium">{date}</span>
                        </div>
                    ))}
                </div>

                {/* SVG Graphics */}
                <div className="absolute left-14 right-4 top-0 bottom-8 z-10">
                    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="timeRibbon" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
                            </linearGradient>
                            
                            <linearGradient id="moodRibbon" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.5" />
                                <stop offset="50%" stopColor="#EAB308" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
                            </linearGradient>
                            
                            <linearGradient id="energyRibbon" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.5" />
                            </linearGradient>
                        </defs>
                        
                        {/* 
                            Coordinates:
                            Y: Top=10 (Time), Middle=50 (Mood), Bottom=90 (Energy)
                            X: Left=0 (Jun 24), Center=50 (Jun 25), Right=100 (Jun 27)
                        */}

                        {/* Ribbon Paths using Cubic Beziers for smooth flow */}
                        
                        {/* Time Ribbon */}
                        <path d="M 0,10 C 25,10 25,30 50,50 C 75,70 75,30 100,50 L 100,60 C 75,40 75,80 50,60 C 25,40 25,20 0,20 Z" fill="url(#timeRibbon)" />
                        
                        {/* Mood Ribbon */}
                        <path d="M 0,50 C 25,50 25,30 50,30 C 75,30 75,70 100,70 L 100,80 C 75,80 75,40 50,40 C 25,40 25,60 0,60 Z" fill="url(#moodRibbon)" />
                        
                        {/* Energy Ribbon */}
                        <path d="M 0,90 C 25,90 25,70 50,70 C 75,70 75,90 100,90 L 100,100 C 75,100 75,80 50,80 C 25,80 25,100 0,100 Z" fill="url(#energyRibbon)" />
                    </svg>

                    {/* SVG overlay icons */}
                    <div className="absolute inset-0">
                        {/* Jun 24 Nodes */}
                        <div className="absolute top-[10%] left-[0%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#8B5CF6] flex items-center justify-center"><Clock className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[50%] left-[0%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#22C55E] flex items-center justify-center"><Smile className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[90%] left-[0%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#06B6D4] flex items-center justify-center"><Activity className="w-2.5 h-2.5 text-white" /></div>
                        
                        {/* Jun 25 Nodes */}
                        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#EAB308] flex items-center justify-center"><Smile className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#8B5CF6] flex items-center justify-center"><Shield className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[70%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center"><Activity className="w-2.5 h-2.5 text-white" /></div>
                        
                        {/* Jun 27 Nodes */}
                        <div className="absolute top-[50%] left-[100%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center"><Clock className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[70%] left-[100%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#8B5CF6] flex items-center justify-center"><Smile className="w-2.5 h-2.5 text-white" /></div>
                        <div className="absolute top-[90%] left-[100%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#22C55E] flex items-center justify-center"><Activity className="w-2.5 h-2.5 text-white" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
