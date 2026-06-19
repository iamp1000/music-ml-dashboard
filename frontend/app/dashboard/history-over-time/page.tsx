"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Activity, Loader2, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function HistoryOverTimePage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistoryData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) {
                    setLoading(false);
                    return;
                }
                
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
                console.error("Failed to fetch history details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistoryData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Aggregating historical play sessions...</p>
            </div>
        );
    }

    // 1. Group actual history by date for Area Chart volume
    const dateCounts: Record<string, number> = {};
    history.forEach(item => {
        const dateStr = new Date(item.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    const areaData = Object.entries(dateCounts).map(([date, count]) => ({
        name: date,
        volume: count // Tracks played
    })).reverse();

    // 2. Map actual history to 7x24 grid for Heatmap
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }).map((_, i) => i);
    
    const heatmapGrid = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxCount = 1;

    history.forEach(item => {
        const d = new Date(item.time);
        const dayIdx = d.getDay(); // 0 = Sun, 1 = Mon, etc.
        const alignedDayIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Map Sun to 6, Mon to 0
        const hr = d.getHours();
        heatmapGrid[alignedDayIdx][hr] += 1;
        if (heatmapGrid[alignedDayIdx][hr] > maxCount) {
            maxCount = heatmapGrid[alignedDayIdx][hr];
        }
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Listening Habits</h2>
                <p className="text-sm text-theme-text-muted mt-1">Deep analysis of your listening times and frequency trends.</p>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 gap-6">
                
                {/* Listening Volume Chart */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[320px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-theme-accent" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Listening Volume (Tracks Played)</h3>
                        </div>
                        <span className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full font-bold">
                            {history.length} Total plays logged
                        </span>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="habitVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity={0}/>
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
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Listening Heatmap</h3>
                        </div>
                        <span className="text-[10px] text-theme-text-muted">Real-time play distribution by day and hour</span>
                    </div>

                    <div className="flex items-end gap-4 overflow-x-auto pb-2 scrollbar-thin">
                        {/* Y-Axis Label (Days) */}
                        <div className="flex flex-col justify-between h-[210px] text-[10px] font-bold text-theme-text-muted uppercase tracking-wider pb-6 shrink-0">
                            {days.map(day => <span key={day} className="h-6 flex items-center">{day}</span>)}
                        </div>

                        {/* Heatmap Matrix */}
                        <div className="flex-1 flex flex-col justify-between h-[210px] min-w-[500px]">
                            {days.map((day, r) => (
                                <div key={r} className="flex gap-1 h-6">
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

                            {/* X-Axis Labels (Hours) */}
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
        </div>
    );
}
