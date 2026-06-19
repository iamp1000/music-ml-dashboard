"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Clock, Music, Users, Disc, Info, Calendar, Shield, Settings, ChevronRight, Loader2
} from "lucide-react";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";

export default function DashboardOverviewPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeTab, setTimeTab] = useState<"D" | "W" | "M">("D");

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
                    const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === "success" && data.data) {
                            setProfile(data.data);
                            return true;
                        }
                    }
                    return false;
                };

                const fetchHistory = async () => {
                    const res = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === "success" && data.data) {
                            setHistory(data.data);
                        }
                    }
                };

                const success = await fetchProfileOnce();
                if (success) {
                    await fetchHistory();
                    setLoading(false);
                } else {
                    // Poll if backend data isn't synced yet
                    const interval = setInterval(async () => {
                        if (await fetchProfileOnce()) {
                            await fetchHistory();
                            setLoading(false);
                            clearInterval(interval);
                        }
                    }, 2000);
                    return () => clearInterval(interval);
                }
            } catch (err) {
                console.error("Dashboard overview load failed", err);
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
            <div className="flex flex-col min-h-[80vh] items-center justify-center text-center p-8 border border-[#1B2332] rounded-3xl bg-[#0D111A]">
                <Shield className="w-16 h-16 text-theme-text-muted mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Active Session</h2>
                <p className="text-theme-text-muted max-w-sm mb-6 text-sm">Please log in to your Spotify account to view your telemetry dashboard.</p>
                <a href="https://music-ml-dashboard.onrender.com/auth/login" className="px-6 py-3 rounded-full bg-theme-accent text-black font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                    Connect Spotify
                </a>
            </div>
        );
    }

    // Dynamic metrics calculated from actual database history and profile
    const tracksPlayedCount = history.length;
    const totalListeningTime = Math.round(tracksPlayedCount * 3.4); // 3.4 mins avg per track
    
    // Extract unique artists in history
    const uniqueArtists = new Set(history.map(item => item.artist_name));
    const artistsDiscoveredCount = uniqueArtists.size || (profile.top_artists ? profile.top_artists.length : 0);

    // Extract unique genres in top artists
    const genreSet = new Set<string>();
    profile.top_artists?.forEach((a: any) => a.genres?.forEach((g: string) => genreSet.add(g)));
    const genresExploredCount = genreSet.size;

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

    // If no history data yet, we show a clean empty state or actual empty structure
    const hasHistory = history.length > 0;

    // 2. Top Tracks from actual history (most frequent plays)
    const trackCounts: Record<string, { name: string; artist: string; count: number; id: string }> = {};
    history.forEach(item => {
        const key = `${item.track_name} - ${item.artist_name}`;
        if (!trackCounts[key]) {
            trackCounts[key] = { name: item.track_name, artist: item.artist_name, count: 0, id: item.track_id };
        }
        trackCounts[key].count += 1;
    });

    const topTracksData = Object.values(trackCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((t, idx) => ({
            rank: idx + 1,
            name: t.name,
            artist: t.artist,
            plays: t.count,
            score: Math.min(100, Math.round((t.count / (history.length || 1)) * 400 + 40)) // Relative percentage score
        }));

    // 3. Mood Timeline Stacked Data from actual history valence/energy
    const moodTimelineData = history.slice(0, 12).map((item, idx) => {
        const v = item.valence || 0.5;
        const e = item.energy || item.arousal || 0.5;
        
        // Define percentages representing active states
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

    // Sparks data for mini charts
    const timeSpark = history.slice(0, 10).map((h, i) => ({ val: (h.energy || 0.5) + (h.valence || 0.5) }));
    const tracksSpark = history.slice(0, 10).map((h, i) => ({ val: i + 1 }));
    const artistsSpark = history.slice(0, 10).map((h, i) => ({ val: Math.round((h.valence || 0.5) * 50) }));
    const genresSpark = history.slice(0, 10).map((h, i) => ({ val: Math.round((h.energy || 0.5) * 40) }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-2xl md:text-3xl font-black tracking-tight text-white">
                        <span>Good evening, {profile.display_name || "Alex"}.</span>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-theme-accent/10 border border-theme-accent/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-theme-accent shadow-[0_0_8px_var(--theme-accent)] animate-ping"></span>
                        </div>
                    </div>
                    <p className="text-sm text-theme-text-muted mt-1">Let's explore your sound.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-[#0D111A] border border-[#1B2332] rounded-xl px-4 py-2.5 text-xs font-semibold text-theme-text-muted hover:border-theme-accent/30 cursor-pointer transition-colors">
                        <Calendar className="w-4 h-4 text-theme-text-muted" />
                        <span>May 12 - Jun 10, 2024</span>
                    </div>

                    {/* Shield Status Button */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-theme-accent/10 border border-theme-accent/30 text-theme-accent cursor-pointer hover:bg-theme-accent/20 transition-all duration-300">
                        <Shield className="w-4.5 h-4.5" />
                    </div>

                    {/* Settings Button */}
                    <Link href="/dashboard/settings" className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0D111A] border border-[#1B2332] text-theme-text-muted cursor-pointer hover:border-white/20 hover:text-white transition-all duration-300">
                        <Settings className="w-4.5 h-4.5" />
                    </Link>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: Total Listening Time */}
                <div className="relative overflow-hidden bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 hover:border-[#1B2332]/80 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Total Listening Time</span>
                            <h3 className="text-2xl font-black text-white mt-2 font-mono">{totalListeningTime.toLocaleString()} <span className="text-xs font-normal text-theme-text-muted">min</span></h3>
                            <span className="inline-flex items-center text-[10px] font-semibold text-theme-accent mt-1">
                                <span className="mr-1">↑</span> 18% vs last month
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    {/* Sparkline mini chart */}
                    <div className="h-10 mt-4 -mx-5 -mb-5 opacity-40 group-hover:opacity-60 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSpark.length ? timeSpark : [{val:2},{val:3},{val:1},{val:4},{val:2},{val:5}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="val" stroke="var(--theme-accent)" strokeWidth={1.5} fillOpacity={1} fill="url(#spark1)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 2: Tracks Played */}
                <div className="relative overflow-hidden bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 hover:border-[#1B2332]/80 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Tracks Played</span>
                            <h3 className="text-2xl font-black text-white mt-2 font-mono">{tracksPlayedCount.toLocaleString()}</h3>
                            <span className="inline-flex items-center text-[10px] font-semibold text-theme-accent mt-1">
                                <span className="mr-1">↑</span> 12% vs last month
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Music className="w-5 h-5" />
                        </div>
                    </div>
                    {/* Sparkline mini chart */}
                    <div className="h-10 mt-4 -mx-5 -mb-5 opacity-40 group-hover:opacity-60 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tracksSpark.length ? tracksSpark : [{val:2},{val:4},{val:3},{val:6},{val:2},{val:5}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Bar dataKey="val" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 3: Artists Discovered */}
                <div className="relative overflow-hidden bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 hover:border-[#1B2332]/80 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Artists Discovered</span>
                            <h3 className="text-2xl font-black text-white mt-2 font-mono">{artistsDiscoveredCount}</h3>
                            <span className="inline-flex items-center text-[10px] font-semibold text-theme-accent mt-1">
                                <span className="mr-1">↑</span> 22% vs last month
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    {/* Sparkline mini chart */}
                    <div className="h-10 mt-4 -mx-5 -mb-5 opacity-40 group-hover:opacity-60 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={artistsSpark.length ? artistsSpark : [{val:3},{val:1},{val:4},{val:2},{val:5},{val:3}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Line type="monotone" dataKey="val" stroke="#3B82F6" strokeWidth={1.5} dot={{ r: 2, fill: '#3B82F6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 4: Genres Explored */}
                <div className="relative overflow-hidden bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 hover:border-[#1B2332]/80 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Genres Explored</span>
                            <h3 className="text-2xl font-black text-white mt-2 font-mono">{genresExploredCount}</h3>
                            <span className="inline-flex items-center text-[10px] font-semibold text-theme-accent mt-1">
                                <span className="mr-1">↑</span> 7% vs last month
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                            <Disc className="w-5 h-5" />
                        </div>
                    </div>
                    {/* Sparkline mini chart */}
                    <div className="h-10 mt-4 -mx-5 -mb-5 opacity-40 group-hover:opacity-60 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={genresSpark.length ? genresSpark : [{val:1},{val:3},{val:2},{val:4},{val:1},{val:3}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="spark4" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="val" stroke="#F59E0B" strokeWidth={1.5} fillOpacity={1} fill="url(#spark4)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Middle row: Listening Over Time & Top Tracks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Listening Over Time Card (2/3 width) */}
                <div className="lg:col-span-2 bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Listening Over Time</h4>
                            <Info className="w-4 h-4 text-theme-text-muted/60 cursor-help" />
                        </div>
                        <div className="flex bg-[#070A0F] border border-[#1B2332] rounded-xl p-0.5">
                            {["D", "W", "M"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setTimeTab(tab as any)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        timeTab === tab 
                                            ? "bg-theme-accent/10 border border-theme-accent/20 text-theme-accent" 
                                            : "text-theme-text-muted hover:text-white border border-transparent"
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={listeningOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="listeningGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{ stroke: 'rgba(34, 197, 94, 0.2)', strokeWidth: 1 }}
                                        contentStyle={{ backgroundColor: '#0D111A', borderColor: '#1B2332', borderRadius: '12px' }}
                                        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                                        itemStyle={{ color: 'var(--theme-accent)', fontSize: '12px' }}
                                        formatter={(value) => [`${value} min`, 'Listening Time']}
                                    />
                                    <Area type="monotone" dataKey="min" stroke="var(--theme-accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#listeningGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                No history records logged. Play music on Spotify to populate timeline.
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Tracks Card (1/3 width) */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Top Tracks</h4>
                        <div className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-2.5 py-1 rounded-lg font-bold">
                            by Plays
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                        {topTracksData.length > 0 ? (
                            topTracksData.map((track) => (
                                <div key={track.rank} className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-theme-text-muted w-4">{track.rank}</span>
                                    <div className="w-10 h-10 rounded-lg bg-[#070A0F] border border-[#1B2332] flex items-center justify-center text-theme-accent shrink-0 font-bold relative overflow-hidden shadow-md">
                                        🎵
                                        <div className="absolute inset-0 bg-theme-accent/5"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xs font-bold text-white truncate leading-tight">{track.name}</h5>
                                        <span className="text-[10px] text-theme-text-muted truncate block mt-0.5">{track.artist}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 pl-2">
                                        <span className="text-xs font-bold text-white font-mono">{track.plays} plays</span>
                                        {/* Little custom block indicators */}
                                        <div className="flex gap-0.5 mt-1">
                                            {Array.from({ length: 10 }).map((_, i) => {
                                                const filled = (track.score / 10) > i;
                                                return (
                                                    <span 
                                                        key={i} 
                                                        className={`w-1 h-1.5 rounded-sm ${filled ? 'bg-theme-accent shadow-[0_0_4px_var(--theme-accent)]' : 'bg-[#1B2332]'}`}
                                                    ></span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-theme-text-muted text-center py-10">
                                No plays recorded. Play some tracks on Spotify!
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[#1B2332]/60 pt-4 mt-4">
                        <Link href="/dashboard/top-artists" className="flex items-center justify-between text-xs text-theme-text-muted hover:text-white transition-colors group">
                            <span>View all tracks</span>
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

            </div>

            {/* Bottom row: Mood Timeline & Audio Features */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Mood Timeline (2/3 width) */}
                <div className="lg:col-span-2 bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Mood Timeline</h4>
                            <Info className="w-4 h-4 text-theme-text-muted/60 cursor-help" />
                        </div>
                        {/* Fake weather/mood selectors matching the screenshot */}
                        <div className="flex bg-[#070A0F] border border-[#1B2332] rounded-xl p-0.5 text-xs">
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">😊</span>
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">🌊</span>
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">☀️</span>
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">☁️</span>
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">💧</span>
                            <span className="px-2 py-1 cursor-pointer hover:text-white transition-colors">⚡</span>
                            <span className="px-2.5 py-1 rounded-lg bg-theme-accent/15 border border-theme-accent/25 text-theme-accent cursor-pointer">🎧</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0 flex gap-4">
                        {/* Stacked area chart */}
                        <div className="flex-1 min-w-0">
                            {hasHistory ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={moodTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0D111A', borderColor: '#1B2332', borderRadius: '12px' }}
                                            labelStyle={{ color: 'white', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="Happy" stackId="1" stroke="var(--theme-accent)" fill="var(--theme-accent)" fillOpacity={0.15} />
                                        <Area type="monotone" dataKey="Calm" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} />
                                        <Area type="monotone" dataKey="Energetic" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                                        <Area type="monotone" dataKey="Melancholic" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} />
                                        <Area type="monotone" dataKey="Focused" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                    No history logged. Play music to analyze emotional timeline.
                                </div>
                            )}
                        </div>

                        {/* Legend on the right side of chart */}
                        <div className="flex flex-col justify-center space-y-3 shrink-0 pr-2">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-theme-accent"></span>
                                    <span className="text-xs text-theme-text">Happy</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{happyPercent}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                                    <span className="text-xs text-theme-text">Calm</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{calmPercent}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></span>
                                    <span className="text-xs text-theme-text">Energetic</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{energeticPercent}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
                                    <span className="text-xs text-theme-text">Melancholic</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{melancholicPercent}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span>
                                    <span className="text-xs text-theme-text">Focused</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{focusedPercent}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audio Features Radar (1/3 width) */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[400px]">
                    <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Audio Features</h4>
                        <Info className="w-4 h-4 text-theme-text-muted/60 cursor-help" />
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="#1B2332" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8293B4', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Averages" dataKey="A" stroke="var(--theme-accent)" strokeWidth={2} fill="var(--theme-accent)" fillOpacity={0.15} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-xs text-theme-text-muted text-center py-10">
                                No metrics calculated. Listening to music will activate features mapping.
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[#1B2332]/60 pt-4 mt-2">
                        <Link href="/dashboard/features" className="flex items-center justify-between text-xs text-theme-text-muted hover:text-white transition-colors group">
                            <span>Explore all audio features</span>
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
