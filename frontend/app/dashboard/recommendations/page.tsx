"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Play, Info, Loader2, AlertCircle } from "lucide-react";
import { fetchWithRateLimit } from "@/utils/api";

export default function RecommendationsPage() {
    const [recTracks, setRecTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecommendationsData = async () => {
            try {
                const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/spotify/recommendations");
                if (data && data.tracks) {
                    setRecTracks(data.tracks);
                }
            } catch (err: any) {
                console.error("Failed to load recommendations", err);
                setErrorMsg(err.message);
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

    // Segment recommended tracks into custom mixes dynamically
    const customMixes = [
        {
            title: "Vibe Booster AI",
            emoji: "⚡",
            gradient: "from-green-600/30 to-emerald-950/20",
            color: "var(--theme-accent)",
            tracks: recTracks.slice(0, 5)
        },
        {
            title: "Deep Focus Ambient Flow",
            emoji: "🌌",
            gradient: "from-purple-600/30 to-violet-950/20",
            color: "#8B5CF6",
            tracks: recTracks.slice(5, 10)
        },
        {
            title: "Discovery Accelerator",
            emoji: "🧭",
            gradient: "from-blue-600/30 to-indigo-950/20",
            color: "#3B82F6",
            tracks: recTracks.slice(10, 15)
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">AI Recommendations</h2>
                <p className="text-sm text-theme-text-muted mt-1">Live recommended mixes and individual seed recommendations computed directly from your Spotify profile.</p>
            </div>

            {/* Error notifications banner */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* AI Playlists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {customMixes.map((mix, idx) => (
                    <div key={idx} className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 flex flex-col h-[400px]">
                        {/* Header Box */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mix.gradient} border border-[#1B2332] flex items-center justify-center text-xl`}>
                                <span>{mix.emoji}</span>
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight">{mix.title}</h4>
                                <span className="text-[9px] text-theme-text-muted">AI-Generated Mix</span>
                            </div>
                        </div>

                        {/* Recommendation list */}
                        <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                            {mix.tracks.length > 0 ? (
                                mix.tracks.map((track: any, tIdx: number) => (
                                    <div key={track.id || tIdx} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#070A0F] border border-transparent hover:border-[#1B2332] transition-colors group cursor-pointer">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#1B2332] relative flex items-center justify-center text-theme-accent text-[10px]">
                                            {track.album?.images?.[0]?.url ? (
                                                <img src={track.album.images[0].url} alt={track.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>🎵</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Play className="w-3.5 h-3.5 text-white fill-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-[10px] font-bold text-white truncate leading-tight group-hover:text-theme-accent transition-colors">{track.name}</h5>
                                            <span className="text-[9px] text-theme-text-muted truncate block mt-0.5">{track.artists[0].name}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-theme-text-muted text-center py-10">
                                    No tracks returned. Link your Spotify to generate seeds.
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[#1B2332]/60 pt-3 mt-3 flex justify-between items-center text-[9px] text-theme-text-muted">
                            <span className="font-mono">{mix.tracks.length} tracks synced</span>
                            <span className="text-theme-accent uppercase font-bold tracking-wider hover:underline flex items-center gap-0.5">
                                Play Mix <span className="font-serif">→</span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
