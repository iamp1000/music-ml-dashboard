"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Sliders, Loader2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function FeaturesPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate data load
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Mock Radar Data
    const radarData = [
        { subject: 'Danceability', A: 85, fullMark: 100 },
        { subject: 'Energy', A: 70, fullMark: 100 },
        { subject: 'Valence', A: 60, fullMark: 100 },
        { subject: 'Acousticness', A: 30, fullMark: 100 },
        { subject: 'Instrumentalness', A: 20, fullMark: 100 },
        { subject: 'Speechiness', A: 45, fullMark: 100 },
    ];

    // Mock Donut Data
    const donutData = [
        { name: 'Pop', value: 400 },
        { name: 'Rock', value: 300 },
        { name: 'Hip Hop', value: 300 },
        { name: 'Indie', value: 200 },
    ];
    const COLORS = ['var(--theme-accent)', 'var(--theme-chart-2)', 'var(--theme-chart-3)', 'var(--theme-chart-4)'];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="5. Genre & Audio Feature Analysis" icon={<Sliders className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh] flex flex-col">
                {loading ? (
                    <div className="flex flex-col h-full items-center justify-center flex-1 py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-chart-3 animate-spin" />
                        <p className="text-theme-text-muted">Analyzing audio vectors...</p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full flex-1 gap-8 mt-6">
                        
                        {/* Center: Radar Chart */}
                        <div className="flex-1 bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6 relative">
                            <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider absolute top-6 left-6 z-10">Audio Data Drive</h3>
                            <div className="absolute top-6 right-6 z-10 text-[10px] bg-theme-accent/20 text-theme-accent px-2 py-1 rounded border border-theme-accent/50">
                                Audio Features
                            </div>
                            <div className="w-full h-full min-h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="var(--theme-border)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--theme-text-muted)', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="User" dataKey="A" stroke="var(--theme-chart-3)" strokeWidth={2} fill="var(--theme-chart-3)" fillOpacity={0.3} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right: Genre Donuts */}
                        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
                            {[1, 2, 3, 4].map((_, i) => (
                                <div key={i} className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-4 flex flex-col">
                                    <h3 className="text-[10px] font-bold text-theme-text uppercase tracking-wider mb-2">Genre Distribution {i+1}</h3>
                                    <div className="flex-1 flex items-center justify-center relative">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={30}
                                                    outerRadius={50}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {donutData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={1 - (i * 0.15)} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', borderRadius: '8px', fontSize: '12px' }}
                                                    itemStyle={{ color: 'white' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                            <span className="text-xl font-bold text-theme-text">{Math.floor(Math.random() * 40 + 10)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </GlassCard>
        </div>
    );
}
