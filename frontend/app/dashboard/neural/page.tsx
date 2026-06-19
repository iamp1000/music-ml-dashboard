"use client";

import React from "react";
import { GlassCard } from "@/components/GlassCard";
import { BrainCircuit } from "lucide-react";

export default function NeuralPage() {
    
    // Config for the neural network visualization
    const layers = [
        { name: "Input", nodes: 4, labels: ["Listening Data", "Energy", "Danceability", "Acousticness", "Valence"] }, // We'll just map 5 explicitly
        { name: "Hidden Layer 1", nodes: 5, labels: [] },
        { name: "Hidden Layer 2", nodes: 5, labels: [] },
        { name: "Output", nodes: 3, labels: ["Mood Prediction", "Preference Shift", "Genre Shift"] }
    ];

    // Helper to generate paths between all nodes of layer A and layer B
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
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <GlassCard title="7. Neural Network Listening Model" icon={<BrainCircuit className="w-5 h-5"/>} className="w-full max-w-6xl min-h-[70vh] flex flex-col">
                <div className="flex flex-col h-full flex-1 bg-theme-bg/20 border border-theme-border/50 rounded-2xl p-8 mt-4 relative overflow-hidden">
                    
                    <div className="flex justify-between h-full w-full relative z-10">
                        {layers.map((layer, lIndex) => (
                            <div key={lIndex} className="flex flex-col justify-between items-center h-full relative w-48">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-8 text-center">{layer.name}</h4>
                                
                                <div className="flex flex-col justify-around flex-1 w-full">
                                    {Array.from({ length: layer.nodes }).map((_, nIndex) => (
                                        <div key={nIndex} className="flex items-center w-full relative">
                                            {/* Label Left (Input) */}
                                            {lIndex === 0 && layer.labels[nIndex] && (
                                                <div className="absolute right-full mr-4 text-xs text-theme-text-muted whitespace-nowrap flex items-center gap-2">
                                                    {layer.labels[nIndex]} <span className="text-theme-accent">→</span>
                                                </div>
                                            )}
                                            
                                            {/* Node */}
                                            <div className="w-6 h-6 rounded-full border-2 border-theme-accent bg-theme-bg/80 mx-auto z-20 relative shadow-[0_0_15px_var(--theme-accent)]">
                                                {/* Pulse effect */}
                                                <div className="absolute inset-0 bg-theme-accent rounded-full animate-ping opacity-20" style={{ animationDelay: `${(lIndex * 0.2) + (nIndex * 0.1)}s` }}></div>
                                            </div>

                                            {/* Label Right (Output) */}
                                            {lIndex === layers.length - 1 && layer.labels[nIndex] && (
                                                <div className="absolute left-full ml-4 text-xs text-theme-text-muted whitespace-nowrap flex items-center gap-2">
                                                    <span className="text-theme-chart-2">→</span> {layer.labels[nIndex]}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SVG Connections Background */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ padding: '2rem' }}>
                        <defs>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--theme-border)" stopOpacity="0.1" />
                                <stop offset="50%" stopColor="var(--theme-accent)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--theme-chart-2)" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        
                        {/* We use percentage coordinates based on flex layout math */}
                        {layers.map((layer, lIndex) => {
                            if (lIndex === layers.length - 1) return null;
                            const paths = generatePaths(lIndex, lIndex + 1);
                            
                            const x1 = (100 / (layers.length - 1)) * lIndex;
                            const x2 = (100 / (layers.length - 1)) * (lIndex + 1);
                            
                            return paths.map((path, i) => {
                                // Y coordinate calculation depends on node count and flex distribution
                                // This is an approximation for visual effect
                                const y1 = (100 / (layers[lIndex].nodes + 1)) * (path.a + 1);
                                const y2 = (100 / (layers[lIndex + 1].nodes + 1)) * (path.b + 1);
                                
                                return (
                                    <line 
                                        key={`edge-${lIndex}-${i}`}
                                        x1={`${x1}%`} y1={`${y1}%`} 
                                        x2={`${x2}%`} y2={`${y2}%`} 
                                        stroke="url(#lineGrad)" 
                                        strokeWidth="1.5"
                                        className="animate-[pulse_2s_ease-in-out_infinite]"
                                        style={{ animationDelay: `${(lIndex * 0.3) + (Math.random() * 0.5)}s` }}
                                    />
                                );
                            });
                        })}
                    </svg>

                </div>
            </GlassCard>
        </div>
    );
}
