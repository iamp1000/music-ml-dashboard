"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { User, Loader2, Music, Disc, ListMusic } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function UserProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const fetchOnce = async () => {
                    const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === "success" && data.data) {
                            setProfile(data.data);
                            setLoading(false);
                            return true;
                        }
                    }
                    return false;
                };

                const success = await fetchOnce();
                if (!success) {
                    const interval = setInterval(async () => {
                        if (await fetchOnce()) {
                            clearInterval(interval);
                        }
                    }, 2000);
                    return () => clearInterval(interval);
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            }
        };
        fetchProfile();
    }, []);

    // Generate mock genres from top_artists if available, or fallback
    const getTopGenres = () => {
        if (!profile || !profile.top_artists) return [
            { name: "Pop", value: 400 },
            { name: "Rap", value: 300 },
            { name: "Hip Hop", value: 300 },
            { name: "R&B", value: 200 },
            { name: "Jazz", value: 100 }
        ];
        
        const genreCounts: Record<string, number> = {};
        profile.top_artists.forEach((artist: any) => {
            if (artist.genres) {
                artist.genres.forEach((g: string) => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            }
        });
        
        return Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name: name.split(" ")[0].substring(0, 10), value: count * 100 }));
    };

    const topGenres = getTopGenres();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="1. User Profile Overview" icon={<User className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh]">
                {loading || !profile ? (
                    <div className="flex flex-col h-full items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                        <p className="text-theme-text-muted">Loading your personalized dashboard...</p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full gap-8 mt-6">
                        
                        {/* Left Column: Profile Info & Stats */}
                        <div className="flex-1 flex flex-col gap-6 border-r border-theme-border/50 pr-8">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-theme-bg overflow-hidden flex items-center justify-center border-4 border-theme-accent/30 relative">
                                    {profile.images && profile.images.length > 0 ? (
                                        <img src={profile.images[0].url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-theme-text-muted" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-1 text-theme-text">{profile.display_name}</h2>
                                    <p className="text-sm text-theme-text-muted flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-theme-accent shadow-[0_0_8px_var(--theme-accent)]"></span> Online • {profile.country || "Earth"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-theme-bg/40 p-5 rounded-xl border border-theme-border/50">
                                    <div className="text-xs text-theme-text-muted mb-1 uppercase tracking-wider font-semibold">Followers</div>
                                    <div className="text-3xl font-bold text-theme-accent">{profile.followers?.toLocaleString() || 0}</div>
                                </div>
                                <div className="bg-theme-bg/40 p-5 rounded-xl border border-theme-border/50">
                                    <div className="text-xs text-theme-text-muted mb-1 uppercase tracking-wider font-semibold">Following</div>
                                    <div className="text-3xl font-bold text-theme-chart-2">{profile.following?.toLocaleString() || 0}</div>
                                </div>
                            </div>

                            <div className="bg-theme-bg/40 p-5 rounded-xl border border-theme-border/50 mt-auto">
                                <h4 className="text-xs text-theme-text-muted mb-4 uppercase tracking-wider font-semibold">Listeners Summary</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm font-bold">10 Decibels</div>
                                        <div className="text-xs text-theme-text-muted">Energy</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-theme-chart-4">Deep dive</div>
                                        <div className="text-xs text-theme-text-muted">Listening Style</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Column: Charts */}
                        <div className="flex-1 flex flex-col gap-6">
                            
                            {/* Top Genres Bar Chart */}
                            <div className="bg-theme-bg/40 p-5 rounded-xl border border-theme-border/50 h-64 flex flex-col">
                                <h4 className="text-xs text-theme-text-muted mb-4 uppercase tracking-wider font-semibold">Top Genres</h4>
                                <div className="flex-1 w-full min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topGenres} layout="horizontal" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" tick={{ fill: 'var(--theme-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{ fill: 'var(--theme-border)', opacity: 0.2 }}
                                                contentStyle={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', borderRadius: '8px' }}
                                                itemStyle={{ color: 'var(--theme-accent)' }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {topGenres.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--theme-accent)' : 'var(--theme-chart-2)'} opacity={1 - index * 0.15} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Listening Activity Progress Bars */}
                            <div className="bg-theme-bg/40 p-5 rounded-xl border border-theme-border/50 flex-1">
                                <h4 className="text-xs text-theme-text-muted mb-4 uppercase tracking-wider font-semibold">Listening Activity</h4>
                                <div className="space-y-5">
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-theme-text">Stationary</span>
                                            <span className="text-theme-text-muted">11.0k</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-theme-accent shadow-[0_0_10px_var(--theme-accent)] rounded-full" style={{ width: '65%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-theme-text">Moving</span>
                                            <span className="text-theme-text-muted">17.3k</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-theme-chart-2 shadow-[0_0_10px_var(--theme-chart-2)] rounded-full" style={{ width: '85%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-theme-text">Average</span>
                                            <span className="text-theme-text-muted">1.2h</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-theme-bg rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-theme-chart-3 shadow-[0_0_10px_var(--theme-chart-3)] rounded-full" style={{ width: '40%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                        </div>

                    </div>
                )}
            </GlassCard>
        </div>
    );
}
