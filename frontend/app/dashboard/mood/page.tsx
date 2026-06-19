"use client";

import React, { useEffect, useState } from "react";
import { Smile, Loader2, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MoodPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sliderValue, setSliderValue] = useState(50);
    const [logStatus, setLogStatus] = useState<string | null>(null);

    useEffect(() => {
        const fetchMoodData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;

                const res = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data) {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to load mood telemetry", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMoodData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Correlating audio features to sentiment...</p>
            </div>
        );
    }

    const hasHistory = history.length > 0;

    // 1. Map history tracks' valence and energy as mood parameters
    const lineData = history.slice(0, 15).map((item, idx) => ({
        index: idx + 1,
        track: item.track_name,
        valence: Math.round((item.valence || 0.5) * 100),
        energy: Math.round((item.energy || item.arousal || 0.5) * 100)
    })).reverse();

    // 2. Classify current mood based on the latest track in history
    const latestTrack = hasHistory ? history[0] : null;
    const v = latestTrack ? (latestTrack.valence || 0.5) : 0.5;
    const e = latestTrack ? (latestTrack.energy || latestTrack.arousal || 0.5) : 0.5;

    let moodName = "Neutral";
    let moodEmoji = "😐";
    let moodOpacity = { melancholy: 0.4, chill: 1, energetic: 0.4 };

    if (v > 0.6 && e > 0.5) {
        moodName = "Energetic / Happy";
        moodEmoji = "🤩";
        moodOpacity = { melancholy: 0.2, chill: 0.2, energetic: 1 };
    } else if (v > 0.6 && e <= 0.5) {
        moodName = "Chill / Calm";
        moodEmoji = "😐";
        moodOpacity = { melancholy: 0.2, chill: 1, energetic: 0.2 };
    } else if (v <= 0.4 && e <= 0.4) {
        moodName = "Melancholic";
        moodEmoji = "😢";
        moodOpacity = { melancholy: 1, chill: 0.2, energetic: 0.2 };
    } else if (e > 0.6) {
        moodName = "Focused / Intense";
        moodEmoji = "⚡";
        moodOpacity = { melancholy: 0.3, chill: 0.3, energetic: 1 };
    }

    const handleMoodLog = () => {
        setLogStatus(`Log registered: actual valence ${sliderValue / 100} compared to predicted ${v.toFixed(2)}`);
        setTimeout(() => setLogStatus(null), 3000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Mood Explorer</h2>
                <p className="text-sm text-theme-text-muted mt-1">Cross-referencing audio valence and energy vectors with emotional classifications.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Line Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[420px] relative">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Smile className="w-5 h-5 text-theme-accent" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mood Correlation Wave</h3>
                        </div>
                        <span className="text-[10px] text-theme-text-muted">Valence (Positivity) vs Energy of recent plays</span>
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
                                    <Line type="monotone" name="Valence (Positivity)" dataKey="valence" stroke="var(--theme-accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--theme-accent)' }} />
                                    <Line type="monotone" name="Energy (Arousal)" dataKey="energy" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                No listening history found. Play music on Spotify.
                            </div>
                        )}
                    </div>
                </div>

                {/* Mood Logging & Predicted State (1/3 width) */}
                <div className="flex flex-col gap-6">
                    
                    {/* Predicted State */}
                    <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6 border-b border-[#1B2332] pb-2">Predicted State</h4>
                        
                        {latestTrack ? (
                            <div className="space-y-4">
                                <div className="text-[10px] text-theme-text-muted uppercase">Based on: <span className="text-white font-bold">{latestTrack.track_name}</span></div>
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.melancholy }}>
                                        <span className="text-3xl mb-1">😢</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Melancholy</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.chill }}>
                                        <span className="text-3xl mb-1">😐</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Chill</span>
                                    </div>
                                    <div className="flex flex-col items-center transition-opacity duration-300" style={{ opacity: moodOpacity.energetic }}>
                                        <span className="text-3xl mb-1">🤩</span>
                                        <span className="text-[9px] text-theme-text-muted uppercase font-semibold">Energetic</span>
                                    </div>
                                </div>
                                <div className="text-center pt-2">
                                    <span className="inline-block text-xs font-black text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full uppercase tracking-wider">
                                        {moodEmoji} {moodName}
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
                        
                        <div className="flex justify-between text-lg px-1 mb-5">
                            <span className="cursor-pointer" onClick={() => setSliderValue(10)}>😢</span>
                            <span className="cursor-pointer" onClick={() => setSliderValue(50)}>😐</span>
                            <span className="cursor-pointer" onClick={() => setSliderValue(90)}>🤩</span>
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
        </div>
    );
}
