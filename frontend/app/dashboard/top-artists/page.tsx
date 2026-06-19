"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Mic2, Loader2, Play } from "lucide-react";

export default function TopArtistsPage() {
    const [artists, setArtists] = useState<any[]>([]);
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data) {
                        setArtists(data.data.top_artists || []);
                        setTracks(data.data.top_tracks || Array(5).fill({ name: "Unknown", artist: "Unknown" })); // Fallback
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch top artists", err);
            }
        };
        fetchProfile();
    }, []);

    // Placeholder mock tracks if not returned by backend
    const mockTracks = [
        { name: "Shattered Dreams", artist: "Johnny Hates Jazz", duration: "3:26" },
        { name: "Careless Whisper", artist: "George Michael", duration: "5:00" },
        { name: "Take On Me", artist: "a-ha", duration: "3:45" },
        { name: "Everybody Wants To Rule", artist: "Tears for Fears", duration: "4:11" },
        { name: "Don't You (Forget About Me)", artist: "Simple Minds", duration: "4:20" },
    ];

    const displayTracks = tracks && tracks.length > 0 && tracks[0].name !== "Unknown" ? tracks : mockTracks;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="3. Top Artists & Tracks" icon={<Mic2 className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh]">
                {loading ? (
                    <div className="flex flex-col h-full items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-12 h-12 text-theme-chart-2 animate-spin" />
                        <p className="text-theme-text-muted">Analyzing your most listened artists...</p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full gap-8 mt-6">
                        
                        {/* Left Side: Top Artists */}
                        <div className="flex-1 border-r border-theme-border/50 pr-8">
                            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-6">Most-Played Artists</h3>
                            
                            {/* Featured Artist Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {artists.slice(0, 4).map((artist, i) => (
                                    <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden mb-2 border-2 border-transparent group-hover:border-theme-accent transition-all duration-300 relative">
                                            {artist.images && artist.images.length > 0 ? (
                                                <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-theme-border/30 flex items-center justify-center">
                                                    <Mic2 className="w-8 h-8 text-theme-text-muted" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-theme-text line-clamp-1">{artist.name}</span>
                                        <span className="text-[10px] text-theme-text-muted line-clamp-1 mt-0.5">Top Artist</span>
                                    </div>
                                ))}
                            </div>

                            {/* Artist List with Bars */}
                            <div className="space-y-4 pr-2">
                                {artists.slice(0, 5).map((artist, i) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                        <div className="text-xs font-mono text-theme-text-muted w-4">{i + 1}</div>
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                                            {artist.images && artist.images.length > 0 ? (
                                                <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-theme-border/30 flex items-center justify-center"><Mic2 className="w-4 h-4 text-theme-text-muted" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-sm font-bold text-theme-text group-hover:text-theme-accent transition-colors">{artist.name}</span>
                                                <span className="text-xs text-theme-text-muted font-mono">{artist.popularity || Math.floor(Math.random() * 100)} Score</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-theme-bg rounded-full overflow-hidden">
                                                <div className="h-full bg-theme-accent rounded-full transition-all duration-1000" style={{ width: `${artist.popularity || 50}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Side: Top Tracks */}
                        <div className="flex-1 pl-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">Tracks</h3>
                                <span className="text-xs text-theme-text-muted border border-theme-border/50 px-3 py-1 rounded-full">All Time</span>
                            </div>

                            <div className="space-y-3">
                                {displayTracks.map((track, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-theme-bg/40 border border-transparent hover:border-theme-border/30 transition-colors group cursor-pointer">
                                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-theme-border/30">
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Play className="w-4 h-4 text-white fill-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-theme-text truncate group-hover:text-theme-chart-2 transition-colors">{track.name}</h4>
                                            <p className="text-xs text-theme-text-muted truncate mt-0.5">{track.artist}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Audio Wave Fake Animation */}
                                            <div className="hidden group-hover:flex items-center gap-0.5 h-4">
                                                <div className="w-0.5 bg-theme-chart-2 h-full animate-[bounce_1s_infinite]"></div>
                                                <div className="w-0.5 bg-theme-chart-2 h-2/3 animate-[bounce_1s_infinite_0.2s]"></div>
                                                <div className="w-0.5 bg-theme-chart-2 h-1/2 animate-[bounce_1s_infinite_0.4s]"></div>
                                                <div className="w-0.5 bg-theme-chart-2 h-full animate-[bounce_1s_infinite_0.1s]"></div>
                                            </div>
                                            <div className="text-xs font-mono text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                                {track.duration || "3:00"}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </GlassCard>
        </div>
    );
}
