"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithRateLimit } from "@/utils/api";
import { ArrowLeft, Clock, Activity, Music, Calendar } from "lucide-react";

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem("jwt");
            if (!token) return;

            try {
                const data = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/history?token=${token}`);
                if (data && data.data) {
                    setHistory(data.data);
                }
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
            setLoading(false);
        };
        fetchHistory();
    }, []);

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const formatDuration = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#06080C] text-white p-6 md:p-12 font-sans selection:bg-theme-accent selection:text-black">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-[#131823] border border-[#1B2332] rounded-full hover:border-theme-accent transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Listening History</h1>
                        <p className="text-theme-text-muted text-sm">Raw telemetry data & AI analysis</p>
                    </div>
                </div>

                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-theme-text-muted">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center text-theme-text-muted">No listening history found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#131823] text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Track</th>
                                        <th className="px-6 py-4 font-medium">Played</th>
                                        <th className="px-6 py-4 font-medium">Context</th>
                                        <th className="px-6 py-4 font-medium">AI Mood</th>
                                        <th className="px-6 py-4 font-medium">Time Fit</th>
                                        <th className="px-6 py-4 font-medium text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1B2332]">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#131823]/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white max-w-[200px] truncate">{item.track_name}</div>
                                                <div className="text-xs text-theme-text-muted max-w-[200px] truncate">{item.artist_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-300">{formatDuration(item.played_ms)} / {formatDuration(item.duration_ms)}</div>
                                                <div className="text-xs text-theme-accent mt-0.5">{item.listen_type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-[#1B2332] text-gray-300 rounded-md text-xs font-semibold">
                                                    {item.context || "None"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-white">{item.mood_category || "Unknown"}</div>
                                                <div className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate" title={item.ai_analysis}>
                                                    {item.ai_analysis || `Valence: ${(item.valence||0).toFixed(2)}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 text-xs">
                                                {item.time_of_day_fit || "Anytime"}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-400 text-xs">
                                                {formatTime(item.time)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
