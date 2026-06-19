"use client";

import React, { useEffect, useState } from "react";
import { Mic2, Loader2, Play } from "lucide-react";

export default function TopArtistsPage() {
    const [artists, setArtists] = useState<any[]>([]);
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                // Fetch profile for top artists
                const profileRes = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                let profileArtists = [];
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    if (data.status === "success" && data.data) {
                        profileArtists = data.data.top_artists || [];
                        setArtists(profileArtists);
                    }
                }

                // Fetch telemetry history to compute top tracks
                const historyRes = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    if (data.status === "success" && data.data) {
                        const historyList = data.data;
                        
                        // Compute top tracks from history occurrences
                        const counts: Record<string, { name: string; artist: string; count: number; id: string }> = {};
                        historyList.forEach((item: any) => {
                            const key = `${item.track_name} - ${item.artist_name}`;
                            if (!counts[key]) {
                                counts[key] = { name: item.track_name, artist: item.artist_name, count: 0, id: item.track_id };
                            }
                            counts[key].count += 1;
                        });

                        const sortedTracks = Object.values(counts)
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10) // Display top 10 tracks
                            .map(t => ({
                                name: t.name,
                                artist: t.artist,
                                plays: t.count,
                                popularity: Math.min(100, t.count * 15 + 40)
                            }));
                        
                        setTracks(sortedTracks);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch top tracks and artists", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTopData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Syncing top artists and tracks...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Tracks & Artists</h2>
                <p className="text-sm text-theme-text-muted mt-1">Detailed list of your most played artists and popular tracks.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Side: Top Artists */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Mic2 className="w-4 h-4 text-theme-accent" />
                        Most-Played Artists
                    </h3>
                    
                    {artists.length > 0 ? (
                        <div className="space-y-4 flex-1">
                            {/* Featured Top Artist Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {artists.slice(0, 4).map((artist, i) => (
                                    <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden mb-2 border border-[#1B2332] group-hover:border-theme-accent transition-all duration-300 relative shadow-md">
                                            {artist.images && artist.images.length > 0 ? (
                                                <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-[#070A0F] flex items-center justify-center">
                                                    <Mic2 className="w-6 h-6 text-theme-text-muted" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-white line-clamp-1 group-hover:text-theme-accent transition-colors">{artist.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Popularity bar items */}
                            <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 scrollbar-thin">
                                {artists.slice(0, 10).map((artist, i) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                        <div className="text-xs font-mono text-theme-text-muted w-4">{i + 1}</div>
                                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#1B2332]">
                                            {artist.images && artist.images.length > 0 ? (
                                                <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-[#070A0F] flex items-center justify-center"><Mic2 className="w-4 h-4 text-theme-text-muted" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-xs font-bold text-white group-hover:text-theme-accent transition-colors">{artist.name}</span>
                                                <span className="text-[10px] text-theme-text-muted font-mono">{artist.popularity} Popularity</span>
                                            </div>
                                            <div className="w-full h-1 bg-[#070A0F] rounded-full overflow-hidden">
                                                <div className="h-full bg-theme-accent rounded-full shadow-[0_0_8px_var(--theme-accent)]" style={{ width: `${artist.popularity}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-20 text-xs text-theme-text-muted">
                            No top artists available. Syncing profile...
                        </div>
                    )}
                </div>

                {/* Right Side: Top Tracks */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="text-theme-accent">🎵</span>
                            Most Played Tracks
                        </h3>
                        <span className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full font-bold">From history</span>
                    </div>

                    {tracks.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[420px] pr-2 scrollbar-thin">
                            {tracks.map((track, i) => (
                                <div key={i} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-[#070A0F] border border-transparent hover:border-[#1B2332] transition-all group cursor-pointer">
                                    <div className="text-xs font-mono text-theme-text-muted w-4 shrink-0">{i + 1}</div>
                                    <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#070A0F] border border-[#1B2332] flex items-center justify-center text-theme-accent text-xs">
                                        🎵
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate group-hover:text-theme-accent transition-colors">{track.name}</h4>
                                        <p className="text-[10px] text-theme-text-muted truncate mt-0.5">{track.artist}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-xs font-mono text-white font-bold">{track.plays} plays</span>
                                        <div className="w-16 h-1 bg-[#1B2332] rounded-full overflow-hidden mt-1">
                                            <div className="h-full bg-theme-accent rounded-full shadow-[0_0_4px_var(--theme-accent)]" style={{ width: `${track.popularity}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-20 text-xs text-theme-text-muted">
                            No track play history recorded. Play music to view top tracks.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
