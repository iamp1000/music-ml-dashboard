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
import SonicPerformanceChart from "@/components/visualizations/SonicPerformanceChart";
import SonicGenreTopology from "@/components/visualizations/SonicGenreTopology";
import DailySonicActivity from "@/components/visualizations/DailySonicActivity";
import TopTracksList from "@/components/visualizations/TopTracksList";

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
    const [searchLoading, setSearchLoading] = useState(false);
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
                        const res = await fetch("https://music-ml-dashboard.onrender.com/api/telemetry/gemini_status");
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
                setSearchLoading(true);
                try {
                    const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=10000");
                    if (data && data.data) {
                        setHistory(data.data);
                        setFullHistoryLoaded(true);
                    }
                } catch(e) {}
                setSearchLoading(false);
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
    const safeHistory = Array.isArray(history) ? history : [];
    const sparklineData = safeHistory.slice(-10).map((h, i) => ({ 
        val: h?.energy !== undefined ? h.energy * 100 : (h?.duration_ms ? Math.min(100, (h.duration_ms / 300000) * 100) : 50),
        i 
    }));

    // ⚠️ Must be here (before early returns) - React Rules of Hooks
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        if (Array.isArray(history)) {
            history.forEach(h => {
                if (h?.time) {
                    const dateStr = h.time.substring(0,4);
                    if (!isNaN(Number(dateStr))) years.add(dateStr);
                }
            });
        }
        const sorted = Array.from(years).sort((a,b) => Number(b) - Number(a));
        return ["1 Year", ...sorted, "All Time"];
    }, [history]);

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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-screen text-white scrollbar-hide">
            
            {/* ═══ Header / Top Bar ═══ */}
            <div className="flex justify-between items-center px-6 lg:px-8 py-5 sticky top-0 z-40 backdrop-blur-xl bg-[var(--theme-bg)]/80 border-b border-[var(--theme-border)]/30">
                {/* Left: Greeting */}
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-panel)] flex items-center justify-center font-bold text-sm">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            profile.display_name?.charAt(0).toUpperCase() || "U"
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-tight tracking-tight">
                            {profile.display_name}
                        </h1>
                        <p className="text-[11px] text-[var(--theme-text-muted)] font-medium">Welcome back 👋</p>
                    </div>
                </div>

                {/* Right: Search + Status */}
                <div className="flex items-center gap-3">
                    {geminiFailing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/8 border border-red-500/20 rounded-xl cursor-help group relative">
                            <Bell className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            <span className="text-[11px] font-bold text-red-400">AI Pending</span>
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <p className="text-[11px] text-[var(--theme-text-muted)]">
                                    Gemini AI is currently failing to respond. Tracks are queued and will be processed when the API recovers.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className={`flex items-center bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-xl transition-all duration-300 overflow-hidden ${searchExpanded ? "w-72 px-4 py-2.5" : "w-10 h-10 justify-center cursor-pointer hover:border-[var(--theme-accent)]/30"}`} onClick={() => !searchExpanded && setSearchExpanded(true)}>
                        <Search className="w-4 h-4 text-[var(--theme-text-muted)] shrink-0" />
                        {searchExpanded && (
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search songs or artists..." 
                                className="bg-transparent border-none outline-none text-[13px] px-3 flex-1 text-white placeholder:text-[var(--theme-text-muted)]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                        {searchExpanded && (
                            <X className="w-3.5 h-3.5 text-[var(--theme-text-muted)] cursor-pointer hover:text-white shrink-0" onClick={(e) => { e.stopPropagation(); setSearchExpanded(false); setSearchQuery(""); }} />
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <div className="flex flex-col gap-6 w-full mx-auto max-w-[1500px] px-6 lg:px-8 py-6">
                
                {/* Fuzzy Search Results - Full Session Timeline */}
                {searchQuery && (
                    <div className="w-full rounded-2xl border border-[var(--theme-accent)]/20 overflow-hidden" style={{ background: "var(--theme-panel)" }}>
                        {/* Search Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--theme-border)]">
                            <div className="flex items-center gap-2.5">
                                <Search className="w-4 h-4 text-[var(--theme-accent)]" />
                                <span className="text-[13px] font-bold text-white">
                                    Results for <span className="text-[var(--theme-accent)]">"{searchQuery}"</span>
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] px-3 py-1 rounded-lg">
                                {filteredHistory.length} session{filteredHistory.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {searchLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-7 h-7 rounded-full border-2 border-[var(--theme-accent)]/20 border-t-[var(--theme-accent)] animate-spin" />
                                <p className="text-[var(--theme-text-muted)] text-[11px] font-bold uppercase tracking-widest">Loading history...</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Music className="w-10 h-10 text-[var(--theme-border)]" />
                                <p className="text-[var(--theme-text-muted)] text-sm font-bold">No matches for "{searchQuery}"</p>
                                <p className="text-[var(--theme-text-muted)]/60 text-xs">Try a different song name or artist</p>
                            </div>
                        ) : (() => {
                            const grouped: Record<string, { name: string; artist: string; image: string; sessions: any[] }> = {};
                            filteredHistory.forEach(item => {
                                const key = `${item.track_name} - ${item.artist_name}`;
                                if (!grouped[key]) {
                                    grouped[key] = { name: item.track_name || "Unknown", artist: item.artist_name || "Unknown Artist", image: item.album_image_url || "", sessions: [] };
                                }
                                grouped[key].sessions.push(item);
                            });

                            const formatSessionDate = (timeStr: string) => {
                                try {
                                    const d = new Date(timeStr);
                                    const now = new Date();
                                    const diffMs = now.getTime() - d.getTime();
                                    const diffDays = Math.floor(diffMs / 86400000);
                                    if (diffDays === 0) return `Today at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                    if (diffDays === 1) return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                    if (diffDays < 7) return `${diffDays} days ago · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                } catch { return timeStr; }
                            };

                            const getMoodColor = (valence: number) => {
                                if (!valence) return "#8293B4";
                                if (valence > 0.65) return "#22c55e";
                                if (valence < 0.38) return "#EF4444";
                                return "#F59E0B";
                            };
                            const getMoodLabel = (valence: number) => {
                                if (!valence) return "—";
                                if (valence > 0.65) return "Positive";
                                if (valence < 0.38) return "Melancholic";
                                return "Neutral";
                            };

                            return (
                                <div className="divide-y divide-[var(--theme-border)] max-h-[520px] overflow-y-auto scrollbar-hide">
                                    {Object.values(grouped).map((track, gIdx) => (
                                        <div key={gIdx} className="p-5">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-11 h-11 rounded-xl bg-[var(--theme-bg)] overflow-hidden shrink-0 flex items-center justify-center">
                                                    {track.image ? <img src={track.image} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-[var(--theme-text-muted)]" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">{track.name}</div>
                                                    <div className="text-[11px] text-[var(--theme-text-muted)] truncate">{track.artist}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[11px] font-black text-[var(--theme-accent)]">{track.sessions.length}× played</span>
                                                    <span className="text-[10px] text-[var(--theme-text-muted)]">{Math.round(track.sessions.reduce((s, i) => s + (i.duration_ms || 204000), 0) / 60000)} min</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pl-1">
                                                {track.sessions
                                                    .sort((a, b) => new Date(b.time || b.played_at || 0).getTime() - new Date(a.time || a.played_at || 0).getTime())
                                                    .map((session, sIdx) => {
                                                        const timeStr = session.time || session.played_at;
                                                        const valence = session.valence;
                                                        const energy = session.energy || session.arousal;
                                                        const moodColor = getMoodColor(valence);
                                                        const durMin = session.duration_ms ? Math.round(session.duration_ms / 60000) : null;

                                                        return (
                                                            <div key={sIdx} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/20 transition-colors">
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: moodColor }} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[11px] font-bold text-white">
                                                                        {timeStr ? formatSessionDate(timeStr) : "Unknown time"}
                                                                    </div>
                                                                    {session.context && (
                                                                        <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">Context: <span className="text-[var(--theme-accent)]">{session.context}</span></div>
                                                                    )}
                                                                </div>
                                                                {valence !== undefined && valence !== null && (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md shrink-0" style={{ color: moodColor, background: `${moodColor}12` }}>
                                                                        {getMoodLabel(valence)}
                                                                    </span>
                                                                )}
                                                                {energy !== undefined && energy !== null && (
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <div className="w-10 h-1 rounded-full bg-[var(--theme-border)] overflow-hidden">
                                                                            <div className="h-full rounded-full" style={{ width: `${Math.round(energy * 100)}%`, background: "linear-gradient(90deg, #8B5CF6, var(--theme-accent))" }} />
                                                                        </div>
                                                                        <span className="text-[9px] text-[var(--theme-text-muted)]">{Math.round(energy * 100)}%</span>
                                                                    </div>
                                                                )}
                                                                {durMin && (
                                                                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] shrink-0">{durMin}m</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ═══ 4 Quadrant Dashboard Layout ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full h-[350px]">
                    <SonicPerformanceChart 
                        listeningTime={totalListeningTime} 
                        tracksPlayed={tracksPlayedCount} 
                    />
                    <SonicGenreTopology />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full h-[350px]">
                    <div className="xl:col-span-8 h-full">
                        <DailySonicActivity />
                    </div>
                    <div className="xl:col-span-4 h-full">
                        <TopTracksList tracks={finalTracks} />
                    </div>
                </div>

            </div>
        </div>
    );
}
