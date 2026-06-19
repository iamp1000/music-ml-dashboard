"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Share2, Loader2 } from "lucide-react";

export default function DiscoveryPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    // Generate static node positions for a fake force-directed graph look
    const nodes = [
        { id: 'center', label: 'You', x: 50, y: 50, r: 8, color: 'var(--theme-accent)' },
        // Listened Artists (Left)
        { id: 'l1', label: 'Artist A', x: 25, y: 30, r: 5, color: 'var(--theme-text-muted)' },
        { id: 'l2', label: 'Artist B', x: 15, y: 55, r: 6, color: 'var(--theme-text-muted)' },
        { id: 'l3', label: 'Artist C', x: 30, y: 75, r: 4, color: 'var(--theme-text-muted)' },
        { id: 'l4', label: 'Artist D', x: 10, y: 80, r: 3, color: 'var(--theme-text-muted)' },
        // Recommended Artists (Right)
        { id: 'r1', label: 'Discovery X', x: 70, y: 25, r: 6, color: 'var(--theme-chart-2)' },
        { id: 'r2', label: 'Discovery Y', x: 85, y: 45, r: 5, color: 'var(--theme-chart-2)' },
        { id: 'r3', label: 'Discovery Z', x: 75, y: 80, r: 7, color: 'var(--theme-chart-2)' },
        { id: 'r4', label: 'Discovery W', x: 90, y: 70, r: 4, color: 'var(--theme-chart-2)' },
        // Connectors
        { id: 'c1', label: 'Hub 1', x: 40, y: 20, r: 3, color: 'white' },
        { id: 'c2', label: 'Hub 2', x: 60, y: 65, r: 3, color: 'white' },
    ];

    const edges = [
        // Center to Hubs
        { from: 'center', to: 'c1' }, { from: 'center', to: 'c2' },
        { from: 'center', to: 'l2' }, { from: 'center', to: 'r2' },
        // Hubs to Nodes
        { from: 'c1', to: 'l1' }, { from: 'c1', to: 'r1' },
        { from: 'c2', to: 'l3' }, { from: 'c2', to: 'r3' },
        // Interconnections
        { from: 'l1', to: 'l2' }, { from: 'l2', to: 'l4' }, { from: 'l3', to: 'l4' },
        { from: 'r1', to: 'r2' }, { from: 'r2', to: 'r4' }, { from: 'r3', to: 'r4' }, { from: 'r2', to: 'r3' },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="6. Discovery & Recommendation Engine" icon={<Share2 className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh] flex flex-col">
                {loading ? (
                    <div className="flex flex-col h-full items-center justify-center flex-1 py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-chart-4 animate-spin" />
                        <p className="text-theme-text-muted">Computing relational vectors...</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full flex-1 relative bg-theme-bg/20 border border-theme-border/50 rounded-2xl mt-4 overflow-hidden">
                        
                        {/* Headers */}
                        <div className="absolute top-6 left-6 z-10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Listened Artists</h3>
                        </div>
                        <div className="absolute top-6 right-6 z-10 text-right">
                            <h3 className="text-sm font-bold text-theme-chart-2 uppercase tracking-wider">Recommended New Discoveries</h3>
                        </div>

                        {/* SVG Graph */}
                        <svg className="absolute inset-0 w-full h-full">
                            <defs>
                                <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
                                </radialGradient>
                            </defs>
                            
                            {/* Edges */}
                            {edges.map((edge, i) => {
                                const fromNode = nodes.find(n => n.id === edge.from);
                                const toNode = nodes.find(n => n.id === edge.to);
                                if (!fromNode || !toNode) return null;
                                return (
                                    <line 
                                        key={i}
                                        x1={`${fromNode.x}%`} 
                                        y1={`${fromNode.y}%`} 
                                        x2={`${toNode.x}%`} 
                                        y2={`${toNode.y}%`} 
                                        stroke="var(--theme-border)" 
                                        strokeWidth="1"
                                        className="animate-[pulse_3s_ease-in-out_infinite]"
                                    />
                                );
                            })}

                            {/* Nodes */}
                            {nodes.map((node) => (
                                <g key={node.id} className="cursor-pointer group">
                                    <circle 
                                        cx={`${node.x}%`} 
                                        cy={`${node.y}%`} 
                                        r={node.r * 3} 
                                        fill="url(#nodeGlow)" 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                    <circle 
                                        cx={`${node.x}%`} 
                                        cy={`${node.y}%`} 
                                        r={node.r} 
                                        fill={node.color} 
                                        stroke="var(--theme-bg)"
                                        strokeWidth="2"
                                        className="transition-transform group-hover:scale-150"
                                        style={{ transformOrigin: `${node.x}% ${node.y}%` }}
                                    />
                                    <text 
                                        x={`${node.x}%`} 
                                        y={`${node.y + (node.r > 5 ? 4 : 3)}%`} 
                                        textAnchor="middle" 
                                        fill="white" 
                                        fontSize="10px"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md pointer-events-none"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            ))}
                        </svg>

                    </div>
                )}
            </GlassCard>
        </div>
    );
}
