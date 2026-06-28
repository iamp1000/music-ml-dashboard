"use client";

import React, { useEffect, useState } from "react";
import { 
    Clock, Filter, Loader2, AlertCircle, Activity, Calendar, Music, 
    Sliders, Smile, BrainCircuit, Info, ChevronRight, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { fetchWithRateLimit } from "@/utils/api";

import CognitiveLoadRadar from "@/components/visualizations/CognitiveLoadRadar";
import AttentionDecayHeatmap from "@/components/visualizations/AttentionDecayHeatmap";
import MoodVolatilityGlobe from "@/components/visualizations/MoodVolatilityGlobe";


type TabType = "history" | "features" | "mood" | "neural" | "deep";

export default function AnalyticsHubPage() {
    const [activeTab, setActiveTab] = useState<TabType>("history");
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [deepInsights, setDeepInsights] = useState<any>(null);

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
            const res = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/analyze_audio", {
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
        const fetchAnalyticsData = async (isBackground = false) => {
            try {
                if (!isBackground) setLoading(true);
                // Fetch profile first
                const profileData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/auth/profile");
                if (profileData && profileData.data) {
                    setProfile(profileData.data);
                }

                // Fetch history
                const limit = isBackground ? 1 : 10000;
                const historyData = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/telemetry/history?limit=${limit}`);
                if (historyData && historyData.data) {
                    if (isBackground && historyData.data.length > 0) {
                        setHistory(prev => {
                            const newId = historyData.data[0].id;
                            if (prev.some(t => t.id === newId)) return prev;
                            return [historyData.data[0], ...prev].slice(0, 10000);
                        });
                    } else if (!isBackground) {
                        setHistory(historyData.data);
                    }
                }

                // Fetch deep insights
                const deepData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/deep-insights");
                if (deepData && deepData.data) {
                    setDeepInsights(deepData.data);
                }
            } catch (err: any) {
                console.error("Failed to load analytics hub data", err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsData();

        // Background polling every 30 seconds
        const intervalId = setInterval(() => {
            fetchAnalyticsData(true);
        }, 30000);

        // Fetch on window focus
        const onFocus = () => fetchAnalyticsData(true);
        window.addEventListener("focus", onFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    // Sandbox API call when sliders change
    useEffect(() => {
        const fetchSandbox = async () => {
            try {
                const res = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/sandbox_inference", {
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
        // --- Today's Stats ---
        const todayStr = new Date().toDateString();
        const todayHistory = history.filter(h => {
            const t = h.time || h.played_at;
            return t ? new Date(t).toDateString() === todayStr : false;
        });
        
        const todaySongsCount = todayHistory.length;
        let todayValence = 0;
        let todayEnergy = 0;
        let positive = 0, neutral = 0, negative = 0;
        
        // Time of Day Bins
        const todBins = {
            Morning: { val: 0, count: 0, name: "Morning (6AM - 12PM)" },
            Afternoon: { val: 0, count: 0, name: "Afternoon (12PM - 6PM)" },
            Evening: { val: 0, count: 0, name: "Evening (6PM - 12AM)" },
            Night: { val: 0, count: 0, name: "Night (12AM - 6AM)" }
        };

        const timeline: Record<string, any> = {};

        history.forEach(item => {
            const timeVal = item.time || item.played_at;
            if (!timeVal) return;
            const dateObj = new Date(timeVal);
            const dStr = dateObj.toDateString();
            const hour = dateObj.getHours();
            const val = item.valence || 0.5;
            
            // Stats
            if (dStr === todayStr) {
                todayValence += val;
                todayEnergy += (item.energy || item.arousal || 0.5);
                if (val > 0.6) positive++;
                else if (val < 0.4) negative++;
                else neutral++;
            }

            // Time of Day
            let todKey = "Night";
            if (hour >= 6 && hour < 12) todKey = "Morning";
            else if (hour >= 12 && hour < 18) todKey = "Afternoon";
            else if (hour >= 18) todKey = "Evening";

            todBins[todKey as keyof typeof todBins].val += val;
            todBins[todKey as keyof typeof todBins].count += 1;

            // Timeline Grouping
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            if (!timeline[dayName]) timeline[dayName] = { Morning: [], Afternoon: [], Evening: [], Night: [] };
            timeline[dayName][todKey].push(val);
        });

        const avgTodayVal = todaySongsCount > 0 ? (todayValence / todaySongsCount) : 0;
        const avgTodayEng = todaySongsCount > 0 ? (todayEnergy / todaySongsCount) : 0;

        const getMoodString = (v: number) => {
            if (v > 0.6) return "Positive / Energetic";
            if (v < 0.4) return "Melancholic / Reflective";
            return "Neutral / Balanced";
        };

        const formatDuration = (ms: number) => {
            if (!ms || isNaN(ms)) return "3:12";
            const totalSeconds = Math.floor(ms / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <div className="space-y-6">
            {/* 1. Today Dashboard - Premium stat cards */}
            <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--theme-accent)]" />
                        Today's Listening Session
                    </h3>
                    <span className="text-[11px] font-medium text-[var(--theme-text-muted)] bg-white/5 px-3 py-1.5 rounded-full">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Songs Played */}
                    <div className="relative rounded-2xl p-5 bg-black/20 border border-white/5 hover:bg-black/30 transition-colors">
                        <div className="text-xs font-semibold text-[var(--theme-text-muted)] mb-3">Songs Today</div>
                        <div className="text-4xl font-bold text-white tracking-tight">{todaySongsCount}</div>
                        <div className="text-[11px] text-[var(--theme-accent)] mt-2 font-medium">tracks played</div>
                    </div>

                    {/* Avg Energy */}
                    <div className="relative rounded-2xl p-5 bg-black/20 border border-white/5 hover:bg-black/30 transition-colors">
                        <div className="text-xs font-semibold text-[var(--theme-text-muted)] mb-3">Avg Energy</div>
                        <div className="text-4xl font-bold text-white tracking-tight">{(avgTodayEng * 100).toFixed(0)}<span className="text-lg text-[var(--theme-text-muted)] font-bold ml-1">%</span></div>
                        <div className="text-[11px] text-purple-400 mt-2 font-medium">audio arousal</div>
                    </div>

                    {/* Mood breakdown - spans 2 cols */}
                    <div className="relative rounded-2xl p-5 bg-black/20 border border-white/5 col-span-2">
                        <div className="text-xs font-semibold text-[var(--theme-text-muted)] mb-4">Mood Breakdown</div>
                        <div className="flex gap-1 w-full h-2.5 rounded-full overflow-hidden mb-4 bg-white/5">
                            <div className="h-full transition-all duration-700 rounded-l-full bg-emerald-400" style={{ width: `${todaySongsCount ? (positive / todaySongsCount) * 100 : 33}%` }} />
                            <div className="h-full transition-all duration-700 bg-amber-400" style={{ width: `${todaySongsCount ? (neutral / todaySongsCount) * 100 : 34}%` }} />
                            <div className="h-full transition-all duration-700 rounded-r-full bg-rose-400" style={{ width: `${todaySongsCount ? (negative / todaySongsCount) * 100 : 33}%` }} />
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {todaySongsCount ? Math.round((positive / todaySongsCount) * 100) : 0}% Positive
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                {todaySongsCount ? Math.round((neutral / todaySongsCount) * 100) : 0}% Neutral
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                {todaySongsCount ? Math.round((negative / todaySongsCount) * 100) : 0}% Negative
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. Time Of Day Analysis - premium rows */}
                <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8">
                    <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Time of Day Analysis
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(todBins).map(([key, data], idx) => {
                            const avg = data.count > 0 ? data.val / data.count : 0.5;
                            const colors = ["#F59E0B", "#3B82F6", "#8B5CF6", "#64748b"];
                            const c = colors[idx % colors.length];
                            const fillPct = Math.round(avg * 100);
                            return (
                                <div key={key} className="relative rounded-2xl p-4 bg-black/20 border border-white/5 hover:border-white/10 transition-colors group overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: c }} />
                                    <div className="flex justify-between items-center pl-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{data.name}</div>
                                            <div className="text-[11px] text-[var(--theme-text-muted)] mt-1 font-medium">{getMoodString(avg)}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold" style={{ color: c }}>{fillPct}%</div>
                                                <div className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-wider font-medium">valence</div>
                                            </div>
                                            <div className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white/5 border-white/5">
                                                {data.count} plays
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Behavioral Timeline */}
                <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8">
                    <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2 mb-6">
                        <Calendar className="w-5 h-5 text-[var(--theme-accent)]" />
                        Behavioral Timeline
                    </h3>
                    <div className="space-y-4 h-[300px] overflow-y-auto scrollbar-thin pr-2">
                        {Object.keys(timeline).length > 0 ? (
                            Object.entries(timeline).map(([day, periods]) => (
                                <div key={day} className="mb-6 relative">
                                    <div className="text-[11px] font-semibold text-[var(--theme-accent)] mb-3 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-[var(--theme-accent)] opacity-50" />
                                        {day}
                                    </div>
                                    <div className="space-y-2 pl-3 border-l border-white/5">
                                        {Object.entries(periods as any).map(([period, vals]) => {
                                            const vArray = vals as number[];
                                            if (vArray.length === 0) return null;
                                            const pAvg = vArray.reduce((a, b) => a + b, 0) / vArray.length;
                                            const pColor = pAvg > 0.6 ? "text-emerald-400" : pAvg < 0.4 ? "text-rose-400" : "text-amber-400";
                                            const pBg = pAvg > 0.6 ? "bg-emerald-400/10" : pAvg < 0.4 ? "bg-rose-400/10" : "bg-amber-400/10";
                                            const pDot = pAvg > 0.6 ? "bg-emerald-400" : pAvg < 0.4 ? "bg-rose-400" : "bg-amber-400";
                                            return (
                                                <div key={period} className="flex justify-between items-center rounded-2xl p-3 bg-black/20 border border-transparent hover:border-white/5 transition-colors">
                                                    <span className="text-xs font-medium text-[var(--theme-text-muted)] flex items-center gap-2 relative -left-[19px]">
                                                        <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-black/40 ${pDot}`} />
                                                        {period}
                                                    </span>
                                                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${pColor} ${pBg}`}>
                                                        {getMoodString(pAvg)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[var(--theme-text-muted)] text-sm flex h-full items-center justify-center font-medium">No timeline data available.</div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Audio Features Radar - premium panel */}
            <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8 flex flex-col h-[450px] relative">
                <div className="flex items-center gap-2 mb-8">
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white tracking-wide">Audio Characteristics</h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                    {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--theme-text-muted)', fontSize: 11, fontWeight: 500 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="User" dataKey="A" stroke="#a855f7" strokeWidth={2} fill="#a855f7" fillOpacity={0.2} dot={{ fill: '#a855f7', r: 3 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[var(--theme-text-muted)] font-medium">No history records logged.</div>
                    )}
                </div>
            </div>

            {/* Genre Distributions - premium card grid */}
            <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide mb-1">Top Genre Distributions</h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] mb-8 font-medium">Relative percentages derived from your top artists list</p>
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
                                <div key={idx} className="rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden bg-black/20 border border-transparent hover:border-white/5 transition-colors group">
                                    <div className="absolute top-3 left-4 text-[11px] font-semibold text-white tracking-wide">{genre.name}</div>

                                    <div className="w-full h-24 flex items-center justify-center relative mt-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={40} paddingAngle={2} dataKey="value" stroke="none">
                                                    <Cell fill={color} />
                                                    <Cell fill="rgba(255,255,255,0.05)" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                            <span className="text-xs font-bold text-white">{genre.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-[var(--theme-text-muted)] font-medium">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Line Chart - premium wide panel */}
            <div className="lg:col-span-2 bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8 flex flex-col h-[420px] relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Smile className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-semibold text-white tracking-wide">Mood Correlation Wave</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--theme-text-muted)]">
                            <div className="w-2.5 h-0.5 rounded bg-[var(--theme-accent)]" /> Valence
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--theme-text-muted)]">
                            <div className="w-2.5 h-0.5 rounded bg-purple-400" /> Energy
                        </span>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 mt-2">
                    {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                                <XAxis dataKey="index" tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line type="monotone" name="Valence" dataKey="valence" stroke="var(--theme-accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--theme-accent)' }} />
                                <Line type="monotone" name="Energy" dataKey="energy" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3, fill: '#a855f7' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[var(--theme-text-muted)] font-medium">No listening history found.</div>
                    )}
                </div>
            </div>

                {/* Logging & predicted state */}
                <div className="flex flex-col gap-6">
                    {/* Predicted state */}
                    <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xs font-semibold text-white tracking-wide mb-6 border-b border-white/5 pb-3">Predicted State</h4>
                        
                        {latestTrack ? (
                            <div className="space-y-4">
                                <div className="text-[11px] text-[var(--theme-text-muted)] font-medium">Based on: <span className="text-white font-semibold">{latestTrack.track_name}</span></div>
                                <div className="flex justify-between items-center px-2 py-2">
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.melancholy }}>
                                        <span className="text-xs mb-1 font-semibold text-[var(--theme-text-muted)]">Low</span>
                                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">Melancholy</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.chill }}>
                                        <span className="text-xs mb-1 font-semibold text-[var(--theme-text-muted)]">Mid</span>
                                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">Chill</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.energetic }}>
                                        <span className="text-xs mb-1 font-semibold text-[var(--theme-text-muted)]">High</span>
                                        <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">Energetic</span>
                                    </div>
                                </div>
                                <div className="text-center pt-2">
                                    <span className="inline-block text-xs font-bold text-[var(--theme-accent)] bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 px-4 py-1.5 rounded-full tracking-wide">
                                        {moodName}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-[var(--theme-text-muted)] font-medium py-6">
                                Connect to Spotify to calculate predicted mood state.
                            </div>
                        )}
                    </div>

                    {/* Actual Mood Log */}
                    <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xs font-semibold text-white tracking-wide mb-4">Log Actual Mood</h4>
                        
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={sliderValue}
                            onChange={(e) => setSliderValue(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent)] mb-4"
                        />
                        
                        <div className="flex justify-between text-[11px] px-1 mb-6 font-medium text-[var(--theme-text-muted)]">
                            <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setSliderValue(10)}>Low</span>
                            <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setSliderValue(50)}>Mid</span>
                            <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setSliderValue(90)}>High</span>
                        </div>

                        <button 
                            onClick={handleMoodLog}
                            className="w-full py-2.5 rounded-xl bg-[var(--theme-accent)]/10 hover:bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] font-semibold text-xs transition-colors border border-[var(--theme-accent)]/20"
                        >
                            Log Mood
                        </button>

                        {logStatus && (
                            <div className="text-[10px] font-medium text-center text-[var(--theme-accent)] bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 py-2 rounded-xl mt-3 animate-pulse">
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
            <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8 flex flex-col min-h-[500px] mt-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
                    <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-[var(--theme-accent)] animate-pulse" />
                        Neural Mood Predictor (CARS)
                    </h3>
                    <span className="text-[11px] text-[var(--theme-text-muted)] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full font-medium">
                        Interactive Sandbox
                    </span>
                </div>

                <div className="flex-1 flex flex-col items-center relative bg-black/20 border border-white/5 rounded-2xl p-8 mb-8 overflow-hidden">
                    {/* Neural Network SVG visualization */}
                    <div className="flex justify-between h-64 w-full max-w-2xl relative z-10">
                        {layers.map((layer, lIndex) => (
                            <div key={lIndex} className="flex flex-col justify-between items-center h-full relative z-10" style={{ width: '120px' }}>
                                <h4 className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest mb-4">{layer.name}</h4>
                                <div className="flex flex-col justify-around flex-1 w-full gap-4">
                                    {Array.from({ length: layer.nodes }).map((_, nIndex) => (
                                        <div key={nIndex} className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-full border border-blue-400 bg-blue-500/20 z-20 relative shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                                                <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
                                            </div>
                                            {layer.labels[nIndex] && (
                                                <span className="text-[10px] mt-2 font-medium text-[var(--theme-text-muted)]">{layer.labels[nIndex]}</span>
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
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.05" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
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
                                        strokeWidth={1.5}
                                        className="transition-all duration-300"
                                    />
                                );
                            });
                        })}
                        </g>
                    </svg>

                    {/* Output Label */}
                    <div className="mt-8 flex flex-col items-center">
                        <span className="text-[11px] text-[var(--theme-text-muted)] font-medium uppercase tracking-wider mb-3">Mood Classification</span>
                        <div className="px-6 py-2 bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 rounded-xl text-[var(--theme-accent)] font-mono font-semibold tracking-wide">
                            {sandboxMood}
                        </div>
                    </div>
                </div>

                {/* Interactive Sliders */}
                <div className="bg-black/20 border border-white/5 p-8 rounded-3xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Time of Day Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-semibold text-white tracking-wide">Time of Day (h)</label>
                                <span className="bg-white/5 border border-white/5 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">{sandboxTime}:00</span>
                            </div>
                            <input 
                                type="range" min="0" max="23" 
                                value={sandboxTime} onChange={(e) => setSandboxTime(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] mt-3 font-medium">
                                <span>Midnight</span>
                                <span>Noon</span>
                                <span>11 PM</span>
                            </div>
                        </div>

                        {/* Energy Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-semibold text-white tracking-wide">Track Energy</label>
                                <span className="bg-white/5 border border-white/5 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">{sandboxEnergy.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.01"
                                value={sandboxEnergy} onChange={(e) => setSandboxEnergy(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent)]"
                            />
                            <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] mt-3 font-medium">
                                <span>Calm</span>
                                <span>Intense</span>
                            </div>
                        </div>

                        {/* Valence Slider */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-semibold text-white tracking-wide">Track Valence</label>
                                <span className="bg-white/5 border border-white/5 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">{sandboxValence.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.01"
                                value={sandboxValence} onChange={(e) => setSandboxValence(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-[10px] text-[var(--theme-text-muted)] mt-3 font-medium">
                                <span>Sad</span>
                                <span>Happy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Sub-Render: Deep Psych Analytics ---
    const renderDeepTab = () => {
        if (!deepInsights) {
            return (
                <div className="flex h-[400px] items-center justify-center flex-col gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-[#EC4899]/30 border-t-[#EC4899] animate-spin" />
                    <p className="text-sm font-bold text-[#8293B4] uppercase tracking-widest">Crunching deep psychological metrics...</p>
                </div>
            );
        }

        const data = deepInsights;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {/* 1. Cognitive Load Radar */}
                <div className="relative bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-purple-400" />
                            <h3 className="text-sm font-semibold text-white tracking-wide">Lyrical Load</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <CognitiveLoadRadar data={data.cognitive_load} />
                    </div>
                </div>

                {/* 2. Attention Decay Horizon */}
                <div className="relative bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            <h3 className="text-sm font-semibold text-white tracking-wide">Skip Horizon</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <AttentionDecayHeatmap data={data.skip_horizon} />
                    </div>
                </div>

                {/* 3. Emotional Volatility Globe */}
                <div className="relative bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col h-[300px] md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-rose-400" />
                            <h3 className="text-sm font-semibold text-white tracking-wide">Volatility</h3>
                        </div>
                        <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${data.emotional_volatility > 0.5 ? 'text-rose-400 bg-rose-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                            {data.emotional_volatility > 0.5 ? "High" : "Low"} Volatility
                        </span>
                    </div>
                    <div className="flex-1 w-full relative">
                        <MoodVolatilityGlobe volatility={data.emotional_volatility} />
                    </div>
                </div>
                
                {/* Context Tagging Tool */}
                <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-8 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-white tracking-wide mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-[var(--theme-accent)]" />
                        Retroactive Session Tagging
                    </h3>
                    <p className="text-sm text-[var(--theme-text-muted)] font-medium mb-6">
                        Select a context to dampen algorithmic disruption for the selected time window (e.g. "Gym", "Sleep").
                    </p>
                    <div className="flex gap-4">
                        <input type="text" placeholder="e.g. Gym, Sleep, Study" className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 w-72 transition-colors" id="tag_input" />
                        <button 
                            onClick={async () => {
                                const tagVal = (document.getElementById("tag_input") as HTMLInputElement).value;
                                if (!tagVal) return;
                                const now = new Date();
                                const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Past 2 hours
                                await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/telemetry/tag", {
                                    method: "POST",
                                    body: JSON.stringify({ tag_name: tagVal, start_time: start.toISOString(), end_time: now.toISOString() })
                                });
                                alert(`Tagged last 2 hours as ${tagVal}`);
                            }}
                            className="bg-[var(--theme-accent)] text-black hover:bg-white font-bold text-sm px-6 rounded-xl transition-colors"
                        >
                            Tag Last 2 Hours
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Navigation Tab configs
    const tabsConfig = [
        { id: "history" as const, label: "History & Habits", icon: Clock, color: "#D1F26D" },
        { id: "features" as const, label: "Audio Features", icon: Sliders, color: "#8B5CF6" },
        { id: "mood" as const, label: "Mood Explorer", icon: Smile, color: "#3B82F6" },
        { id: "neural" as const, label: "Neural Model", icon: BrainCircuit, color: "#F59E0B" },
        { id: "deep" as const, label: "Deep Psych", icon: Activity, color: "#EC4899" },
    ];

    const activeTabColor = tabsConfig.find(t => t.id === activeTab)?.color ?? "#D1F26D";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Analytics Hub</h2>
                    <p className="text-sm text-[var(--theme-text-muted)] mt-2 font-medium">Consolidated listening patterns, emotional mapping &amp; inference models.</p>
                </div>

                {/* Premium pill tab selector */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1.5 rounded-2xl shrink-0 backdrop-blur-md">
                    {tabsConfig.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                                    isActive
                                        ? "bg-white/10 text-white shadow-sm"
                                        : "text-[var(--theme-text-muted)] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
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
                {activeTab === "deep" && renderDeepTab()}
            </div>
        </div>
    );
}
