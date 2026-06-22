"use client";

import React, { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface FeatureRadarProps {
    data: any[];
}

export default function FeatureRadar() {
    const [stats, setStats] = useState([
        { subject: "Energy", A: 0 },
        { subject: "Valence", A: 0 },
        { subject: "Arousal", A: 0 },
        { subject: "Danceability", A: 0 },
        { subject: "Acousticness", A: 0 },
    ]);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const protocol = window.location.protocol;
                const host = 'music-ml-dashboard.onrender.com';
                const res = await fetch(`${protocol}//${host}/telemetry/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                if (data.status === "success" && data.data.length > 0) {
                    const tracks = data.data;
                    const avg = (key: string) => tracks.reduce((acc: number, t: any) => acc + (t[key] || 0.5), 0) / tracks.length;
                    
                    setStats([
                        { subject: "Energy", A: avg("energy") * 100 },
                        { subject: "Valence", A: avg("valence") * 100 },
                        { subject: "Arousal", A: avg("arousal") * 100 },
                        { subject: "Danceability", A: 70 }, // Placeholder for now
                        { subject: "Acousticness", A: 30 }, // Placeholder for now
                    ]);
                }
            } catch (e) {
                console.error("Failed to fetch features:", e);
            }
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
                <PolarGrid stroke="var(--theme-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--theme-text-muted)", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                    name="User Average"
                    dataKey="A"
                    stroke="var(--theme-accent)"
                    fill="var(--theme-accent)"
                    fillOpacity={0.4}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
}
