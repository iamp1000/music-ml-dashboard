"use client";

import React from "react";
import { Music, ChevronDown } from "lucide-react";

export default function TopTracksList({ tracks }: { tracks: any[] }) {
    // Sparkline helper for tracks
    const generateSparkline = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        const points = [];
        const width = 60;
        const height = 20;
        for (let i = 0; i < 6; i++) {
            const x = (i / 5) * width;
            const y = height - (Math.abs(Math.sin(hash + i)) * height * 0.8) - 2;
            points.push(`${x},${y}`);
        }
        return points.join(" ");
    };

    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col h-full min-h-[350px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                        TOP TRACKS
                    </h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] font-normal mt-0.5">
                        All time favorites
                    </p>
                </div>
                
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#282B33] bg-[#282B33] hover:bg-white/10 transition-colors">
                    <span className="text-[10px] text-white">by Plays</span>
                    <ChevronDown className="w-3 h-3 text-white" />
                </button>
            </div>
            
            {/* List */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
                {tracks.slice(0, 4).map((track, i) => (
                    <div key={i} className="flex justify-between items-center rounded-xl p-3 border border-[var(--theme-border)] bg-[var(--theme-bg)]/50 hover:bg-[var(--theme-bg)] transition-colors group">
                        
                        {/* Left: Image & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#282B33] flex items-center justify-center">
                                {track.image ? (
                                    <img src={track.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Music className="w-4 h-4 text-[#8293B4]" />
                                )}
                            </div>
                            
                            <div className="min-w-0">
                                <div className="text-[12px] text-white font-bold truncate group-hover:text-[var(--theme-accent)] transition-colors">
                                    {track.name}
                                </div>
                                <div className="text-[10px] text-[var(--theme-text-muted)] truncate">
                                    {track.artist}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right: Sparkline & Count */}
                        <div className="flex items-center gap-4 shrink-0">
                            <svg width="60" height="20" viewBox="0 0 60 20" className="opacity-70 group-hover:opacity-100 transition-opacity">
                                <polyline 
                                    points={generateSparkline(track.name + track.artist)} 
                                    fill="none" 
                                    stroke="#D1F26D" 
                                    strokeWidth="1.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                />
                            </svg>
                            <div className="text-[13px] text-white font-black w-4 text-right">
                                {track.plays}
                            </div>
                        </div>
                        
                    </div>
                ))}
            </div>
        </div>
    );
}
