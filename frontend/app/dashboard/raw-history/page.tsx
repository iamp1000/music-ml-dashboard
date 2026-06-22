"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithRateLimit } from "@/utils/api";
import { ArrowLeft, Loader2, ChevronDown, CheckCircle2, Star, Clock, Music, Calendar } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MOOD_COLORS: Record<string, string> = {
    "High Energy": "#F97316", // Orange
    "Chill": "#3B82F6", // Blue
    "Focus": "#A855F7", // Purple
    "Happy": "#22C55E", // Green
    "Sad": "#64748B", // Slate
    "Unknown": "#475569"
};

const GENRE_COLORS = ['#22C55E', '#F97316', '#A855F7', '#3B82F6', '#EAB308'];

export default function ListeningHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredSession, setHoveredSession] = useState<any | null>(null);

    // Filters state
    const [filterShow, setFilterShow] = useState("All");
    const [filterGenre, setFilterGenre] = useState("All");
    const [dateRange, setDateRange] = useState("Current Day");
    const [period, setPeriod] = useState("All Time");

    const fetchHistory = async (isBackground = false) => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        if (!isBackground) setLoading(true);
        try {
            const data = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/history?token=${token}&limit=100`);
            if (data && data.data) {
                setHistory(data.data);
                groupIntoSessions(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();

        const intervalId = setInterval(() => {
            fetchHistory(true);
        }, 30000);

        const onFocus = () => fetchHistory(true);
        window.addEventListener("focus", onFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    const groupIntoSessions = (historyData: any[]) => {
        if (historyData.length === 0) {
            setSessions([]);
            return;
        }
        
        const grouped = [];
        let currentSession = {
            id: historyData[0].id,
            startTime: new Date(historyData[0].time),
            endTime: new Date(historyData[0].time),
            context: historyData[0].context || "None",
            mood: historyData[0].ai_mood || historyData[0].mood_category || "Unknown",
            tracks: [historyData[0]]
        };
        
        for (let i = 1; i < historyData.length; i++) {
            const track = historyData[i];
            const trackTime = new Date(track.time);
            const prevTrackTime = new Date(historyData[i-1].time);
            
            const diffMinutes = (prevTrackTime.getTime() - trackTime.getTime()) / 60000;
            
            if (diffMinutes > 20) {
                grouped.push(currentSession);
                currentSession = {
                    id: track.id,
                    startTime: trackTime,
                    endTime: trackTime,
                    context: track.context || "None",
                    mood: track.ai_mood || track.mood_category || "Unknown",
                    tracks: [track]
                };
            } else {
                currentSession.tracks.push(track);
                currentSession.startTime = trackTime;
            }
        }
        grouped.push(currentSession);
        
        setSessions(grouped);
    };

    const getMoodColor = (mood: string) => {
        for (const [key, color] of Object.entries(MOOD_COLORS)) {
            if (mood.includes(key)) return color;
        }
        return MOOD_COLORS["Unknown"];
    };

    // Calculate dynamic stats
    const totalListenTimeMins = history.reduce((sum, t) => sum + ((t.played_ms || 0) / 60000), 0);
    const uniqueTracksCount = new Set(history.map(t => t.track_name)).size;
    
    // Genre calculations from tracks
    const genreCounts: Record<string, number> = {};
    history.forEach(t => {
        const g = t.ai_mood || "Unknown";
        genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "None";

    const genrePieData = sortedGenres.slice(0, 5).map(([name, count], idx) => ({
        name,
        value: count
    }));

    // Top Artists calculation
    const artistCounts: Record<string, number> = {};
    history.forEach(t => {
        if(t.artist_name) {
            artistCounts[t.artist_name] = (artistCounts[t.artist_name] || 0) + 1;
        }
    });
    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] text-white p-4 sm:p-6 font-sans scrollbar-hide">
            <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
                
                {/* Header & Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full hover:border-[var(--theme-accent)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Listening Journey Timeline</h1>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-4 bg-[var(--theme-panel)] border border-[var(--theme-border)] p-3 rounded-2xl">
                    <div className="flex items-center gap-2 bg-[var(--theme-bg)] px-4 py-2 rounded-xl border border-[var(--theme-border)]">
                        <span className="text-xs text-gray-400 font-medium">Show:</span>
                        <span className="text-xs text-white flex items-center gap-2">{filterShow} <ChevronDown className="w-3 h-3 text-gray-500" /></span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--theme-bg)] px-4 py-2 rounded-xl border border-[var(--theme-border)]">
                        <span className="text-xs text-gray-400 font-medium">Filter:</span>
                        <span className="text-xs text-white flex items-center gap-2">Genre ({filterGenre}) <ChevronDown className="w-3 h-3 text-gray-500" /></span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--theme-bg)] px-4 py-2 rounded-xl border border-[var(--theme-border)]">
                        <span className="text-xs text-gray-400 font-medium">Date Range:</span>
                        <span className="text-xs text-white flex items-center gap-2">{dateRange} <ChevronDown className="w-3 h-3 text-gray-500" /></span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--theme-bg)] px-4 py-2 rounded-xl border border-[var(--theme-border)] ml-auto">
                        <span className="text-xs text-gray-400 font-medium">Period:</span>
                        <span className="text-xs text-white flex items-center gap-2">{period} <ChevronDown className="w-3 h-3 text-gray-500" /></span>
                    </div>
                </div>

                {/* Timeline Area */}
                <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 relative overflow-hidden min-h-[300px]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Continuous Timeline</div>
                        <div className="flex gap-4">
                            {Object.entries(MOOD_COLORS).slice(0,4).map(([name, color]) => (
                                <div key={name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
                                    <span className="text-[10px] text-gray-400 uppercase">{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex justify-center items-center h-32 text-gray-500 text-sm">
                            No listening history found for this period.
                        </div>
                    ) : (
                        <div className="relative mt-12 mb-16 px-4">
                            {/* Axis Line */}
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--theme-border)] -translate-y-1/2"></div>
                            
                            {/* Axis Labels (Mocking hours based on start/end of sessions) */}
                            <div className="absolute -top-8 left-0 right-0 flex justify-between text-[10px] text-gray-500 font-mono">
                                <span>{sessions[sessions.length-1]?.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span>{sessions[0]?.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>

                            {/* Timeline Blocks Container */}
                            <div className="relative h-12 flex items-center w-full gap-1 overflow-x-auto scrollbar-hide">
                                {sessions.slice().reverse().map((session, idx) => {
                                    // Calculate relative width based on tracks (mock duration mapping)
                                    const widthPercent = Math.max(5, Math.min(100, session.tracks.length * 10));
                                    const color = getMoodColor(session.mood);

                                    return (
                                        <div 
                                            key={session.id}
                                            className="h-8 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-105 hover:-translate-y-1 relative"
                                            style={{ 
                                                width: `${widthPercent}%`, 
                                                backgroundColor: color,
                                                opacity: 0.8
                                            }}
                                            onMouseEnter={() => setHoveredSession(session)}
                                            onMouseLeave={() => setHoveredSession(null)}
                                        >
                                            {/* Hover Popover */}
                                            {hoveredSession?.id === session.id && (
                                                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl p-4 shadow-2xl z-50">
                                                    <div className="flex gap-3 mb-3">
                                                        <div className="w-10 h-10 bg-[var(--theme-bg)] rounded-lg shrink-0 flex items-center justify-center">
                                                            <Music className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-white font-bold text-sm truncate">{session.tracks[0]?.track_name}</div>
                                                            <div className="text-gray-400 text-xs truncate">{session.tracks.length} Tracks in session</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-300">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                                            <span className="font-bold">{session.mood}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            AI Tag: {session.tracks[0]?.ai_analysis || "Analyzed Session"}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Containers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    
                    {/* Key Group Insights */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-1">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">AI Listening Insights</h3>
                        <div className="space-y-4">
                            {sessions.slice(0,3).map((s, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="w-6 h-6 rounded-full bg-[var(--theme-bg)] flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: getMoodColor(s.mood)}}></div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-white font-bold">{s.mood} Session</div>
                                        <div className="text-[10px] text-gray-500 leading-tight mt-1 truncate max-w-[120px]">{s.tracks[0]?.track_name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shared Playlist Synergy */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-1">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Playlist Synergy</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Music className="w-4 h-4 text-[#D1F26D]" />
                                <span className="text-xs text-white">Daily Mix 1</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Music className="w-4 h-4 text-[#3B82F6]" />
                                <span className="text-xs text-white">Focus Flow</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Music className="w-4 h-4 text-[#A855F7]" />
                                <span className="text-xs text-white">Discover Weekly</span>
                            </div>
                        </div>
                    </div>

                    {/* Session Stats */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-1 flex flex-col justify-between">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Session Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--theme-bg)] rounded-2xl p-4">
                                <div className="text-[10px] text-gray-400 uppercase">Listening Time</div>
                                <div className="text-lg font-bold text-white mt-1">{Math.round(totalListenTimeMins)}m</div>
                            </div>
                            <div className="bg-[var(--theme-bg)] rounded-2xl p-4">
                                <div className="text-[10px] text-gray-400 uppercase">Unique Tracks</div>
                                <div className="text-lg font-bold text-white mt-1">{uniqueTracksCount}</div>
                            </div>
                            <div className="bg-[var(--theme-bg)] rounded-2xl p-4 col-span-2">
                                <div className="text-[10px] text-gray-400 uppercase">Favorite Genre / Mood</div>
                                <div className="text-sm font-bold text-white mt-1">{topGenre}</div>
                            </div>
                        </div>
                    </div>

                    {/* Genre Exploration (Concentric Donut Chart) */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-1 flex flex-col">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Genre Exploration</h3>
                        <div className="flex-1 relative min-h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genrePieData}
                                        innerRadius="50%"
                                        outerRadius="80%"
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {genrePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Artists & Transactions */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-1">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Top Artists</h3>
                        <div className="space-y-4">
                            {topArtists.map(([artist, count], i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[var(--theme-bg)] rounded-full flex items-center justify-center">
                                            <Star className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-white font-bold flex items-center gap-1">
                                                {artist} <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            </div>
                                            <div className="text-[10px] text-gray-500">Listening</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-white font-bold">{count}</div>
                                        <div className="text-[9px] text-gray-500 uppercase">Plays</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
