"use client";

import React from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { AnimationPresets } from "@/lib/animations";

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

            <motion.div 
                className="space-y-3 overflow-y-auto scrollbar-thin pr-2 h-full"
                variants={AnimationPresets.container}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                {artists.map((artist, i) => (
                    <motion.div 
                        key={i} 
                        variants={AnimationPresets.itemSlideRight}
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative flex justify-between items-center bg-[#080B12] border border-[var(--theme-border)] rounded-xl p-3 cursor-pointer overflow-hidden group"
                    >
                        {/* Gradient background slide on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--theme-border)] shrink-0 shadow-lg shadow-black/50 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
                                {artist.image ? (
                                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[var(--theme-bg)] flex items-center justify-center text-xs font-bold text-gray-500">
                                        {artist.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white leading-tight group-hover:text-purple-400 transition-colors">{artist.name}</span>
                                <span className="text-[10px] text-gray-500">{artist.count * 15} plays</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 relative z-10">
                            <motion.span 
                                className="text-sm font-black text-white w-4 text-center group-hover:text-purple-400 transition-colors"
                                whileHover={{ scale: 1.2 }}
                            >
                                {artist.count}
                            </motion.span>
                            <div className="w-16 h-6">
                                <svg width="100%" height="100%" viewBox="0 0 72 20" preserveAspectRatio="none">
                                    <motion.polyline
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                        points={generateSparkline(artist.name)}
                                        fill="none"
                                        stroke="#A855F7"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                                    />
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
