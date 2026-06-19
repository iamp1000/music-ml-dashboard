"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Activity, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function HistoryOverTimePage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate data load
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Mock Area Chart Data
    const areaData = Array.from({ length: 30 }).map((_, i) => ({
        name: `Day ${i+1}`,
        volume: Math.floor(Math.random() * 100) + 10
    }));

    // Mock Heatmap Data (7 rows x 24 columns)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }).map((_, i) => i);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="4. Listening History Over Time" icon={<Activity className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh] flex flex-col">
                {loading ? (
                    <div className="flex flex-col h-full items-center justify-center flex-1 py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                        <p className="text-theme-text-muted">Aggregating historical data...</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full flex-1 gap-8 mt-6">
                        
                        {/* Top: Area Chart */}
                        <div className="h-64 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">Listening Volume</h3>
                                <div className="flex gap-2">
                                    <span className="text-xs text-theme-accent px-2 py-1 rounded bg-theme-accent/10">30 Days</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={areaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" hide />
                                    <YAxis tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--theme-accent)' }}
                                    />
                                    <Area type="monotone" dataKey="volume" stroke="var(--theme-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bottom: GitHub Heatmap */}
                        <div className="flex-1 w-full bg-theme-bg/30 rounded-xl border border-theme-border/50 p-6">
                            <div className="flex items-end justify-between gap-4 h-full">
                                {/* Y-Axis (Days) */}
                                <div className="flex flex-col justify-between h-full text-[10px] text-theme-text-muted uppercase tracking-widest pb-4">
                                    {days.map(day => <span key={day}>{day}</span>)}
                                </div>
                                
                                {/* Grid */}
                                <div className="flex-1 flex flex-col justify-between h-full">
                                    {days.map((day, r) => (
                                        <div key={r} className="flex justify-between gap-1">
                                            {hours.map(c => {
                                                const intensity = Math.random();
                                                let bgColor = 'bg-theme-bg border-theme-border/20';
                                                if (intensity > 0.8) bgColor = 'bg-theme-accent border-theme-accent';
                                                else if (intensity > 0.5) bgColor = 'bg-theme-accent/60 border-theme-accent/60';
                                                else if (intensity > 0.2) bgColor = 'bg-theme-accent/30 border-theme-accent/30';

                                                return (
                                                    <div 
                                                        key={c} 
                                                        className={`flex-1 aspect-square rounded-sm border hover:border-white cursor-crosshair transition-colors ${bgColor}`}
                                                        title={`${day} ${c}:00`}
                                                    ></div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    {/* X-Axis (Hours) */}
                                    <div className="flex justify-between text-[10px] text-theme-text-muted mt-2">
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
                )}
            </GlassCard>
        </div>
    );
}
