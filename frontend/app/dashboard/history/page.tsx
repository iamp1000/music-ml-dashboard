"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Clock, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function CompleteHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${API_URL}/telemetry/history?limit=20`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success") {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Format mm:ss from ms
    const formatDuration = (ms: number) => {
        if (!ms) return "--:--";
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="2. Complete History (Timeline)" icon={<Clock className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[80vh] flex flex-col">
                <div className="flex flex-col h-full flex-1">
                    
                    {/* Top Controls */}
                    <div className="flex items-center justify-between mt-4 mb-6">
                        <h3 className="text-lg font-bold text-theme-text">Recently Played</h3>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-theme-bg/50 border border-theme-border/50 rounded-full px-4 py-1.5 text-xs text-theme-text-muted">
                                <span>30-08-2023</span>
                                <span className="mx-2">→</span>
                                <span>30-08-2023</span>
                                <Filter className="w-3 h-3 ml-3 text-theme-accent" />
                            </div>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wider text-theme-text-muted pb-3 border-b border-theme-border/50 px-4">
                        <div className="col-span-2">Time</div>
                        <div className="col-span-4">Track</div>
                        <div className="col-span-3">Artist</div>
                        <div className="col-span-2">Album</div>
                        <div className="col-span-1 text-right">Duration</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto pr-2 mt-2 space-y-1">
                        {loading ? (
                            <div className="text-center py-10 text-theme-text-muted">Loading timeline...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-theme-text-muted">No history found. Listen to some tracks!</div>
                        ) : (
                            history.map((item, i) => {
                                const playedAt = new Date(item.played_at);
                                return (
                                    <div key={item.id || i} className="grid grid-cols-12 gap-4 text-sm items-center hover:bg-theme-bg/50 p-2 px-4 rounded-lg transition-colors border border-transparent hover:border-theme-border/30 group">
                                        <div className="col-span-2 text-theme-text-muted text-xs">
                                            {format(playedAt, "HH:mm a")}
                                        </div>
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded overflow-hidden bg-theme-border/50 relative">
                                                {/* Fallback image block, actual image URL would come from API if fetched */}
                                                <div className="absolute inset-0 bg-theme-accent/20 flex items-center justify-center text-xs group-hover:bg-theme-accent/40 transition-colors">🎵</div>
                                            </div>
                                            <div className="truncate font-medium text-theme-text group-hover:text-theme-accent transition-colors">
                                                {item.track_name || "Unknown Track"}
                                            </div>
                                        </div>
                                        <div className="col-span-3 truncate text-theme-text-muted">
                                            {item.artist_name || "Unknown Artist"}
                                        </div>
                                        <div className="col-span-2 truncate text-theme-text-muted text-xs">
                                            {item.album_name || "Single"}
                                        </div>
                                        <div className="col-span-1 text-right text-theme-text-muted font-mono text-xs">
                                            {formatDuration(item.duration_ms)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </GlassCard>
        </div>
    );
}
