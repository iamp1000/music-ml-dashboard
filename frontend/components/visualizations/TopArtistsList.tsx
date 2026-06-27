"use client";

import React from "react";
import { Star } from "lucide-react";

export default function TopArtistsList({ artists }: { artists: any[] }) {
    // Sparkline helper
    const generateSparkline = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        const points = [];
        for (let i = 0; i < 7; i++) {
            const val = Math.abs(Math.sin(hash + i)) * 10 + 5;
            points.push(`${i * 12},${20 - val}`);
        }
        return points.join(" ");
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-white tracking-widest uppercase">Top Artists & Play Contributions</h3>
                <Star className="w-4 h-4 text-[#D1F26D] fill-[#D1F26D]" />
            </div>

            <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-[var(--theme-border)] pb-2">
                <span>Artist</span>
                <div className="flex gap-6 mr-2">
                    <span>Plays</span>
                    <span>Contribution Count</span>
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto scrollbar-thin pr-2 h-[260px]">
                {artists.map((artist, i) => (
                    <div key={i} className="flex justify-between items-center bg-[#080B12] border border-[var(--theme-border)] rounded-xl p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--theme-border)] shrink-0">
                                {artist.image ? (
                                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[var(--theme-bg)] flex items-center justify-center text-xs font-bold text-gray-500">
                                        {artist.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white leading-tight">{artist.name}</span>
                                <span className="text-[10px] text-gray-500">{artist.count * 15} plays</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-sm font-black text-white w-4 text-center">{artist.count}</span>
                            <div className="w-16 h-6">
                                <svg width="100%" height="100%" viewBox="0 0 72 20" preserveAspectRatio="none">
                                    <polyline
                                        points={generateSparkline(artist.name)}
                                        fill="none"
                                        stroke="#D1F26D"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
