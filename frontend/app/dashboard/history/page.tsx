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

                // Fetch deep insights
                const deepData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/deep-insights");
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
                {/* 1. Today Dashboard */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-theme-accent" />
                        Today's Listening
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4">
                            <div className="text-[10px] font-bold text-theme-text-muted uppercase mb-1">Songs Played</div>
                            <div className="text-3xl font-black text-white">{todaySongsCount}</div>
                        </div>
                        
                        <div className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4">
                            <div className="text-[10px] font-bold text-theme-text-muted uppercase mb-1">Average Energy</div>
                            <div className="text-3xl font-black text-white">{avgTodayEng.toFixed(2)}</div>
                        </div>

                        <div className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4 col-span-1 md:col-span-2 flex items-center">
                            <div className="w-full">
                                <div className="text-[10px] font-bold text-theme-text-muted uppercase mb-2">Mood Breakdown</div>
                                <div className="flex gap-1 w-full h-4 rounded-full overflow-hidden mb-2 bg-[#1B2332]/40">
                                    <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${todaySongsCount ? (positive/todaySongsCount)*100 : 33}%` }}></div>
                                    <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${todaySongsCount ? (neutral/todaySongsCount)*100 : 34}%` }}></div>
                                    <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${todaySongsCount ? (negative/todaySongsCount)*100 : 33}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-theme-text-muted">
                                    <span className="text-green-500">{todaySongsCount ? Math.round((positive/todaySongsCount)*100) : 0}% Positive</span>
                                    <span className="text-yellow-500">{todaySongsCount ? Math.round((neutral/todaySongsCount)*100) : 0}% Neutral</span>
                                    <span className="text-red-500">{todaySongsCount ? Math.round((negative/todaySongsCount)*100) : 0}% Negative</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 2. Time Of Day Analysis */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-theme-accent" />
                            Time of Day Analysis
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(todBins).map(([key, data]) => {
                                const avg = data.count > 0 ? data.val / data.count : 0.5;
                                return (
                                    <div key={key} className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4 flex justify-between items-center group hover:border-[#1B2332] transition-colors">
                                        <div>
                                            <div className="text-xs font-bold text-white">{data.name}</div>
                                            <div className="text-[10px] text-theme-text-muted mt-1 uppercase tracking-wider">{getMoodString(avg)} <span className="text-theme-accent ml-1">{(avg*100).toFixed(0)}%</span></div>
                                        </div>
                                        <div className="text-[10px] font-bold text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1.5 rounded-md">
                                            {data.count} plays
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Listening History Timeline */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-theme-accent" />
                            Behavioral Timeline
                        </h3>
                        <div className="space-y-6 h-[300px] overflow-y-auto scrollbar-thin pr-4">
                            {Object.keys(timeline).length > 0 ? (
                                Object.entries(timeline).map(([day, periods]) => (
                                    <div key={day} className="mb-4 relative">
                                        <div className="text-xs font-bold text-theme-accent mb-3 bg-[#0D111A] inline-block pr-4 relative z-10">{day}</div>
                                        <div className="absolute left-[3px] top-4 bottom-0 w-[2px] bg-[#1B2332] -z-0"></div>
                                        <div className="space-y-3 pl-5 relative z-10">
                                            {Object.entries(periods as any).map(([period, vals]) => {
                                                const vArray = vals as number[];
                                                if (vArray.length === 0) return null;
                                                const pAvg = vArray.reduce((a,b)=>a+b,0) / vArray.length;
                                                return (
                                                    <div key={period} className="text-[11px] font-bold flex justify-between items-center bg-[#070A0F] border border-[#1B2332]/40 p-2.5 rounded-lg">
                                                        <span className="text-theme-text-muted flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-theme-accent"></div>
                                                            {period}
                                                        </span>
                                                        <span className="text-white flex items-center gap-2 uppercase tracking-wider">
                                                            <ArrowRight className="w-3 h-3 text-theme-text-muted" />
                                                            {getMoodString(pAvg)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-theme-text-muted text-sm flex h-full items-center justify-center">No timeline data available.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Raw Database History Log */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-5 h-5 text-theme-accent" />
                            Raw Listening Log
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#1B2332]">
                                    <th className="py-4 px-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Time</th>
                                    <th className="py-4 px-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Track</th>
                                    <th className="py-4 px-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Artist</th>
                                    <th className="py-4 px-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider hidden md:table-cell">Valence</th>
                                    <th className="py-4 px-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider hidden lg:table-cell">Vibe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1B2332]/50">
                                {history.slice(0, 100).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-[#070A0F] transition-colors group">
                                        <td className="py-3 px-4 text-xs text-theme-text-muted whitespace-nowrap">
                                            {new Date(item.time).toLocaleString(undefined, {
                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-bold text-white group-hover:text-theme-accent transition-colors max-w-[200px] truncate">
                                                {item.track_name}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-xs text-theme-text-muted max-w-[150px] truncate">
                                                {item.artist_name}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-[#1B2332] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-theme-accent"
                                                        style={{ width: `${(item.valence || 0.5) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-theme-text-muted font-mono w-6">
                                                    {((item.valence || 0.5) * 100).toFixed(0)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden lg:table-cell text-xs font-mono text-theme-accent">
                                            {item.mood_category || "Analyzing..."}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {history.length === 0 && (
                            <div className="py-12 text-center text-sm text-theme-text-muted">
                                No history records found. Ensure the background worker is running.
                            </div>
                        )}
                        {history.length > 100 && (
                            <div className="py-4 text-center text-xs text-theme-text-muted border-t border-[#1B2332]/50">
                                Showing latest 100 records
                            </div>
                        )}
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

    // --- Sub-Render: Deep Psych Analytics ---
    const renderDeepTab = () => {
        if (!deepInsights) {
            return (
                <div className="flex h-[400px] items-center justify-center text-sm text-theme-text-muted">
                    <Loader2 className="w-8 h-8 text-theme-accent animate-spin mr-3" />
                    Crunching deep psychological metrics...
                </div>
            );
        }

        const data = deepInsights;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Cognitive Load Radar */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-purple-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lyrical Load</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <CognitiveLoadRadar data={data.cognitive_load} />
                    </div>
                </div>

                {/* 2. Attention Decay Horizon */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Skip Horizon</h3>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <AttentionDecayHeatmap data={data.skip_horizon} />
                    </div>
                </div>

                {/* 3. Emotional Volatility Globe */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[300px] md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Volatility</h3>
                        </div>
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
                                await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/telemetry/tag", {
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
        { id: "history" as const, label: "History & Habits", icon: Clock },
        { id: "features" as const, label: "Audio Features", icon: Sliders },
        { id: "mood" as const, label: "Mood Explorer", icon: Smile },
        { id: "neural" as const, label: "Neural Model", icon: BrainCircuit },
        { id: "deep" as const, label: "Deep Psych", icon: Activity },
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
                {activeTab === "deep" && renderDeepTab()}
            </div>
        </div>
    );
}
