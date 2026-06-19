"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Smile, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MoodPage() {
    const [loading, setLoading] = useState(true);
    const [sliderValue, setSliderValue] = useState(50);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Mock Line Data (Features vs Mood Prediction)
    const lineData = [
        { features: 0, predicted: 0.1 },
        { features: 10, predicted: 0.4 },
        { features: 20, predicted: 0.6 },
        { features: 30, predicted: 0.5 },
        { features: 40, predicted: 0.8 },
        { features: 50, predicted: 0.9 },
        { features: 60, predicted: 1.1 },
        { features: 70, predicted: 1.4 },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="8. Mood Correlation Study" icon={<Smile className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh] flex flex-col">
                {loading ? (
                    <div className="flex flex-col h-full items-center justify-center flex-1 py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-chart-2 animate-spin" />
                        <p className="text-theme-text-muted">Correlating audio features to sentiment...</p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full flex-1 gap-8 mt-6">
                        
                        {/* Left: Line Chart */}
                        <div className="flex-[2] bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6 relative">
                            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider mb-2">Listening Data</h3>
                            <div className="absolute top-6 right-6 text-xs text-theme-text-muted flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-theme-accent"></span> ML Predicted Mood
                            </div>
                            
                            <div className="w-full h-full min-h-[300px] mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <XAxis dataKey="features" label={{ value: 'Features', position: 'bottom', fill: 'var(--theme-text-muted)', fontSize: 12 }} tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis label={{ value: 'ML Predicted Mood', angle: -90, position: 'insideLeft', fill: 'var(--theme-text-muted)', fontSize: 12 }} tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--theme-accent)' }}
                                        />
                                        <Line type="monotone" dataKey="predicted" stroke="var(--theme-accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--theme-accent)', stroke: 'var(--theme-bg)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right: Mood Logging Container */}
                        <div className="flex-[1] flex flex-col gap-4">
                            
                            {/* ML Prediction Block */}
                            <div className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6 flex-1 flex flex-col justify-center">
                                <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-6 border-b border-theme-border/50 pb-2">Mood</h3>
                                <div className="text-xs text-theme-text-muted mb-4">ML Predicted Mood</div>
                                <div className="flex justify-between items-center px-4">
                                    <div className="flex flex-col items-center opacity-50">
                                        <span className="text-3xl mb-2">😢</span>
                                        <span className="text-[10px] text-theme-text-muted uppercase">Melancholy</span>
                                    </div>
                                    <div className="flex flex-col items-center opacity-50">
                                        <span className="text-3xl mb-2">😐</span>
                                        <span className="text-[10px] text-theme-text-muted uppercase">Chill</span>
                                    </div>
                                    <div className="flex flex-col items-center scale-110 drop-shadow-[0_0_15px_var(--theme-chart-2)]">
                                        <span className="text-3xl mb-2">🤩</span>
                                        <span className="text-[10px] text-theme-chart-2 uppercase font-bold">Energetic</span>
                                    </div>
                                </div>
                            </div>

                            {/* User Logging Block */}
                            <div className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6 flex-1 flex flex-col justify-center">
                                <div className="text-xs font-bold text-theme-text mb-6">Log Your Actual Mood</div>
                                
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={sliderValue}
                                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                                    className="w-full h-2 bg-theme-bg rounded-lg appearance-none cursor-pointer accent-theme-accent mb-6"
                                />
                                
                                <div className="flex justify-between text-xl px-2 mb-6">
                                    <span>😢</span>
                                    <span>😐</span>
                                    <span>🤩</span>
                                </div>

                                <button className="w-full py-3 rounded-full bg-theme-accent/20 hover:bg-theme-accent text-theme-accent hover:text-theme-bg font-bold text-sm transition-colors border border-theme-accent/50 hover:border-transparent">
                                    Compare
                                </button>
                            </div>

                        </div>

                    </div>
                )}
            </GlassCard>
        </div>
    );
}
