"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Play, Info, Loader2 } from "lucide-react";

export default function RecommendationsPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendationsData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;

                const profileRes = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    if (data.status === "success" && data.data) {
                        setProfile(data.data);
                    }
                }

                const historyRes = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    if (data.status === "success" && data.data) {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to load recommendations", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecommendationsData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Generating custom AI recommendations...</p>
            </div>
        );
    }

    const hasHistory = history.length > 0;
    const topArtist = profile?.top_artists?.[0]?.name || (hasHistory ? history[0].artist_name : "your favorites");
    const topGenre = profile?.top_artists?.[0]?.genres?.[0] || "Pop";
    const sampleTrack = hasHistory ? history[0].track_name : "your favorites";

    // Generate dynamic AI playlists using the user's actual music details
    const playlists = [
        {
            id: "vba",
            title: "Vibe Booster AI",
            description: `High-energy vectors optimized using your love for ${topArtist}`,
            color: "var(--theme-accent)",
            gradient: "from-green-600/30 to-emerald-950/20",
            icon: "⚡"
        },
        {
            id: "dff",
            title: "Deep Focus Flow",
            description: `Calming low-valence ambient tracks derived from ${sampleTrack}`,
            color: "#8B5CF6",
            gradient: "from-purple-600/30 to-violet-950/20",
            icon: "🌌"
        },
        {
            id: "dac",
            title: "Discovery Accelerator",
            description: `Fresh experimental discoveries matching your top genre: ${topGenre}`,
            color: "#3B82F6",
            gradient: "from-blue-600/30 to-indigo-950/20",
            icon: "🧭"
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">AI Playlists</h2>
                <p className="text-sm text-theme-text-muted mt-1">Custom recommendation containers computed using your audio features and listening vectors.</p>
            </div>

            {/* Custom Playlist Container */}
            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                <div className="flex justify-between items-center border-b border-[#1B2332]/60 pb-4 mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-theme-accent" />
                        Custom Recommended Mixes
                    </h3>
                    <div className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full font-bold">
                        Calculated from Spotify telemetry
                    </div>
                </div>

                <div className="space-y-4">
                    {playlists.map((pl) => (
                        <div key={pl.id} className="group flex items-center justify-between bg-[#070A0F] hover:bg-[#070A0F]/80 border border-[#1B2332]/60 hover:border-[#1B2332] rounded-2xl p-4 transition-all duration-300 cursor-pointer overflow-hidden relative">
                            {/* Hover accent background glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-theme-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            
                            <div className="flex items-center gap-5 z-10 relative w-full">
                                {/* Playlist cover with premium gradient and emoji */}
                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${pl.gradient} border border-[#1B2332] shrink-0 relative shadow-md flex items-center justify-center text-3xl group-hover:scale-105 transition-transform duration-500`}>
                                    <span>{pl.icon}</span>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                        <Play className="w-6 h-6 text-white fill-white" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-bold text-white group-hover:text-theme-accent transition-colors mb-1 truncate">{pl.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pl.color, boxShadow: `0 0 6px ${pl.color}` }}></span>
                                        <p className="text-xs text-theme-text-muted truncate uppercase tracking-wider">{pl.description}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-theme-text-muted px-2 shrink-0">
                                    <button className="p-2 rounded-xl hover:bg-[#0D111A] hover:text-white transition-colors">
                                        <Info className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
