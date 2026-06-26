"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
    Clock, Music, Users, Disc, Info, Calendar, Shield, Settings, ChevronRight, ChevronDown, Loader2, AlertCircle, X, MoreVertical, Plus, PlayCircle, Filter, Search, Bell
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { fetchWithRateLimit } from "@/utils/api";

export default function DashboardOverviewPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expandedMetric, setExpandedMetric] = useState<"time" | "tracks" | "artists" | "genres" | null>(null);
    const [filterYear, setFilterYear] = useState<string>("1 Year");
    
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [geminiFailing, setGeminiFailing] = useState(false);

    const [activityFilter, setActivityFilter] = useState<"7D" | "30D" | "All Time">("30D");

    // Poll data every 10 seconds for live updates
    useEffect(() => {
        let isMounted = true;

        const loadDashboardData = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlToken = urlParams.get('token');
                if (urlToken) {
                    localStorage.setItem("jwt", urlToken);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                const token = localStorage.getItem("jwt");
                if (!token) {
                    if(isMounted) setLoading(false);
                    return;
                }

                const fetchProfileOnce = async () => {
                    try {
                        const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/auth/profile");
                        if (data && isMounted) {
                            // Support both { data: {...} } and direct object returns
                            setProfile(data.data || data);
                            return true;
                        }
                    } catch (e: any) {
                        if(isMounted) setErrorMsg(e.message);
                    }
                    return false;
                };

                const fetchHistoryData = async (isBackground = false) => {
                    try {
                        if (!isBackground) {
                            const cached = sessionStorage.getItem("dashboard_history");
                            if (cached) {
                                const parsed = JSON.parse(cached);
                                setHistory(parsed);
                                if (parsed.length > 500) setFullHistoryLoaded(true);
                            }
                        }

                        const limit = isBackground ? 1 : (fullHistoryLoaded ? 10000 : 15);
                        const historyData = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=${limit}`);
                        if (historyData && isMounted) {
                            if (isBackground && historyData.data && historyData.data.length > 0) {
                                setHistory(prev => {
                                    const newId = historyData.data[0].id;
                                    if (prev.some((t: any) => t.id === newId)) return prev;
                                    const newHistory = [historyData.data[0], ...prev].slice(0, 10000);
                                    sessionStorage.setItem("dashboard_history", JSON.stringify(newHistory));
                                    return newHistory;
                                });
                            } else if (!isBackground) {
                                const data = historyData.data || historyData || [];
                                setHistory(data);
                                sessionStorage.setItem("dashboard_history", JSON.stringify(data));
                            }
                        }
                    } catch (e: any) {
                        console.error("Failed to load history", e);
                    }
                };

                const fetchAggregates = async () => {
                    try {
                        const cached = sessionStorage.getItem("dashboard_aggregates");
                        if (cached && isMounted) {
                            setAggregates(JSON.parse(cached));
                        }

                        const aggData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/aggregates");
                        if (aggData && isMounted) {
                            setAggregates(aggData.data);
                            sessionStorage.setItem("dashboard_aggregates", JSON.stringify(aggData.data));
                        }
                    } catch(e) {}
                };

                const success = await fetchProfileOnce();
                if (success) {
                    await fetchAggregates();
                    await fetchHistoryData(false);
                }
                
                // Fetch Gemini Status
                const fetchGeminiStatus = async () => {
                    try {
                        const res = await fetch("https://music-ml-server.onrender.com/api/telemetry/gemini_status");
                        const data = await res.json();
                        setGeminiFailing(data.is_failing || false);
                    } catch (e) {
                        // Ignore silent errors
                    }
                };
                fetchGeminiStatus();
                const intervalId = setInterval(fetchGeminiStatus, 10000);
                
                if (isMounted) setLoading(false);

                // Polling for live updates every 15 minutes (900000ms), only if the tab is visible
                const pollInterval = setInterval(async () => {
                    if (isMounted && profile && document.visibilityState === "visible") {
                        await fetchHistoryData(true);
                    }
                }, 900000);

                return () => {
                    isMounted = false;
                    clearInterval(pollInterval);
                    clearInterval(intervalId);
                };
            } catch (err: any) {
                if(isMounted) {
                    setErrorMsg(err.message);
                    setLoading(false);
                }
            }
        };

        loadDashboardData();
        return () => { isMounted = false; };
    }, []);

    
    // Load full history if user searches or changes filter
    useEffect(() => {
        if (!fullHistoryLoaded && (searchQuery.trim() !== "" || filterYear !== "1 Year" || activityFilter !== "30D")) {
            const loadFull = async () => {
                setLoading(true);
                try {
                    const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=10000");
                    if (data && data.data) {
                        setHistory(data.data);
                        setFullHistoryLoaded(true);
                    }
                } catch(e) {}
                setLoading(false);
            };
            loadFull();
        }
    }, [searchQuery, filterYear, activityFilter, fullHistoryLoaded]);

    // Derived Metrics & Filters
    const filteredHistory = useMemo(() => {
        let result = history;
        // Search Logic
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => 
                (item.track_name && item.track_name.toLowerCase().includes(query)) ||
                (item.artist_name && item.artist_name.toLowerCase().includes(query))
            );
        }
        
        // Year filter for expanded view logic
        if (expandedMetric && filterYear !== "1 Year" && filterYear !== "All Time") {
            const yearStr = filterYear;
            result = result.filter(item => {
                const date = new Date(item.time);
                return date.getFullYear().toString() === yearStr;
            });
        }
        
        return result;
    }, [history, searchQuery, expandedMetric, filterYear]);


    const isDefaultView = filterYear === "1 Year" && searchQuery.trim() === "";

    // Metrics based on filtered data OR aggregates
    const tracksPlayedCount = (isDefaultView && aggregates) ? aggregates.total_tracks_played : filteredHistory.length;
    const totalListeningTime = (isDefaultView && aggregates) ? aggregates.total_listening_time_mins : Math.round(filteredHistory.reduce((sum, item) => sum + ((item.duration_ms || 204000) / 60000), 0));
    const uniqueArtists = new Set(filteredHistory.map(item => item.artist_name));
    const artistsDiscoveredCount = (isDefaultView && aggregates) ? aggregates.artists_discovered : uniqueArtists.size;
    
    // For Top Genres / Genres Explored
    const genreCounts: Record<string, number> = {};
    if (!isDefaultView || !aggregates) {
        filteredHistory.forEach(item => {
            if (item.genre) {
                genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1;
            } else if (item.mood_category) {
                genreCounts[item.mood_category] = (genreCounts[item.mood_category] || 0) + 1;
            }
        });
    }
    const genresExploredCount = (isDefaultView && aggregates) ? aggregates.genres_explored : (Object.keys(genreCounts).length || 1);
    const sortedGenres = (isDefaultView && aggregates && aggregates.top_genres_json) ? aggregates.top_genres_json.map((g:any) => [g.name, g.value]) : Object.entries(genreCounts).sort((a,b) => b[1] - a[1]);

    // Top Tracks Processing
    const trackCounts: Record<string, { name: string; artist: string; count: number; image: string; time: number }> = {};
    if (!isDefaultView || !aggregates) {
        filteredHistory.forEach(item => {
            const key = `${item.track_name} - ${item.artist_name}`;
            if (!trackCounts[key]) {
                trackCounts[key] = { name: item.track_name, artist: item.artist_name, count: 0, image: item.album_image_url, time: 0 };
            }
            trackCounts[key].count += 1;
            trackCounts[key].time += ((item.duration_ms || 204000) / 60000);
        });
    }

    const displayTracks = (isDefaultView && aggregates && aggregates.top_artists_json && aggregates.top_artists_json.length > 0) 
        ? aggregates.top_artists_json.map((t:any, idx:number) => ({
            rank: idx + 1, name: t.name, artist: t.artist, plays: t.count, time: t.count*3, image: undefined
        })) 
        : Object.values(trackCounts).sort((a, b) => b.count - a.count).slice(0, 5).map((t, idx) => ({
            rank: idx + 1, name: t.name, artist: t.artist, plays: t.count, time: Math.round(t.time), image: t.image
        }));

    
    const dummyTracks = [
        { rank: 1, name: "Ode To The Mets", artist: "The Strokes", plays: 2, time: 10, image: undefined },
        { rank: 2, name: "Sweet Momo", artist: "The Walters", plays: 2, time: 8, image: undefined },
        { rank: 3, name: "Saigal Blues", artist: "Ram Sampath", plays: 2, time: 7, image: undefined },
        { rank: 4, name: "Earthmover", artist: "Have A Nice Life", plays: 2, time: 6, image: undefined },
        { rank: 5, name: "Red Light", artist: "The Strokes", plays: 2, time: 5, image: undefined },
    ];
    const finalTracks = displayTracks.length > 0 ? displayTracks : dummyTracks;

    // Activity Manager Chart Processing
    const activityChartData = useMemo(() => {
        const dateCounts: Record<string, { time: number, valence: number, energy: number, count: number }> = {};
        const sourceData = history; // base it off full history for the chart
        
        let cutoffDate = new Date();
        if (activityFilter === "7D") cutoffDate.setDate(cutoffDate.getDate() - 7);
        else if (activityFilter === "30D") cutoffDate.setDate(cutoffDate.getDate() - 30);
        else cutoffDate.setFullYear(2000);

        sourceData.forEach(item => {
            const itemDate = new Date(item.time);
            if (itemDate >= cutoffDate) {
                const dateStr = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!dateCounts[dateStr]) dateCounts[dateStr] = { time: 0, valence: 0, energy: 0, count: 0 };
                dateCounts[dateStr].time += ((item.duration_ms || 204000) / 60000);
                dateCounts[dateStr].valence += (item.valence || 0.5);
                dateCounts[dateStr].energy += (item.energy || 0.5);
                dateCounts[dateStr].count += 1;
            }
        });

        const data = Object.entries(dateCounts).map(([date, d]) => ({
            name: date,
            time: Math.round(d.time),
            mood: Math.round((d.valence / d.count) * 100),
            energy: Math.round((d.energy / d.count) * 100)
        })).reverse();

        if (data.length < 3) {
            return [
                { name: "Jun 13", time: 30, mood: 60, energy: 40 },
                { name: "Jun 14", time: 45, mood: 65, energy: 45 },
                { name: "Jun 15", time: 60, mood: 70, energy: 50 },
            ];
        }
        return data;
    }, [history, activityFilter]);

    const artistDonutData = useMemo(() => {
        if (isDefaultView && aggregates && aggregates.top_artists_json) {
            return aggregates.top_artists_json.slice(0, 5).map((a: any) => ({ name: a.name, value: a.count }));
        }
        const counts: Record<string, number> = {};
        filteredHistory.forEach(item => {
            if (item.artist_name) {
                counts[item.artist_name] = (counts[item.artist_name] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
    }, [filteredHistory, isDefaultView, aggregates]);

    const genreTrendData = useMemo(() => {
        const trend: Record<string, Record<string, number>> = {};
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        
        // Initialize last 7 days
        for(let i = 6; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dayName = days[d.getDay()];
            trend[dayName] = {};
        }

        const top5Genres = sortedGenres.slice(0, 5).map((g: any) => g[0]);

        filteredHistory.forEach(item => {
            const d = new Date(item.time);
            if (today.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000) {
                const dayName = days[d.getDay()];
                if (trend[dayName]) {
                    const genre = item.genre || item.mood_category || "Unknown";
                    if (top5Genres.includes(genre)) {
                        trend[dayName][genre] = (trend[dayName][genre] || 0) + 1;
                    }
                }
            }
        });

        return Object.entries(trend).map(([day, genres]) => ({
            day,
            ...genres
        }));
    }, [filteredHistory, sortedGenres]);

    // Format top 5 genres for Stacked Bar Legend
    const top5GenresList = sortedGenres.slice(0, 5).map((g: any) => g[0]);

    // Sparkline real data based on track energy and duration
    const sparklineData = history.slice(-10).map((h, i) => ({ 
        val: h.energy !== undefined ? h.energy * 100 : (h.duration_ms ? Math.min(100, (h.duration_ms / 300000) * 100) : 50),
        i 
    }));

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--theme-bg)] items-center justify-center space-y-6">
                <Loader2 className="w-12 h-12 text-[#D1F26D] animate-spin" />
                <p className="text-[#8293B4] text-sm tracking-widest uppercase">Syncing Live Telemetry...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col min-h-screen bg-[var(--theme-bg)] items-center justify-center text-center p-8">
                <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-[40px] p-12 flex flex-col items-center">
                    <Shield className="w-16 h-16 text-[#8293B4] mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2 text-white">No Active Session</h2>
                    <p className="text-[#8293B4] max-w-sm mb-6 text-sm">Please log in to your Spotify account to view your telemetry dashboard.</p>
                    <a href="https://music-ml-dashboard.onrender.com/api/auth/login" className="px-6 py-3 rounded-full bg-[#D1F26D] text-black font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                        Connect Spotify
                    </a>
                </div>
            </div>
        );
    }

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        history.forEach(h => {
            if (h.time) {
                const dateStr = h.time.substring(0,4);
                if (!isNaN(Number(dateStr))) years.add(dateStr);
            }
        });
        const sorted = Array.from(years).sort((a,b) => Number(b) - Number(a));
        return ["1 Year", ...sorted, "All Time"];
    }, [history]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-[var(--theme-bg)] min-h-screen text-white scrollbar-hide">
            
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center bg-[var(--theme-bg)] p-6 lg:px-8 border-b border-[var(--theme-border)]/50 sticky top-0 z-40 backdrop-blur-xl">
                {/* Left: User Profile */}
                <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-panel)] flex items-center justify-center font-bold">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            profile.display_name?.charAt(0).toUpperCase() || "U"
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight tracking-tight">
                            {profile.display_name}
                        </h1>
                        <p className="text-xs text-[#8293B4]">Music Dashboard</p>
                    </div>
                </div>

                {/* Right: Expandable Fuzzy Search & Status */}
                <div className="flex items-center gap-4">
                    {geminiFailing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full cursor-help group relative">
                            <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                            <span className="text-xs font-semibold text-red-400">Gemini Pending</span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[#1C1C24] border border-[#2D2D3A] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <p className="text-xs text-gray-300">
                                    Gemini AI is currently failing to respond. Tracks are queued and will be processed when the API recovers.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className={`flex items-center bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full transition-all duration-300 overflow-hidden ${searchExpanded ? "w-64 px-4 py-2" : "w-12 h-12 justify-center cursor-pointer hover:bg-white/5"}`} onClick={() => !searchExpanded && setSearchExpanded(true)}>
                        <Search className="w-5 h-5 text-[#8293B4] shrink-0" />
                        {searchExpanded && (
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search songs or artists..." 
                                className="bg-transparent border-none outline-none text-sm px-3 flex-1 text-white placeholder:text-[#8293B4]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                        {searchExpanded && (
                            <X className="w-4 h-4 text-[#8293B4] cursor-pointer hover:text-white shrink-0" onClick={(e) => { e.stopPropagation(); setSearchExpanded(false); setSearchQuery(""); }} />
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Wrapper - No padding to touch edges if needed, but keeping standard padding for interior layout */}
            <div className="p-0 flex flex-col gap-6 w-full mx-auto max-w-[1600px] mt-6 px-6">
                
                {/* Fuzzy Search Results Overlay Layout */}
                {searchQuery && (
                    <div className="w-full bg-[var(--theme-panel)] border border-[#D1F26D]/50 rounded-[32px] p-6 mb-2 shadow-[0_0_30px_rgba(209,242,109,0.1)]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Search Results: "{searchQuery}"</h3>
                        {filteredHistory.length === 0 ? (
                            <div className="text-center text-[#8293B4] py-8">No matching tracks or artists found in your history.</div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                                {/* Aggregate grouped sessions by track */}
                                {Object.values(trackCounts)
                                    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((track, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-[var(--theme-bg)] p-3 rounded-[20px] border border-[var(--theme-border)]">
                                            <div className="w-12 h-12 rounded-[14px] bg-[#2A364D] overflow-hidden flex items-center justify-center shrink-0">
                                                {track.image ? <img src={track.image} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-[#8293B4]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{track.name}</div>
                                                <div className="text-xs text-[#8293B4] truncate">{track.artist}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-xs font-bold text-[#D1F26D]">{track.count} Sessions</div>
                                                <div className="text-[10px] text-[#8293B4]">{Math.round(track.time)} mins total</div>
                                            </div>
                                        </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Full Width 4 Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    
                    {/* Time */}
                    <div onClick={() => setExpandedMetric(expandedMetric === "time" ? null : "time")} className={`bg-[var(--theme-panel)] border ${expandedMetric === "time" ? "border-[#D1F26D]" : "border-[var(--theme-border)]"} rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#D1F26D]/50 transition-colors h-[200px] relative overflow-hidden group`}>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#D1F26D]/10 text-[#D1F26D]">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="rounded-full bg-[var(--theme-panel)] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[var(--theme-border)]">
                                {filterYear} <ChevronDown className="w-3 h-3"/>
                            </div>
                        </div>
                        <div className="relative z-10 mt-auto">
                            <h3 className="text-xs text-[#8293B4] mb-1">Total Listening Time</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{totalListeningTime}</span>
                                <span className="text-xs text-[#8293B4]">min</span>
                            </div>
                        </div>
                        {/* Sparkline */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-40 group-hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData}>
                                    <defs>
                                        <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D1F26D" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#D1F26D" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="val" stroke="#D1F26D" strokeWidth={2} fillOpacity={1} fill="url(#colorTime)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Tracks */}
                    <div onClick={() => setExpandedMetric(expandedMetric === "tracks" ? null : "tracks")} className={`bg-[var(--theme-panel)] border ${expandedMetric === "tracks" ? "border-[#A855F7]" : "border-[var(--theme-border)]"} rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#A855F7]/50 transition-colors h-[200px] relative overflow-hidden group`}>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#A855F7]/10 text-[#A855F7]">
                                <Music className="w-4 h-4" />
                            </div>
                            <div className="rounded-full bg-[var(--theme-panel)] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[var(--theme-border)]">
                                {filterYear} <ChevronDown className="w-3 h-3"/>
                            </div>
                        </div>
                        <div className="relative z-10 mt-auto">
                            <h3 className="text-xs text-[#8293B4] mb-1">Total Tracks Played</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{tracksPlayedCount}</span>
                            </div>
                        </div>
                        {/* Sparkline */}
                        <div className="absolute bottom-6 left-6 right-6 h-12 opacity-80 group-hover:opacity-100 transition-opacity flex items-end justify-between gap-1">
                            {sparklineData.slice(0,8).map((d,i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-[#A855F7]/20 to-[#A855F7] rounded-sm" style={{ height: `${Math.max(20, d.val)}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Artists */}
                    <div onClick={() => setExpandedMetric(expandedMetric === "artists" ? null : "artists")} className={`bg-[var(--theme-panel)] border ${expandedMetric === "artists" ? "border-[#3B82F6]" : "border-[var(--theme-border)]"} rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#3B82F6]/50 transition-colors h-[200px] relative overflow-hidden group`}>
                        <div className="w-full flex justify-between items-start mb-0 relative z-10">
                            <h3 className="text-sm font-bold text-white tracking-wider">Artists Discovered</h3>
                        </div>

                        <div className="flex-1 flex items-center justify-center mt-2 relative">
                            {/* Inner Donut + Text */}
                            <div className="absolute inset-0 flex items-center justify-center -ml-20">
                                <span className="text-3xl font-bold text-white relative z-10">{artistsDiscoveredCount}</span>
                                <ResponsiveContainer width={140} height={140} className="absolute inset-0 m-auto">
                                    <PieChart>
                                        <Pie 
                                            data={artistDonutData} 
                                            innerRadius={45} 
                                            outerRadius={60} 
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {artistDonutData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={["#3B82F6", "#EAB308", "#22C55E", "#06B6D4", "#D946EF"][index % 5]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Legend on the right */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 pr-2">
                                {artistDonutData.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-[10px] text-gray-300">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: ["#3B82F6", "#EAB308", "#22C55E", "#06B6D4", "#D946EF"][index % 5]}}></div>
                                        <span className="truncate max-w-[80px]">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Genres Explored */}
                    <div onClick={() => setExpandedMetric(expandedMetric === "genres" ? null : "genres")} className={`bg-[var(--theme-panel)] border ${expandedMetric === "genres" ? "border-[#EAB308]" : "border-[var(--theme-border)]"} rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#EAB308]/50 transition-colors h-[200px] relative overflow-hidden group`}>
                        <div className="flex justify-between items-start mb-0 relative z-10">
                            <h3 className="text-sm font-bold text-white tracking-wider">Genres Explored</h3>
                            <div className="rounded-full bg-[var(--theme-panel)] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[var(--theme-border)]">
                                {filterYear} <ChevronDown className="w-3 h-3"/>
                            </div>
                        </div>
                        <div className="text-xs text-[#8293B4] mb-2">7 day trend</div>

                        <div className="flex-1 w-full relative z-10 -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={genreTrendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={8}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="day" type="category" axisLine={false} tickLine={false} tick={{fill: '#8293B4', fontSize: 10}} width={40} />
                                    {top5GenresList.map((genre: any, index: number) => (
                                        <Bar key={genre} dataKey={genre} stackId="a" fill={["#3B82F6", "#EAB308", "#22C55E", "#06B6D4", "#D946EF"][index % 5]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                            {top5GenresList.map((genre: any, index: number) => (
                                <div key={index} className="flex items-center gap-1 text-[10px] text-gray-300">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: ["#3B82F6", "#EAB308", "#22C55E", "#06B6D4", "#D946EF"][index % 5]}}></div>
                                    <span className="truncate max-w-[50px] capitalize">{genre}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* IN-LINE EXPANDED METRICS VIEW */}
                {expandedMetric && (
                    <div className="w-full bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-[32px] p-6 lg:p-8 flex flex-col animate-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
                                {expandedMetric === "time" && "Listening Time Details"}
                                {expandedMetric === "tracks" && "Tracks Played Details"}
                                {expandedMetric === "artists" && "Artists Discovered Details"}
                                {expandedMetric === "genres" && "Genres Explored Details"}
                            </h2>
                            <div className="flex items-center gap-3">
                                {/* Year Filters */}
                                <div className="flex bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full overflow-hidden text-xs font-medium p-1">
                                    {availableYears.map(year => (
                                        <button 
                                            key={year} 
                                            onClick={() => setFilterYear(year)}
                                            className={`px-4 py-1.5 rounded-full transition-colors ${filterYear === year ? "bg-[#2A364D] text-white" : "text-[#8293B4] hover:text-white"}`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setExpandedMetric(null)} className="w-8 h-8 flex items-center justify-center bg-[var(--theme-panel)] rounded-full hover:bg-white/10 text-white transition-colors border border-[var(--theme-border)]">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="w-full max-h-[400px] overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {expandedMetric === "time" && Object.entries(trackCounts).sort((a,b) => b[1].time - a[1].time).slice(0, 30).map(([key, t], idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[#D1F26D]/50 transition-colors">
                                        <div className="font-bold text-white truncate max-w-[60%]">{t.name}</div>
                                        <span className="text-[#D1F26D] font-mono font-bold bg-[#D1F26D]/10 px-3 py-1 rounded-full text-xs shrink-0">{Math.round(t.time)} mins</span>
                                    </div>
                                ))}

                                {expandedMetric === "tracks" && Object.values(trackCounts).sort((a,b) => b.count - a.count).slice(0, 30).map((t, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-[20px] bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[#A855F7]/50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-[12px] overflow-hidden shrink-0">
                                                {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#2A364D] flex items-center justify-center"><Music className="w-4 h-4 text-[#8293B4]" /></div>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white text-sm truncate">{t.name}</div>
                                                <div className="text-[10px] text-[#8293B4] truncate">{t.artist}</div>
                                            </div>
                                        </div>
                                        <span className="text-[#A855F7] font-bold bg-[#A855F7]/10 px-3 py-1.5 rounded-full border border-[#A855F7]/20 text-xs shrink-0">{t.count} plays</span>
                                    </div>
                                ))}

                                {expandedMetric === "artists" && Array.from(uniqueArtists).map((artist, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-[20px] bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[#3B82F6]/50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] shrink-0 border border-[#3B82F6]/30">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-white text-sm truncate">{artist as string}</span>
                                    </div>
                                ))}

                                {expandedMetric === "genres" && sortedGenres.map(([genre, count]: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-4 rounded-[20px] bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[#EAB308]/50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0 border border-[#EAB308]/30">
                                                <Disc className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-white text-sm truncate capitalize">{genre}</span>
                                        </div>
                                        <span className="text-[#EAB308] font-bold bg-[#EAB308]/10 px-3 py-1 rounded-full text-xs shrink-0">{count} Tracks</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* BOTTOM SPLIT SECTION */}
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                    
                    {/* Activity Manager Chart Container */}
                    <div className="flex-1 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-[32px] p-6 lg:p-8 flex flex-col h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-bold text-white tracking-wider">Activity Manager</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full overflow-hidden text-xs font-medium p-1">
                                    <button onClick={() => setActivityFilter("7D")} className={`px-4 py-1.5 rounded-full transition-colors ${activityFilter === "7D" ? "bg-[#2A364D] text-white" : "text-[#8293B4] hover:text-white"}`}>7 Days</button>
                                    <button onClick={() => setActivityFilter("30D")} className={`px-4 py-1.5 rounded-full transition-colors ${activityFilter === "30D" ? "bg-[#2A364D] text-white" : "text-[#8293B4] hover:text-white"}`}>30 Days</button>
                                    <button onClick={() => setActivityFilter("All Time")} className={`px-4 py-1.5 rounded-full transition-colors ${activityFilter === "All Time" ? "bg-[#2A364D] text-white" : "text-[#8293B4] hover:text-white"}`}>All Time</button>
                                </div>
                            </div>
                        </div>

                        {/* Chart body */}
                        <div className="flex-1 min-h-[250px] w-full mt-2 relative">
                            <div className="absolute inset-0 bg-[var(--theme-bg)]/50 rounded-[24px] pointer-events-none border border-white/5"></div>
                            
                            <div className="absolute top-4 left-4 z-10 flex gap-4 text-xs font-bold">
                                <div className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full bg-[#D1F26D]"></span> Listening Time (m)</div>
                                <div className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> Avg Mood</div>
                                <div className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full bg-[#A855F7]"></span> Avg Energy</div>
                            </div>

                            <ResponsiveContainer width="100%" height="100%" className="pt-10 relative z-10">
                                <AreaChart data={activityChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D1F26D" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#D1F26D" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1B2332', borderColor: '#2A364D', borderRadius: '16px', padding: '12px' }}
                                        labelStyle={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}
                                        itemStyle={{ color: '#D1F26D', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="time" stroke="#D1F26D" strokeWidth={3} fillOpacity={1} fill="url(#colorGreen)" activeDot={{ r: 6, fill: "#D1F26D", stroke: "#111319", strokeWidth: 2 }} />
                                    <Area type="monotone" dataKey="mood" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorBlue)" activeDot={{ r: 6, fill: "#3B82F6", stroke: "#111319", strokeWidth: 2 }} />
                                    <Area type="monotone" dataKey="energy" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorPurple)" activeDot={{ r: 6, fill: "#A855F7", stroke: "#111319", strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Tracks (Right Sidebar equivalent) */}
                    <div className="w-full xl:w-[450px] flex flex-col gap-6">
                        
                        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-[32px] p-6 lg:p-8 flex flex-col h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-bold text-white tracking-wider">Main Tracks<br/><span className="text-[10px] text-[#8293B4] font-normal tracking-normal">All Time Favorites</span></h4>
                                <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full px-4 py-2 text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                                    by Plays <ChevronDown className="w-3 h-3" />
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-2">
                                {finalTracks.map((track: any) => (
                                    <div key={track.rank} className="flex items-center gap-4 bg-[var(--theme-panel)] p-3 pr-4 rounded-[20px] hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-[var(--theme-border)]">
                                        <div className="w-12 h-12 rounded-[14px] bg-[#2A364D] overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                                            {track.image ? (
                                                <img src={track.image} alt={track.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Music className="w-5 h-5 text-[#8293B4]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{track.name}</div>
                                            <div className="text-[11px] text-[#8293B4] truncate">{track.artist}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <div className="text-xs font-bold text-[#D1F26D] bg-[#D1F26D]/10 px-2 py-1 rounded-md">{track.plays} plays</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
