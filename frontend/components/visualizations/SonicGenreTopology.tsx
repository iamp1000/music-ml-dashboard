"use client";

import React, { useMemo } from "react";
import { Calendar, Hexagon } from "lucide-react";

export default function SonicGenreTopology({ genres }: { genres?: { name: string, count: number }[] }) {
    const constellations = useMemo(() => {
        if (!genres || genres.length === 0) return [];
        
        // Colors closely matched to the image: Purple, Yellow-Green, Orange, Cyan, Green
        const palette = ['#A855F7', '#D9F99D', '#FDBA74', '#67E8F9', '#86EFAC'];
        
        // Updated base positions to spread out nicely
        const basePositions = [
            { x: 180, y: 120 },
            { x: 400, y: 80 },
            { x: 280, y: 220 },
            { x: 480, y: 200 },
            { x: 500, y: 120 }
        ];

        // Basic string hasher for seeded randomization
        const hashStr = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            return hash;
        };

        const randomSeed = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        return genres.slice(0, 5).map((g, index) => {
            let seed = hashStr(g.name);
            const center = basePositions[index % basePositions.length];
            const color = palette[index % palette.length];
            
            // Generate 4-7 stars
            const numStars = Math.floor(randomSeed(seed++) * 4) + 4;
            const stars = [];
            for (let i = 0; i < numStars; i++) {
                const angle = (Math.PI * 2 * i) / numStars + randomSeed(seed++) * 0.5;
                const radius = 25 + randomSeed(seed++) * 40;
                stars.push({
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                });
            }

            // Generate blob path around stars (smooth, organic)
            const blobPoints = [];
            const numBlobPoints = 8;
            for (let i = 0; i < numBlobPoints; i++) {
                const angle = (Math.PI * 2 * i) / numBlobPoints;
                const radius = 60 + randomSeed(seed++) * 25;
                blobPoints.push({
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                });
            }
            // Create a smooth cubic bezier closed path
            let blob = `M ${blobPoints[0].x} ${blobPoints[0].y}`;
            for (let i = 0; i < numBlobPoints; i++) {
                const next = blobPoints[(i + 1) % numBlobPoints];
                const ctrlX = blobPoints[i].x + (next.x - blobPoints[i].x) / 2 + (randomSeed(seed++) * 20 - 10);
                const ctrlY = blobPoints[i].y + (next.y - blobPoints[i].y) / 2 + (randomSeed(seed++) * 20 - 10);
                blob += ` Q ${ctrlX} ${ctrlY}, ${next.x} ${next.y}`;
            }

            // Generate connections (constellation lines)
            const connections = [];
            for (let i = 0; i < numStars; i++) {
                connections.push([i, (i + 1) % numStars]);
            }
            if (numStars > 3) {
                connections.push([0, Math.floor(numStars / 2)]);
                if (numStars > 5) connections.push([1, Math.floor(numStars / 2) + 1]);
            }

            return {
                id: g.name.replace(/\W/g, '').toLowerCase() || `g-${index}`,
                name: g.name,
                plays: g.count,
                color,
                blob,
                stars,
                connections,
                // Place label near top left of the cluster to match design
                labelPos: { x: center.x - 30, y: center.y - 45 }
            };
        });
    }, [genres]);

    const totalPlays = useMemo(() => genres?.reduce((sum, g) => sum + g.count, 0) || 0, [genres]);

    return (
        <div className="bg-[#1A1C23]/90 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            
            {/* Header matches the exact design in the image */}
            <div className="flex justify-between items-start z-10 w-full relative">
                <div className="flex flex-col">
                    <h3 className="text-[14px] font-semibold text-white tracking-wide">
                        SONIC GENRE TOPOLOGY
                    </h3>
                    <p className="text-[13px] text-gray-400 font-normal mt-0.5">
                        (Last Year)
                    </p>
                </div>
                <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-colors z-10 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[12px] font-medium">Calendar</span>
                </button>
            </div>

            {constellations.length === 0 ? (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center opacity-50 z-10 mt-8">
                    <Hexagon className="w-12 h-12 text-white/50 mb-3" />
                    <p className="text-sm font-bold text-white">No Constellations Formed</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                        Awaiting data to construct topology.
                    </p>
                </div>
            ) : (
                <>
                    {/* SVG Constellation Graph */}
                    <div className="flex-1 w-full h-full relative -mt-4">
                        <svg viewBox="0 0 700 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            
                            {/* Render Blobs and glowing lines */}
                            <defs>
                                <filter id="glow-blob" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="8" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                                {constellations.map(c => (
                                    <radialGradient id={`glow-${c.id}`} key={`glow-${c.id}`}>
                                        <stop offset="0%" stopColor={c.color} stopOpacity="0.8" />
                                        <stop offset="100%" stopColor={c.color} stopOpacity="0" />
                                    </radialGradient>
                                ))}
                            </defs>

                            {/* Render Blobs */}
                            {constellations.map(c => (
                                <path 
                                    key={`blob-${c.id}`}
                                    d={c.blob}
                                    fill={c.color}
                                    fillOpacity="0.04"
                                    stroke={c.color}
                                    strokeWidth="2"
                                    strokeOpacity="0.8"
                                    filter="url(#glow-blob)"
                                />
                            ))}

                            {/* Render Connections */}
                            {constellations.map(c => (
                                <g key={`conns-${c.id}`}>
                                    {c.connections.map((conn, idx) => {
                                        const p1 = c.stars[conn[0]];
                                        const p2 = c.stars[conn[1]];
                                        return (
                                            <line 
                                                key={`conn-${c.id}-${idx}`}
                                                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                                stroke={c.color}
                                                strokeWidth="1.5"
                                                strokeOpacity="0.8"
                                            />
                                        );
                                    })}
                                </g>
                            ))}

                            {/* Render Stars */}
                            {constellations.map(c => (
                                <g key={`stars-${c.id}`}>
                                    {c.stars.map((star, idx) => (
                                        <g key={`star-${c.id}-${idx}`}>
                                            {/* Outer glow */}
                                            <circle cx={star.x} cy={star.y} r="12" fill={`url(#glow-${c.id})`} opacity="0.6" />
                                            {/* Inner bright star */}
                                            <circle cx={star.x} cy={star.y} r="2.5" fill="#ffffff" />
                                        </g>
                                    ))}
                                </g>
                            ))}

                            {/* Render Labels EXACTLY matching the design */}
                            {constellations.map(c => (
                                <g key={`label-${c.id}`} transform={`translate(${c.labelPos.x}, ${c.labelPos.y})`}>
                                    <text 
                                        x="0" 
                                        y="0" 
                                        fill={c.color} 
                                        fontSize="15" 
                                        fontWeight="600" 
                                        textAnchor="middle"
                                        style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}
                                    >
                                        {c.name}
                                    </text>
                                    <text 
                                        x="0" 
                                        y="16" 
                                        fill="#9CA3AF" 
                                        fontSize="12" 
                                        fontWeight="400" 
                                        textAnchor="middle"
                                    >
                                        {c.plays} plays
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* Total Label matching the bottom right of the image */}
                    <div className="absolute bottom-6 right-8 flex flex-col items-end z-10">
                        <span className="text-[13px] text-gray-400 font-normal">Total</span>
                        <span className="text-[36px] font-bold text-white leading-none tracking-tight mt-1">{totalPlays}</span>
                    </div>
                </>
            )}
        </div>
    );
}
