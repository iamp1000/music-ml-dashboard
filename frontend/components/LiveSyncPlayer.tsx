"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function LiveSyncPlayer() {
    const waveRef = useRef<HTMLDivElement>(null);
    const [trackName, setTrackName] = useState("Waiting for Spotify...");
    const [valence, setValence] = useState(0.5);

    useEffect(() => {
        // Connect to FastAPI WebSocket
        const ws = new WebSocket("ws://localhost:8000/ws/stream/live");
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.track) {
                setTrackName(data.track);
                setValence(data.metrics.valence);
                
                // GSAP Extreme Animation on track change
                gsap.fromTo(
                    waveRef.current,
                    { scaleY: 0.1, opacity: 0 },
                    { scaleY: data.metrics.energy * 2, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
                );
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div className="p-6 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 text-white w-full max-w-md">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Live Sync • Now Playing</h2>
            <div className="flex items-center gap-6">
                {/* Audio Wave Visualizer Block */}
                <div 
                    ref={waveRef} 
                    className="w-16 h-16 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-sm"
                    style={{ transformOrigin: "bottom" }}
                />
                
                <div className="flex flex-col">
                    <span className="font-bold text-xl truncate">{trackName}</span>
                    <span className="text-zinc-400 text-sm mt-1">
                        Real-Time Valence: <span className="text-emerald-400 font-mono">{(valence * 100).toFixed(1)}%</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
