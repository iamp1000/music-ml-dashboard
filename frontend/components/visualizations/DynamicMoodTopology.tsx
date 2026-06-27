"use client";

import React, { useMemo } from "react";
import { Play, Pause } from "lucide-react";

export default function DynamicMoodTopology({ history }: { history: any[] }) {
    // We'll map history items to a 3D isometric plane
    // X = time (oldest to newest)
    // Z = valence (sad to happy)
    // Y = energy (height/intensity)
    
    const mappedNodes = useMemo(() => {
        if (!history || history.length === 0) return [];
        const recent = history.slice(0, 50).reverse(); // last 50 songs
        
        return recent.map((item, idx) => {
            const x = (idx / Math.max(1, recent.length - 1)) * 300 - 150; // -150 to 150
            const v = item.valence !== undefined ? item.valence : 0.5;
            const e = item.energy !== undefined ? item.energy : (item.arousal !== undefined ? item.arousal : 0.5);
            
            const z = (v * 200) - 100; // -100 to 100
            const y = e * 100; // 0 to 100 (height)
            
            // Isometric projection
            // angle = 30 degrees (approx 0.523 rad)
            const cos30 = 0.866;
            const sin30 = 0.5;
            
            const screenX = (x - z) * cos30;
            const screenY = (x + z) * sin30 - y;
            
            let color = "#3B82F6"; // default blue (chill/sad)
            if (v > 0.6 && e > 0.6) color = "#F59E0B"; // orange (happy/high energy)
            else if (v <= 0.4 && e > 0.6) color = "#EF4444"; // red (angry/heavy metal)
            else if (v > 0.6 && e <= 0.5) color = "#22C55E"; // green (calm/positive)
            
            return {
                screenX: screenX + 200, // center X
                screenY: screenY + 180, // center Y
                baseY: (x + z) * sin30 + 180, // for the stem
                color,
                e, v,
                name: item.track_name || "Unknown"
            };
        });
    }, [history]);

    const surfacePaths = useMemo(() => {
        if (mappedNodes.length === 0) return null;
        const pathData = mappedNodes.map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.screenX} ${n.screenY}`).join(" ");
        return pathData;
    }, [mappedNodes]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 relative z-10">
                <h3 className="text-xs font-black text-white tracking-widest uppercase">Dynamic Mood Topology <span className="text-gray-500 font-normal">(Last 50)</span></h3>
            </div>

            <div className="flex-1 relative w-full flex items-center justify-center min-h-[220px]">
                <svg width="100%" height="100%" viewBox="0 0 400 280" className="overflow-visible drop-shadow-2xl">
                    <defs>
                        <linearGradient id="topo-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid base plane (isometric) */}
                    <g opacity="0.1" stroke="#FFFFFF" strokeWidth="1">
                        {[...Array(11)].map((_, i) => {
                            const x = (i / 10) * 300 - 150;
                            const z1 = -100, z2 = 100;
                            const sx1 = (x - z1) * 0.866 + 200;
                            const sy1 = (x + z1) * 0.5 + 180;
                            const sx2 = (x - z2) * 0.866 + 200;
                            const sy2 = (x + z2) * 0.5 + 180;
                            return <line key={`g-x-${i}`} x1={sx1} y1={sy1} x2={sx2} y2={sy2} />
                        })}
                        {[...Array(11)].map((_, i) => {
                            const z = (i / 10) * 200 - 100;
                            const x1 = -150, x2 = 150;
                            const sx1 = (x1 - z) * 0.866 + 200;
                            const sy1 = (x1 + z) * 0.5 + 180;
                            const sx2 = (x2 - z) * 0.866 + 200;
                            const sy2 = (x2 + z) * 0.5 + 180;
                            return <line key={`g-z-${i}`} x1={sx1} y1={sy1} x2={sx2} y2={sy2} />
                        })}
                    </g>

                    {/* Topology curve path */}
                    {surfacePaths && (
                        <path d={surfacePaths} fill="none" stroke="url(#topo-grad)" strokeWidth="3" className="drop-shadow-lg" />
                    )}

                    {/* Nodes and Stems */}
                    {mappedNodes.map((n, i) => (
                        <g key={i} className="group cursor-pointer">
                            <line x1={n.screenX} y1={n.screenY} x2={n.screenX} y2={n.baseY} stroke={n.color} strokeWidth="1" opacity="0.3" />
                            <circle cx={n.screenX} cy={n.screenY} r={n.e > 0.8 ? 5 : 3} fill={n.color} className="drop-shadow-md transition-all duration-300 group-hover:r-6" />
                            <text x={n.screenX} y={n.screenY - 10} fill="white" fontSize="10" fontWeight="bold" opacity="0" className="group-hover:opacity-100 transition-opacity" textAnchor="middle">
                                {n.name}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Legend & Scrubber */}
            <div className="mt-auto relative z-10 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Sad dips</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Positive highs</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]" /> Heavy metal intensity</div>
                </div>

                <div className="flex items-center gap-3">
                    <Play className="w-4 h-4 text-white cursor-pointer hover:text-[var(--theme-accent)] transition-colors" />
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative cursor-pointer group">
                        <div className="absolute top-0 left-0 bottom-0 bg-white rounded-full w-1/3 group-hover:bg-[var(--theme-accent)] transition-colors" />
                        <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-white rounded-full -translate-y-1/2 -translate-x-1/2 shadow-lg" />
                    </div>
                    <Pause className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
}
