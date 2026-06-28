"use client";

import React, { useMemo } from "react";
import { Calendar, Hexagon } from "lucide-react";

export default function SonicGenreTopology({ genres }: { genres?: { name: string, count: number }[] }) {
    const constellations = useMemo(() => {
        if (!genres || genres.length === 0) return [];
        
        const palette = ['#A855F7', '#EAB308', '#F97316', '#22D3EE', '#EC4899'];
        const basePositions = [
            { x: 150, y: 100 },
            { x: 350, y: 80 },
            { x: 250, y: 180 },
            { x: 480, y: 150 },
            { x: 400, y: 220 }
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
            
            // Generate 3-5 stars
            const numStars = Math.floor(randomSeed(seed++) * 3) + 3;
            const stars = [];
            for (let i = 0; i < numStars; i++) {
                const angle = (Math.PI * 2 * i) / numStars + randomSeed(seed++) * 0.5;
                const radius = 20 + randomSeed(seed++) * 30;
                stars.push({
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                });
            }

            // Generate blob path around stars
            const blobPoints = [];
            const numBlobPoints = 6;
            for (let i = 0; i < numBlobPoints; i++) {
                const angle = (Math.PI * 2 * i) / numBlobPoints;
                const radius = 45 + randomSeed(seed++) * 20;
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

            // Generate connections
            const connections = [];
            for (let i = 0; i < numStars; i++) {
                connections.push([i, (i + 1) % numStars]);
            }
            if (numStars > 3) connections.push([0, 2]);

            return {
                id: g.name.replace(/\W/g, '').toLowerCase() || `g-${index}`,
                name: g.name,
                plays: g.count,
                color,
                blob,
                stars,
                connections,
                labelPos: { x: center.x, y: center.y - 50 }
            };
        });
    }, [genres]);

    const totalPlays = useMemo(() => genres?.reduce((sum, g) => sum + g.count, 0) || 0, [genres]);

    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-5 flex flex-col relative overflow-hidden h-full">
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                        SONIC GENRE TOPOLOGY
                    </h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] font-normal capitalize tracking-normal mt-0.5">
                        (Active Resonance)
                    </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] hover:border-[var(--theme-accent)]/30 transition-all z-10">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] text-white">Calendar</span>
                </button>
            </div>

            {constellations.length === 0 ? (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center opacity-50 z-10 mt-8">
                    <Hexagon className="w-12 h-12 text-[var(--theme-accent)]/50 mb-3" />
                    <p className="text-sm font-bold text-white">No Constellations Formed</p>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-1 max-w-[200px]">
                        Awaiting further auditory telemetry to construct your genre galaxy.
                    </p>
                </div>
            ) : (
                <>
                    {/* SVG Constellation Graph */}
                    <div className="flex-1 w-full h-full relative -mt-4">
                        <svg viewBox="0 0 600 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                {constellations.map(c => (
                                    <radialGradient id={`glow-${c.id}`} key={`glow-${c.id}`}>
                                        <stop offset="0%" stopColor={c.color} stopOpacity="1" />
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
                                    fillOpacity="0.05"
                                    stroke={c.color}
                                    strokeWidth="1.5"
                                    strokeOpacity="0.3"
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
                                                strokeOpacity="0.5"
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
                                            <circle cx={star.x} cy={star.y} r="8" fill={`url(#glow-${c.id})`} opacity="0.6" />
                                            {/* Inner bright star */}
                                            <circle cx={star.x} cy={star.y} r="2.5" fill="#fff" />
                                        </g>
                                    ))}
                                </g>
                            ))}

                            {/* Render Labels */}
                            {constellations.map(c => (
                                <g key={`label-${c.id}`} transform={`translate(${c.labelPos.x}, ${c.labelPos.y})`} className="opacity-90">
                                    <text x="0" y="0" fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">{c.name}</text>
                                    <text x="0" y="14" fill="var(--theme-text-muted)" fontSize="10" textAnchor="middle">{c.plays} plays</text>
                                </g>
                            ))}
                        </svg>
                    </div>

                    {/* Total Label */}
                    <div className="absolute bottom-5 right-5 flex flex-col items-end z-10 bg-[var(--theme-panel)]/80 px-3 py-1.5 rounded-xl backdrop-blur-md border border-[var(--theme-border)]">
                        <span className="text-[10px] text-[var(--theme-text-muted)] font-bold">Total Tracks</span>
                        <span className="text-2xl font-black text-white leading-none">{totalPlays}</span>
                    </div>
                </>
            )}
        </div>
    );
}
