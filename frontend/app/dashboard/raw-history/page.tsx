"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchWithRateLimit } from "@/utils/api";
import { ArrowLeft, Loader2, ChevronDown, CheckCircle2, Star, Music, Search } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import EmotionalScatterPlot from "@/components/EmotionalScatterPlot";
import ArtistBarChart from "@/components/visualizations/ArtistBarChart";
import ListeningActivityChart from "@/components/visualizations/ListeningActivityChart";
import MoodPieChart from "@/components/visualizations/MoodPieChart";
import DynamicMoodTopology from "@/components/visualizations/DynamicMoodTopology";
import TopArtistsList from "@/components/visualizations/TopArtistsList";
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
    const [editingSession, setEditingSession] = useState<any | null>(null);
    const [contextInput, setContextInput] = useState("");
    const [isUpdatingContext, setIsUpdatingContext] = useState(false);

    // Filters state
    const [filterShow, setFilterShow] = useState("All");
    const [filterGenre, setFilterGenre] = useState("All");
    const [dateRange, setDateRange] = useState("Current Week");
    const [period, setPeriod] = useState("All Time");
    const [timelineGrouping, setTimelineGrouping] = useState("Artist");
    const [timelineGroupingOpen, setTimelineGroupingOpen] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);

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

                if (diffMins > 15 || (track.ai_mood !== currentSession.mood && diffMins > 5)) {
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

        // 7-day calendar window based on Logical Day (Starting 5 AM)
        const LOGICAL_DAY_START_HOUR = 5; 
        const getLogicalTime = (d: Date) => {
            const h = d.getHours();
            const m = d.getMinutes();
            let logicalHour = h - LOGICAL_DAY_START_HOUR;
            if (logicalHour < 0) logicalHour += 24;
            return logicalHour + m / 60;
        };

        let minLogicalTime = 24;
        let maxLogicalTime = 0;

        sessionsByGroup.forEach(s => {
            const startLT = getLogicalTime(s.startTime);
            let endLT = getLogicalTime(s.endTime);
            if (endLT < startLT) endLT += 24;
            
            if (startLT < minLogicalTime) minLogicalTime = startLT;
            if (endLT > maxLogicalTime) maxLogicalTime = endLT;
        });

        // Add padding, cap at 0 and 24
        const minLogicalHour = Math.max(0, Math.floor(minLogicalTime));
        const maxLogicalHour = Math.min(24, Math.ceil(maxLogicalTime));

        const latestTrackTime = history.length > 0 ? new Date(history[0].time).getTime() : Date.now();
        const weekOffsetMs = weekOffset * 7 * 24 * 60 * 60 * 1000;
        const latestLogicalDate = new Date(latestTrackTime - LOGICAL_DAY_START_HOUR * 60 * 60 * 1000 - weekOffsetMs);
        
        const daysOffset: Date[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(latestLogicalDate.getTime() - (i * 24 * 60 * 60 * 1000));
            daysOffset.push(d);
        }

        const startDateStr = daysOffset[0].toISOString().split('T')[0];
        const endDateStr = daysOffset[6].toISOString().split('T')[0];

        // Filter history to current week
        const weekHistory = history.filter(t => {
            const logicalDate = new Date(new Date(t.time).getTime() - LOGICAL_DAY_START_HOUR * 60 * 60 * 1000);
            const logicalDateStr = logicalDate.toISOString().split('T')[0];
            return logicalDateStr >= startDateStr && logicalDateStr <= endDateStr;
        });

        const artistCounts: Record<string, number> = {};
        const moodCounts: Record<string, number> = {};
        const contextCounts: Record<string, number> = {};
        const listeningData: any[] = [];

        weekHistory.forEach(t => {
            const artist = t.artist_name || "Unknown Artist";
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
            
            const mood = t.ai_mood || t.mood_category || "Unknown Mood";
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
            
            const ctx = t.ml_features?.cultural_context || t.ml_features?.context_tag || t.context || "Unknown Context";
            contextCounts[ctx] = (contextCounts[ctx] || 0) + 1;
            
            const logicalDate = new Date(new Date(t.time).getTime() - LOGICAL_DAY_START_HOUR * 60 * 60 * 1000);
            const logicalDateStr = logicalDate.toISOString().split('T')[0];
            const dayIndex = daysOffset.findIndex(d => d.toISOString().split('T')[0] === logicalDateStr);
            
            if (dayIndex !== -1) {
                const dateObj = new Date(t.time);
                const timeOfDay = dateObj.getHours() + (dateObj.getMinutes() / 60);
                listeningData.push({
                    dayIndex,
                    timeOfDay,
                    size: 60,
                    trackName: t.track_name || t.name,
                    artistName: artist,
                    originalTime: t.time
                });
            }
        });

        const artistData = Object.entries(artistCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);
        const moodData = Object.entries(moodCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const contextData = Object.entries(contextCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

        return {
            groups: topGroups,
            sessions: sessionsByGroup,
            minLogicalHour,
            maxLogicalHour,
            daysOffset,
            LOGICAL_DAY_START_HOUR,
            artistData,
            moodData,
            contextData,
            listeningData
        };
    }, [history, timelineGrouping, weekOffset]);

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

    const { groups, sessions, minLogicalHour, maxLogicalHour, daysOffset, LOGICAL_DAY_START_HOUR, artistData, moodData, contextData, listeningData } = processedTimelineData;
    const timeSpanHours = (maxLogicalHour || 24) - (minLogicalHour || 0);

    const getLogicalTime = (time: Date) => {
        const h = time.getHours();
        const m = time.getMinutes();
        let logicalHour = h - (LOGICAL_DAY_START_HOUR || 5);
        if (logicalHour < 0) logicalHour += 24;
        return logicalHour + m / 60;
    };

    const getTopPercent = (time: Date) => {
        if (timeSpanHours === 0) return 0;
        const lt = getLogicalTime(time);
        return Math.max(0, Math.min(100, ((lt - (minLogicalHour || 0)) / timeSpanHours) * 100));
    };

    const getHeightPercent = (start: Date, end: Date) => {
        if (timeSpanHours === 0) return 0;
        const startLT = getLogicalTime(start);
        let endLT = getLogicalTime(end);
        if (endLT < startLT) endLT += 24;
        const calculated = ((endLT - startLT) / timeSpanHours) * 100;
        return Math.max(1.5, Math.min(100, calculated)); 
    };

    const getSessionColumn = (time: Date) => {
        if (!daysOffset) return -1;
        const logicalDate = new Date(time.getTime() - (LOGICAL_DAY_START_HOUR || 5) * 60 * 60 * 1000);
        const logicalDateStr = logicalDate.toISOString().split('T')[0];
        
        for (let i = 0; i < daysOffset.length; i++) {
            if (daysOffset[i].toISOString().split('T')[0] === logicalDateStr) {
                return i;
            }
        }
        return -1;
    };

    const formatDayLabel = (d: Date) => {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${daysOfWeek[d.getDay()]} ${d.getMonth()+1}/${d.getDate()}`;
    };

    const yAxisLabels = [];
    if (minLogicalHour !== undefined && maxLogicalHour !== undefined) {
        for (let h = minLogicalHour; h <= maxLogicalHour; h++) {
            const realHour = (h + LOGICAL_DAY_START_HOUR) % 24;
            const ampm = realHour >= 12 ? 'PM' : 'AM';
            const displayHour = realHour % 12 === 0 ? 12 : realHour % 12;
            yAxisLabels.push({ logical: h, display: `${displayHour} ${ampm}` });
        }
    }

    const handleUpdateContext = async () => {
        if (!editingSession) return;
        setIsUpdatingContext(true);
        try {
            const token = localStorage.getItem("jwt");
            const docIds = editingSession.tracks.map((t: any) => t.id);
            await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/history/session/context`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    document_ids: docIds,
                    context: contextInput || "None"
                })
            });
            // Update local state to reflect change
            setHistory(prev => prev.map(t => {
                if (docIds.includes(t.id)) {
                    return { ...t, context: contextInput || "None", ml_features: { ...t.ml_features, context_tag: contextInput || "None" } };
                }
                return t;
            }));
            setEditingSession(null);
            setContextInput("");
        } catch (e) {
            console.error("Failed to update context", e);
        }
        setIsUpdatingContext(false);
    };

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
                    
                    {/* Main Chart Container - Premium */}
                    <div
                        className="relative rounded-3xl lg:col-span-2 xl:col-span-3 overflow-hidden flex flex-col border bg-[var(--theme-panel)] border-[var(--theme-border)]"
                    >
                        {/* Gradient top-border accent */}


                        <div className="p-6">
                            {/* Controls Row */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                {/* Group By pill */}
                                <div className="relative">
                                    <div
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] cursor-pointer hover:border-[var(--theme-accent)]/40 transition-all duration-200 select-none"
                                        onClick={() => setTimelineGroupingOpen(!timelineGroupingOpen)}
                                    >
                                        <span className="text-xs font-bold text-white tracking-wide">Group By: <span className="text-[var(--theme-accent)]">{timelineGrouping}</span></span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${timelineGroupingOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                    {timelineGroupingOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] overflow-hidden z-50 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                                            {['Artist', 'Mood', 'Listening Activity', 'Context'].map((option) => (
                                                <div
                                                    key={option}
                                                    className={`flex items-center gap-3 px-4 py-3 text-xs font-bold cursor-pointer hover:bg-[var(--theme-accent)]/10 transition-colors ${timelineGrouping === option ? 'text-[var(--theme-accent)]' : 'text-gray-400'}`}
                                                    onClick={() => {
                                                        setTimelineGrouping(option);
                                                        setTimelineGroupingOpen(false);
                                                    }}
                                                >
                                                    {timelineGrouping === option && <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] shrink-0" />}
                                                    Group by {option}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Week navigation - pill style like reference image */}
                                <div className="flex items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] overflow-hidden">
                                    <button
                                        onClick={() => setWeekOffset(w => w + 1)}
                                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[var(--theme-accent)]/10 transition-all border-r border-[var(--theme-border)]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <span className="text-xs font-black text-white px-5 py-2 tracking-wide">
                                        {weekOffset === 0 ? "Current Week" : `${weekOffset}W Ago`}
                                    </span>
                                    <button
                                        onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                                        disabled={weekOffset === 0}
                                        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[var(--theme-accent)]/10 transition-all border-l border-[var(--theme-border)] disabled:opacity-25 disabled:cursor-not-allowed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                    </button>
                                </div>

                                {/* Legend */}
                                <div className="flex items-center gap-4 ml-auto">
                                    {timelineGrouping === "Mood" ? (
                                        Object.entries(MOOD_COLORS).slice(0, 3).map(([name, color]) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                                                <span className="text-[10px] font-bold text-[#8293B4]">{name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        groups.slice(0, 3).map((name, idx) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ background: GENRE_COLORS[idx % GENRE_COLORS.length] }} />
                                                <span className="text-[10px] font-bold text-[#8293B4] truncate max-w-[72px]" title={name}>{name}</span>
                                            </div>
                                        ))
                                    )}
                                    <span className="text-[#8293B4] font-bold text-xs">···</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart area */}
                        {loading ? (
                            <div className="flex-1 flex flex-col justify-center items-center gap-4 py-16">
                                <div className="w-10 h-10 rounded-full border-2 border-[var(--theme-accent)]/20 border-t-[var(--theme-accent)] animate-spin" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading history...</p>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="flex-1 flex justify-center items-center text-gray-400 text-sm pb-16">
                                No listening history found for this period.
                            </div>
                        ) : timelineGrouping === "Mood" ? (
                            <div className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden h-[500px]">
                                <EmotionalScatterPlot />
                            </div>
                        ) : timelineGrouping === "Artist" ? (
                            <div className="flex-1 flex flex-col pb-4">
                                <ArtistBarChart data={artistData || []} />
                            </div>
                        ) : timelineGrouping === "Context" ? (
                            <div className="flex-1 flex flex-col pb-4">
                                <ArtistBarChart data={contextData || []} />
                            </div>
                        ) : timelineGrouping === "Listening Activity" ? (
                            <div className="flex-1 flex flex-col pb-4">
                                <ListeningActivityChart data={listeningData || []} daysOffset={daysOffset || []} />
                            </div>
                        ) : null}
                    </div>

                    {/* Right Column: Dynamic Mood Topology & Top Artists */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        {/* Dynamic Mood Topology */}
                        <div className="h-[300px]">
                            <DynamicMoodTopology history={history} />
                        </div>

                        {/* Top Artists & Play Contributions */}
                        <div className="flex-1 flex flex-col min-h-[350px]">
                            <TopArtistsList artists={topArtistsList.map(([name, count]) => ({ name, count, image: null }))} />
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
                                <div className="w-6 h-6 rounded-md bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center shrink-0 mt-0.5">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-white font-bold">New release shared listen</div>
                                    <div className="text-[10px] text-gray-500">New release shared listen</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-md bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center shrink-0 mt-0.5">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-white font-bold">Remastered new lights</div>
                                    <div className="text-[10px] text-gray-500">New release shared listen</div>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-md bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center shrink-0 mt-0.5">
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
                                <div className="w-6 h-6 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-[var(--theme-accent)]" />
                                </div>
                                <span className="text-xs text-white">Shared Playlist</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-gray-400" />
                                </div>
                                <span className="text-xs text-white">Shared Playlist</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center">
                                    <Music className="w-3 h-3 text-[var(--theme-accent)]" />
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
                            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Total Group<br/>Listening Time</div>
                                <div className="text-lg font-bold text-white mt-2">3:37m</div>
                            </div>
                            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Unique<br/>Tracks</div>
                                <div className="text-lg font-bold text-white mt-2">383</div>
                            </div>
                            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-3 flex flex-col justify-between">
                                <div className="text-[10px] text-gray-400 leading-tight">Favorite<br/>Genre</div>
                                <div className="text-lg font-bold text-white mt-2">34+</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
            {editingSession && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl p-6 w-96 shadow-2xl relative">
                        <h3 className="text-xl font-bold text-white mb-4">Set Session Context</h3>
                        <p className="text-xs text-gray-400 mb-4">Apply a context tag to all {editingSession.tracks.length} tracks in this listening session. This will trigger a re-analysis.</p>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Context Tag</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Gym, Studying, Driving"
                                    value={contextInput}
                                    onChange={(e) => setContextInput(e.target.value)}
                                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateContext()}
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {["Gym", "Studying", "Driving", "Work", "Party", "Sleep"].map(tag => (
                                    <span key={tag} onClick={() => setContextInput(tag)} className="text-xs bg-[var(--theme-bg)] hover:bg-[var(--theme-bg)]/80 text-gray-300 px-3 py-1 rounded-full cursor-pointer transition-colors border border-[var(--theme-border)]">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setEditingSession(null)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateContext}
                                disabled={isUpdatingContext || !contextInput}
                                className="px-4 py-2 bg-[var(--theme-accent)] hover:brightness-110 text-white text-sm font-medium rounded-lg shadow-lg shadow-[var(--theme-accent)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isUpdatingContext && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isUpdatingContext ? 'Updating...' : 'Save Context'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
