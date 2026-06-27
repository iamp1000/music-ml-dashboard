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
            <div
                className="rounded-2xl p-6 border"
                style={{ background: "linear-gradient(135deg, #0A0F1A 0%, #0D111A 100%)", borderColor: "#1B2332" }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-[#D1F26D]" />
                        Today's Listening Session
                    </h3>
                    <span className="text-[10px] font-bold text-[#8293B4] bg-[#1B2332]/60 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Songs Played */}
                    <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0D111A, #111827)" }}>

                        <div className="text-[10px] font-bold text-[#8293B4] uppercase tracking-widest mb-3">Songs Today</div>
                        <div className="text-4xl font-black text-white">{todaySongsCount}</div>
                        <div className="text-[10px] text-[#D1F26D] mt-2 font-semibold">tracks played</div>
                    </div>

                    {/* Avg Energy */}
                    <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0D111A, #111827)" }}>

                        <div className="text-[10px] font-bold text-[#8293B4] uppercase tracking-widest mb-3">Avg Energy</div>
                        <div className="text-4xl font-black text-white">{(avgTodayEng * 100).toFixed(0)}<span className="text-lg text-[#8293B4] font-bold">%</span></div>
                        <div className="text-[10px] text-[#8B5CF6] mt-2 font-semibold">audio arousal</div>
                    </div>

                    {/* Mood breakdown - spans 2 cols */}
                    <div className="relative rounded-2xl p-5 overflow-hidden col-span-2" style={{ background: "linear-gradient(135deg, #0D111A, #111827)" }}>

                        <div className="text-[10px] font-bold text-[#8293B4] uppercase tracking-widest mb-3">Mood Breakdown</div>
                        <div className="flex gap-1 w-full h-3 rounded-full overflow-hidden mb-3" style={{ background: "#1B2332" }}>
                            <div className="h-full transition-all duration-700 rounded-l-full" style={{ width: `${todaySongsCount ? (positive / todaySongsCount) * 100 : 33}%`, background: "linear-gradient(90deg,#22c55e,#84cc16)" }} />
                            <div className="h-full transition-all duration-700" style={{ width: `${todaySongsCount ? (neutral / todaySongsCount) * 100 : 34}%`, background: "#F59E0B" }} />
                            <div className="h-full transition-all duration-700 rounded-r-full" style={{ width: `${todaySongsCount ? (negative / todaySongsCount) * 100 : 33}%`, background: "#EF4444" }} />
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                {todaySongsCount ? Math.round((positive / todaySongsCount) * 100) : 0}% Positive
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-400">
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                {todaySongsCount ? Math.round((neutral / todaySongsCount) * 100) : 0}% Neutral
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                {todaySongsCount ? Math.round((negative / todaySongsCount) * 100) : 0}% Neg
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. Time Of Day Analysis - premium rows */}
                <div
                    className="rounded-2xl p-6 border"
                    style={{ background: "#080B12", borderColor: "#1B2332" }}
                >
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-[#3B82F6]" />
                        Time of Day Analysis
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(todBins).map(([key, data], idx) => {
                            const avg = data.count > 0 ? data.val / data.count : 0.5;
                            const colors = ["#F59E0B", "#3B82F6", "#8B5CF6", "#1E293B"];
                            const labels = ["Morning", "Afternoon", "Evening", "Night"];
                            const c = colors[idx % colors.length];
                            const fillPct = Math.round(avg * 100);
                            return (
                                <div key={key} className="relative rounded-xl p-4 border overflow-hidden group hover:border-white/10 transition-all duration-300" style={{ background: "#0A0F1A", borderColor: "#1B2332" }}>
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: c }} />
                                    <div className="flex justify-between items-center pl-2">
                                        <div>
                                            <div className="text-xs font-bold text-white">{data.name}</div>
                                            <div className="text-[10px] text-[#8293B4] mt-1">{getMoodString(avg)}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-lg font-black" style={{ color: c }}>{fillPct}%</div>
                                                <div className="text-[9px] text-[#8293B4] uppercase">valence</div>
                                            </div>
                                            <div className="text-[10px] font-bold px-3 py-1.5 rounded-full border" style={{ color: c, borderColor: `${c}30`, background: `${c}10` }}>
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
                <div
                    className="rounded-2xl p-6 border"
                    style={{ background: "#080B12", borderColor: "#1B2332" }}
                >
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-[#D1F26D]" />
                        Behavioral Timeline
                    </h3>
                    <div className="space-y-4 h-[300px] overflow-y-auto scrollbar-thin pr-2">
                        {Object.keys(timeline).length > 0 ? (
                            Object.entries(timeline).map(([day, periods]) => (
                                <div key={day} className="mb-4 relative">
                                    <div className="text-[11px] font-black text-[#D1F26D] mb-3 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-[#D1F26D]/40" />
                                        {day}
                                    </div>
                                    <div className="space-y-2 pl-3">
                                        {Object.entries(periods as any).map(([period, vals]) => {
                                            const vArray = vals as number[];
                                            if (vArray.length === 0) return null;
                                            const pAvg = vArray.reduce((a, b) => a + b, 0) / vArray.length;
                                            const pColor = pAvg > 0.6 ? "#22c55e" : pAvg < 0.4 ? "#EF4444" : "#F59E0B";
                                            return (
                                                <div key={period} className="flex justify-between items-center rounded-xl p-3 border" style={{ background: "#0A0F1A", borderColor: "#1B2332" }}>
                                                    <span className="text-[11px] font-bold text-[#8293B4] flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }} />
                                                        {period}
                                                    </span>
                                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ color: pColor, background: `${pColor}15` }}>
                                                        {getMoodString(pAvg)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[#8293B4] text-sm flex h-full items-center justify-center">No timeline data available.</div>
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
            {/* Audio Features Radar - premium panel */}
            <div
                className="rounded-2xl p-6 flex flex-col h-[450px] relative border overflow-hidden"
                style={{ background: "linear-gradient(160deg, #080B12 0%, #0D111A 100%)", borderColor: "#1B2332" }}
            >

                <div className="flex items-center gap-2 mb-6">
                    <Sliders className="w-4 h-4 text-[#8B5CF6]" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Audio Characteristics Radar</h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                    {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#1B2332" strokeDasharray="4 4" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8293B4', fontSize: 11, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="User" dataKey="A" stroke="#8B5CF6" strokeWidth={2.5} fill="#8B5CF6" fillOpacity={0.12} dot={{ fill: '#8B5CF6', r: 3 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[#8293B4]">No history records logged.</div>
                    )}
                </div>
            </div>

            {/* Genre Distributions - premium card grid */}
            <div
                className="rounded-2xl p-6 flex flex-col justify-between border overflow-hidden"
                style={{ background: "linear-gradient(160deg, #080B12 0%, #0D111A 100%)", borderColor: "#1B2332" }}
            >

                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1">Top Genre Distributions</h3>
                    <p className="text-[11px] text-[#8293B4] mb-6">Relative percentages derived from your top artists list</p>
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
                                <div key={idx} className="rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden border hover:border-white/10 transition-all group" style={{ background: "#0A0F1A", borderColor: `${color}20` }}>
                                    <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
                                    <div className="absolute top-2 left-3 text-[10px] font-black text-white uppercase tracking-wider">{genre.name}</div>

                                    <div className="w-full h-24 flex items-center justify-center relative mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={38} paddingAngle={3} dataKey="value" stroke="none">
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
                    <div className="flex-1 flex items-center justify-center text-xs text-[#8293B4]">
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
            {/* Line Chart - premium wide panel */}
            <div
                className="lg:col-span-2 rounded-2xl p-6 flex flex-col h-[420px] relative border overflow-hidden"
                style={{ background: "linear-gradient(160deg, #080B12 0%, #0D111A 100%)", borderColor: "#1B2332" }}
            >

                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <Smile className="w-5 h-5 text-[#3B82F6]" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Mood Correlation Wave</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#8293B4]">
                            <div className="w-3 h-0.5 rounded bg-[#D1F26D]" /> Valence
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#8293B4]">
                            <div className="w-3 h-0.5 rounded bg-[#8B5CF6]" /> Energy
                        </span>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 mt-2">
                    {hasHistory ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                                <XAxis dataKey="index" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#080B12', borderColor: '#1B2332', borderRadius: '12px', fontSize: '12px' }}
                                    labelStyle={{ color: 'white', fontWeight: 'bold' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line type="monotone" name="Valence" dataKey="valence" stroke="#D1F26D" strokeWidth={2.5} dot={{ r: 3, fill: '#D1F26D' }} />
                                <Line type="monotone" name="Energy" dataKey="energy" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[#8293B4]">No listening history found.</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Cognitive Load Radar */}
                <div className="relative rounded-2xl p-6 flex flex-col h-[300px] border overflow-hidden" style={{ background: "#080B12", borderColor: "#1B2332" }}>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-[#8B5CF6]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Lyrical Load</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <CognitiveLoadRadar data={data.cognitive_load} />
                    </div>
                </div>

                {/* 2. Attention Decay Horizon */}
                <div className="relative rounded-2xl p-6 flex flex-col h-[300px] border overflow-hidden" style={{ background: "#080B12", borderColor: "#1B2332" }}>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#3B82F6]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Skip Horizon</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <AttentionDecayHeatmap data={data.skip_horizon} />
                    </div>
                </div>

                {/* 3. Emotional Volatility Globe */}
                <div className="relative rounded-2xl p-6 flex flex-col h-[300px] border overflow-hidden md:col-span-2 lg:col-span-1" style={{ background: "#080B12", borderColor: "#1B2332" }}>

                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-[#EF4444]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Volatility</h3>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{ color: data.emotional_volatility > 0.5 ? "#EF4444" : "#22c55e", background: data.emotional_volatility > 0.5 ? "#EF444415" : "#22c55e15" }}>
                            {data.emotional_volatility > 0.5 ? "High" : "Low"} Volatility
                        </span>
                    </div>
                    <div className="flex-1 w-full relative">
                        <MoodVolatilityGlobe volatility={data.emotional_volatility} />
                    </div>
                </div>
                
                {/* Context Tagging Tool */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 lg:col-span-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-theme-accent" />
                        Retroactive Session Tagging
                    </h3>
                    <p className="text-xs text-theme-text-muted mb-4">
                        Select a context to dampen algorithmic disruption for the selected time window (e.g. "Gym", "Sleep").
                    </p>
                    <div className="flex gap-4">
                        <input type="text" placeholder="e.g. Gym, Sleep, Study" className="bg-[#070A0F] border border-[#1B2332] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-theme-accent w-64" id="tag_input" />
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
                            className="bg-theme-accent/20 border border-theme-accent/40 text-theme-accent hover:bg-theme-accent hover:text-black font-bold uppercase text-xs px-6 rounded-lg transition-colors"
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-white">Analytics Hub</h2>
                    <p className="text-sm text-[#8293B4] mt-1.5">Consolidated listening patterns, emotional mapping &amp; inference models.</p>
                </div>

                {/* Premium pill tab selector */}
                <div className="flex items-center gap-1 bg-[#080B12] border border-[#1B2332] p-1 rounded-2xl shrink-0 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    {tabsConfig.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={isActive ? { background: `${tab.color}18`, borderColor: `${tab.color}40`, color: tab.color } : {}}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 border ${
                                    isActive
                                        ? "border shadow-lg"
                                        : "text-[#8293B4] border-transparent hover:text-white hover:bg-white/5"
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
                {activeTab === "deep" && renderDeepTab()}
            </div>
        </div>
    );
}
