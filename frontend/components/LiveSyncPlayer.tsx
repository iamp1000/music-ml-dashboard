"use client";

import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, Volume2, AlertTriangle, Music } from "lucide-react";
import { fetchWithRateLimit } from "@/utils/api";

export default function LiveSyncPlayer() {
    const [trackName, setTrackName] = useState("Waiting for Spotify...");
    const [artistName, setArtistName] = useState("");
    const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
    
    // Web Playback SDK state
    const [player, setPlayer] = useState<any>(null);
    const [isPaused, setIsPaused] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    
    // Liked/Shuffle/Repeat states
    const [isLiked, setIsLiked] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<"off" | "track" | "context">("off");
    
    // Volume & Progress states
    const [volume, setVolume] = useState(0.5);
    const [progressMs, setProgressMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);

    // Rate limiting tracking state
    const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
    const lastCheckedTrackIdRef = useRef<string | null>(null);

    // Rate limit countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (rateLimitSeconds > 0) {
            interval = setInterval(() => {
                setRateLimitSeconds((prev) => {
                    if (prev <= 1) {
                        setTrackName("Waiting for Spotify...");
                        setArtistName("");
                        return 0;
                    }
                    setArtistName(`Please wait for ${prev - 1} seconds`);
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [rateLimitSeconds]);

    // Fetch Spotify Token and initialize Player
    useEffect(() => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        const fetchSpotifyToken = async () => {
            try {
                // Fetch profile to get token
                const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/auth/profile");
                if (data && data.data?.access_token) {
                    setSpotifyToken(data.data.access_token);
                    initializePlayer(data.data.access_token);
                    if (data.data.id) {
                        initializeWebsocket(data.data.id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch token for player", err);
            }
        };

        const initializeWebsocket = (userId: string) => {
            const ws = new WebSocket(`wss://music-ml-dashboard.onrender.com/ws/stream/live?token=${token}`);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.status === "playing") {
                        setTrackName(data.track);
                        setArtistName(data.artist || "Unknown Artist");
                        setIsActive(true);
                        
                        if (data.duration_ms) setDurationMs(data.duration_ms);
                        if (data.progress_ms) setProgressMs(data.progress_ms);
                        if (data.id) checkLikedStatus(data.id);
                        
                        setCurrentTrack((prev: any) => ({
                            ...prev,
                            id: data.id,
                            name: data.track,
                            album: { images: [{ url: data.album_art }] }
                        }));
                    } else if (data && data.status === "inactive") {
                        setTrackName("No track playing");
                        setArtistName("");
                        setIsActive(false);
                        setCurrentTrack(null);
                    } else if (data && data.status === "rate_limited") {
                        setRateLimitSeconds(data.retry_after || 30);
                        setTrackName(`Spotify Rate Limit Cooldown...`);
                        setArtistName(`Please wait for ${data.retry_after || 30} seconds`);
                        setIsActive(false);
                        setCurrentTrack(null);
                    }
                } catch (e) {
                    console.error("WS parse error", e);
                }
            };
            ws.onclose = () => {
                setTimeout(() => initializeWebsocket(userId), 5000);
            };
        };

        const initializePlayer = (spotifyToken: string) => {
            if (!document.getElementById("spotify-player-sdk")) {
                const script = document.createElement("script");
                script.id = "spotify-player-sdk";
                script.src = "https://sdk.scdn.co/spotify-player.js";
                script.async = true;
                document.body.appendChild(script);
            }

            (window as any).onSpotifyWebPlaybackSDKReady = () => {
                const player = new (window as any).Spotify.Player({
                    name: "SonicLens Web Player",
                    getOAuthToken: async (cb: any) => { 
                        try {
                            const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/api/auth/profile");
                            if (data && data.data?.access_token) {
                                cb(data.data.access_token);
                            } else {
                                cb(spotifyToken);
                            }
                        } catch (e) {
                            cb(spotifyToken);
                        }
                    },
                    volume: 0.5
                });

                setPlayer(player);

                player.addListener("ready", ({ device_id }: any) => {
                    console.log("Spotify Ready with Device ID", device_id);
                    setDeviceId(device_id);
                });

                player.addListener("not_ready", ({ device_id }: any) => {
                    console.log("Device ID has gone offline", device_id);
                    setDeviceId(null);
                });

                player.addListener("player_state_changed", (state: any) => {
                    if (!state) return;
                    setCurrentTrack(state.track_window.current_track);
                    setIsPaused(state.paused);
                    setProgressMs(state.position);
                    setDurationMs(state.duration);
                    
                    if (state.track_window.current_track) {
                        const newTrackId = state.track_window.current_track.id;
                        setTrackName(state.track_window.current_track.name);
                        setArtistName(state.track_window.current_track.artists[0].name);
                        
                        // Prevent hammering Spotify API on every play/pause/volume change
                        if (lastCheckedTrackIdRef.current !== newTrackId) {
                            lastCheckedTrackIdRef.current = newTrackId;
                            checkLikedStatus(newTrackId);
                        }
                    }

                    setIsActive(true);
                });

                player.connect();
            };
        };

        fetchSpotifyToken();
    }, []);

    // Rate-limiting listener
    useEffect(() => {
        const handleRateLimit = (e: any) => {
            setRateLimitSeconds(e.detail.retryAfter);
        };
        window.addEventListener("spotify-rate-limit", handleRateLimit);
        return () => window.removeEventListener("spotify-rate-limit", handleRateLimit);
    }, []);

    // Progress bar ticking timer
    useEffect(() => {
        if (isPaused || durationMs === 0) return;
        const interval = setInterval(() => {
            setProgressMs(prev => {
                if (prev >= durationMs) {
                    clearInterval(interval);
                    return durationMs;
                }
                return prev + 1000;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isPaused, durationMs]);

    // Check if current track is liked via backend proxy
    const checkLikedStatus = async (trackId: string) => {
        try {
            const data = await fetchWithRateLimit(
                `https://music-ml-dashboard.onrender.com/api/spotify/player/like?track_id=${trackId}`
            );
            if (data) {
                setIsLiked(data.liked);
            }
        } catch (err) {
            console.error("Failed to check like status", err);
        }
    };

    // Toggle track like state via backend proxy
    const handleLikeToggle = async () => {
        if (!currentTrack || rateLimitSeconds > 0) return;
        const trackId = currentTrack.id;
        const url = `https://music-ml-dashboard.onrender.com/api/spotify/player/like?track_id=${trackId}`;
        try {
            await fetchWithRateLimit(url, { method: isLiked ? "DELETE" : "PUT" });
            setIsLiked(!isLiked);
        } catch (err) {
            console.error("Failed to toggle like", err);
        }
    };

    // Toggle shuffle mode via backend proxy
    const handleShuffleToggle = async () => {
        if (rateLimitSeconds > 0) return;
        const newShuffle = !isShuffle;
        const url = `https://music-ml-dashboard.onrender.com/api/spotify/player/shuffle?state=${newShuffle}${deviceId ? `&device_id=${deviceId}` : ""}`;
        try {
            await fetchWithRateLimit(url, { method: "PUT" });
            setIsShuffle(newShuffle);
        } catch (err) {
            console.error("Failed to toggle shuffle", err);
        }
    };

    // Toggle repeat mode via backend proxy
    const handleRepeatToggle = async () => {
        if (rateLimitSeconds > 0) return;
        const nextMode = repeatMode === "off" ? "track" : repeatMode === "track" ? "context" : "off";
        const url = `https://music-ml-dashboard.onrender.com/api/spotify/player/repeat?state=${nextMode}${deviceId ? `&device_id=${deviceId}` : ""}`;
        try {
            await fetchWithRateLimit(url, { method: "PUT" });
            setRepeatMode(nextMode);
        } catch (err) {
            console.error("Failed to toggle repeat", err);
        }
    };

    // Control volume via both backend proxy and local SDK
    const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (player) {
            await player.setVolume(val);
        }
        if (rateLimitSeconds === 0) {
            const volPercent = Math.round(val * 100);
            const url = `https://music-ml-dashboard.onrender.com/api/spotify/player/volume?volume_percent=${volPercent}${deviceId ? `&device_id=${deviceId}` : ""}`;
            try {
                await fetchWithRateLimit(url, { method: "PUT" });
            } catch (err) {
                console.error("Failed to set volume on Spotify API", err);
            }
        }
    };

    // Handle progress bar seek click
    const handleSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player || durationMs === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const seekPosition = Math.round(percentage * durationMs);
        await player.seek(seekPosition);
        setProgressMs(seekPosition);
    };

    const formatTime = (ms: number) => {
        if (!ms || isNaN(ms)) return "0:00";
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Web Playback controls wrapper
    const handlePrev = () => player && player.previousTrack();
    const handlePlayPause = () => player && player.togglePlay();
    const handleNext = () => player && player.nextTrack();

    const isButtonsDisabled = !isActive || rateLimitSeconds > 0;

    return (
        <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl p-5 text-gray-300 w-full flex flex-col space-y-4 relative overflow-hidden">
            
            {/* Rate limit warning banner */}
            {rateLimitSeconds > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center gap-2 animate-pulse uppercase tracking-wider">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-yellow-500" />
                    <span>Rate limit backoff: {rateLimitSeconds}s</span>
                </div>
            )}

            {/* Album Cover & Track Details */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-black/20 border border-white/10 shrink-0 overflow-hidden relative flex items-center justify-center text-theme-accent">
                    {currentTrack && currentTrack.album?.images[0]?.url ? (
                        <img 
                            src={currentTrack?.album?.images[0]?.url || "/placeholder.jpg"} 
                            alt="Album" 
                            className={`w-full h-full object-cover shadow-sm ${rateLimitSeconds > 0 ? 'opacity-50 grayscale' : ''}`}
                        />
                    ) : (
                        <Music className="w-6 h-6 text-theme-accent" />
                    )}
                </div>

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
                    <div className="relative overflow-hidden w-full group [mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
                        <div className={`flex w-max ${trackName.length > 22 ? 'animate-marquee group-hover:[animation-play-state:paused]' : ''}`}>
                            <span className={`text-sm font-semibold pr-8 ${rateLimitSeconds > 0 ? 'text-red-400' : 'text-white'}`}>
                                {trackName}
                            </span>
                            {trackName.length > 22 && (
                                <span className={`text-sm font-semibold pr-8 ${rateLimitSeconds > 0 ? 'text-red-400' : 'text-white'}`} aria-hidden="true">
                                    {trackName}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="relative overflow-hidden w-full group mt-0.5 [mask-image:linear-gradient(to_right,black_80%,transparent_100%)]">
                        <div className={`flex w-max ${artistName.length > 28 ? 'animate-marquee group-hover:[animation-play-state:paused]' : ''}`}>
                            <span className="text-xs text-gray-400 pr-8">
                                {artistName}
                            </span>
                            {artistName.length > 28 && (
                                <span className="text-xs text-gray-400 pr-8" aria-hidden="true">
                                    {artistName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Like / Heart Icon */}
                {isActive && (
                    <button 
                        onClick={handleLikeToggle}
                        disabled={rateLimitSeconds > 0}
                        className={`p-1 hover:text-white transition-colors shrink-0 disabled:opacity-40 ${isLiked ? 'text-theme-accent' : ''}`}
                    >
                        <Heart className="w-4 h-4 fill-current" />
                    </button>
                )}
            </div>

            {/* Sync connection status at the very bottom */}
            <div className="flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-[9px] font-bold uppercase tracking-widest text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] animate-pulse"></span>
                <span>Spotify Connected</span>
            </div>
            
        </div>
    );
}
