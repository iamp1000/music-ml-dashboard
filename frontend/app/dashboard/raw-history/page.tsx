"use client";

import React, { useEffect, useState } from "react";
import { fetchWithRateLimit } from "@/utils/api";
import { Loader2, Clock } from "lucide-react";
import { RawHistoryHeader } from "@/components/RawHistoryHeader";
import { WeekNavigationControls } from "@/components/WeekNavigationControls";
import { SessionCard, type Session } from "@/components/SessionCard";
import { StatsBlock, type StatsItem } from "@/components/StatsBlock";
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
    const sessions: Session[] = timelineData?.sessions || [];
    const topArtists: StatsItem[] = (stats.top_artists || []).map((a: any) => ({ name: a.name, count: a.count }));
    const topContexts: StatsItem[] = (stats.top_contexts || []).map((c: any) => ({ name: c.name, count: c.count }));

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
                                sessions.map((session, idx) => (
                                    <SessionCard key={idx} session={session} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Dynamic Mood Topology & Stats */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        
                        {/* Dynamic Mood Topology */}
                        <div className="h-[300px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                            <DynamicMoodTopology history={sessions.flatMap((s) => s.tracks)} />
                        </div>

                        {/* Premium Stats Blocks */}
                        <div className="flex-1 flex flex-col gap-4">
                            <StatsBlock
                                title="Top Artists"
                                items={topArtists}
                            />
                            <StatsBlock
                                title="Top Contexts"
                                items={topContexts}
                                accentColor="#3b82f6"
                                hoverAccentClass="group-hover:text-blue-400"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
