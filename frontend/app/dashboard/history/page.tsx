"use client";

import React, { useEffect, useState } from "react";
import { 
    Clock, Filter, Loader2, AlertCircle, Activity, Calendar, Music, 
    Sliders, Smile, BrainCircuit, Info, ChevronRight 
} from "lucide-react";
import { format } from "date-fns";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { fetchWithRateLimit } from "@/utils/api";

type TabType = "history" | "features" | "mood" | "neural";

export default function AnalyticsHubPage() {
    const [activeTab, setActiveTab] = useState<TabType>("history");
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Mood logger state
    const [sliderValue, setSliderValue] = useState(50);
    const [logStatus, setLogStatus] = useState<string | null>(null);

    // Inference state
    const [inferenceLoading, setInferenceLoading] = useState(false);
    const [inferenceResult, setInferenceResult] = useState<{ valence: number, arousal: number } | null>(null);

    // Sandbox state
    const [sandboxTime, setSandboxTime] = useState(12);
    const [sandboxEnergy, setSandboxEnergy] = useState(0.5);
    const [sandboxValence, setSandboxValence] = useState(0.5);
    const [sandboxMood, setSandboxMood] = useState("Awaiting Inference...");

    const runInference = async () => {
        setInferenceLoading(true);
        try {
            const res = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/analyze_audio", {
                method: "POST",
                body: JSON.stringify({ file_path: "sample_track.wav" })
            });
            if (res && res.data) {
                setInferenceResult(res.data);
            }
        } catch (err) {
            console.error("Inference Error:", err);
        } finally {
            setInferenceLoading(false);
        }
    };

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                // Fetch profile first
                const profileData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/auth/profile");
                if (profileData && profileData.data) {
                    setProfile(profileData.data);
                }

                // Fetch history
                const historyData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/history");
                if (historyData && historyData.data) {
                    setHistory(historyData.data);
                }
            } catch (err: any) {
                console.error("Failed to load analytics hub data", err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalyticsData();
    }, []);

    // Sandbox API call when sliders change
    useEffect(() => {
        const fetchSandbox = async () => {
            try {
                const res = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/sandbox_inference", {
                    method: "POST",
                    body: JSON.stringify({ time_of_day: sandboxTime, energy: sandboxEnergy, valence: sandboxValence })
                });
                if (res && res.data) {
                    setSandboxMood(res.data.predicted_mood);
                }
            } catch (err) {
                // Ignore silent errors for sandbox
            }
        };
        const timer = setTimeout(() => {
            fetchSandbox();
        }, 300); // debounce
        return () => clearTimeout(timer);
    }, [sandboxTime, sandboxEnergy, sandboxValence]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Loading Analytics Hub...</p>
            </div>
        );
    }

    // Common statistics calculation
    const hasHistory = history.length > 0;
    
    // Average audio features calculations
    let avgValence = 0.5;
    let avgEnergy = 0.5;
    if (hasHistory) {
        avgValence = history.reduce((sum, h) => sum + (h.valence || 0.5), 0) / history.length;
        avgEnergy = history.reduce((sum, h) => sum + (h.energy || h.arousal || 0.5), 0) / history.length;
    }
    const danceability = avgEnergy * 0.8 + avgValence * 0.2;
    const acousticness = 1 - avgEnergy;

    // --- Sub-Render: History & Habits ---
    const renderHistoryTab = () => {
        // Group history by date (last 10 days)
        const dateCounts: Record<string, number> = {};
        history.forEach(item => {
            const timeVal = item.time || item.played_at;
            if (timeVal) {
                const dateStr = new Date(timeVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
            }
        });

        const areaData = Object.entries(dateCounts).map(([date, count]) => ({
            name: date,
            volume: count
        })).reverse();

        // 7x24 grid for Heatmap
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const hours = Array.from({ length: 24 }).map((_, i) => i);
        const heatmapGrid = Array(7).fill(0).map(() => Array(24).fill(0));
        let maxCount = 1;

        history.forEach(item => {
            const timeVal = item.time || item.played_at;
            if (timeVal) {
                const d = new Date(timeVal);
                const dayIdx = d.getDay(); 
                const alignedDayIdx = dayIdx === 0 ? 6 : dayIdx - 1; 
                const hr = d.getHours();
                heatmapGrid[alignedDayIdx][hr] += 1;
                if (heatmapGrid[alignedDayIdx][hr] > maxCount) {
                    maxCount = heatmapGrid[alignedDayIdx][hr];
                }
            }
        });

        const formatDuration = (ms: number) => {
            if (!ms || isNaN(ms)) return "3:12";
            const totalSeconds = Math.floor(ms / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Listening Volume Chart */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[320px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-theme-accent" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Listening Volume</h3>
                            </div>
                            <span className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full font-bold">
                                {history.length} Total plays logged
                            </span>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            {hasHistory ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="habitVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity="0.25"/>
                                                <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0D111A', borderColor: '#1B2332', borderRadius: '12px' }}
                                            itemStyle={{ color: 'var(--theme-accent)' }}
                                        />
                                        <Area type="monotone" dataKey="volume" stroke="var(--theme-accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#habitVolumeGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                    No history data. Play tracks on Spotify to compile volume trends.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-theme-accent" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Heatmap</h3>
                            </div>
                            <span className="text-[10px] text-theme-text-muted">Play distribution by day and hour</span>
                        </div>

                        <div className="flex items-end gap-4 overflow-x-auto pb-2 scrollbar-thin">
                            <div className="flex flex-col justify-between h-[180px] text-[10px] font-bold text-theme-text-muted uppercase tracking-wider pb-6 shrink-0">
                                {days.map(day => <span key={day} className="h-5 flex items-center">{day}</span>)}
                            </div>

                            <div className="flex-1 flex flex-col justify-between h-[180px] min-w-[320px]">
                                {days.map((day, r) => (
                                    <div key={r} className="flex gap-1 h-5">
                                        {hours.map(c => {
                                            const count = heatmapGrid[r][c];
                                            const intensity = count / maxCount;
                                            let bgColor = 'bg-[#070A0F] border-[#1B2332]/40';
                                            
                                            if (count > 0) {
                                                if (intensity > 0.75) bgColor = 'bg-theme-accent border-theme-accent';
                                                else if (intensity > 0.50) bgColor = 'bg-theme-accent/70 border-theme-accent/70';
                                                else if (intensity > 0.25) bgColor = 'bg-theme-accent/40 border-theme-accent/40';
                                                else bgColor = 'bg-theme-accent/20 border-theme-accent/20';
                                            }

                                            return (
                                                <div 
                                                    key={c} 
                                                    className={`flex-1 rounded-sm border hover:border-white cursor-pointer transition-colors duration-200 ${bgColor}`}
                                                    title={`${day} at ${c}:00 - ${count} play${count === 1 ? '' : 's'}`}
                                                ></div>
                                            );
                                        })}
                                    </div>
                                ))}

                                <div className="flex justify-between text-[9px] font-bold text-theme-text-muted mt-2 px-1">
                                    <span>12 AM</span>
                                    <span>6 AM</span>
                                    <span>12 PM</span>
                                    <span>6 PM</span>
                                    <span>11 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Container Card */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-5 h-5 text-theme-accent" />
                            Historical Logs
                        </h3>
                    </div>

                    <div className="flex-1 flex flex-col min-w-full">
                        <div className="grid grid-cols-12 gap-4 text-[10px] font-bold uppercase tracking-widest text-theme-text-muted pb-3 border-b border-[#1B2332] px-4 shrink-0">
                            <div className="col-span-2">Played At</div>
                            <div className="col-span-4">Track Title</div>
                            <div className="col-span-3">Artist</div>
                            <div className="col-span-2">Telemetry</div>
                            <div className="col-span-1 text-right">Duration</div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[400px] pr-1 mt-2 space-y-1.5 scrollbar-thin">
                            {hasHistory ? (
                                history.map((item, i) => {
                                    const playedAt = new Date(item.time || item.played_at);
                                    return (
                                        <div key={item.id || i} className="grid grid-cols-12 gap-4 text-xs items-center bg-[#070A0F]/30 hover:bg-[#070A0F] p-3 px-4 rounded-xl transition-all border border-[#1B2332]/40 hover:border-[#1B2332] group">
                                            <div className="col-span-2 text-theme-text-muted font-mono">
                                                {format(playedAt, "MMM dd • hh:mm a")}
                                            </div>
                                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[#070A0F] border border-[#1B2332] flex items-center justify-center text-theme-accent text-[10px] font-bold shrink-0 relative overflow-hidden shadow-sm">
                                                    <Music className="w-4 h-4 text-theme-accent" />
                                                    <div className="absolute inset-0 bg-theme-accent/5"></div>
                                                </div>
                                                <div className="truncate font-bold text-white group-hover:text-theme-accent transition-colors">
                                                    {item.track_name || "Unknown Track"}
                                                </div>
                                            </div>
                                            <div className="col-span-3 truncate text-theme-text-muted font-medium">
                                                {item.artist_name || "Unknown Artist"}
                                            </div>
                                            <div className="col-span-2 flex items-center gap-4 text-theme-text-muted">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-theme-accent uppercase font-mono">Val:</span>
                                                    <span className="font-mono font-bold text-white text-[10px]">{(item.valence || 0.5).toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-purple-400 uppercase font-mono">Eng:</span>
                                                    <span className="font-mono font-bold text-white text-[10px]">{(item.energy || item.arousal || 0.5).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1 text-right text-theme-text-muted font-mono font-bold">
                                                {formatDuration(item.duration_ms)}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex h-[200px] items-center justify-center text-sm text-theme-text-muted">
                                    No playback history found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Sub-Render: Audio Features ---
    const renderFeaturesTab = () => {
        const radarData = [
            { subject: 'Valence', A: Math.round(avgValence * 100), fullMark: 100 },
            { subject: 'Energy', A: Math.round(avgEnergy * 100), fullMark: 100 },
            { subject: 'Danceability', A: Math.round((avgEnergy * 0.85 + avgValence * 0.15) * 100), fullMark: 100 },
            { subject: 'Acousticness', A: Math.round((1 - avgEnergy) * 85), fullMark: 100 },
            { subject: 'Instrumentalness', A: Math.round((1 - avgValence) * 60), fullMark: 100 },
            { subject: 'Speechiness', A: Math.round((avgEnergy * 0.5 + 0.2) * 100), fullMark: 100 },
        ];

        // Compute genre distribution from top artists
        const genreCounts: Record<string, number> = {};
        let totalGenreTags = 0;
        
        profile?.top_artists?.forEach((artist: any) => {
            artist.genres?.forEach((g: string) => {
                const name = g.split(" ")[0]; 
                const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
                genreCounts[capitalized] = (genreCounts[capitalized] || 0) + 1;
                totalGenreTags++;
            });
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, count]) => ({
                name,
                value: count,
                percentage: totalGenreTags > 0 ? Math.round((count / totalGenreTags) * 100) : 25
            }));

        const COLORS = ['var(--theme-accent)', '#8B5CF6', '#3B82F6', '#F59E0B'];

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Audio Features Radar */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[450px] relative">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-theme-accent" />
                        Audio Characteristics Radar
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#1B2332" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8293B4', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="User" dataKey="A" stroke="var(--theme-accent)" strokeWidth={2} fill="var(--theme-accent)" fillOpacity={0.15} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                No history records logged.
                            </div>
                        )}
                    </div>
                </div>

                {/* Genre Distributions */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Top Genre Distributions</h3>
                        <p className="text-[11px] text-theme-text-muted mb-6">Relative percentages derived from your top artists list</p>
                    </div>

                    {topGenres.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            {topGenres.map((genre, idx) => {
                                const chartData = [
                                    { name: genre.name, value: genre.value },
                                    { name: 'Other', value: Math.max(1, totalGenreTags - genre.value) }
                                ];
                                const color = COLORS[idx % COLORS.length];

                                return (
                                    <div key={idx} className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                                        <div className="absolute top-2 left-3 text-[10px] font-bold text-white uppercase tracking-wider">{genre.name}</div>
                                        
                                        <div className="w-full h-24 flex items-center justify-center relative mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={28}
                                                        outerRadius={38}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        <Cell fill={color} />
                                                        <Cell fill="#1B2332" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                                <span className="text-sm font-black text-white font-mono">{genre.percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-theme-text-muted">
                            No genre distributions available. Syncing profile...
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Sub-Render: Mood Explorer ---
    const renderMoodTab = () => {
        const lineData = history.slice(0, 15).map((item, idx) => ({
            index: idx + 1,
            track: item.track_name,
            valence: Math.round((item.valence || 0.5) * 100),
            energy: Math.round((item.energy || item.arousal || 0.5) * 100)
        })).reverse();

        const latestTrack = hasHistory ? history[0] : null;
        const v = latestTrack ? (latestTrack.valence || 0.5) : 0.5;
        const e = latestTrack ? (latestTrack.energy || latestTrack.arousal || 0.5) : 0.5;

        let moodName = "Neutral";
        let moodOpacity = { melancholy: 0.4, chill: 1, energetic: 0.4 };

        if (v > 0.6 && e > 0.5) {
            moodName = "Energetic / Happy";
            moodOpacity = { melancholy: 0.2, chill: 0.2, energetic: 1 };
        } else if (v > 0.6 && e <= 0.5) {
            moodName = "Chill / Calm";
            moodOpacity = { melancholy: 0.2, chill: 1, energetic: 0.2 };
        } else if (v <= 0.4 && e <= 0.4) {
            moodName = "Melancholic";
            moodOpacity = { melancholy: 1, chill: 0.2, energetic: 0.2 };
        } else if (e > 0.6) {
            moodName = "Focused / Intense";
            moodOpacity = { melancholy: 0.3, chill: 0.3, energetic: 1 };
        }

        const handleMoodLog = () => {
            setLogStatus(`Log registered: actual valence ${sliderValue / 100} compared to predicted ${v.toFixed(2)}`);
            setTimeout(() => setLogStatus(null), 3000);
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[420px] relative">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Smile className="w-5 h-5 text-theme-accent" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mood Correlation Wave</h3>
                        </div>
                        <span className="text-[10px] text-theme-text-muted">Valence vs Energy of recent plays</span>
                    </div>
                    
                    <div className="flex-1 w-full min-h-0 mt-4">
                        {hasHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={lineData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                                    <XAxis dataKey="index" tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#8293B4', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0D111A', borderColor: '#1B2332', borderRadius: '12px' }}
                                        labelStyle={{ color: 'white', fontWeight: 'bold' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Line type="monotone" name="Valence" dataKey="valence" stroke="var(--theme-accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--theme-accent)' }} />
                                    <Line type="monotone" name="Energy" dataKey="energy" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                No listening history found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Logging & predicted state */}
                <div className="flex flex-col gap-6">
                    {/* Predicted state */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6 border-b border-[#1B2332] pb-2">Predicted State</h4>
                        
                        {latestTrack ? (
                            <div className="space-y-4">
                                <div className="text-[10px] text-theme-text-muted uppercase">Based on: <span className="text-white font-bold">{latestTrack.track_name}</span></div>
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.melancholy }}>
                                        <span className="text-xs mb-1 font-bold text-theme-text-muted uppercase">Low</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Melancholy</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.chill }}>
                                        <span className="text-xs mb-1 font-bold text-theme-text-muted uppercase">Mid</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Chill</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.energetic }}>
                                        <span className="text-xs mb-1 font-bold text-theme-text-muted uppercase">High</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Energetic</span>
                                    </div>
                                </div>
                                <div className="text-center pt-2">
                                    <span className="inline-block text-xs font-black text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full uppercase tracking-wider">
                                        {moodName}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-theme-text-muted py-6">
                                Connect to Spotify to calculate predicted mood state.
                            </div>
                        )}
                    </div>

                    {/* Actual Mood Log */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Log Actual Mood</h4>
                        
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={sliderValue}
                            onChange={(e) => setSliderValue(parseInt(e.target.value))}
                            className="w-full h-1 bg-[#1B2332] rounded-lg appearance-none cursor-pointer accent-theme-accent mb-4"
                        />
                        
                        <div className="flex justify-between text-xs px-1 mb-5 font-bold text-theme-text-muted">
                            <span className="cursor-pointer uppercase hover:text-white transition-colors" onClick={() => setSliderValue(10)}>Low</span>
                            <span className="cursor-pointer uppercase hover:text-white transition-colors" onClick={() => setSliderValue(50)}>Mid</span>
                            <span className="cursor-pointer uppercase hover:text-white transition-colors" onClick={() => setSliderValue(90)}>High</span>
                        </div>

                        <button 
                            onClick={handleMoodLog}
                            className="w-full py-2.5 rounded-xl bg-theme-accent/15 hover:bg-theme-accent text-theme-accent hover:text-black font-bold text-xs uppercase tracking-widest transition-all duration-300 border border-theme-accent/30 hover:border-transparent"
                        >
                            Log Mood
                        </button>

                        {logStatus && (
                            <div className="text-[9px] font-bold text-center text-theme-accent bg-theme-accent/5 border border-theme-accent/15 py-1.5 rounded-lg mt-3 uppercase tracking-wider animate-pulse">
                                {logStatus}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Sub-Render: Neural Model Classifier Sandbox ---
    const renderNeuralTab = () => {
        const layers = [
            { name: "INPUTS", nodes: 3, labels: ["Energy", "Valence", "Time"] },
            { name: "HIDDEN", nodes: 4, labels: ["H1", "H2", "H3", "H4"] },
            { name: "PREDICTION", nodes: 1, labels: ["Mood Output"] }
        ];

        const generatePaths = (layerAIndex: number, layerBIndex: number) => {
            const paths = [];
            const nodesA = layers[layerAIndex].nodes;
            const nodesB = layers[layerBIndex].nodes;
            for (let a = 0; a < nodesA; a++) {
                for (let b = 0; b < nodesB; b++) {
                    paths.push({ a, b });
                }
            }
            return paths;
        };

        return (
            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center border-b border-[#1B2332]/60 pb-4 mb-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-theme-accent animate-pulse" />
                        Neural Mood Predictor (CARS)
                    </h3>
                    <span className="text-[10px] text-theme-text-muted bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold">
                        Interactive Sandbox
                    </span>
                </div>

                <div className="flex-1 flex flex-col items-center relative bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-8 mb-6 overflow-hidden">
                    {/* Neural Network SVG visualization */}
                    <div className="flex justify-between h-64 w-full max-w-2xl relative z-10">
                        {layers.map((layer, lIndex) => (
                            <div key={lIndex} className="flex flex-col justify-between items-center h-full relative z-10" style={{ width: '120px' }}>
                                <h4 className="text-[10px] font-black text-theme-text-muted uppercase tracking-widest mb-4">{layer.name}</h4>
                                <div className="flex flex-col justify-around flex-1 w-full gap-4">
                                    {Array.from({ length: layer.nodes }).map((_, nIndex) => (
                                        <div key={nIndex} className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full border border-blue-400 bg-blue-500/20 z-20 relative shadow-[0_0_12px_rgba(59,130,246,0.5)]">
                                                <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
                                            </div>
                                            {layer.labels[nIndex] && (
                                                <span className="text-[9px] mt-2 font-bold text-theme-text-muted">{layer.labels[nIndex]}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ paddingTop: '5.5rem' }}>
                        <defs>
                            <linearGradient id="sandboxLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        
                        <g transform="translate(160, 0)">
                        {layers.map((layer, lIndex) => {
                            if (lIndex === layers.length - 1) return null;
                            const paths = generatePaths(lIndex, lIndex + 1);
                            
                            // Estimate x positions roughly mapped to the flexbox
                            const x1 = lIndex * 260;
                            const x2 = (lIndex + 1) * 260;
                            
                            return paths.map((path, i) => {
                                const y1 = (200 / (layers[lIndex].nodes + 1)) * (path.a + 1);
                                const y2 = (200 / (layers[lIndex + 1].nodes + 1)) * (path.b + 1);
                                
                                return (
                                    <line 
                                        key={`edge-${lIndex}-${i}`}
                                        x1={x1} y1={y1} 
                                        x2={x2} y2={y2} 
                                        stroke="url(#sandboxLineGrad)" 
                                        strokeWidth={1.5 + (Math.random() * 2)}
                                        className="transition-all duration-300"
                                    />
                                );
                            });
                        })}
                        </g>
                    </svg>

                    {/* Output Label */}
                    <div className="mt-8 flex flex-col items-center">
                        <span className="text-[10px] text-theme-text-muted uppercase tracking-wider mb-2">Mood Classification</span>
                        <div className="px-6 py-2 bg-theme-accent/10 border border-theme-accent/20 rounded-xl text-theme-accent font-mono font-bold tracking-widest uppercase">
                            {sandboxMood}
                        </div>
                    </div>
                </div>

                {/* Interactive Sliders */}
                <div className="bg-[#070A0F] border border-[#1B2332] p-6 rounded-xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Time of Day Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Time of Day (h)</label>
                                <span className="bg-[#1B2332] text-white text-[10px] font-mono px-2 py-1 rounded">{sandboxTime}:00</span>
                            </div>
                            <input 
                                type="range" min="0" max="23" 
                                value={sandboxTime} onChange={(e) => setSandboxTime(Number(e.target.value))}
                                className="w-full h-1 bg-[#1B2332] rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-[9px] text-theme-text-muted mt-2 uppercase">
                                <span>Midnight</span>
                                <span>Noon</span>
                                <span>11 PM</span>
                            </div>
                        </div>

                        {/* Energy Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Track Energy</label>
                                <span className="bg-[#1B2332] text-white text-[10px] font-mono px-2 py-1 rounded">{sandboxEnergy.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.01"
                                value={sandboxEnergy} onChange={(e) => setSandboxEnergy(Number(e.target.value))}
                                className="w-full h-1 bg-[#1B2332] rounded-lg appearance-none cursor-pointer accent-theme-accent"
                            />
                            <div className="flex justify-between text-[9px] text-theme-text-muted mt-2 uppercase">
                                <span>Calm</span>
                                <span>Intense</span>
                            </div>
                        </div>

                        {/* Valence Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Track Valence</label>
                                <span className="bg-[#1B2332] text-white text-[10px] font-mono px-2 py-1 rounded">{sandboxValence.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.01"
                                value={sandboxValence} onChange={(e) => setSandboxValence(Number(e.target.value))}
                                className="w-full h-1 bg-[#1B2332] rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                            />
                            <div className="flex justify-between text-[9px] text-theme-text-muted mt-2 uppercase">
                                <span>Sad</span>
                                <span>Happy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Navigation Tab configs
    const tabsConfig = [
        { id: "history" as const, label: "History & Habits", icon: Clock },
        { id: "features" as const, label: "Audio Features", icon: Sliders },
        { id: "mood" as const, label: "Mood Explorer", icon: Smile },
        { id: "neural" as const, label: "Neural Model", icon: BrainCircuit },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">Analytics Hub</h2>
                    <p className="text-sm text-theme-text-muted mt-1">Consolidated listening patterns, emotional mapping, and inference models.</p>
                </div>

                {/* Tab selector buttons */}
                <div className="flex items-center gap-1.5 bg-[#0D111A] border border-[#1B2332] p-1 rounded-xl shrink-0">
                    {tabsConfig.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                    isActive
                                        ? "bg-theme-accent text-black shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                                        : "text-theme-text-muted hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error notifications banner */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Active Tab Panel */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === "history" && renderHistoryTab()}
                {activeTab === "features" && renderFeaturesTab()}
                {activeTab === "mood" && renderMoodTab()}
                {activeTab === "neural" && renderNeuralTab()}
            </div>
        </div>
    );
}
