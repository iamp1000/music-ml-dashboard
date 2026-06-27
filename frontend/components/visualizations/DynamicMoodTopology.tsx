"use client";

import React, { useMemo } from "react";
import { Play, Pause } from "lucide-react";

export default function DynamicMoodTopology({ history }: { history: any[] }) {
    // Generate a 3D Mesh
    const { meshPaths, nodes } = useMemo(() => {
        const gridSizeX = 25;
        const gridSizeZ = 20;
        
        // Isometric projection constants
        const cos30 = 0.866;
        const sin30 = 0.5;
        
        const project = (x: number, y: number, z: number) => {
            const screenX = (x - z) * cos30 + 200;
            const screenY = (x + z) * sin30 - y + 160;
            return { screenX, screenY };
        };

        const getTerrainY = (x: number, z: number) => {
            const nx = x / 150; 
            const nz = z / 100;
            // Create interesting hills and valleys
            let y = Math.sin(nx * 2) * Math.cos(nz * 2) * 30;
            y += Math.sin(nx * 4 + nz * 3) * 15;
            y += Math.exp(-(Math.pow(nx - 0.5, 2) + Math.pow(nz, 2)) * 4) * 60; // Peak on the right
            y -= Math.exp(-(Math.pow(nx + 0.5, 2) + Math.pow(nz, 2)) * 3) * 30; // Valley on the left
            return y;
        };

        const horizontalPaths = [];
        for (let i = 0; i <= gridSizeZ; i++) {
            const z = (i / gridSizeZ) * 200 - 100;
            let d = "";
            for (let j = 0; j <= gridSizeX; j++) {
                const x = (j / gridSizeX) * 300 - 150;
                const y = getTerrainY(x, z);
                const p = project(x, y, z);
                d += `${j === 0 ? 'M' : 'L'} ${p.screenX.toFixed(1)} ${p.screenY.toFixed(1)} `;
            }
            horizontalPaths.push(d);
        }

        const verticalPaths = [];
        for (let j = 0; j <= gridSizeX; j++) {
            const x = (j / gridSizeX) * 300 - 150;
            let d = "";
            for (let i = 0; i <= gridSizeZ; i++) {
                const z = (i / gridSizeZ) * 200 - 100;
                const y = getTerrainY(x, z);
                const p = project(x, y, z);
                d += `${i === 0 ? 'M' : 'L'} ${p.screenX.toFixed(1)} ${p.screenY.toFixed(1)} `;
            }
            verticalPaths.push(d);
        }

        // Map history to nodes on the surface
        let plottedNodes: any[] = [];
        if (history && history.length > 0) {
            const recent = history.slice(0, 50).reverse();
            plottedNodes = recent.map((item, idx) => {
                const v = item.valence !== undefined ? item.valence : Math.random();
                const e = item.energy !== undefined ? item.energy : Math.random();
                
                // Map valence to X (-150 to 150), energy to Z (-100 to 100) or vice versa to spread them
                // We'll spread them linearly across X but fluctuate Z based on valence to look natural
                const x = (idx / Math.max(1, recent.length - 1)) * 280 - 140; 
                const z = (v * 160) - 80;
                const y = getTerrainY(x, z);
                
                const p = project(x, y, z);
                
                let color = "#3B82F6"; // blue
                if (x > 50 && y > 20) color = "#EF4444"; // red peak
                else if (y > 0) color = "#F59E0B"; // orange mids

                return {
                    ...p,
                    color,
                    r: e > 0.7 ? 4 : 2,
                    name: item.track_name || "Unknown"
                };
            });
        }

        return { meshPaths: [...horizontalPaths, ...verticalPaths], nodes: plottedNodes };
    }, [history]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 relative z-10">
                <h3 className="text-[11px] font-bold text-white tracking-widest uppercase">
                    Dynamic Mood Topology <span className="text-[var(--theme-text-muted)] font-normal ml-1 capitalize">(Last 50)</span>
                </h3>
            </div>

            <div className="flex-1 relative w-full flex items-center justify-center min-h-[220px] -mt-4">
                <svg width="100%" height="100%" viewBox="0 0 400 280" className="overflow-visible">
                    <defs>
                        {/* Gradient for the mesh lines based on X position to match screenshot */}
                        <linearGradient id="mesh-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.7" />
                            <stop offset="80%" stopColor="#F59E0B" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
                        </linearGradient>
                        
                        {/* Gradient for a subtle surface fill */}
                        <linearGradient id="surface-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.15" />
                        </linearGradient>
                    </defs>
                    
                    {/* Render Mesh Paths */}
                    <g>
                        {meshPaths.map((d, i) => (
                            <path 
                                key={i} 
                                d={d} 
                                fill="none" 
                                stroke="url(#mesh-grad)" 
                                strokeWidth="0.8" 
                                opacity="0.8" 
                            />
                        ))}
                    </g>

                    {/* Nodes on surface */}
                    {nodes.map((n, i) => (
                        <g key={i} className="group cursor-pointer">
                            <circle 
                                cx={n.screenX} 
                                cy={n.screenY} 
                                r={n.r} 
                                fill={n.color} 
                                className="drop-shadow-lg transition-all duration-300 group-hover:r-5 group-hover:opacity-100" 
                                opacity={0.9} 
                            />
                            {/* Inner glow dot */}
                            <circle cx={n.screenX} cy={n.screenY} r={n.r / 2} fill="#ffffff" opacity={0.8} />
                            
                            <text 
                                x={n.screenX} 
                                y={n.screenY - 10} 
                                fill="white" 
                                fontSize="9" 
                                fontWeight="bold" 
                                opacity="0" 
                                className="group-hover:opacity-100 transition-opacity" 
                                textAnchor="middle"
                            >
                                {n.name}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Legend & Scrubber */}
            <div className="mt-auto relative z-10 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-[var(--theme-text-muted)]">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" /> Sad dips</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Positive highs</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> Heavy metal intensity</div>
                </div>

                <div className="flex items-center gap-3">
                    <Play className="w-4 h-4 text-white cursor-pointer hover:text-[var(--theme-accent)] transition-colors" />
                    <div className="flex-1 h-1 bg-[var(--theme-border)] rounded-full relative cursor-pointer group">
                        <div className="absolute top-0 left-0 bottom-0 bg-white rounded-full w-1/3 group-hover:bg-[var(--theme-accent)] transition-colors" />
                        <div className="absolute top-1/2 left-1/3 w-2.5 h-2.5 bg-white rounded-full -translate-y-1/2 -translate-x-1/2 shadow-lg" />
                    </div>
                    <Pause className="w-4 h-4 text-[var(--theme-text-muted)] cursor-pointer hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
}
