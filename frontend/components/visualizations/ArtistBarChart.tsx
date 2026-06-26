"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ['#22C55E', '#A855F7', '#F97316', '#3B82F6', '#EAB308', '#EF4444', '#14B8A6'];

export default function ArtistBarChart({ data }: { data: any[] }) {
    return (
        <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D3A" horizontal={false} />
                    <XAxis type="number" stroke="#6B7280" tick={{fill: '#6B7280'}} />
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#6B7280" 
                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                        width={120}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1C1C24', borderColor: '#2D2D3A', borderRadius: '8px', color: '#fff' }}
                        cursor={{fill: '#2D2D3A', opacity: 0.4}}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
