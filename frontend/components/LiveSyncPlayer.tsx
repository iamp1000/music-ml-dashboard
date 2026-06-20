"use client";

import React, { useEffect, useState } from "react";
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

    // Fetch Spotify Token and initialize Player
    useEffect(() => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        const fetchSpotifyToken = async () => {
            try {
                // Fetch profile to get token
                const data = await fetchWithRateLimit("https://music-ml-dashboard.onrender.com/auth/profile");
                if (data && data.data?.access_token) {
                    setSpotifyToken(data.data.access_token);
                    initializePlayer(data.data.access_token);
                    initializeWebsocket();
                }
            } catch (err) {
                console.error("Failed to fetch token for player", err);
            }
        };

        const initializeWebsocket = () => {
            const ws = new WebSocket(`wss://music-ml-dashboard.onrender.com/ws/stream/live?token=${token}`);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.track && data.track !== "No track playing") {
                        setTrackName(data.track);
                        setArtistName(data.artist || "Unknown Artist");
                        setIsActive(true);
                    } else if (data && data.track === "No track playing") {
                        setTrackName("No track playing");
                        setArtistName("");
                        setIsActive(false);
                    }
                } catch (e) {
                    console.error("WS parse error", e);
                }
            };
            ws.onclose = () => {
                setTimeout(() => initializeWebsocket(), 5000);
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
                    getOAuthToken: (cb: any) => { cb(spotifyToken); },
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
                        setTrackName(state.track_window.current_track.name);
                        setArtistName(state.track_window.current_track.artists[0].name);
                        checkLikedStatus(state.track_window.current_track.id);
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

    // Rate-limiting cooldown timer
    useEffect(() => {
        if (rateLimitSeconds <= 0) return;
        const interval = setInterval(() => {
            setRateLimitSeconds(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [rateLimitSeconds]);

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
    return (
        <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-4 text-[#8293B4] w-full flex flex-col space-y-4 relative">
            
            {/* Rate limit warning banner */}
            {rateLimitSeconds > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold py-2 px-3 rounded-lg flex items-center gap-2 animate-pulse uppercase tracking-wider">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-yellow-500" />
                    <span>Rate limit backoff: {rateLimitSeconds}s</span>
                </div>
            )}

            {/* Album Cover & Track Details */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#06080C] border border-[#1B2332] shrink-0 overflow-hidden relative flex items-center justify-center text-theme-accent">
                    {currentTrack && currentTrack.album?.images[0]?.url ? (
                        <img src={currentTrack.album.images[0].url} alt={trackName} className="w-full h-full object-cover" />
                    ) : (
                        <Music className="w-5 h-5 text-theme-accent" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{trackName}</h4>
                    <p className="text-[10px] text-theme-text-muted truncate mt-0.5">{artistName || "No artist active"}</p>
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

            {/* Progress Slider Bar */}
            <div className="space-y-1">
                <div 
                    onClick={handleSeek} 
                    className="w-full h-1 bg-[#1B2332] rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all relative"
                >
                    <div 
                        className="h-full bg-theme-accent shadow-[0_0_8px_var(--theme-accent)] rounded-full transition-all duration-300"
                        style={{ width: `${(progressMs / (durationMs || 1)) * 100}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-theme-text-muted">
                    <span>{formatTime(progressMs)}</span>
                    <span>{formatTime(durationMs)}</span>
                </div>
            </div>

            {/* Sync connection status at the very bottom */}
            <div className="flex items-center justify-center gap-1.5 border-t border-[#1B2332]/50 pt-3 text-[9px] font-bold uppercase tracking-widest text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E] animate-pulse"></span>
                <span>Spotify Connected</span>
            </div>
            
        </div>
    );
}
