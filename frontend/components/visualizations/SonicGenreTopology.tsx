"use client";

import React from "react";
import { Calendar } from "lucide-react";

export default function SonicGenreTopology() {
    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col relative overflow-hidden h-full min-h-[350px]">
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                        SONIC GENRE TOPOLOGY
                    </h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] font-normal capitalize tracking-normal mt-0.5">
                        (Last Year)
                    </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] hover:border-[var(--theme-accent)]/30 transition-all">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] text-white">Calendar</span>
                </button>
            </div>

            {/* Content / Image */}
            <div className="absolute inset-0 mt-20 p-6 flex items-center justify-center">
                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                        src="/sonic_genre_topology.png" 
                        alt="Sonic Genre Topology Map" 
                        className="w-full h-full object-cover rounded-2xl scale-[1.1] opacity-90"
                    />
                </div>
            </div>

            {/* Total Label */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end z-10 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-md">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-bold">Total</span>
                <span className="text-3xl font-black text-white leading-none">146</span>
            </div>
        </div>
    );
}
