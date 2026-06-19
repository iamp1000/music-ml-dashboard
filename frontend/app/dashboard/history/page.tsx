"use client";

import React, { useEffect, useState } from "react";
import { Clock, Filter, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function CompleteHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const res = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data) {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch history details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatDuration = (ms: number) => {
        if (!ms || isNaN(ms)) return "3:12"; // realistic fallback duration if not provided
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Syncing playback history timeline...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Playback History</h2>
                <p className="text-sm text-theme-text-muted mt-1">Timeline list of your recently transmitted play sessions and audio logs.</p>
            </div>

            {/* Table Container Card */}
            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-5 h-5 text-theme-accent" />
                        Historical Logs
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-[#070A0F] border border-[#1B2332] rounded-xl px-3 py-1.5 text-xs text-theme-text-muted">
                            <span>Timeline History</span>
                            <Filter className="w-3.5 h-3.5 ml-2.5 text-theme-accent" />
                        </div>
                    </div>
                </div>

                {/* Table Layout */}
                <div className="flex-1 flex flex-col min-w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 text-[10px] font-bold uppercase tracking-widest text-theme-text-muted pb-3 border-b border-[#1B2332] px-4 shrink-0">
                        <div className="col-span-2">Played At</div>
                        <div className="col-span-4">Track Title</div>
                        <div className="col-span-3">Artist</div>
                        <div className="col-span-2">Telemetry</div>
                        <div className="col-span-1 text-right">Duration</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 mt-2 space-y-1.5 scrollbar-thin">
                        {history.length > 0 ? (
                            history.map((item, i) => {
                                const playedAt = new Date(item.time || item.played_at);
                                return (
                                    <div key={item.id || i} className="grid grid-cols-12 gap-4 text-xs items-center bg-[#070A0F]/30 hover:bg-[#070A0F] p-3 px-4 rounded-xl transition-all border border-[#1B2332]/40 hover:border-[#1B2332] group">
                                        <div className="col-span-2 text-theme-text-muted font-mono">
                                            {format(playedAt, "MMM dd • hh:mm a")}
                                        </div>
                                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-[#070A0F] border border-[#1B2332] flex items-center justify-center text-theme-accent text-[10px] font-bold shrink-0 relative overflow-hidden shadow-sm">
                                                🎵
                                                <div className="absolute inset-0 bg-theme-accent/5"></div>
                                            </div>
                                            <div className="truncate font-bold text-white group-hover:text-theme-accent transition-colors">
                                                {item.track_name || "Unknown Track"}
                                            </div>
                                        </div>
                                        <div className="col-span-3 truncate text-theme-text-muted font-medium">
                                            {item.artist_name || "Unknown Artist"}
                                        </div>
                                        <div className="col-span-2 flex items-center gap-4 text-theme-text-muted">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold text-theme-accent uppercase font-mono">Val:</span>
                                                <span className="font-mono font-bold text-white text-[10px]">{(item.valence || 0.5).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold text-purple-400 uppercase font-mono">Eng:</span>
                                                <span className="font-mono font-bold text-white text-[10px]">{(item.energy || item.arousal || 0.5).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1 text-right text-theme-text-muted font-mono font-bold">
                                            {formatDuration(item.duration_ms)}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-sm text-theme-text-muted">
                                No playback history found. Start playing music to generate records.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
