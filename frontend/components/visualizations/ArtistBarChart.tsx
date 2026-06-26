"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts";

const BAR_COLORS = [
    "#D1F26D", "#A855F7", "#3B82F6", "#F97316",
    "#EC4899", "#22C55E", "#F59E0B", "#14B8A6",
    "#EF4444", "#8B5CF6"
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "#080B12", border: "1px solid #1B2332", borderRadius: "14px", padding: "10px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{payload[0]?.payload?.name}</p>
                <p style={{ color: "#8293B4", fontSize: 11 }}>
                    <span style={{ color: payload[0]?.color ?? "#D1F26D", fontWeight: 700 }}>{payload[0]?.value}</span>
                    {" plays"}
                </p>
            </div>
        );
    }
    return null;
};

export default function ArtistBarChart({ data }: { data: any[] }) {
    return (
        <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 10, right: 40, left: 110, bottom: 10 }}
                    barSize={10}
                >
                    {/* Only vertical dashed reference lines */}
                    <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="#1B2332"
                        horizontal={false}
                        vertical={true}
                    />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#4B5563", fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8293B4", fontSize: 11, fontWeight: 700 }}
                        width={105}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "#D1F26D08" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={BAR_COLORS[index % BAR_COLORS.length]}
                                fillOpacity={0.9}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
