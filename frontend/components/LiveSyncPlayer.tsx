"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

export default function LiveSyncPlayer() {
    const waveRef = useRef<HTMLDivElement>(null);
    const [trackName, setTrackName] = useState("Waiting for Spotify...");
    const [artistName, setArtistName] = useState("");
    const [valence, setValence] = useState(0.5);
    
    // Web Playback SDK state
    const [player, setPlayer] = useState<any>(null);
    const [isPaused, setIsPaused] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('jwt'); // We need the Spotify access token, but we only have JWT!
        // Wait, the SDK needs a raw Spotify Access Token. 
        // We will need to fetch the access token from the backend securely.
        
        const fetchSpotifyToken = async () => {
            try {
                // For security, the backend should have an endpoint that returns the decrypted access token
                // If it doesn't exist yet, we'll gracefully fallback to WebSocket only.
                const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data && data.data.access_token) {
                        initializePlayer(data.data.access_token);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch token for player", err);
            }
        };

        const initializePlayer = (spotifyToken: string) => {
            const script = document.createElement("script");
            script.src = "https://sdk.scdn.co/spotify-player.js";
            script.async = true;
            document.body.appendChild(script);

            (window as any).onSpotifyWebPlaybackSDKReady = () => {
                const player = new (window as any).Spotify.Player({
                    name: 'Affective Music SaaS Web Player',
                    getOAuthToken: (cb: any) => { cb(spotifyToken); },
                    volume: 0.5
                });

                setPlayer(player);

                player.addListener('ready', ({ device_id }: any) => {
                    console.log('Ready with Device ID', device_id);
                });

                player.addListener('not_ready', ({ device_id }: any) => {
                    console.log('Device ID has gone offline', device_id);
                });

                player.addListener('player_state_changed', (state: any) => {
                    if (!state) return;
                    setCurrentTrack(state.track_window.current_track);
                    setIsPaused(state.paused);
                    
                    if (state.track_window.current_track) {
                        setTrackName(state.track_window.current_track.name);
                        setArtistName(state.track_window.current_track.artists[0].name);
                    }

                    player.getCurrentState().then((state: any) => {
                        (!state) ? setIsActive(false) : setIsActive(true);
                    });
                });

                player.connect();
            };
        };

        // Standard WebSocket fallback for Valence/Energy sync
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = 'music-ml-dashboard.onrender.com';
        const wsUrl = `${protocol}//${host}/ws/stream/live?token=${token}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.track && !currentTrack) { 
                // Only override if WebSDK isn't active
                setTrackName(data.track);
                setValence(data.metrics.valence);
            }
            if (data.metrics) {
                gsap.fromTo(
                    waveRef.current,
                    { scaleY: 0.1, opacity: 0 },
                    { scaleY: Math.max(0.1, data.metrics.energy * 2), opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
                );
            }
        };

        ws.onclose = (event) => {
            if (event.code === 1008 && !currentTrack) {
                setTrackName("Authentication failed. Please login.");
            }
        }

        fetchSpotifyToken();

        return () => ws.close();
    }, []);

    return (
        <div className="p-4 bg-theme-bg/80 rounded-xl shadow-2xl border border-theme-border/50 text-theme-text w-full">
            <h2 className="text-[10px] uppercase tracking-widest text-theme-text-muted mb-4 border-b border-theme-border/50 pb-2">Live Web Playback</h2>
            
            <div className="flex items-center gap-4 mb-4">
                {/* Audio Wave Visualizer Block */}
                <div 
                    ref={waveRef} 
                    className="w-12 h-12 bg-gradient-to-t from-theme-chart-2 to-theme-accent rounded-sm shadow-[0_0_15px_var(--theme-accent)]"
                    style={{ transformOrigin: "bottom" }}
                >
                    {currentTrack && currentTrack.album?.images[0]?.url && (
                        <img src={currentTrack.album.images[0].url} className="w-full h-full object-cover mix-blend-overlay opacity-50" />
                    )}
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-sm truncate text-theme-text">{trackName}</span>
                    {artistName && <span className="text-[10px] text-theme-text-muted truncate mt-0.5">{artistName}</span>}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-2">
                <button 
                    className="p-2 text-theme-text-muted hover:text-white transition-colors"
                    onClick={() => player && player.previousTrack()}
                >
                    <SkipBack className="w-4 h-4" />
                </button>
                <button 
                    className="p-3 bg-theme-text text-theme-bg rounded-full hover:scale-105 transition-transform shadow-[0_0_10px_var(--theme-text-muted)]"
                    onClick={() => player && player.togglePlay()}
                >
                    {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                </button>
                <button 
                    className="p-2 text-theme-text-muted hover:text-white transition-colors"
                    onClick={() => player && player.nextTrack()}
                >
                    <SkipForward className="w-4 h-4" />
                </button>
            </div>
            
            {!isActive && (
                <div className="text-center mt-3 text-[10px] text-theme-chart-4 bg-theme-chart-4/10 py-1 rounded">
                    Transfer playback to "Affective Music SaaS Web Player" in Spotify
                </div>
            )}
        </div>
    );
}
