"use client";

import React from "react";

export interface StatsItem {
    name: string;
    count: number;
}

export interface StatsBlockProps {
    title: string;
    items: StatsItem[];
    accentColor?: string;
    hoverAccentClass?: string;
}

export function StatsBlock({
    title,
    items,
    accentColor = "var(--theme-accent)",
    hoverAccentClass = "group-hover:text-[var(--theme-accent)]",
}: StatsBlockProps) {
    return (
        <div className="bg-gradient-to-br from-[#1A1C23] to-[#0A0B10] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"
                style={{ backgroundColor: accentColor }}
            />
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">{title}</h3>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between group">
                        <span className={`text-sm font-bold text-white ${hoverAccentClass} transition-colors truncate`}>
                            {item.name}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{item.count} plays</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
