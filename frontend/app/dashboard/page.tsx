"use client";

import { useEffect, useState } from "react";
import { fetchWithRateLimit } from "@/utils/api";
import { Music, Search, Bell, Clock, X, Loader2, Sparkles, Activity } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BentoCard } from "@/components/effects/BentoCard";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";

// Visualizations
import TopArtistsList from "@/components/visualizations/TopArtistsList";
import SonicGenreTopology from "@/components/visualizations/SonicGenreTopology";
import EmotionalScatterPlot from "@/components/visualizations/EmotionalScatterPlot";
import { AIInsightHero } from "@/components/visualizations/AIInsightHero";
import BioOptimizationGraph from "@/components/visualizations/BioOptimizationGraph";

export default function DashboardPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [geminiFailing, setGeminiFailing] = useState(false);

    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

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
                const insightsResp = await fetchWithRateLimit('https://music-ml-dashboard.onrender.com/api/ml/insights');
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
    const tracksPlayedCount = safeHistory.length;

    const neuralConfidence = safeHistory.length > 0 
        ? ((safeHistory.reduce((s, h) => s + (h.valence || 0.5), 0) / safeHistory.length) * 0.6 + 
           (safeHistory.reduce((s, h) => s + (h.energy || 0.5), 0) / safeHistory.length) * 0.4) * 100 
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center space-y-6 bg-black">
                <div className="relative">
                    <Loader2 className="w-16 h-16 text-[var(--theme-accent)] animate-spin opacity-50" />
                    <div className="absolute inset-0 blur-xl bg-[var(--theme-accent)] opacity-20 rounded-full" />
                </div>
                <p className="text-[var(--theme-text-muted)] text-sm tracking-[0.3em] uppercase font-bold animate-pulse">Establishing Neural Link...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8 bg-black">
                <div className="flex flex-col items-center justify-center p-12 max-w-md w-full relative z-10 text-center">
                    <div className="absolute -inset-20 bg-purple-500/10 blur-[100px] rounded-full z-0" />
                    <h2 className="text-3xl font-black mb-4 tracking-tighter relative z-10">System Locked</h2>
                    <p className="text-gray-400 mb-10 font-medium relative z-10">Please authenticate via Spotify to access the Intelligence OS.</p>
                    <a href="https://music-ml-dashboard.onrender.com/api/auth/login" className="relative z-10 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black hover:scale-105 transition-transform shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                        Initialize Session
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-black text-white selection:bg-purple-500/30 overflow-x-hidden pb-40">
            
            {/* Ambient Background Room Lighting */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] mix-blend-screen animate-pulse duration-[10s]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] mix-blend-screen" />
            </div>

            {/* Header (Minimal, floating) */}
            <div className="flex justify-between items-center px-6 lg:px-12 py-8 fixed top-0 w-full z-50">
                <div className="flex items-center gap-4 group cursor-pointer backdrop-blur-xl bg-white/5 p-2 pr-6 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-xl">
                                {profile.display_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white leading-none tracking-tight">
                            {profile.display_name}
                        </h1>
                        <p className="text-[10px] text-[var(--theme-accent)] font-bold tracking-widest uppercase mt-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active Sync
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {geminiFailing && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border border-red-500/30 rounded-full backdrop-blur-xl cursor-help">
                            <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                            <span className="text-xs font-bold text-red-400">Degradation Detected</span>
                        </div>
                    )}
                    <div className={`flex items-center bg-white/5 border border-white/10 backdrop-blur-xl rounded-full transition-all duration-500 overflow-hidden ${searchExpanded ? "w-80 px-4 py-3" : "w-12 h-12 justify-center cursor-pointer hover:bg-white/10"}`} onClick={() => !searchExpanded && setSearchExpanded(true)}>
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

            {/* Immersive Narrative Flow */}
            <div className="relative z-10 w-full flex flex-col items-center pt-32">
                
                {/* 1. The Entry Room (Hero) */}
                <motion.div 
                    style={{ y: yHero, opacity: opacityHero }}
                    className="min-h-[80vh] w-full max-w-[1400px] flex items-center justify-center px-6 relative"
                >
                    <AIInsightHero history={safeHistory} />
                </motion.div>

                {/* Narrative Transition */}
                <div className="w-full flex justify-center py-24 opacity-30">
                    <div className="w-[1px] h-32 bg-gradient-to-b from-purple-500 to-transparent" />
                </div>

                {/* 2. Bio-Optimization Room */}
                <div className="w-full max-w-[1400px] px-6 py-24">
                    <div className="mb-16 md:px-12 flex flex-col items-center text-center">
                        <span className="text-green-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Neural Engagement
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Bio-Optimization Matrix</h2>
                        <p className="text-gray-400 mt-4 max-w-xl text-lg">Your musical consumption directly maps to physical state changes. This is your real-time reward trajectory.</p>
                    </div>
                    
                    <BentoCard borderless noPadding className="h-[600px] w-full">
                        <BioOptimizationGraph />
                    </BentoCard>
                </div>

                {/* 3. The Analytics Nexus (Split Flow) */}
                <div className="w-full max-w-[1400px] px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Left: Emotional State */}
                    <div className="flex flex-col">
                        <div className="mb-10">
                            <h2 className="text-3xl font-black tracking-tighter">Emotional Weather</h2>
                            <p className="text-gray-400 mt-2">Mapping the affective state space of your listening habits.</p>
                        </div>
                        <BentoCard borderless className="h-[500px]">
                            <EmotionalScatterPlot />
                        </BentoCard>
                    </div>

                    {/* Right: Telemetry Hub */}
                    <div className="flex flex-col justify-center gap-8">
                        <div className="flex gap-8">
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Immersion</p>
                                <div className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                                    <AnimatedCounter from={0} to={totalListeningTime} />
                                    <span className="text-lg text-purple-400">min</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Confidence</p>
                                <div className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-2">
                                    {neuralConfidence.toFixed(1)}
                                    <span className="text-lg text-blue-400">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">Dominant Frequencies</p>
                            <TopArtistsList artists={aggregates?.top_artists_json?.slice(0, 5) || []} />
                        </div>
                    </div>
                </div>

                {/* Narrative Transition */}
                <div className="w-full flex justify-center py-24 opacity-30">
                    <div className="w-[1px] h-32 bg-gradient-to-b from-blue-500 to-transparent" />
                </div>

                {/* 4. The Galaxy Room */}
                <div className="w-full max-w-[1400px] px-6 py-24">
                    <div className="mb-16 md:px-12">
                        <span className="text-blue-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Spatial Mapping
                        </span>
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter">The Musical Galaxy</h2>
                        <p className="text-gray-400 mt-4 max-w-xl text-lg">Your top genres form gravitational clusters. Navigate the constellations of your acoustic preferences.</p>
                    </div>
                    
                    <BentoCard borderless noPadding className="h-[700px] w-full rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(30,58,138,0.2)]">
                        <SonicGenreTopology genres={aggregates?.top_genres_json} />
                    </BentoCard>
                </div>

            </div>
        </div>
    );
}
