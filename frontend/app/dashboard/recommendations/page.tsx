"use client";

import React from "react";
import { GlassCard } from "@/components/GlassCard";
import { Sparkles, Play, Info } from "lucide-react";

export default function RecommendationsPage() {
    
    const playlists = [
        {
            id: "dlm",
            title: "Deep Learning Mix",
            description: "Based on recent energetic listening",
            image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80",
            color: "var(--theme-chart-2)"
        },
        {
            id: "dwa",
            title: "Discover Weekly AI",
            description: "Based on recent energetic listening",
            image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80",
            color: "var(--theme-accent)"
        },
        {
            id: "mb",
            title: "Mood Booster",
            description: "Based on recent energetic listening",
            image: "https://images.unsplash.com/photo-1493225457124-a1a2a5eaeb76?auto=format&fit=crop&w=300&q=80",
            color: "var(--theme-chart-3)"
        }
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="9. AI-Powered Personalized Recommendations" icon={<Sparkles className="w-5 h-5"/>} className="w-full max-w-5xl min-h-[70vh] flex flex-col">
                <div className="flex flex-col h-full flex-1 mt-6">
                    
                    <div className="flex justify-between items-end border-b border-theme-border/50 pb-4 mb-6">
                        <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">Custom Playlists</h3>
                        <div className="text-[10px] text-theme-text-muted bg-theme-bg px-3 py-1 rounded-full border border-theme-border/50">Custom Recommended</div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {playlists.map((pl, i) => (
                            <div key={pl.id} className="group flex items-center justify-between bg-theme-bg/30 hover:bg-theme-bg/60 border border-theme-border/50 hover:border-theme-border rounded-2xl p-4 transition-all duration-300 cursor-pointer overflow-hidden relative">
                                {/* Hover background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-theme-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                
                                <div className="flex items-center gap-6 z-10 relative w-full">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative shadow-lg">
                                        <img src={pl.image} alt={pl.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="w-8 h-8 text-white fill-white" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <h4 className="text-2xl font-bold text-theme-text group-hover:text-theme-accent transition-colors mb-1">{pl.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.color, boxShadow: `0 0 8px ${pl.color}` }}></span>
                                            <p className="text-xs text-theme-text-muted uppercase tracking-wider">{pl.description}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-8 text-theme-text-muted px-4 shrink-0">
                                        <div className="hidden md:block text-xs max-w-[200px] border-l border-theme-border/50 pl-4 py-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            {pl.description}
                                        </div>
                                        <button className="p-2 rounded-full hover:bg-theme-bg hover:text-white transition-colors">
                                            <Info className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </GlassCard>
        </div>
    );
}
