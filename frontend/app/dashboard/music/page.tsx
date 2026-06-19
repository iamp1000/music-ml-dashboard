"use client";

import React, { useEffect, useState } from "react";
import { 
    Music, Sparkles, Play, Loader2, AlertCircle, 
    Mic2, Compass, Award, Percent, Tag, Zap
} from "lucide-react";
import { fetchWithRateLimit } from "@/utils/api";

type TabType = "top-items" | "recommendations";

export default function MusicRecommendationsHub() {
    const [activeTab, setActiveTab] = useState<TabType>("top-items");
    const [artists, setArtists] = useState<any[]>([]);
    const [tracks, setTracks] = useState<any[]>([]);
    const [recTracks, setRecTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchMusicHubData = async () => {
            try {
                // 1. Fetch profile for top artists
                const profileData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/auth/profile");
                if (profileData && profileData.data) {
                    setArtists(profileData.data.top_artists || []);
                }

                // 2. Fetch top tracks
                const topTracksData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/spotify/top-tracks?limit=20");
                if (topTracksData && topTracksData.items) {
                    setTracks(topTracksData.items);
                }

                // 3. Fetch recommendations
                const recData = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/spotify/recommendations?limit=15");
                if (recData && recData.tracks) {
                    setRecTracks(recData.tracks);
                }
            } catch (err: any) {
                console.error("Failed to load music hub data", err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMusicHubData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Loading Music Hub...</p>
            </div>
        );
    }

    // --- Analytics Calculations ---
    const topArtist = artists[0] || null;
    const avgTrackPopularity = tracks.length > 0
        ? Math.round(tracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / tracks.length)
        : 0;

    const genreSet = new Set<string>();
    artists.forEach(a => a.genres?.forEach((g: string) => genreSet.add(g)));
    const genreDiversityCount = genreSet.size;

    const recommendationSeedTrack = tracks[0] || null;

    // --- Sub-Render: Top Tracks & Artists ---
    const renderTopItems = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Artists List */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Mic2 className="w-5 h-5 text-theme-accent" />
                            Top Artists
                        </h3>
                    </div>

                    <div className="space-y-4 flex-1">
                        {artists.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                                {artists.slice(0, 10).map((artist, i) => (
                                    <div key={artist.id || i} className="flex items-center gap-3 p-2 bg-[#070A0F]/50 border border-[#1B2332]/50 rounded-xl hover:border-[#1B2332] transition-colors">
                                        <div className="text-xs font-mono text-theme-text-muted w-4 shrink-0">{i + 1}</div>
                                        <div className="w-10 h-10 rounded-lg bg-[#070A0F] border border-[#1B2332] flex items-center justify-center shrink-0 text-theme-accent font-bold text-[10px] overflow-hidden">
                                            {artist.images?.[0]?.url ? (
                                                <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Mic2 className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-white truncate">{artist.name}</h4>
                                            <p className="text-[9px] text-theme-text-muted truncate mt-0.5 uppercase tracking-wide font-mono">
                                                {artist.genres?.[0] || "General"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center py-20 text-xs text-theme-text-muted">
                                No top artists available. Syncing profile...
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Tracks List */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Music className="w-5 h-5 text-theme-accent" />
                            Most Played Tracks
                        </h3>
                    </div>

                    {tracks.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto max-h-[420px] pr-2 scrollbar-thin">
                            {tracks.map((track, i) => (
                                <div key={i} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-[#070A0F] border border-transparent hover:border-[#1B2332] transition-all group cursor-pointer">
                                    <div className="text-xs font-mono text-theme-text-muted w-4 shrink-0">{i + 1}</div>
                                    <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#070A0F] border border-[#1B2332] flex items-center justify-center text-theme-accent text-xs">
                                        {track.album?.images?.[0]?.url ? (
                                            <img src={track.album.images[0].url} alt={track.name} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <Music className="w-4 h-4" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate group-hover:text-theme-accent transition-colors">{track.name}</h4>
                                        <p className="text-[10px] text-theme-text-muted truncate mt-0.5">{track.artists[0].name}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-xs font-mono text-white font-bold">{track.popularity}% pop</span>
                                        <div className="w-16 h-1 bg-[#1B2332] rounded-full overflow-hidden mt-1">
                                            <div className="h-full bg-theme-accent rounded-full shadow-[0_0_4px_var(--theme-accent)]" style={{ width: `${track.popularity}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-20 text-xs text-theme-text-muted">
                            No track play history recorded.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Sub-Render: Recommendations ---
    const renderRecommendations = () => {
        const customMixes = [
            {
                title: "Vibe Booster AI",
                tagline: "Energy Flow Boost",
                icon: Zap,
                gradient: "from-green-600/30 to-emerald-950/20",
                tracks: recTracks.slice(0, 5)
            },
            {
                title: "Deep Focus Flow",
                tagline: "Ambient Study Vibe",
                icon: Compass,
                gradient: "from-purple-600/30 to-violet-950/20",
                tracks: recTracks.slice(5, 10)
            },
            {
                title: "Discovery Accelerator",
                tagline: "Exploring New Styles",
                icon: Sparkles,
                gradient: "from-blue-600/30 to-indigo-950/20",
                tracks: recTracks.slice(10, 15)
            }
        ];

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {customMixes.map((mix, idx) => {
                    const MixIcon = mix.icon;
                    return (
                        <div key={idx} className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-5 flex flex-col h-[400px]">
                            {/* Header Box */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mix.gradient} border border-[#1B2332] flex items-center justify-center`}>
                                    <MixIcon className="w-5 h-5 text-theme-accent" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight">{mix.title}</h4>
                                    <span className="text-[9px] text-theme-text-muted">{mix.tagline}</span>
                                </div>
                            </div>

                            {/* Recommendations list */}
                            <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                                {mix.tracks.length > 0 ? (
                                    mix.tracks.map((track: any, tIdx: number) => (
                                        <div key={track.id || tIdx} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#070A0F] border border-transparent hover:border-[#1B2332] transition-colors group cursor-pointer">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#1B2332] relative flex items-center justify-center text-theme-accent text-[10px]">
                                                {track.album?.images?.[0]?.url ? (
                                                    <img src={track.album.images[0].url} alt={track.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Music className="w-3.5 h-3.5" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-[10px] font-bold text-white truncate leading-tight group-hover:text-theme-accent transition-colors">{track.name}</h5>
                                                <span className="text-[9px] text-theme-text-muted truncate block mt-0.5">{track.artists[0].name}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] text-theme-text-muted text-center py-10">
                                        No recommendations compiled.
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-[#1B2332]/60 pt-3 mt-3 flex justify-between items-center text-[9px] text-theme-text-muted">
                                <span className="font-mono">{mix.tracks.length} tracks synced</span>
                                <span className="text-theme-accent uppercase font-bold tracking-wider hover:underline flex items-center gap-0.5">
                                    Play Mix <span className="font-serif">→</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Navigation Tab configs
    const tabsConfig = [
        { id: "top-items" as const, label: "Top Tracks & Artists", icon: Music },
        { id: "recommendations" as const, label: "AI Recommendations", icon: Sparkles },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">Music & Discovery</h2>
                    <p className="text-sm text-theme-text-muted mt-1">Live top Spotify tracks, artists, and customized recommendations.</p>
                </div>

                {/* Tab selector buttons */}
                <div className="flex items-center gap-1.5 bg-[#0D111A] border border-[#1B2332] p-1 rounded-xl shrink-0">
                    {tabsConfig.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                    isActive
                                        ? "bg-theme-accent text-black shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                                        : "text-theme-text-muted hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error notifications banner */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Analytics Statistics Row - More Containers to increase value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="bg-[#0D111A] border border-[#1B2332] p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-theme-accent/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="w-10 h-10 rounded-xl bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-theme-accent" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-widest block">Top Artist</span>
                        <h4 className="text-sm font-black text-white truncate uppercase mt-0.5">
                            {topArtist ? topArtist.name : "None"}
                        </h4>
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-[#0D111A] border border-[#1B2332] p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Percent className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-widest block">Average Popularity</span>
                        <h4 className="text-sm font-black text-white truncate uppercase mt-0.5">
                            {avgTrackPopularity}% Rating
                        </h4>
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-[#0D111A] border border-[#1B2332] p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-widest block">Genre Diversity</span>
                        <h4 className="text-sm font-black text-white truncate uppercase mt-0.5">
                            {genreDiversityCount} Genres
                        </h4>
                    </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-[#0D111A] border border-[#1B2332] p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-widest block">Seed Reference</span>
                        <h4 className="text-sm font-black text-white truncate uppercase mt-0.5">
                            {recommendationSeedTrack ? recommendationSeedTrack.name : "None"}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Active Tab Panel */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === "top-items" && renderTopItems()}
                {activeTab === "recommendations" && renderRecommendations()}
            </div>
        </div>
    );
}
