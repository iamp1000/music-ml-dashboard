"use client";

import React, { useEffect, useState } from "react";
import { fetchWithRateLimit } from "@/utils/api";
import { Loader2, ChevronDown, CheckCircle2, Music, Search, Clock, ListMusic } from "lucide-react";
import { RawHistoryHeader } from "@/components/RawHistoryHeader";
import { WeekNavigationControls } from "@/components/WeekNavigationControls";
import ArtistBarChart from "@/components/visualizations/ArtistBarChart";
import ListeningActivityChart from "@/components/visualizations/ListeningActivityChart";
import TopArtistsList from "@/components/visualizations/TopArtistsList";
import DynamicMoodTopology from "@/components/visualizations/DynamicMoodTopology";

export default function ListeningHistoryPage() {
    const [timelineData, setTimelineData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);

    const fetchTimeline = async (isBackground = false) => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        if (!isBackground) setLoading(true);
        try {
            const data = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/analytics/timeline`);
            if (data && data.data) {
                setTimelineData(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch timeline", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTimeline();
        const intervalId = setInterval(() => fetchTimeline(true), 30000);
        return () => clearInterval(intervalId);
    }, []);

    const stats = timelineData?.stats || { top_artists: [], top_moods: [], top_contexts: [] };
    const sessions = timelineData?.sessions || [];

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] text-white p-4 sm:p-6 font-sans scrollbar-hide">
            <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
                
                {/* Header & Navigation */}
                <RawHistoryHeader backHref="/dashboard" title="Listening Journey" />

                {/* Main Premium Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* Main Timeline Column */}
                    <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
                        
                        {/* Timeline Header Glass Card */}
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#1A1C23] to-[#0A0B10] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl p-6">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-accent)] to-transparent opacity-50" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-[var(--theme-accent)]" />
                                        Recent Sessions
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">Machine Learning analyzed tracks organized by listening sessions.</p>
                                </div>
                                <WeekNavigationControls
                                    weekOffset={weekOffset}
                                    onOlderWeekClick={() => setWeekOffset(w => w + 1)}
                                    onNewerWeekClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                                />
                            </div>
                        </div>

                        {/* Sessions Feed */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center py-20 gap-4">
                                    <Loader2 className="w-8 h-8 text-[var(--theme-accent)] animate-spin" />
                                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Loading Timeline...</span>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-20 text-gray-500 font-medium">No listening history found.</div>
                            ) : (
                                sessions.map((session: any, idx: number) => (
                                    <div key={idx} className="group relative rounded-3xl overflow-hidden border border-white/5 bg-[#12141A] hover:bg-[#151820] hover:border-white/10 transition-all p-6">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--theme-accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
                                                    <ListMusic className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                                        {session.dominant_mood} Session
                                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-gray-300 font-medium border border-white/5">
                                                            {session.tracks.length} tracks
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 font-medium">
                                                        {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                                {new Date(session.start_time).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-4 pl-13">
                                            {session.tracks.slice(0, 5).map((track: any, tIdx: number) => (
                                                <div key={tIdx} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full pl-1 pr-3 py-1">
                                                    <div className="w-5 h-5 rounded-full bg-[#1A1C23] flex items-center justify-center">
                                                        <Music className="w-2.5 h-2.5 text-[var(--theme-accent)]" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-gray-300 truncate max-w-[120px]">{track.track_name}</span>
                                                </div>
                                            ))}
                                            {session.tracks.length > 5 && (
                                                <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1">
                                                    <span className="text-[11px] font-bold text-gray-500">+{session.tracks.length - 5} more</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Dynamic Mood Topology & Stats */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        
                        {/* Dynamic Mood Topology */}
                        <div className="h-[300px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                            <DynamicMoodTopology history={sessions.flatMap((s: any) => s.tracks)} />
                        </div>

                        {/* Premium Stats Blocks */}
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="bg-gradient-to-br from-[#1A1C23] to-[#0A0B10] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-accent)] opacity-10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2" />
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Top Artists</h3>
                                <div className="space-y-3">
                                    {stats.top_artists.map((artist: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <span className="text-sm font-bold text-white group-hover:text-[var(--theme-accent)] transition-colors truncate">{artist.name}</span>
                                            <span className="text-xs text-gray-500 font-medium">{artist.count} plays</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-[#1A1C23] to-[#0A0B10] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 opacity-10 blur-[50px] rounded-full -translate-x-1/2 translate-y-1/2" />
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Top Contexts</h3>
                                <div className="space-y-3">
                                    {stats.top_contexts.map((ctx: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{ctx.name}</span>
                                            <span className="text-xs text-gray-500 font-medium">{ctx.count} plays</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
