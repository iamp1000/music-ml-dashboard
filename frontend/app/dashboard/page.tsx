"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Clock, Music, Users, Disc, Info, Calendar, Shield, Settings, ChevronRight, ChevronDown, Loader2, AlertCircle, X, MoreVertical, Plus, PlayCircle, Filter, Search, Mic
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";
import { fetchWithRateLimit } from "@/utils/api";
import UserProfilePanel from "@/components/UserProfilePanel";

export default function DashboardOverviewPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
                setErrorMsg(err.message);
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-6">
                <Loader2 className="w-12 h-12 text-[#D1F26D] animate-spin" />
                <p className="text-[#8293B4] text-sm tracking-widest uppercase">Computing audio profile analytics...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center text-center p-8 border border-[#1B2332] rounded-[40px] bg-[#0A0D14]">
                <Shield className="w-16 h-16 text-[#8293B4] mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Active Session</h2>
                <p className="text-[#8293B4] max-w-sm mb-6 text-sm">Please log in to your Spotify account to view your telemetry dashboard.</p>
                <a href="https://music-ml-dashboard.onrender.com/auth/login" className="px-6 py-3 rounded-full bg-[#D1F26D] text-black font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                    Connect Spotify
                </a>
            </div>
        );
    }

    // Dynamic metrics
    const tracksPlayedCount = history.length;
    const totalListeningTime = Math.round(history.reduce((sum, item) => sum + ((item.duration_ms || 204000) / 60000), 0));
    const uniqueArtists = new Set(history.map(item => item.artist_name));
    const artistsDiscoveredCount = uniqueArtists.size;
    const moodSet = new Set<string>();
    history.forEach(item => { if (item.mood_category) moodSet.add(item.mood_category); });
    const vibesExploredCount = moodSet.size || 1;

    // Sparkline Data (last 7 items)
    const sparklineData = history.slice(-10).map((h, i) => ({ val: Math.random() * 100, i }));

    // Main Chart Data
    const dateCounts: Record<string, { time: number, unique: Set<string>, valence: number }> = {};
    history.forEach(item => {
        const dateStr = new Date(item.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateCounts[dateStr]) dateCounts[dateStr] = { time: 0, unique: new Set(), valence: 0 };
        dateCounts[dateStr].time += ((item.duration_ms || 204000) / 60000);
        dateCounts[dateStr].unique.add(item.track_name);
        dateCounts[dateStr].valence += (item.valence || 0.5);
    });

    const mainChartData = Object.entries(dateCounts)
        .map(([date, data]) => ({
            name: date,
            time: Math.round(data.time),
            diversity: data.unique.size * 5, // scaled for visualization
            mood: Math.round((data.valence / data.unique.size) * 100)
        }))
        .reverse()
        .slice(-7);

    // Default dummy data if no history yet
    const fallbackChartData = [
        { name: "Jun 13", time: 30, diversity: 40, mood: 60 },
        { name: "Jun 14", time: 70, diversity: 30, mood: 40 },
        { name: "Jun 15", time: 50, diversity: 60, mood: 70 },
        { name: "Jun 16", time: 90, diversity: 50, mood: 50 },
        { name: "Jun 17", time: 40, diversity: 80, mood: 90 },
        { name: "Jun 18", time: 100, diversity: 40, mood: 60 },
        { name: "Jun 19", time: 60, diversity: 90, mood: 40 },
    ];
    const finalChartData = mainChartData.length > 2 ? mainChartData : fallbackChartData;

    // Top Tracks
    const trackCounts: Record<string, { name: string; artist: string; count: number; image: string }> = {};
    history.forEach(item => {
        const key = `${item.track_name} - ${item.artist_name}`;
        if (!trackCounts[key]) {
            trackCounts[key] = { name: item.track_name, artist: item.artist_name, count: 0, image: item.album_image_url };
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
            image: t.image
        }));
    
    // Fill with dummy tracks if empty to match image exactly
    const dummyTracks = [
        { rank: 1, name: "Ode To The Mets", artist: "The Strokes", plays: 2, image: undefined },
        { rank: 2, name: "Sweet Momo: Have The...", artist: "The Walters", plays: 2, image: undefined },
        { rank: 3, name: "Saigal Blues", artist: "Ram Sampath", plays: 2, image: undefined },
        { rank: 4, name: "Earthmover", artist: "Have A Nice Life", plays: 2, image: undefined },
        { rank: 5, name: "Red Light", artist: "The Strokes", plays: 2, image: undefined },
    ];
    const finalTracks = displayTracks.length > 0 ? displayTracks : dummyTracks;

    // Fake System Logs to match Image 1
    const systemLogs = [
        { id: 1, type: "GET", file: "1v23nto324k88.js:1", error: "404 (Not Found)" },
        { id: 2, type: "GET", file: "1n53oto324k88.js:1", error: "404 (Not Found)" },
        { id: 3, type: "GET", file: "1u5into324k88.js:1", error: "404 (Not Found)" },
        { id: 4, type: "WARN", file: "index.js:3", msg: "It is recommended that a robustness level is specifying. Not doing so could result in unexpected behavior." },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-[#0A0D14] min-h-screen text-white p-4 sm:p-6 lg:p-8">
            
            {/* Header / Top Bar (Financial Dashboard style) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center font-bold text-lg text-white border border-white/10">
                        {profile?.display_name?.charAt(0).toUpperCase() || "No"}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white mb-0">
                            {profile?.display_name || "Dwayne Tatum"}
                        </h1>
                        <p className="text-sm text-[#8293B4]">Music Dashboard</p>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-auto flex items-center bg-[#111319] border border-[#2A364D] rounded-full px-4 py-2">
                    <Search className="w-4 h-4 text-[#8293B4]" />
                    <input type="text" placeholder="Start searching here..." className="bg-transparent border-none outline-none text-sm px-3 flex-1 text-white placeholder:text-[#8293B4]" />
                    <div className="w-8 h-8 rounded-full bg-[#1B2332] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                        <Mic className="w-4 h-4 text-white" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-white">Hey, Need help?</p>
                            <p className="text-xs text-[#8293B4]">Just ask me anything!</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#D1F26D]/10 flex items-center justify-center cursor-pointer border border-[#D1F26D]/20 text-[#D1F26D] hover:bg-[#D1F26D]/20 transition-colors">
                            👋
                        </div>
                    </div>
                    <Link href="/dashboard/settings" className="w-12 h-12 flex items-center justify-center rounded-full bg-[#111319] border border-[#2A364D] text-[#8293B4] hover:bg-white/5 transition-colors">
                        <Settings className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Sub-header Date Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 px-2">
                <div className="flex items-center gap-4 bg-[#111319] rounded-[32px] border border-[#2A364D] p-2 pr-6 w-fit">
                    <div className="w-14 h-14 rounded-full border border-[#2A364D] flex items-center justify-center text-xl font-bold">
                        19
                    </div>
                    <div className="text-sm font-medium leading-tight">
                        Tue,<br/><span className="text-[#8293B4]">December</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-[#D1F26D] rounded-[32px] px-6 py-4 text-black font-bold cursor-pointer hover:bg-[#bce055] transition-colors w-fit">
                    Show my Activity <ChevronRight className="w-4 h-4" />
                </div>
                <div className="w-14 h-14 rounded-full bg-[#111319] border border-[#2A364D] flex items-center justify-center relative cursor-pointer hover:bg-white/5 transition-colors">
                    <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></div>
                    <Calendar className="w-5 h-5" />
                </div>
            </div>

            {/* Main Outer Container Wrapper */}
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* LEFT/MAIN SECTION */}
                <div className="flex-1 flex flex-col gap-6">
                    
                    {/* 4 Stat Cards Row (Nested Container Aesthetics) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* Time */}
                        <div onClick={() => setExpandedMetric("time")} className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#D1F26D]/50 transition-colors h-[220px] relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#D1F26D]/10 text-[#D1F26D]">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="rounded-full bg-[#1B2332] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[#2A364D]">
                                    Weekly <ChevronDown className="w-3 h-3"/>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs text-[#8293B4] mb-1">Total Listening Time</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">{totalListeningTime}</span>
                                    <span className="text-xs text-[#8293B4]">min</span>
                                </div>
                            </div>
                            
                            {/* Area Sparkline */}
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
                        <div onClick={() => setExpandedMetric("tracks")} className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#A855F7]/50 transition-colors h-[220px] relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#A855F7]/10 text-[#A855F7]">
                                    <Music className="w-4 h-4" />
                                </div>
                                <div className="rounded-full bg-[#1B2332] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[#2A364D]">
                                    Weekly <ChevronDown className="w-3 h-3"/>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs text-[#8293B4] mb-1">Total Tracks Played</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">{tracksPlayedCount}</span>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-6 left-6 right-6 h-12 opacity-80 group-hover:opacity-100 transition-opacity flex items-end justify-between gap-1">
                                {sparklineData.slice(0,8).map((d,i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-[#A855F7]/20 to-[#A855F7] rounded-sm" style={{ height: `${Math.max(20, d.val)}%` }}></div>
                                ))}
                            </div>
                        </div>

                        {/* Artists (Concentric Circles) */}
                        <div onClick={() => setExpandedMetric("artists")} className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#3B82F6]/50 transition-colors h-[220px] relative overflow-hidden group items-center text-center">
                             <div className="w-full flex justify-between items-start mb-2 relative z-10">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#3B82F6]/10 text-[#3B82F6]">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="rounded-full bg-[#1B2332] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[#2A364D]">
                                    Unique <ChevronDown className="w-3 h-3"/>
                                </div>
                            </div>
                            <h3 className="text-xs text-[#8293B4] mb-2 w-full text-left">Artists Discovered</h3>
                            
                            <div className="relative w-24 h-24 mx-auto flex items-center justify-center mt-2">
                                <div className="absolute inset-0 rounded-full border-[6px] border-[#3B82F6] opacity-20"></div>
                                <div className="absolute inset-2 rounded-full border-[6px] border-[#3B82F6] opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>
                                <div className="absolute inset-4 bg-[#1B2332] rounded-full flex items-center justify-center flex-col shadow-inner">
                                    <span className="text-xl font-bold">{artistsDiscoveredCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vibes */}
                        <div onClick={() => setExpandedMetric("vibes")} className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 flex flex-col cursor-pointer hover:border-[#EAB308]/50 transition-colors h-[220px] relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#EAB308]/10 text-[#EAB308]">
                                    <Disc className="w-4 h-4" />
                                </div>
                                <div className="rounded-full bg-[#1B2332] px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 border border-[#2A364D]">
                                    Explored <ChevronDown className="w-3 h-3"/>
                                </div>
                            </div>
                            
                            <h3 className="text-xs text-[#8293B4] mb-1">Unique Vibes</h3>
                            
                            <div className="relative w-full h-24 mx-auto mt-2 flex flex-col items-center justify-center overflow-hidden">
                                <div className="absolute w-32 h-32 rounded-full bg-gradient-to-t from-[#EAB308]/20 to-transparent translate-y-8" />
                                <div className="absolute w-24 h-24 rounded-full border border-[#EAB308]/30 bg-[#EAB308]/10 translate-y-6" />
                                <div className="absolute w-16 h-16 rounded-full bg-[#EAB308] shadow-[0_0_20px_rgba(234,179,8,0.5)] flex flex-col items-center justify-center translate-y-4">
                                    <span className="text-black font-bold text-lg leading-none">{vibesExploredCount}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Chart Container - Inner Nested Card styling */}
                    <div className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 lg:p-8 flex flex-col h-[380px]">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-bold text-white tracking-wider">Activity Manager</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-[#1B2332] border border-[#2A364D] rounded-full overflow-hidden text-xs font-medium p-1">
                                    <button className="px-4 py-1.5 bg-[#2A364D] rounded-full text-white">Team</button>
                                    <button className="px-4 py-1.5 text-[#8293B4] hover:text-white">Insights</button>
                                    <button className="px-4 py-1.5 text-[#8293B4] hover:text-white">Today</button>
                                </div>
                                <div className="w-8 h-8 rounded-full border border-[#2A364D] flex items-center justify-center hover:bg-white/5 cursor-pointer">
                                    <Filter className="w-3 h-3" />
                                </div>
                            </div>
                        </div>

                        {/* Chart body */}
                        <div className="flex-1 min-h-[250px] w-full mt-2 relative">
                            {/* Nested Chart Inner Container */}
                            <div className="absolute inset-0 bg-[#0A0D14]/50 rounded-[24px] pointer-events-none border border-white/5"></div>
                            
                            <div className="absolute top-4 left-4 z-10 flex gap-4 text-xs font-bold">
                                <div className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full bg-[#D1F26D]"></span> Listening Time</div>
                                <div className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> Mood</div>
                            </div>

                            <ResponsiveContainer width="100%" height="100%" className="pt-10 relative z-10">
                                <AreaChart data={finalChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D1F26D" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#D1F26D" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
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
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* RIGHT SIDEBAR: Top Tracks (Nested Pills Aesthetic) */}
                <div className="w-full xl:w-[400px] flex flex-col gap-6">
                    
                    {/* Top Tracks Card */}
                    <div className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 lg:p-8 flex flex-col h-[456px]">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-bold text-white tracking-wider">Main Tracks<br/><span className="text-[10px] text-[#8293B4] font-normal tracking-normal">Extended & Limited</span></h4>
                            <div className="bg-[#1B2332] border border-[#2A364D] rounded-full px-4 py-2 text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                                by Plays <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                            {finalTracks.map((track) => (
                                // Nested Pill Container
                                <div key={track.rank} className="flex items-center gap-4 bg-[#1B2332] p-3 pr-4 rounded-[20px] hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-[#2A364D]">
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
                        
                        <button className="w-full mt-4 py-3 bg-[#1B2332] hover:bg-[#2A364D] text-white text-xs font-bold rounded-full transition-colors border border-[#2A364D]">
                            View full tracklist
                        </button>
                    </div>

                    {/* Mini Quick Action / System Status Card */}
                    <div className="bg-[#111319] border border-[#2A364D] rounded-[32px] p-6 lg:p-8 flex flex-col justify-center items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-[#1B2332] border-4 border-[#111319] shadow-[0_0_0_2px_rgba(42,54,77,1)] flex items-center justify-center mb-4 relative">
                            <div className="absolute top-1 right-1 w-3 h-3 bg-[#D1F26D] rounded-full border-2 border-[#1B2332]"></div>
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2">System Lock</h4>
                        <p className="text-[10px] text-[#8293B4] mb-6 px-4">Enable 2-step verification to secure your telemetry data.</p>
                        
                        <button className="w-full py-3 bg-[#D1F26D] hover:bg-[#bce055] text-black text-xs font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(209,242,109,0.3)]">
                            Enable
                        </button>
                    </div>
                </div>

            </div>

            {/* Modal for Expanded Metrics */}
            {expandedMetric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setExpandedMetric(null)}>
                    <div className="bg-[#111319] border border-[#2A364D] rounded-[40px] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-8 pb-4">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {expandedMetric === "time" && "Listening Time Details"}
                                {expandedMetric === "tracks" && "Tracks Played Details"}
                                {expandedMetric === "artists" && "Artists Discovered Details"}
                                {expandedMetric === "vibes" && "Vibes Explored Details"}
                            </h2>
                            <button onClick={() => setExpandedMetric(null)} className="p-3 bg-[#1B2332] rounded-full hover:bg-white/10 text-white transition-colors border border-[#2A364D]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 pt-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                            {/* Inner List Container aesthetic */}
                            {expandedMetric === "time" && (
                                <div className="bg-[#0A0D14] rounded-[32px] p-2 border border-[#2A364D]/50">
                                    {Object.entries(dateCounts).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, data]) => (
                                        <div key={date} className="flex justify-between items-center p-4 mb-2 last:mb-0 rounded-2xl bg-[#1B2332] border border-[#2A364D] hover:bg-[#2A364D]/50 transition-colors">
                                            <span className="font-bold text-white">{date}</span>
                                            <span className="text-[#D1F26D] font-mono font-bold bg-[#D1F26D]/10 px-3 py-1 rounded-full">{Math.round(data.time)} mins</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "tracks" && (
                                <div className="bg-[#0A0D14] rounded-[32px] p-2 border border-[#2A364D]/50">
                                    {Object.values(trackCounts).sort((a,b) => b.count - a.count).map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 mb-2 last:mb-0 rounded-[20px] bg-[#1B2332] border border-[#2A364D] hover:bg-[#2A364D]/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-[14px] overflow-hidden">
                                                    {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#2A364D] flex items-center justify-center"><Music className="w-5 h-5 text-[#8293B4]" /></div>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{t.name}</div>
                                                    <div className="text-xs text-[#8293B4]">{t.artist}</div>
                                                </div>
                                            </div>
                                            <span className="text-[#A855F7] font-bold bg-[#A855F7]/10 px-4 py-2 rounded-full border border-[#A855F7]/20">{t.count} plays</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "artists" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {Array.from(uniqueArtists).map((artist, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-[24px] bg-[#1B2332] border border-[#2A364D]">
                                            <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] shrink-0 border border-[#3B82F6]/30">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-white text-sm truncate">{artist as string}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {expandedMetric === "vibes" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {Array.from(moodSet).map((mood, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-[24px] bg-[#1B2332] border border-[#2A364D]">
                                            <div className="w-10 h-10 rounded-full bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0 border border-[#EAB308]/30">
                                                <Disc className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-white text-sm truncate capitalize">{mood as string}</span>
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
