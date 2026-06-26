"use client";

import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

export default function ListeningActivityChart({ data, daysOffset }: { data: any[], daysOffset: Date[] }) {
    // Format the date for the X axis tick
    const formatDay = (tickItem: any) => {
        if (!daysOffset || daysOffset.length === 0) return tickItem;
        const index = Math.round(tickItem);
        if (index >= 0 && index < daysOffset.length) {
            return daysOffset[index].toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        return '';
    };

    // Format the time for the Y axis tick
    const formatTime = (tickItem: any) => {
        const hour = Math.floor(tickItem);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour} ${ampm}`;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[#1C1C24] border border-[#2D2D3A] p-3 rounded-lg shadow-xl">
                    <p className="text-white font-medium">{data.trackName}</p>
                    <p className="text-gray-400 text-xs">{data.artistName}</p>
                    <div className="mt-2 text-xs">
                        <span className="text-gray-500">Time: </span>
                        <span className="text-[var(--theme-accent)]">{new Date(data.originalTime).toLocaleTimeString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D3A" />
                    <XAxis 
                        type="number" 
                        dataKey="dayIndex" 
                        name="Date" 
                        domain={[0, 6]} 
                        tickFormatter={formatDay}
                        stroke="#6B7280"
                        tick={{fill: '#9CA3AF', fontSize: 12}}
                        tickCount={7}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="timeOfDay" 
                        name="Time" 
                        domain={[0, 24]} 
                        tickFormatter={formatTime}
                        stroke="#6B7280"
                        tick={{fill: '#9CA3AF', fontSize: 12}}
                        reversed
                    />
                    <ZAxis type="number" dataKey="size" range={[60, 60]} />
                    <Tooltip content={<CustomTooltip />} cursor={{strokeDasharray: '3 3'}} />
                    <Scatter name="Listening Activity" data={data} fill="#A855F7" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
