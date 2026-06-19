"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, Volume2 } from "lucide-react";

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

    // Fetch Spotify Token and initialize Player
    useEffect(() => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        const fetchSpotifyToken = async () => {
            try {
                const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data && data.data.access_token) {
                        setSpotifyToken(data.data.access_token);
                        initializePlayer(data.data.access_token);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch token for player", err);
            }
        };

        const initializePlayer = (spotifyToken: string) => {
            // Avoid duplicate scripts
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
                        checkLikedStatus(state.track_window.current_track.id, spotifyToken);
                    }

                    setIsActive(true);
                });

                player.connect();
            };
        };

        fetchSpotifyToken();
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

    // Check if current track is liked
    const checkLikedStatus = async (trackId: string, token: string) => {
        try {
            const res = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsLiked(data[0]);
            }
        } catch (err) {
            console.error("Failed to check like status", err);
        }
    };

    // Toggle track like state
    const handleLikeToggle = async () => {
        if (!currentTrack || !spotifyToken) return;
        const trackId = currentTrack.id;
        const method = isLiked ? "DELETE" : "PUT";
        try {
            const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
                method,
                headers: { "Authorization": `Bearer ${spotifyToken}` }
            });
            if (res.ok) {
                setIsLiked(!isLiked);
            }
        } catch (err) {
            console.error("Failed to toggle like", err);
        }
    };

    // Toggle shuffle mode
    const handleShuffleToggle = async () => {
        if (!spotifyToken) return;
        const newShuffle = !isShuffle;
        try {
            const res = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newShuffle}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${spotifyToken}` }
            });
            if (res.ok) {
                setIsShuffle(newShuffle);
            }
        } catch (err) {
            console.error("Failed to toggle shuffle", err);
        }
    };

    // Toggle repeat mode
    const handleRepeatToggle = async () => {
        if (!spotifyToken) return;
        const nextMode = repeatMode === "off" ? "track" : repeatMode === "track" ? "context" : "off";
        try {
            const res = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextMode}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${spotifyToken}` }
            });
            if (res.ok) {
                setRepeatMode(nextMode);
            }
        } catch (err) {
            console.error("Failed to toggle repeat", err);
        }
    };

    // Control volume
    const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (player) {
            await player.setVolume(val);
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

    return (
        <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-4 text-[#8293B4] w-full flex flex-col space-y-4">
            
            {/* Album Cover & Track Details */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#06080C] border border-[#1B2332] shrink-0 overflow-hidden relative flex items-center justify-center text-theme-accent">
                    {currentTrack && currentTrack.album?.images[0]?.url ? (
                        <img src={currentTrack.album.images[0].url} alt={trackName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-lg">🎵</span>
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
                        className={`p-1 hover:text-white transition-colors shrink-0 ${isLiked ? 'text-theme-accent' : ''}`}
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

            {/* Web Playback Controls Row */}
            <div className="flex items-center justify-between px-1">
                {/* Shuffle Button */}
                <button 
                    onClick={handleShuffleToggle}
                    className={`p-1 hover:text-white transition-colors ${isShuffle ? 'text-theme-accent' : 'text-theme-text-muted'}`}
                >
                    <Shuffle className="w-3.5 h-3.5" />
                </button>

                {/* Previous Button */}
                <button 
                    onClick={handlePrev}
                    className="p-1.5 hover:text-white transition-colors disabled:opacity-30"
                    disabled={!isActive}
                >
                    <SkipBack className="w-4 h-4" />
                </button>

                {/* Play / Pause Circular Button */}
                <button 
                    onClick={handlePlayPause}
                    className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md shrink-0 disabled:opacity-50"
                    disabled={!isActive}
                >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-black ml-0.5" /> : <Pause className="w-3.5 h-3.5 fill-black" />}
                </button>

                {/* Next Button */}
                <button 
                    onClick={handleNext}
                    className="p-1.5 hover:text-white transition-colors disabled:opacity-30"
                    disabled={!isActive}
                >
                    <SkipForward className="w-4 h-4" />
                </button>

                {/* Repeat Button */}
                <button 
                    onClick={handleRepeatToggle}
                    className={`p-1 hover:text-white transition-colors ${repeatMode !== 'off' ? 'text-theme-accent' : 'text-theme-text-muted'}`}
                >
                    <Repeat className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Volume Control Overlay */}
            <div className="flex items-center gap-2 border-t border-[#1B2332]/50 pt-3">
                <Volume2 className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-[#1B2332] rounded-full appearance-none cursor-pointer accent-theme-accent"
                />
            </div>

            {/* Sync connection status at the very bottom */}
            <div className="flex items-center justify-center gap-1.5 border-t border-[#1B2332]/50 pt-3 text-[9px] font-bold uppercase tracking-widest text-[#22C55E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E] animate-pulse"></span>
                <span>Spotify Connected</span>
            </div>
            
        </div>
    );
}
