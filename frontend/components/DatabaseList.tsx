"use client";

import React, { useEffect, useState } from "react";
import gsap from "gsap";

interface TrackHistory {
    time: string;
    track_id: string;
    track_name?: string;
    artist_name?: string;
    valence: number;
    arousal: number;
    energy: number;
}

export default function DatabaseList() {
    const [history, setHistory] = useState<TrackHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const protocol = window.location.protocol;
                const host = 'music-ml-dashboard.onrender.com';
                const res = await fetch(`${protocol}//${host}/telemetry/history`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.status === "success") {
                    // Sort descending by time
                    const sorted = data.data.sort((a: TrackHistory, b: TrackHistory) => 
                        new Date(b.time).getTime() - new Date(a.time).getTime()
                    );
                    setHistory(sorted);
                }
            } catch (e) {
                console.error("Failed to fetch history:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchHistory, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="p-6 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 text-white animate-pulse">Loading database history...</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {history.length === 0 ? (
                    <div className="text-zinc-500 italic">No listening history found yet... play some tracks!</div>
                ) : (
                    history.map((track, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/60 transition-colors border border-transparent hover:border-zinc-700">
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-zinc-100">
                                    {track.track_name ? track.track_name : `Track ID: ${track.track_id.substring(0, 8)}...`}
                                </span>
                                <span className="text-xs text-zinc-400">
                                    {track.artist_name ? track.artist_name : "Unknown Artist"} • {new Date(track.time).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex gap-4 text-xs font-mono text-right">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500">Valence</span>
                                    <span className={track.valence > 0.5 ? 'text-emerald-400' : 'text-rose-400'}>{track.valence.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500">Energy</span>
                                    <span className="text-cyan-400">{track.energy.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
