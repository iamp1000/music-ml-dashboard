"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Loader2, Search, X, Bell, Clock, Music, Users } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { fetchWithRateLimit } from "@/utils/api";

import SonicGenreTopology from "@/components/visualizations/SonicGenreTopology";
import TopTracksList from "@/components/visualizations/TopTracksList";
import EmotionalScatterPlot from "@/components/visualizations/EmotionalScatterPlot";
import BioOptimizationGraph from "@/components/visualizations/BioOptimizationGraph";

import { BentoCard } from "@/components/effects/BentoCard";
import { AIInsightHero } from "@/components/visualizations/AIInsightHero";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";

export default function DashboardOverviewPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [geminiFailing, setGeminiFailing] = useState(false);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Setup fetching logic
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
                            setProfile(data.data || data);
                            return true;
                        }
                    } catch (e: any) {
                        if(isMounted) setErrorMsg(e.message);
                    }
                    return false;
                };

                const fetchHistoryData = async () => {
                    try {
                        const cached = sessionStorage.getItem("dashboard_history");
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            setHistory(parsed);
                        }
                        const historyData = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=15`);
                        if (historyData && isMounted) {
                            const data = historyData.data || historyData || [];
                            setHistory(data);
                            sessionStorage.setItem("dashboard_history", JSON.stringify(data));
                        }
                    } catch (e: any) {}
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
                    await fetchHistoryData();
                }
                
                const fetchGeminiStatus = async () => {
                    try {
                        const res = await fetch("https://music-ml-dashboard.onrender.com/api/telemetry/gemini_status");
                        const data = await res.json();
                        setGeminiFailing(data.is_failing || false);
                    } catch (e) {}
                };
                fetchGeminiStatus();
                
                if (isMounted) setLoading(false);
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

    // Derived Metrics
    const tracksPlayedCount = aggregates ? aggregates.total_tracks_played : history.length;
    const totalListeningTime = aggregates ? aggregates.total_listening_time_mins : Math.round(history.reduce((sum, item) => sum + ((item.duration_ms || 204000) / 60000), 0));
    const artistsDiscoveredCount = aggregates ? aggregates.artists_discovered : new Set(history.map(item => item.artist_name)).size;
    const genresExploredCount = aggregates ? aggregates.genres_explored : 0;
    
    // Sparkline real data
    const safeHistory = Array.isArray(history) ? history : [];
    const sparklineData = safeHistory.slice(-10).map((h, i) => ({ 
        val: h?.energy !== undefined ? h.energy * 100 : (h?.duration_ms ? Math.min(100, (h.duration_ms / 300000) * 100) : 50),
        i 
    }));

    // Loading State
    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center space-y-6">
                <Loader2 className="w-12 h-12 text-[var(--theme-accent)] animate-spin" />
                <p className="text-[var(--theme-text-muted)] text-sm tracking-widest uppercase font-bold">Initializing OS...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8">
                <BentoCard className="flex flex-col items-center justify-center p-12 max-w-md w-full">
                    <h2 className="text-2xl font-black mb-3">System Locked</h2>
                    <p className="text-[var(--theme-text-muted)] text-center mb-8 font-medium">Please authenticate via Spotify to access the Intelligence OS.</p>
                    <a href="https://music-ml-dashboard.onrender.com/api/auth/login" className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                        Initialize Session
                    </a>
                </BentoCard>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-screen relative z-10 w-full overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 lg:px-10 py-6 sticky top-0 z-40 bg-[var(--theme-bg)]/40 backdrop-blur-3xl border-b border-white/5">
                <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-12 h-12 rounded-[16px] overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-300">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-xl">
                                {profile.display_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white leading-tight tracking-tight">
                            {profile.display_name}
                        </h1>
                        <p className="text-[12px] text-[var(--theme-accent)] font-bold tracking-widest uppercase">System Online</p>
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3">
                    {geminiFailing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl cursor-help group relative">
                            <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                            <span className="text-xs font-bold text-red-400">AI Degradation</span>
                        </div>
                    )}
                    <div className={`flex items-center bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl transition-all duration-400 overflow-hidden ${searchExpanded ? "w-80 px-4 py-3" : "w-12 h-12 justify-center cursor-pointer hover:bg-white/10"}`} onClick={() => !searchExpanded && setSearchExpanded(true)}>
                        <Search className="w-5 h-5 text-[var(--theme-text-muted)] shrink-0" />
                        {searchExpanded && (
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search the musical continuum..." 
                                className="bg-transparent border-none outline-none text-sm px-3 flex-1 text-white placeholder:text-[var(--theme-text-muted)] font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                        {searchExpanded && (
                            <X className="w-4 h-4 text-[var(--theme-text-muted)] cursor-pointer hover:text-white shrink-0" onClick={(e) => { e.stopPropagation(); setSearchExpanded(false); setSearchQuery(""); }} />
                        )}
                    </div>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="p-6 lg:p-10 max-w-[1800px] mx-auto w-full">
                
                {/* Asymmetric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-[200px]">
                    
                    {/* Hero insight (Spans 3 cols, 2 rows) */}
                    <div className="md:col-span-2 xl:col-span-3 row-span-2">
                        <AIInsightHero />
                    </div>

                    {/* Stat Cards Column */}
                    <BentoCard className="flex flex-col justify-between group">
                        <div>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover:bg-purple-500/20 transition-colors">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-[var(--theme-text-muted)] font-bold uppercase tracking-widest mb-2">Immersion Time</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white tracking-tighter">
                                <AnimatedCounter from={0} to={totalListeningTime} />
                            </span>
                            <span className="text-sm font-bold text-purple-400 uppercase">Min</span>
                        </div>
                    </BentoCard>

                    <BentoCard className="flex flex-col justify-between group">
                        <div>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:bg-blue-500/20 transition-colors">
                                <Music className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-[var(--theme-text-muted)] font-bold uppercase tracking-widest mb-2">Sonic Fragments</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white tracking-tighter">
                                <AnimatedCounter from={0} to={tracksPlayedCount} />
                            </span>
                            <span className="text-sm font-bold text-blue-400 uppercase">Tracks</span>
                        </div>
                    </BentoCard>

                    {/* Timeline River / BioOptimization (Spans 2 cols, 2 rows) */}
                    <BentoCard className="md:col-span-2 row-span-2 relative group overflow-hidden">
                        <div className="absolute top-6 left-6 z-20">
                            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Bio-Optimization Matrix
                            </h2>
                            <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-1">Real-time reward trajectory</p>
                        </div>
                        <div className="w-full h-full pt-16">
                            <BioOptimizationGraph />
                        </div>
                    </BentoCard>

                    {/* Emotional Weather (Spans 2 cols, 2 rows) */}
                    <BentoCard className="md:col-span-2 row-span-2 relative overflow-hidden group">
                        <div className="absolute top-6 left-6 z-20">
                            <h2 className="text-lg font-black tracking-tight text-white">Emotional Weather</h2>
                            <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-1">Affective state space</p>
                        </div>
                        <div className="w-full h-full pt-8">
                            <EmotionalScatterPlot />
                        </div>
                    </BentoCard>

                    {/* Music Galaxy / Topology (Spans 3 cols, 3 rows) */}
                    <BentoCard className="md:col-span-2 xl:col-span-3 row-span-3 relative p-0 overflow-hidden" noPadding={true}>
                        <div className="absolute top-8 left-8 z-20 pointer-events-none">
                            <h2 className="text-xl font-black tracking-tight text-white shadow-black drop-shadow-lg">Music Galaxy</h2>
                            <p className="text-sm text-gray-300 font-medium mt-1 shadow-black drop-shadow-md">Explore your genre clusters</p>
                        </div>
                        <div className="w-full h-full scale-110">
                            <SonicGenreTopology />
                        </div>
                    </BentoCard>

                    {/* Top Artists Orbit / List (Spans 1 col, 2 rows) */}
                    <BentoCard className="row-span-2 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 blur-[60px] pointer-events-none rounded-full" />
                        <div className="z-10 mb-6">
                            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-green-400" />
                                Top Entities
                            </h2>
                        </div>
                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide z-10">
                            {aggregates?.top_artists_json?.slice(0, 5).map((artist: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500/20 to-blue-500/20 flex items-center justify-center font-bold text-green-300 group-hover:scale-110 transition-transform">
                                        #{i+1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-sm text-white truncate">{artist.name}</h3>
                                        <p className="text-[11px] text-[var(--theme-text-muted)]">{artist.count} streams</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </BentoCard>
                    
                    {/* Neural Confidence / OS Stats (Spans 1 col, 1 row) */}
                    <BentoCard className="relative overflow-hidden flex flex-col justify-center items-center group cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 group-hover:opacity-100 opacity-0 transition-opacity duration-500 pointer-events-none" />
                        <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">Neural Confidence</h2>
                        <div className="text-4xl font-black text-white tracking-tighter">87.4%</div>
                        <div className="w-2/3 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full w-[87%]" />
                        </div>
                    </BentoCard>

                </div>
            </div>
        </div>
    );
}
