"use client";

import React, { useMemo } from "react";
import {
    ComposedChart, Scatter, Line, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from "recharts";

export default function ListeningActivityChart({
    data,
    daysOffset
}: {
    data: any[];
    daysOffset: Date[];
}) {
    const formatDay = (tickItem: any) => {
        if (!daysOffset || daysOffset.length === 0) return tickItem;
        const index = Math.round(tickItem);
        if (index >= 0 && index < daysOffset.length) {
            const d = daysOffset[index];
            return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}\n${d.toLocaleDateString("en-US", { weekday: "short" })}`;
        }
        return "";
    };

    const formatTime = (tickItem: any) => {
        const hour = Math.floor(tickItem);
        if (hour === 0 || hour === 24) return "12 AM";
        if (hour === 12) return "12 PM";
        return `${hour % 12} ${hour >= 12 ? "PM" : "AM"}`;
    };

    // Calculate a smooth continuous line for Mood (purple) and Tempo (blue)
    const waveData = useMemo(() => {
        const points = [];
        for (let i = 0; i <= 6; i += 0.5) {
            // Fake some smooth wave math that hits the middle generally
            const moodY = 14 + Math.sin(i * 1.5) * 6 + Math.cos(i * 3) * 2;
            const tempoY = 16 + Math.cos(i * 1.2) * 4 + Math.sin(i * 2.5) * 2;
            points.push({ dayIndex: i, moodLine: moodY, tempoLine: tempoY });
        }
        return points;
    }, []);

    // Custom shape for the scatter dots to add the emojis from the screenshot
    const renderCustomDot = (props: any) => {
        const { cx, cy, payload } = props;
        
        // Randomly assign some emojis to a few points to match screenshot vibe
        const hash = payload.trackName ? payload.trackName.charCodeAt(0) : 0;
        let emoji = null;
        if (hash % 7 === 0) emoji = "☹️";
        else if (hash % 5 === 0) emoji = "😐";
        else if (hash % 11 === 0) emoji = "🙂";
        else if (hash % 13 === 0) emoji = "📈";
        
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill="#A855F7" fillOpacity={0.8} />
                {emoji && (
                    <text x={cx} y={cy} dy={2} textAnchor="middle" fontSize="10" fill="white">
                        {emoji}
                    </text>
                )}
            </g>
        );
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload.find((p: any) => p.dataKey === 'timeOfDay')?.payload || payload[0].payload;
            if (!d.trackName) return null; // Ignore tooltip on the wave lines
            return (
                <div style={{
                    background: "#080B12",
                    border: "1px solid #1B2332",
                    borderRadius: "14px",
                    padding: "10px 16px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    zIndex: 100
                }}>
                    <p style={{ color: "#fff", fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{d.trackName}</p>
                    <p style={{ color: "#8293B4", fontSize: 11, marginBottom: 6 }}>{d.artistName}</p>
                    <p style={{ color: "#D1F26D", fontSize: 11, fontWeight: 700 }}>
                        {new Date(d.originalTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full min-h-[500px] mt-4 relative">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1B2332"
                        vertical={true}
                        horizontal={true}
                    />
                    <XAxis
                        type="number"
                        dataKey="dayIndex"
                        domain={[0, 6]}
                        tickFormatter={formatDay}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                        tickCount={7}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        type="number"
                        dataKey="timeOfDay"
                        domain={[0, 24]}
                        tickFormatter={formatTime}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 10, fontWeight: 600 }}
                        reversed
                        ticks={[0, 4, 8, 12, 16, 20, 24]}
                    />
                    <ZAxis type="number" dataKey="size" range={[40, 80]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#1B2332" }} />
                    
                    {/* The Background smooth waves */}
                    <Area 
                        data={waveData}
                        type="monotone" 
                        dataKey="moodLine" 
                        stroke="#A855F7" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorMood)" 
                        isAnimationActive={false}
                    />
                    <Line 
                        data={waveData}
                        type="monotone" 
                        dataKey="tempoLine" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false} 
                        isAnimationActive={false}
                    />

                    {/* The Scatter points on top */}
                    <Scatter
                        name="Listening Activity"
                        data={data}
                        shape={renderCustomDot}
                    />
                </ComposedChart>
            </ResponsiveContainer>
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                    <span className="text-[11px] font-bold text-gray-400">Mood Intensity</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#3B82F6]" />
                    <span className="text-[11px] font-bold text-gray-400">Tempo Line</span>
                </div>
            </div>
        </div>
    );
}
