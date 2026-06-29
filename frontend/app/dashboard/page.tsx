"use client";

import { useEffect, useState } from "react";
import { fetchWithRateLimit } from "@/utils/api";
import { Search, Bell, X, Loader2 } from "lucide-react";

import TopArtistsList from "@/components/visualizations/TopArtistsList";
import SonicGenreTopology from "@/components/visualizations/SonicGenreTopology";
import EmotionalScatterPlot from "@/components/visualizations/EmotionalScatterPlot";
import ListeningJourneyTimeline from "@/components/visualizations/BioOptimizationGraph"; // Renamed inside, filename kept
import CircadianFlux from "@/components/visualizations/CircadianFlux";

export default function DashboardPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [geminiFailing, setGeminiFailing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch profile
                const profResp = await fetchWithRateLimit('https://music-ml-dashboard.onrender.com/api/auth/profile');
                if (profResp?.data) {
                    setProfile(profResp.data);
                }

                // Fetch full history & aggregates concurrently
                const [histResp, aggResp] = await Promise.all([
                    fetchWithRateLimit('https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=200'),
                    fetchWithRateLimit('https://music-ml-dashboard.onrender.com/api/telemetry/aggregates')
                ]);

                if (histResp?.data) setHistory(histResp.data);
                if (aggResp?.data) setAggregates(aggResp.data);

                // Fetch AI insights
                const insightsResp = await fetchWithRateLimit('https://music-ml-dashboard.onrender.com/api/telemetry/deep-insights');
                if (!insightsResp?.data) {
                    setGeminiFailing(true);
                }
            } catch (error) {
                console.error("Dashboard failed to load data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const safeHistory = Array.isArray(history) ? history : [];
    
    // Dynamic Stats
    const totalListeningTime = Math.round(safeHistory.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0) / 60000);
    const neuralConfidence = safeHistory.length > 0 
        ? ((safeHistory.reduce((s, h) => s + (h.valence || 0.5), 0) / safeHistory.length) * 0.6 + 
           (safeHistory.reduce((s, h) => s + (h.energy || 0.5), 0) / safeHistory.length) * 0.4) * 100 
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col h-screen w-screen items-center justify-center space-y-6 bg-[#0f0e13]">
                <div className="relative">
                    <Loader2 className="w-16 h-16 text-purple-500 animate-spin opacity-50" />
                    <div className="absolute inset-0 blur-xl bg-purple-500 opacity-20 rounded-full" />
                </div>
                <p className="text-gray-400 text-sm tracking-[0.3em] uppercase font-bold animate-pulse">Establishing Neural Link...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col h-screen w-screen items-center justify-center bg-[#0f0e13]">
                <div className="flex flex-col items-center justify-center p-12 max-w-md w-full relative z-10 text-center">
                    <div className="absolute -inset-20 bg-purple-500/10 blur-[100px] rounded-full z-0" />
                    <h2 className="text-3xl font-black mb-4 tracking-tighter relative z-10 text-white">System Locked</h2>
                    <p className="text-gray-400 mb-10 font-medium relative z-10">Please authenticate via Spotify to access the Intelligence OS.</p>
                    <a href="https://music-ml-dashboard.onrender.com/api/auth/login" className="relative z-10 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black hover:scale-105 transition-transform shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                        Initialize Session
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[#0A0910] text-white selection:bg-purple-500/30 overflow-hidden flex flex-col p-4 gap-4">
            
            {/* Header (Minimal, Compact) */}
            <div className="flex justify-between items-center w-full z-50 h-[60px] shrink-0">
                
                <div className="flex items-center gap-4 group cursor-pointer bg-white/5 p-1.5 pr-6 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-xl">
                                {profile.display_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white leading-none tracking-tight">
                            {profile.display_name}
                        </h1>
                        <p className="text-[10px] text-green-400 font-bold tracking-widest uppercase mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active Sync
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {geminiFailing && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border border-red-500/30 rounded-full cursor-help">
                            <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                            <span className="text-xs font-bold text-red-400">Degradation Detected</span>
                        </div>
                    )}
                    <div className={`flex items-center bg-white/5 border border-white/10 rounded-full transition-all duration-500 overflow-hidden ${searchExpanded ? "w-64 px-4 py-2" : "w-10 h-10 justify-center cursor-pointer hover:bg-white/10"}`} onClick={() => !searchExpanded && setSearchExpanded(true)}>
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        {searchExpanded && (
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search continuum..." 
                                className="bg-transparent border-none outline-none text-sm px-3 flex-1 text-white font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                        {searchExpanded && (
                            <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white shrink-0" onClick={(e) => { e.stopPropagation(); setSearchExpanded(false); setSearchQuery(""); }} />
                        )}
                    </div>
                </div>
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="flex-1 w-full grid grid-cols-12 grid-rows-12 gap-4 min-h-0">
                
                {/* Top Center-Left: Listening Journey Timeline */}
                <div className="col-span-8 row-span-7 h-full w-full relative">
                    <ListeningJourneyTimeline history={safeHistory} />
                </div>

                {/* Top Right: Circadian Flux */}
                <div className="col-span-4 row-span-7 h-full w-full relative">
                    <CircadianFlux history={safeHistory} />
                </div>

                {/* Bottom Left: Sonic Genre Topology */}
                <div className="col-span-4 row-span-5 h-full w-full relative">
                    <SonicGenreTopology genres={aggregates?.top_genres_json} />
                </div>

                {/* Bottom Middle: Emotional Scatter Plot */}
                <div className="col-span-4 row-span-5 h-full w-full relative bg-[#1A1C23]/90 border border-white/10 rounded-2xl overflow-hidden p-2">
                    <EmotionalScatterPlot history={safeHistory} />
                </div>

                {/* Bottom Right: Quick Stats & Top Artists */}
                <div className="col-span-4 row-span-5 h-full w-full relative bg-[#1A1C23]/90 border border-white/10 rounded-2xl p-4 flex flex-col overflow-hidden">
                    
                    {/* Quick Stats Header */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Immersion</p>
                            <div className="text-2xl font-black text-white tracking-tighter flex items-baseline gap-1">
                                {totalListeningTime}
                                <span className="text-xs text-purple-400 font-medium">min</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Confidence</p>
                            <div className="text-2xl font-black text-white tracking-tighter flex items-baseline gap-1">
                                {neuralConfidence.toFixed(1)}
                                <span className="text-xs text-blue-400 font-medium">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-2 px-1">Top Artists & Contributions</p>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <TopArtistsList artists={aggregates?.top_artists_json?.slice(0, 5) || []} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
