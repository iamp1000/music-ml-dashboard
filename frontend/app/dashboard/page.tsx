"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Clock, Music, Users, Disc, Info, Calendar, Shield, Settings, ChevronRight, Loader2, AlertCircle, X, MoreVertical, Plus
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";
import { fetchWithRateLimit } from "@/utils/api";
import UserProfilePanel from "@/components/UserProfilePanel";
import VibeSelector from "@/components/VibeSelector";

// Custom Capsule shape for the Bar Chart
const CapsuleBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    if (height <= 0) return null;
    const radius = width / 2;
    return (
        <g>
            {/* Background pill (full height approximation) */}
            <rect x={x} y={y - 10} width={width} height={height + 20} fill="#1B2332" rx={radius} ry={radius} opacity={0.3} />
            {/* The actual filled bar */}
            <rect x={x} y={y} width={width} height={height} fill={fill} rx={radius} ry={radius} />
            {/* The inner dot at the top */}
            {height > 10 && <circle cx={x + radius} cy={y + radius + 1} r={radius * 0.4} fill="#0A0D14" />}
        </g>
    );
};

export default function DashboardOverviewPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeTab, setTimeTab] = useState<string>("Overview");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [expandedMetric, setExpandedMetric] = useState<"time" | "tracks" | "artists" | "vibes" | null>(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Handle URL redirects token
                const urlParams = new URLSearchParams(window.location.search);
                const urlToken = urlParams.get('token');
                if (urlToken) {
                    localStorage.setItem("jwt", urlToken);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                const token = localStorage.getItem("jwt");
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Poll profile details
                const fetchProfileOnce = async () => {
                    try {
                        const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/auth/profile");
                        if (data && data.data) {
                            setProfile(data.data);
                            return true;
                        }
                    } catch (e: any) {
                        setErrorMsg(e.message);
                    }
                    return false;
                };

                const fetchHistoryData = async () => {
                    try {
                        // Fetch history telemetry
                        const historyData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/history");
                        if (historyData && historyData.data) {
                            setHistory(historyData.data);
                        }
                    } catch (e: any) {
                        console.error("Failed to load history", e);
                        setErrorMsg(e.message);
                    }
                };

                const success = await fetchProfileOnce();
                if (success) {
                    await fetchHistoryData();
                    setLoading(false);
                } else {
                    // Poll if backend data isn't synced yet
                    const interval = setInterval(async () => {
                        if (await fetchProfileOnce()) {
                            await fetchHistoryData();
                            setLoading(false);
                            clearInterval(interval);
                        }
                    }, 2000);
                    return () => clearInterval(interval);
                }
            } catch (err: any) {
                console.error("Dashboard overview load failed", err);
                setErrorMsg(err.message);
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-6">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm tracking-widest uppercase">Computing audio profile analytics...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center text-center p-8 border border-[#1B2332] rounded-3xl bg-[#0A0D14]">
                <Shield className="w-16 h-16 text-theme-text-muted mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Active Session</h2>
                <p className="text-theme-text-muted max-w-sm mb-6 text-sm">Please log in to your Spotify account to view your telemetry dashboard.</p>
                <a href="https://music-ml-dashboard.onrender.com/auth/login" className="px-6 py-3 rounded-full bg-theme-accent text-black font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                    Connect Spotify
                </a>
            </div>
        );
    }

    // Dynamic metrics calculated from actual database history
    const tracksPlayedCount = history.length;
    const totalListeningTime = Math.round(history.reduce((sum, item) => sum + ((item.duration_ms || 204000) / 60000), 0));
    
    // Extract unique artists in history
    const uniqueArtists = new Set(history.map(item => item.artist_name));
    const artistsDiscoveredCount = uniqueArtists.size;

    // Extract unique ML moods as "Vibes Explored"
    const moodSet = new Set<string>();
    history.forEach(item => {
        if (item.mood_category) moodSet.add(item.mood_category);
    });
    const vibesExploredCount = moodSet.size;

    // 1. Listening Volume Over Time Data
    // Group history by date (last 10 days)
    const dateCounts: Record<string, number> = {};
    history.forEach(item => {
        const dateStr = new Date(item.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const listeningOverTimeData = Object.entries(dateCounts)
        .map(([date, count]) => ({
            name: date,
            min: Math.round(count * 3.4)
        }))
        .reverse()
        .slice(-10);

    const hasHistory = history.length > 0;

    // 2. Render Top Tracks from History
    const trackCounts: Record<string, { name: string; artist: string; count: number }> = {};
    history.forEach(item => {
        const key = `${item.track_name} - ${item.artist_name}`;
        if (!trackCounts[key]) {
            trackCounts[key] = { name: item.track_name, artist: item.artist_name, count: 0 };
        }
        trackCounts[key].count += 1;
    });

    const displayTracks = Object.values(trackCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((t, idx) => ({
            rank: idx + 1,
            name: t.name,
            artist: t.artist,
            plays: t.count,
            score: Math.min(100, Math.round((t.count / (history.length || 1)) * 400 + 40))
        }));

    // 3. Mood Timeline Stacked Data from actual history valence/energy
    const moodTimelineData = history.slice(0, 12).map((item, idx) => {
        const v = item.valence || 0.5;
        const e = item.energy || item.arousal || 0.5;
        
        return {
            name: new Date(item.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Happy: v > 0.6 ? Math.round(v * 100) : Math.round(v * 20),
            Calm: (v > 0.4 && v <= 0.6) ? Math.round(v * 100) : Math.round(v * 30),
            Energetic: e > 0.6 ? Math.round(e * 100) : Math.round(e * 20),
            Melancholic: v <= 0.4 ? Math.round((1 - v) * 100) : Math.round((1 - v) * 15),
            Focused: (e > 0.3 && e <= 0.6) ? Math.round(e * 100) : Math.round(e * 25),
        };
    }).reverse();

    // Mood distribution averages
    let happyPercent = 20, calmPercent = 20, energeticPercent = 20, melancholicPercent = 20, focusedPercent = 20;
    if (hasHistory) {
        let happyVal = 0, calmVal = 0, energeticVal = 0, melancholicVal = 0, focusedVal = 0;
        history.forEach(item => {
            const v = item.valence || 0.5;
            const e = item.energy || item.arousal || 0.5;
            if (v > 0.6 && e > 0.5) happyVal++;
            else if (v > 0.6 && e <= 0.5) calmVal++;
            else if (v <= 0.5 && e > 0.6) energeticVal++;
            else if (v <= 0.5 && e <= 0.5) melancholicVal++;
            else focusedVal++;
        });
        const total = history.length;
        happyPercent = Math.round((happyVal / total) * 100);
        calmPercent = Math.round((calmVal / total) * 100);
        energeticPercent = Math.round((energeticVal / total) * 100);
        melancholicPercent = Math.round((melancholicVal / total) * 100);
        focusedPercent = Math.round((focusedVal / total) * 100);
    }

    // 4. Audio Features Radar averages from actual history
    let avgVal = 0.5, avgEng = 0.5;
    if (hasHistory) {
        avgVal = history.reduce((sum, h) => sum + (h.valence || 0.5), 0) / history.length;
        avgEng = history.reduce((sum, h) => sum + (h.energy || h.arousal || 0.5), 0) / history.length;
    }
    const radarData = [
        { subject: 'Energy', A: Math.round(avgEng * 100) },
        { subject: 'Danceability', A: Math.round((avgEng * 0.8 + avgVal * 0.2) * 100) },
        { subject: 'Valence', A: Math.round(avgVal * 100) },
        { subject: 'Acousticness', A: Math.round((1 - avgEng) * 80) },
        { subject: 'Instrumentalness', A: Math.round((1 - avgVal) * 50) },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col xl:flex-row gap-6">
            
            {/* LEFT COLUMN: Main Dash */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                            <span className="w-4 h-4 rounded-full bg-theme-accent shadow-[0_0_12px_var(--theme-accent)] animate-pulse"></span>
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
                                SonicLens <span className="text-theme-text-muted font-light">Analytics</span>
                            </h1>
                            <p className="text-sm text-theme-text-muted mt-2 tracking-wide">
                                Managing Your <span className="text-theme-accent font-bold">Sound</span> and <span className="text-[#D1F26D] font-bold">Discovery</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Link href="/dashboard/settings" className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0D111A] border border-[#1B2332] text-theme-text-muted cursor-pointer hover:border-white/20 hover:text-white transition-all duration-300">
                            <Settings className="w-5 h-5" />
                        </Link>
                        <button className="flex items-center gap-2 bg-[#1B2332] text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-[#D1F26D] hover:text-black transition-colors">
                            <Plus className="w-4 h-4" /> Expand Taste
                        </button>
                    </div>
                </div>

                {/* Sub-Navigation Pills */}
                <div className="flex flex-wrap gap-2 bg-[#0D111A] border border-[#1B2332] rounded-2xl p-1.5 self-start mb-2">
                    {["Overview", "Listening", "Artists", "Moods", "Variables"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setTimeTab(tab)}
                            className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                timeTab === tab 
                                    ? "bg-[#1B2332] text-white shadow-sm" 
                                    : "text-theme-text-muted hover:text-white"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Error notifications banner */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Time (Bright Accent like the Yellow 'Data Transfer' card) */}
                    <div onClick={() => setExpandedMetric("time")} className="cursor-pointer relative overflow-hidden bg-[#D1F26D] rounded-3xl p-6 text-black hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(209,242,109,0.1)]">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2 text-black/60 font-bold text-sm">
                                <Clock className="w-4 h-4" /> Listening Time
                            </div>
                            <MoreVertical className="w-5 h-5 text-black/40" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-5xl lg:text-6xl font-black tracking-tighter">{totalListeningTime}</span>
                            <span className="text-xs font-bold text-black/40 uppercase tracking-widest">/ mins</span>
                        </div>
                        {/* Segmented Pill Indicators */}
                        <div className="flex gap-1.5 h-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className={`flex-1 rounded-full ${i < 5 ? 'bg-black' : 'border border-black/20 bg-transparent'}`}></div>
                            ))}
                        </div>
                    </div>

                    {/* Card 2: Tracks (White/Off-white Card like 'Operations') */}
                    <div onClick={() => setExpandedMetric("tracks")} className="cursor-pointer relative overflow-hidden bg-white rounded-3xl p-6 text-black hover:scale-[1.02] transition-transform">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2 text-black/60 font-bold text-sm">
                                <Music className="w-4 h-4" /> Tracks Played
                            </div>
                            <MoreVertical className="w-5 h-5 text-black/40" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-5xl lg:text-6xl font-black tracking-tighter">{tracksPlayedCount}</span>
                            <span className="text-xs font-bold text-black/40 uppercase tracking-widest">/ total</span>
                        </div>
                        {/* Segmented Pill Indicators */}
                        <div className="flex gap-1.5 h-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className={`flex-1 rounded-full ${i < 6 ? 'bg-black' : 'border border-black/20 bg-transparent'}`}></div>
                            ))}
                        </div>
                    </div>

                    {/* Card 3: Vibes (Dark Card like 'Take You Automation...') */}
                    <div onClick={() => setExpandedMetric("vibes")} className="cursor-pointer relative overflow-hidden bg-[#0D111A] border border-[#1B2332] rounded-3xl p-6 text-white hover:border-white/20 transition-all flex flex-col justify-between group shadow-xl">
                        {/* Background subtle gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D1F26D]/5 to-transparent opacity-50"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl xl:text-3xl font-bold leading-tight mb-2">Take Your <span className="text-[#D1F26D] flex items-center gap-1 inline-flex">Sound <ChevronRight className="w-5 h-5 xl:w-6 xl:h-6" /></span><br/>to the Next Level</h3>
                            <p className="text-xs text-theme-text-muted">Explored {vibesExploredCount} unique vibes</p>
                        </div>
                        <button className="relative z-10 w-full mt-6 bg-white text-black py-3 rounded-xl font-bold flex justify-between items-center px-5 group-hover:bg-[#D1F26D] transition-colors">
                            <span>Vibe Check</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Statistics Chart (Income Tracker / Operations style) */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-6 sm:p-8 flex flex-col h-[400px] shadow-lg">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#1B2332] flex items-center justify-center">
                                <AreaChart className="w-4 h-4 text-theme-text-muted" />
                            </div>
                            <h4 className="text-lg sm:text-xl font-bold text-white">Statistics</h4>
                            <div className="hidden sm:flex items-center gap-4 ml-6 text-xs font-bold">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white"></span> Listening</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#D1F26D]"></span> Artists</div>
                            </div>
                        </div>
                        <div className="bg-[#1B2332] rounded-xl px-4 py-2 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">
                            2024 <ChevronRight className="w-3 h-3 inline ml-1 rotate-90" />
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full min-h-0">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={listeningOverTimeData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }} barSize={16}>
                                    <XAxis dataKey="name" tick={{ fill: '#8293B4', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        contentStyle={{ backgroundColor: '#1B2332', borderColor: '#2A364D', borderRadius: '12px' }}
                                        labelStyle={{ color: 'white', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#D1F26D' }}
                                    />
                                    <Bar dataKey="min" fill="white" shape={<CapsuleBar />} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">No data available</div>
                        )}
                    </div>
                </div>

                {/* Mood Timeline & Premium Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Proposal Progress style Mood Timeline */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-6 sm:p-8 shadow-lg">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-lg font-bold text-white">Mood Timeline</h4>
                            <div className="text-xs text-theme-text-muted flex items-center gap-2 border border-[#1B2332] px-3 py-1.5 rounded-lg">
                                <Calendar className="w-4 h-4" /> Last 12 tracks
                            </div>
                        </div>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <div className="text-xs font-bold text-theme-text-muted mb-1">Happy</div>
                                <div className="text-3xl sm:text-4xl font-black">{happyPercent}%</div>
                            </div>
                            <div className="w-px h-12 bg-[#1B2332]"></div>
                            <div>
                                <div className="text-xs font-bold text-theme-text-muted mb-1">Chill</div>
                                <div className="text-3xl sm:text-4xl font-black">{calmPercent}%</div>
                            </div>
                            <div className="w-px h-12 bg-[#1B2332]"></div>
                            <div>
                                <div className="text-xs font-bold text-theme-text-muted mb-1">Energy</div>
                                <div className="text-3xl sm:text-4xl font-black">{energeticPercent}%</div>
                            </div>
                        </div>
                        {/* Segmented Timeline Graphic */}
                        <div className="flex items-end gap-1 h-16">
                            {moodTimelineData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group">
                                    <div className="w-full bg-[#1B2332] rounded-full transition-all group-hover:bg-[#2A364D]" style={{ height: `${d.Happy}%` }}></div>
                                    <div className="w-full bg-[#D1F26D] rounded-full transition-all shadow-[0_0_8px_rgba(209,242,109,0)] group-hover:shadow-[0_0_8px_rgba(209,242,109,0.5)]" style={{ height: `${d.Calm}%` }}></div>
                                    <div className="w-full bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ height: '4px' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Premium Upgrade Card */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center items-center text-center shadow-lg">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D1F26D]/10 via-transparent to-transparent opacity-60"></div>
                        <h4 className="text-xl font-bold text-white mb-3 relative z-10">Unlock Premium ML</h4>
                        <p className="text-sm text-theme-text-muted mb-8 relative z-10 max-w-[200px]">Get exclusive access to neural embeddings & discovery stats.</p>
                        <button className="bg-white text-black px-8 py-3.5 rounded-xl font-bold relative z-10 flex items-center gap-2 hover:bg-[#D1F26D] transition-colors shadow-lg">
                            Upgrade now <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Sidebar Stack (Your Recent Projects style) */}
            <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
                {/* Profile Widget */}
                <div 
                    onClick={() => setShowProfilePanel(true)}
                    className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-5 flex items-center gap-4 cursor-pointer hover:border-white/20 transition-colors shadow-lg"
                >
                    <div className="w-14 h-14 rounded-2xl bg-theme-accent/10 border border-theme-accent/30 overflow-hidden flex items-center justify-center text-theme-accent shrink-0">
                        {profile?.images?.[0]?.url ? (
                            <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-6 h-6" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{profile?.display_name || "Alex"}</div>
                        <div className="text-xs text-theme-text-muted truncate">Premium Account</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1B2332] flex items-center justify-center text-theme-text-muted">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Top Tracks (Recent Projects style) */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-6 flex-1 flex flex-col min-h-[400px] shadow-lg">
                    <div className="flex justify-between items-end mb-6">
                        <h4 className="text-lg font-bold text-white">Your Top Tracks</h4>
                        <span className="text-xs font-bold text-theme-text-muted hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white">See all</span>
                    </div>

                    <div className="flex-1 space-y-3">
                        {displayTracks.length > 0 ? displayTracks.map((track) => (
                            <div key={track.rank} className="bg-[#0A0D14] border border-[#1B2332] rounded-2xl p-4 hover:border-white/20 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#D1F26D] text-black flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-sm font-bold text-white truncate">{track.name}</h5>
                                        </div>
                                        <div className="text-xs text-theme-text-muted truncate mt-0.5">{track.artist}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#1B2332] flex items-center justify-center text-theme-text-muted group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold bg-[#1B2332] text-theme-text-muted px-2.5 py-1 rounded-full uppercase tracking-wider">{track.plays} plays</span>
                                    <span className="text-[10px] font-bold bg-[#1B2332] text-[#D1F26D] px-2.5 py-1 rounded-full uppercase tracking-wider">Top Tier</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-sm text-theme-text-muted py-10">No top tracks yet.</div>
                        )}
                    </div>
                </div>

                {/* Radar Chart Card */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold text-white">Audio Features</h4>
                        <div className="w-8 h-8 rounded-full bg-[#1B2332] flex items-center justify-center">
                            <Info className="w-4 h-4 text-theme-text-muted" />
                        </div>
                    </div>
                    <p className="text-xs text-theme-text-muted mb-4">Detailed sonic breakdown.</p>
                    <div className="h-48 w-full bg-[#0A0D14] rounded-2xl relative border border-[#1B2332]">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                    <PolarGrid stroke="#1B2332" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8293B4', fontSize: 9 }} />
                                    <Radar name="Averages" dataKey="A" stroke="#D1F26D" strokeWidth={2} fill="#D1F26D" fillOpacity={0.2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-theme-text-muted">No data available.</div>
                        )}
                    </div>
                </div>
            </div>

            <UserProfilePanel 
                isOpen={showProfilePanel} 
                onClose={() => setShowProfilePanel(false)} 
                profile={profile} 
            />

            {/* Modal for Expanded Metrics */}
            {expandedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedMetric(null)}>
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-[#1B2332]">
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                                {expandedMetric === "time" && "Listening Time Details"}
                                {expandedMetric === "tracks" && "Tracks Played Details"}
                                {expandedMetric === "artists" && "Artists Discovered Details"}
                                {expandedMetric === "vibes" && "Vibes Explored Details"}
                            </h2>
                            <button onClick={() => setExpandedMetric(null)} className="p-2 rounded-full hover:bg-white/10 text-theme-text-muted hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {expandedMetric === "time" && (
                                <div className="space-y-3">
                                    {Object.entries(dateCounts).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, count]) => (
                                        <div key={date} className="flex justify-between items-center p-3 rounded-xl bg-[#1B2332]/30 border border-[#1B2332]">
                                            <span className="font-bold text-theme-text-muted">{date}</span>
                                            <span className="text-[#D1F26D] font-mono">{Math.round(count * 3.4)} mins</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "tracks" && (
                                <div className="space-y-3">
                                    {Object.values(trackCounts).sort((a,b) => b.count - a.count).map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#1B2332]/30 border border-[#1B2332]">
                                            <div>
                                                <div className="font-bold text-white">{t.name}</div>
                                                <div className="text-xs text-theme-text-muted">{t.artist}</div>
                                            </div>
                                            <span className="text-[#D1F26D] font-mono bg-[#D1F26D]/10 px-3 py-1 rounded-lg">{t.count} plays</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "artists" && (
                                <div className="grid grid-cols-2 gap-3">
                                    {Array.from(uniqueArtists).map((artist, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#1B2332]/30 border border-[#1B2332]">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-white text-sm truncate">{artist as string}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "vibes" && (
                                <div className="grid grid-cols-2 gap-3">
                                    {Array.from(moodSet).map((mood, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#1B2332]/30 border border-[#1B2332]">
                                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                                                <Disc className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-white text-sm truncate">{mood as string}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
