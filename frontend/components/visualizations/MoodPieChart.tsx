"use client";

import React from "react";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

const MOOD_COLORS: Record<string, string> = {
    "High Energy": "#F97316", // Orange
    "Chill": "#3B82F6", // Blue
    "Focus": "#A855F7", // Purple
    "Happy": "#22C55E", // Green
    "Sad": "#64748B", // Slate
    "Unknown": "#475569"
};

export default function MoodPieChart({ data }: { data: any[] }) {
    return (
        <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={160}
                        paddingAngle={5}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name] || MOOD_COLORS["Unknown"]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1C1C24', borderColor: '#2D2D3A', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
