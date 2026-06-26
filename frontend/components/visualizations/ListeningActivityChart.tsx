"use client";

import React from "react";
import {
    ScatterChart, Scatter, XAxis, YAxis,
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
            return daysOffset[index].toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric"
            });
        }
        return "";
    };

    const formatTime = (tickItem: any) => {
        const hour = Math.floor(tickItem);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour} ${ampm}`;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div style={{
                    background: "#080B12",
                    border: "1px solid #1B2332",
                    borderRadius: "14px",
                    padding: "10px 16px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
                }}>
                    <p style={{ color: "#fff", fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                        {d.trackName}
                    </p>
                    <p style={{ color: "#8293B4", fontSize: 11, marginBottom: 6 }}>
                        {d.artistName}
                    </p>
                    <p style={{ color: "#D1F26D", fontSize: 11, fontWeight: 700 }}>
                        {new Date(d.originalTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                        {" · "}
                        {new Date(d.originalTime).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric"
                        })}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                    <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="#1B2332"
                    />
                    <XAxis
                        type="number"
                        dataKey="dayIndex"
                        name="Date"
                        domain={[0, 6]}
                        tickFormatter={formatDay}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#D1F26D", fontSize: 10, fontWeight: 700 }}
                        tickCount={7}
                    />
                    <YAxis
                        type="number"
                        dataKey="timeOfDay"
                        name="Time"
                        domain={[0, 24]}
                        tickFormatter={formatTime}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8293B4", fontSize: 10, fontWeight: 600 }}
                        reversed
                        ticks={[0, 6, 12, 18, 24]}
                    />
                    <ZAxis type="number" dataKey="size" range={[40, 80]} />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ strokeDasharray: "3 3", stroke: "#1B2332" }}
                    />
                    <Scatter
                        name="Listening Activity"
                        data={data}
                        fill="#A855F7"
                        fillOpacity={0.85}
                    />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
