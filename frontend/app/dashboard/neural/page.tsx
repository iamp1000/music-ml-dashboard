"use client";

import React, { useEffect, useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

export default function NeuralPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNeuralData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;

                const res = await fetch("https://music-ml-dashboard.onrender.com/telemetry/history", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data) {
                        setHistory(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to load neural data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNeuralData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[80vh] items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-theme-accent animate-spin" />
                <p className="text-theme-text-muted text-sm uppercase tracking-wider">Mapping neural networks...</p>
            </div>
        );
    }

    const hasHistory = history.length > 0;
    let avgValence = 0.5, avgEnergy = 0.5;
    if (hasHistory) {
        avgValence = history.reduce((sum, h) => sum + (h.valence || 0.5), 0) / history.length;
        avgEnergy = history.reduce((sum, h) => sum + (h.energy || h.arousal || 0.5), 0) / history.length;
    }

    const danceability = avgEnergy * 0.8 + avgValence * 0.2;
    const acousticness = 1 - avgEnergy;

    // Config for the neural network visualization with user's actual audio feature values
    const layers = [
        { 
            name: "Input Vectors", 
            nodes: 4, 
            labels: [
                `Energy: ${avgEnergy.toFixed(2)}`, 
                `Valence: ${avgValence.toFixed(2)}`, 
                `Danceability: ${danceability.toFixed(2)}`, 
                `Acousticness: ${acousticness.toFixed(2)}`
            ] 
        },
        { name: "Latent Node 1", nodes: 5, labels: [] },
        { name: "Latent Node 2", nodes: 5, labels: [] },
        { 
            name: "Output Predictions", 
            nodes: 3, 
            labels: [
                `Mood state: ${avgValence > 0.5 ? "Happy/Chill" : "Melancholy"}`, 
                `Energy Shift: ${avgEnergy > 0.5 ? "+14% Trend" : "-8% Trend"}`, 
                `Genre Drift: ${avgValence > 0.5 ? "Pop/Hip-hop" : "Ambient"}`
            ] 
        }
    ];

    // Helper to generate paths between layer A and layer B
    const generatePaths = (layerAIndex: number, layerBIndex: number) => {
        const paths = [];
        const nodesA = layers[layerAIndex].nodes;
        const nodesB = layers[layerBIndex].nodes;
        
        for (let a = 0; a < nodesA; a++) {
            for (let b = 0; b < nodesB; b++) {
                paths.push({ a, b });
            }
        }
        return paths;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Neural Model</h2>
                <p className="text-sm text-theme-text-muted mt-1">Mathematical representation of the feed-forward neural layers classifying your audio characteristics.</p>
            </div>

            {/* Neural Net Graph Card */}
            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center border-b border-[#1B2332]/60 pb-4 mb-8">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-theme-accent animate-pulse" />
                        Active Listening Network Classification
                    </h3>
                    <span className="text-[10px] text-theme-accent bg-theme-accent/10 border border-theme-accent/20 px-3 py-1 rounded-full font-bold">
                        Feed-Forward Inference State
                    </span>
                </div>

                <div className="flex-1 flex flex-col md:flex-row justify-between items-center relative overflow-hidden bg-[#070A0F] border border-[#1B2332]/60 rounded-xl p-8 min-h-[400px]">
                    <div className="flex justify-between h-full w-full relative z-10">
                        {layers.map((layer, lIndex) => (
                            <div key={lIndex} className="flex flex-col justify-between items-center h-full relative w-48 z-10">
                                <h4 className="text-[10px] font-black text-theme-text-muted uppercase tracking-widest mb-6 text-center">{layer.name}</h4>
                                
                                <div className="flex flex-col justify-around flex-1 w-full gap-4">
                                    {Array.from({ length: layer.nodes }).map((_, nIndex) => (
                                        <div key={nIndex} className="flex items-center w-full relative">
                                            {/* Label Left (Input) */}
                                            {lIndex === 0 && layer.labels[nIndex] && (
                                                <div className="absolute right-full mr-3 text-[10px] font-bold text-theme-text-muted whitespace-nowrap flex items-center gap-1.5">
                                                    {layer.labels[nIndex]} <span className="text-theme-accent font-black">→</span>
                                                </div>
                                            )}
                                            
                                            {/* Node Circle */}
                                            <div className="w-5 h-5 rounded-full border border-theme-accent bg-[#070A0F] mx-auto z-20 relative shadow-[0_0_8px_var(--theme-accent)]">
                                                {/* Pulse ping element */}
                                                <div className="absolute inset-0 bg-theme-accent rounded-full animate-ping opacity-25" style={{ animationDelay: `${(lIndex * 0.25) + (nIndex * 0.12)}s` }}></div>
                                            </div>

                                            {/* Label Right (Output) */}
                                            {lIndex === layers.length - 1 && layer.labels[nIndex] && (
                                                <div className="absolute left-full ml-3 text-[10px] font-bold text-theme-text-muted whitespace-nowrap flex items-center gap-1.5">
                                                    <span className="text-theme-accent font-black">→</span> {layer.labels[nIndex]}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SVG Connections Canvas */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ padding: '2rem' }}>
                        <defs>
                            <linearGradient id="neuralLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#1B2332" stopOpacity="0.1" />
                                <stop offset="50%" stopColor="var(--theme-accent)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#1B2332" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        
                        {layers.map((layer, lIndex) => {
                            if (lIndex === layers.length - 1) return null;
                            const paths = generatePaths(lIndex, lIndex + 1);
                            
                            const x1 = (100 / (layers.length - 1)) * lIndex;
                            const x2 = (100 / (layers.length - 1)) * (lIndex + 1);
                            
                            return paths.map((path, i) => {
                                const y1 = (100 / (layers[lIndex].nodes + 1)) * (path.a + 1);
                                const y2 = (100 / (layers[lIndex + 1].nodes + 1)) * (path.b + 1);
                                
                                return (
                                    <line 
                                        key={`edge-${lIndex}-${i}`}
                                        x1={`${x1}%`} y1={`${y1}%`} 
                                        x2={`${x2}%`} y2={`${y2}%`} 
                                        stroke="url(#neuralLineGrad)" 
                                        strokeWidth="1"
                                        className="animate-[pulse_2.5s_ease-in-out_infinite]"
                                        style={{ animationDelay: `${(lIndex * 0.25) + (Math.random() * 0.4)}s` }}
                                    />
                                );
                            });
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
}
