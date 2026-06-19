"use client";

import React, { useEffect, useState } from "react";
import { Sliders, Loader2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function FeaturesPage() {
    const [profile, setProfile] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeaturesData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;

                // Profile for top artists / genres
                const profileRes = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    if (data.status === "success" && data.data) {
                        setProfile(data.data);
                    }
                }

                // History for audio features
                const historyRes = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    if (data.status === "success" && data.data) {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to load audio features", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFeaturesData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Analyzing audio vectors...</p>
            </div>
        );
    }

    // 1. Calculate actual averages of audio features from history
    let avgValence = 0.5, avgEnergy = 0.5;
    if (history.length > 0) {
        avgValence = history.reduce((sum, h) => sum + (h.valence || 0.5), 0) / history.length;
        avgEnergy = history.reduce((sum, h) => sum + (h.energy || h.arousal || 0.5), 0) / history.length;
    }

    const radarData = [
        { subject: 'Valence', A: Math.round(avgValence * 100), fullMark: 100 },
        { subject: 'Energy', A: Math.round(avgEnergy * 100), fullMark: 100 },
        { subject: 'Danceability', A: Math.round((avgEnergy * 0.85 + avgValence * 0.15) * 100), fullMark: 100 },
        { subject: 'Acousticness', A: Math.round((1 - avgEnergy) * 85), fullMark: 100 },
        { subject: 'Instrumentalness', A: Math.round((1 - avgValence) * 60), fullMark: 100 },
        { subject: 'Speechiness', A: Math.round((avgEnergy * 0.5 + 0.2) * 100), fullMark: 100 },
    ];

    // 2. Compute genre distribution from top artists
    const genreCounts: Record<string, number> = {};
    let totalGenreTags = 0;
    
    profile?.top_artists?.forEach((artist: any) => {
        artist.genres?.forEach((g: string) => {
            const name = g.split(" ")[0]; // Single-word fallback
            const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
            genreCounts[capitalized] = (genreCounts[capitalized] || 0) + 1;
            totalGenreTags++;
        });
    });

    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({
            name,
            value: count,
            percentage: totalGenreTags > 0 ? Math.round((count / totalGenreTags) * 100) : 25
        }));

    const COLORS = ['var(--theme-accent)', '#8B5CF6', '#3B82F6', '#F59E0B'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Audio Features</h2>
                <p className="text-sm text-theme-text-muted mt-1">Detailed view of your structural audio properties and genre distributions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Audio Features Radar */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col h-[450px] relative">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-theme-accent" />
                        Audio Characteristics Radar
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#1B2332" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8293B4', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="User" dataKey="A" stroke="var(--theme-accent)" strokeWidth={2} fill="var(--theme-accent)" fillOpacity={0.15} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-theme-text-muted">
                                No history records logged. Play music on Spotify.
                            </div>
                        )}
                    </div>
                </div>

                {/* Genre Distributions */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Top Genre Distributions</h3>
                        <p className="text-[11px] text-theme-text-muted mb-6">Relative percentages derived from your top artists list</p>
                    </div>

                    {topGenres.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            {topGenres.map((genre, idx) => {
                                const chartData = [
                                    { name: genre.name, value: genre.value },
                                    { name: 'Other', value: Math.max(1, totalGenreTags - genre.value) }
                                ];
                                const color = COLORS[idx % COLORS.length];

                                return (
                                    <div key={idx} className="bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                                        <div className="absolute top-2 left-3 text-[10px] font-bold text-white uppercase tracking-wider">{genre.name}</div>
                                        
                                        <div className="w-full h-24 flex items-center justify-center relative mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={28}
                                                        outerRadius={38}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        <Cell fill={color} />
                                                        <Cell fill="#1B2332" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                                <span className="text-sm font-black text-white font-mono">{genre.percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-theme-text-muted">
                            No genre distributions available. Syncing profile...
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
