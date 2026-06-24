"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchWithRateLimit } from "@/utils/api";
import { ArrowLeft, Loader2, ChevronDown, CheckCircle2, Star, Music, Search } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const MOOD_COLORS: Record<string, string> = {
    "High Energy": "#F97316", // Orange
    "Chill": "#3B82F6", // Blue
    "Focus": "#A855F7", // Purple
    "Happy": "#22C55E", // Green
    "Sad": "#64748B", // Slate
    "Unknown": "#475569"
};

const GENRE_COLORS = ['#22C55E', '#A855F7', '#F97316', '#3B82F6', '#EAB308'];

export default function ListeningHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredSession, setHoveredSession] = useState<any | null>(null);

    // Filters state
    const [filterShow, setFilterShow] = useState("All");
    const [filterGenre, setFilterGenre] = useState("All");
    const [dateRange, setDateRange] = useState("Current Week");
    const [period, setPeriod] = useState("All Time");
    const [timelineGrouping, setTimelineGrouping] = useState("Artist");
    const [timelineGroupingOpen, setTimelineGroupingOpen] = useState(false);

    const fetchHistory = async (isBackground = false) => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        if (!isBackground) setLoading(true);
        try {
            const limit = isBackground ? 1 : 10000;
            const data = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=${limit}`);
            if (data && data.data) {
                if (isBackground && data.data.length > 0) {
                    setHistory(prev => {
                        const newTrack = data.data[0];
                        if (prev.some(t => t.id === newTrack.id)) return prev;
                        return [newTrack, ...prev].slice(0, 10000);
                    });
                } else if (!isBackground) {
                    setHistory(data.data);
                }
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();
        const intervalId = setInterval(() => fetchHistory(true), 30000);
        const onFocus = () => fetchHistory(true);
        window.addEventListener("focus", onFocus);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    // 1. Process data for the Advanced Timeline (X = Days of week, Y = Top Artists)
        const processedTimelineData = useMemo(() => {
        if (history.length === 0) return { groups: [], sessions: [], minTime: 0, maxTime: 1 };

        // Determine top groups based on timelineGrouping
        const groupCounts: Record<string, number> = {};
        history.forEach(t => {
            let val = "Unknown";
            if (timelineGrouping === "Artist") val = t.artist_name || "Unknown Artist";
            else if (timelineGrouping === "Mood") val = t.ai_mood || t.mood_category || "Unknown Mood";
            else if (timelineGrouping === "Listening Activity") {
                val = t.ml_features?.time_of_day_fit || t.time_of_day_fit || "General Activity";
            }
            else if (timelineGrouping === "Context") val = t.ml_features?.cultural_context || t.ml_features?.context_tag || t.context || "Unknown Context";
            
            groupCounts[val] = (groupCounts[val] || 0) + 1;
        });
        
        const topGroups = Object.entries(groupCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);

        // Group history into sessions per group
        const sessionsByGroup: any[] = [];
        let idCounter = 0;

        topGroups.forEach((groupName, index) => {
            const groupTracks = history.filter(t => {
                if (timelineGrouping === "Artist") return (t.artist_name || "Unknown Artist") === groupName;
                if (timelineGrouping === "Mood") return (t.ai_mood || t.mood_category || "Unknown Mood") === groupName;
                if (timelineGrouping === "Listening Activity") return (t.ml_features?.time_of_day_fit || t.time_of_day_fit || "General Activity") === groupName;
                if (timelineGrouping === "Context") return (t.ml_features?.cultural_context || t.ml_features?.context_tag || t.context || "Unknown Context") === groupName;
                return false;
            }).reverse(); // chronological
            
            if (groupTracks.length === 0) return;

            let currentSession = {
                id: `sess-${idCounter++}`,
                groupName: groupName,
                groupIndex: index,
                startTime: new Date(groupTracks[0].time),
                endTime: new Date(groupTracks[0].time),
                mood: groupTracks[0].ai_mood || groupTracks[0].mood_category || "Unknown",
                tracks: [groupTracks[0]]
            };

            for (let i = 1; i < groupTracks.length; i++) {
                const track = groupTracks[i];
                const trackTime = new Date(track.time);
                const prevTime = new Date(groupTracks[i-1].time);
                const diffMins = (trackTime.getTime() - prevTime.getTime()) / 60000;

                if (diffMins > 30 || (track.ai_mood !== currentSession.mood && diffMins > 5)) {
                    sessionsByGroup.push(currentSession);
                    currentSession = {
                        id: `sess-${idCounter++}`,
                        groupName: groupName,
                        groupIndex: index,
                        startTime: trackTime,
                        endTime: trackTime,
                        mood: track.ai_mood || track.mood_category || "Unknown",
                        tracks: [track]
                    };
                } else {
                    currentSession.tracks.push(track);
                    currentSession.endTime = trackTime;
                }
            }
            sessionsByGroup.push(currentSession);
        });

        const latestTrackTime = history.length > 0 ? new Date(history[0].time).getTime() : Date.now();
        const startOfWeek = latestTrackTime - (7 * 24 * 60 * 60 * 1000);

        return {
            groups: topGroups,
            sessions: sessionsByGroup,
            minTime: startOfWeek,
            maxTime: latestTrackTime
        };
    }, [history, timelineGrouping]);

    const getMoodColor = (mood: string) => {
        for (const [key, color] of Object.entries(MOOD_COLORS)) {
            if (mood.includes(key)) return color;
        }
        return MOOD_COLORS["Unknown"];
    };



    const topArtistsList = useMemo(() => {
        const artistCounts: Record<string, number> = {};
        history.forEach(t => {
            if(t.artist_name) {
                artistCounts[t.artist_name] = (artistCounts[t.artist_name] || 0) + 1;
            }
        });
        return Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [history]);

    const { groups, sessions, minTime, maxTime } = processedTimelineData;
    const timeSpan = maxTime - minTime;

    // Helper to position blocks
    const getLeftPercent = (time: number) => {
        if (time < minTime) return 0;
        return ((time - minTime) / timeSpan) * 100;
    };
    const getWidthPercent = (start: number, end: number, minWidth = 2) => {
        const s = Math.max(start, minTime);
        const e = Math.min(end, maxTime);
        if (s >= maxTime || e <= minTime) return 0;
        // Make sure it has a minimum width to be visible, or scale by track count
        const calculated = ((e - s) / timeSpan) * 100;
        return Math.max(minWidth, calculated);
    };

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className="min-h-screen bg-[var(--theme-bg)] text-white p-4 sm:p-6 font-sans scrollbar-hide">
            <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
                
                {/* Header & Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    <Link prefetch={false} href="/dashboard" className="p-2 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full hover:border-[var(--theme-accent)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Listening Journey Timeline</h1>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 bg-[var(--theme-panel)] px-4 py-2 rounded-xl border border-[var(--theme-border)] cursor-pointer">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 ml-2">Search timeline...</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--theme-panel)] px-4 py-2 rounded-xl border border-[var(--theme-border)] ml-auto">
                        <span className="text-xs text-gray-400 font-medium">Date Range:</span>
                        <div className="flex items-center gap-2 group/nav cursor-pointer">
                            <span className="text-gray-500 hover:text-white opacity-0 group-hover/nav:opacity-100 transition-opacity">&lt;</span>
                            <span className="text-xs text-white flex items-center gap-2">{dateRange} <ChevronDown className="w-3 h-3 text-gray-500" /></span>
                            <span className="text-gray-500 hover:text-white opacity-0 group-hover/nav:opacity-100 transition-opacity">&gt;</span>
                        </div>
                    </div>
                </div>

                {/* Main 2D Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* Gantt Chart Timeline */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 lg:col-span-2 xl:col-span-3 relative overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                <div 
                                    className="bg-[#1C1C24] px-4 py-2 rounded-full border border-[#2D2D3A] flex items-center gap-2 cursor-pointer hover:border-[var(--theme-accent)] transition-colors"
                                    onClick={() => setTimelineGroupingOpen(!timelineGroupingOpen)}
                                >
                                    <span className="text-xs text-white">Group By: {timelineGrouping}</span>
                                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${timelineGroupingOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {timelineGroupingOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1C1C24] border border-[#2D2D3A] rounded-xl shadow-xl z-50 overflow-hidden py-1">
                                        {['Artist', 'Mood', 'Listening Activity', 'Context'].map((option) => (
                                            <div 
                                                key={option}
                                                className={`px-4 py-2 text-xs cursor-pointer hover:bg-[var(--theme-border)] ${timelineGrouping === option ? 'text-[var(--theme-accent)]' : 'text-gray-300'}`}
                                                onClick={() => {
                                                    setTimelineGrouping(option);
                                                    setTimelineGroupingOpen(false);
                                                }}
                                            >
                                                Group by {option}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            </div>
                            <div className="flex gap-4">
                                {timelineGrouping === "Mood" ? (
                                    Object.entries(MOOD_COLORS).slice(0,3).map(([name, color]) => (
                                        <div key={name} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
                                            <span className="text-[10px] text-gray-400">{name}</span>
                                        </div>
                                    ))
                                ) : (
                                    groups.slice(0,3).map((name, idx) => (
                                        <div key={name} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }}></div>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[80px]" title={name}>{name}</span>
                                        </div>
                                    ))
                                )}
                                <div className="text-gray-400">...</div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex justify-center items-center">
                                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="flex-1 flex justify-center items-center text-gray-500 text-sm">
                                No listening history found for this period.
                            </div>
                        ) : timelineGrouping === "Mood" ? (
                                <div className="flex-1 flex flex-col justify-center items-center bg-[#1C1C24] rounded-3xl border-2 border-dashed border-[#2D2D3A] m-4 p-8 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-[var(--theme-accent)]/5 to-transparent pointer-events-none"></div>
                                    <div className="w-16 h-16 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--theme-accent)]/10">
                                        <div className="w-8 h-8 rounded-full bg-[var(--theme-accent)]/20 animate-pulse"></div>
                                    </div>
                                    <h3 className="text-2xl font-bold tracking-tight text-white mb-4">TBD: 3D Mood Analytics</h3>
                                    <p className="text-sm text-gray-400 text-center max-w-lg leading-relaxed">
                                        This section will feature an interactive 3D graph showing how your listening activity takes a dip when you listen to sad songs, goes up with heavy metal, and stays positive with happy songs. 
                                        <br/><br/>
                                        <span className="text-[var(--theme-accent)]">Currently under development.</span>
                                    </p>
                                </div>
                            ) : (
                            <div className="flex-1 flex flex-col mt-4">
                                {/* X-Axis Header (Days) */}
                                <div className="flex border-b border-[var(--theme-border)] pb-2 mb-4 ml-[120px]">
                                    {days.map((day, i) => (
                                        <div key={day} className="flex-1 text-center text-xs text-gray-500">{day}</div>
                                    ))}
                                </div>

                                {/* Y-Axis Rows and Timeline Grid */}
                                <div className="relative flex-1">
                                    {/* Vertical Grid Lines */}
                                    <div className="absolute inset-0 ml-[120px] flex pointer-events-none">
                                        {days.map((day, i) => (
                                            <div key={day} className="flex-1 border-l border-[var(--theme-border)] opacity-30"></div>
                                        ))}
                                    </div>



                                    {/* Artist/Group Rows */}
                                    {groups.map((groupName, idx) => (
                                        <div key={groupName} className="relative h-16 flex items-center border-b border-[var(--theme-border)] opacity-80 last:border-0 hover:bg-white/5 transition-colors group">
                                            {/* Row Header (Y-Axis) */}
                                            <div className="w-[120px] shrink-0 flex items-center gap-3 z-20">
                                                <div className="w-8 h-8 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center shrink-0 overflow-hidden">
                                                    {/* Generic Avatar/Icon */}
                                                    <Star className="w-4 h-4 text-gray-500 group-hover:text-[var(--theme-accent)] transition-colors" />
                                                </div>
                                                <div className="text-xs text-gray-300 font-medium truncate pr-2">{groupName}</div>
                                            </div>

                                            {/* Row Blocks */}
                                            <div className="flex-1 relative h-full">
                                                {sessions.filter(s => s.groupIndex === idx).map(session => {
                                                    // Add artificial width padding based on track count to make it visible
                                                    const extraWidth = session.tracks.length * 2;
                                                    const left = getLeftPercent(session.startTime.getTime());
                                                    const width = getWidthPercent(session.startTime.getTime(), session.endTime.getTime(), 3 + extraWidth);
                                                    const color = timelineGrouping === "Mood" ? getMoodColor(session.mood) : GENRE_COLORS[session.groupIndex % GENRE_COLORS.length];

                                                    return (
                                                        <div 
                                                            key={session.id}
                                                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer transition-all hover:brightness-125 z-20"
                                                            style={{ 
                                                                left: `${left}%`,
                                                                width: `${width}%`, 
                                                                backgroundColor: color,
                                                                opacity: hoveredSession && hoveredSession.id !== session.id ? 0.3 : 0.8
                                                            }}
                                                            onMouseEnter={() => setHoveredSession(session)}
                                                            onMouseLeave={() => setHoveredSession(null)}
                                                        >
                                                            {/* Hover Tooltip perfectly matching image */}
                                                            {hoveredSession?.id === session.id && (
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#1C1C24] border border-[#2D2D3A] rounded-xl p-3 shadow-2xl z-50">
                                                                    <div className="flex gap-3 mb-3 border-b border-[#2D2D3A] pb-3">
                                                                        <div className="w-12 h-12 bg-[#101014] rounded shadow-inner shrink-0 flex items-center justify-center">
                                                                            <span className="text-[8px] text-gray-500 uppercase">Cover</span>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="text-white font-bold text-sm truncate leading-tight">{session.tracks[0]?.track_name || "Unknown Track"}</div>
                                                                            <div className="text-gray-400 text-xs mt-1">{session.tracks.length} Tracks</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Group Event:</div>
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-300">
                                                                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#22C55E' }}></div>
                                                                            <span>{session.mood} Listen</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-300">
                                                                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#F97316' }}></div>
                                                                            <span>AI Analysis Fired</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[10px] text-gray-300">
                                                                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#A855F7' }}></div>
                                                                            <span>Group Activity</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}
                        

                    </div>

                    {/* Right Column: Genre Exploration & Top Artists */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        
                        {/* Mood 3D Graph Placeholder */}
                        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col h-[300px] items-center justify-center">
                            <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2">Mood Trends</h3>
                            <div className="text-gray-500 text-sm text-center">
                                <p>[TBD: 3D Mood Graph Visualization]</p>
                                <p className="text-xs mt-2 opacity-70">Will display dynamic trends tracking sad dips, positive highs, and heavy metal intensity.</p>
                            </div>
                        </div>

                        {/* Top Artists & Transactions */}
                        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex-1">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Top Artists & Transactions</h3>
                                <span className="text-gray-500 text-xs">...</span>
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-4 border-b border-[var(--theme-border)] pb-2">
                                <span>Artists</span>
                                <span>User Contribution</span>
                            </div>

                            <div className="space-y-4">
                                {topArtistsList.map(([artist, count], i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#1C1C24] border border-[#2D2D3A] rounded-full flex items-center justify-center">
                                                <Star className="w-3 h-3 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-white font-bold flex items-center gap-1">
                                                    {artist} <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                                                </div>
                                                <div className="text-[10px] text-gray-500">Listening</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-white font-bold">{count}</div>
                                            <div className="text-[9px] text-gray-500 uppercase">User contribution</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Key Group Insights */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Key Group Insights</h3>
                            <span className="text-gray-500 text-xs">...</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-md bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center shrink-0 mt-0.5">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-white font-bold">New release shared listen</div>
                                    <div className="text-[10px] text-gray-500">New release shared listen</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-md bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center shrink-0 mt-0.5">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-white font-bold">Remastered new lights</div>
                                    <div className="text-[10px] text-gray-500">New release shared listen</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-md bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center shrink-0 mt-0.5">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-white font-bold">Group Activity</div>
                                    <div className="text-[10px] text-gray-500">New release shared listen</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shared Playlist Synergy */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Shared Playlist Synergy</h3>
                            <span className="text-gray-500 text-xs">...</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-[#22C55E]" />
                                </div>
                                <span className="text-xs text-white">Shared Playlist</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <span className="text-xs text-white">Shared Playlist</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1C1C24] border border-[#2D2D3A] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-[#A855F7]" />
                                </div>
                                <span className="text-xs text-white">Shared Playlist</span>
                            </div>
                        </div>
                    </div>

                    {/* Group Stats */}
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Group Stats</h3>
                            <span className="text-gray-500 text-xs">...</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[#1C1C24] border border-[#2D2D3A] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Total Group<br/>Listening Time</div>
                                <div className="text-lg font-bold text-white mt-2">3:37m</div>
                            </div>
                            <div className="bg-[#1C1C24] border border-[#2D2D3A] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Unique<br/>Tracks</div>
                                <div className="text-lg font-bold text-white mt-2">383</div>
                            </div>
                            <div className="bg-[#1C1C24] border border-[#2D2D3A] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Favorite<br/>Genre</div>
                                <div className="text-lg font-bold text-white mt-2">34+</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
