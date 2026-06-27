"use client";

import React from "react";
import { Calendar } from "lucide-react";

export default function SonicGenreTopology() {
    // Hardcoded constellation data to match the screenshot's vibe
    const constellations = [
        {
            id: "pop",
            name: "Pop/Dance",
            plays: 148,
            color: "#A855F7",
            // Center roughly at 150, 100
            blob: "M 80 100 C 70 60, 140 40, 180 60 C 220 80, 240 130, 200 160 C 160 190, 90 180, 80 100 Z",
            stars: [
                {x: 100, y: 120}, {x: 130, y: 80}, {x: 170, y: 100}, {x: 150, y: 140}, {x: 190, y: 130}
            ],
            connections: [
                [0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 4]
            ],
            labelPos: {x: 140, y: 50}
        },
        {
            id: "hiphop",
            name: "Hip-Hop",
            plays: 24,
            color: "#EAB308",
            // Center roughly at 350, 80
            blob: "M 300 80 C 310 40, 380 30, 410 70 C 430 110, 390 140, 350 130 C 310 120, 280 110, 300 80 Z",
            stars: [
                {x: 320, y: 80}, {x: 350, y: 60}, {x: 390, y: 90}, {x: 360, y: 110}
            ],
            connections: [
                [0, 1], [1, 2], [2, 3], [0, 3]
            ],
            labelPos: {x: 360, y: 40}
        },
        {
            id: "country",
            name: "Country",
            plays: 76,
            color: "#F97316",
            // Center roughly at 250, 180
            blob: "M 180 180 C 190 150, 260 140, 300 170 C 330 200, 300 230, 250 230 C 200 230, 160 210, 180 180 Z",
            stars: [
                {x: 210, y: 180}, {x: 250, y: 160}, {x: 280, y: 190}, {x: 240, y: 210}
            ],
            connections: [
                [0, 1], [1, 2], [2, 3], [3, 0]
            ],
            labelPos: {x: 240, y: 145}
        },
        {
            id: "classical",
            name: "Classical",
            plays: 13,
            color: "#22D3EE",
            // Center roughly at 480, 150
            blob: "M 430 140 C 440 100, 500 100, 530 130 C 560 160, 530 200, 480 200 C 440 200, 410 180, 430 140 Z",
            stars: [
                {x: 450, y: 140}, {x: 490, y: 120}, {x: 510, y: 160}, {x: 470, y: 170}
            ],
            connections: [
                [0, 1], [1, 2], [2, 3], [3, 0]
            ],
            labelPos: {x: 480, y: 100}
        },
        {
            id: "indie",
            name: "Indie/Alt",
            plays: 45,
            color: "#EC4899", // Pink
            // Center roughly at 400, 200
            blob: "M 340 200 C 350 170, 400 160, 430 190 C 450 220, 410 240, 370 240 C 330 240, 320 220, 340 200 Z",
            stars: [
                {x: 360, y: 200}, {x: 390, y: 180}, {x: 420, y: 210}, {x: 380, y: 220}
            ],
            connections: [
                [0, 1], [1, 2], [2, 3], [3, 0]
            ],
            labelPos: {x: 390, y: 245}
        }
    ];

    return (
        <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-3xl p-5 flex flex-col relative overflow-hidden h-full">
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">
                        SONIC GENRE TOPOLOGY
                    </h3>
                    <p className="text-[11px] text-[var(--theme-text-muted)] font-normal capitalize tracking-normal mt-0.5">
                        (Last Year)
                    </p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] hover:border-[var(--theme-accent)]/30 transition-all z-10">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span className="text-[10px] text-white">Calendar</span>
                </button>
            </div>

            {/* SVG Constellation Graph */}
            <div className="flex-1 w-full h-full relative -mt-4">
                <svg viewBox="0 0 600 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {constellations.map(c => (
                            <radialGradient id={`glow-${c.id}`} key={`glow-${c.id}`}>
                                <stop offset="0%" stopColor={c.color} stopOpacity="1" />
                                <stop offset="100%" stopColor={c.color} stopOpacity="0" />
                            </radialGradient>
                        ))}
                    </defs>

                    {/* Render Blobs */}
                    {constellations.map(c => (
                        <path 
                            key={`blob-${c.id}`}
                            d={c.blob}
                            fill={c.color}
                            fillOpacity="0.1"
                            stroke={c.color}
                            strokeWidth="2"
                            strokeOpacity="0.5"
                        />
                    ))}

                    {/* Render Connections */}
                    {constellations.map(c => (
                        <g key={`conns-${c.id}`}>
                            {c.connections.map((conn, idx) => {
                                const p1 = c.stars[conn[0]];
                                const p2 = c.stars[conn[1]];
                                return (
                                    <line 
                                        key={`conn-${c.id}-${idx}`}
                                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                        stroke={c.color}
                                        strokeWidth="1.5"
                                        strokeOpacity="0.6"
                                    />
                                );
                            })}
                        </g>
                    ))}

                    {/* Render Stars */}
                    {constellations.map(c => (
                        <g key={`stars-${c.id}`}>
                            {c.stars.map((star, idx) => (
                                <g key={`star-${c.id}-${idx}`}>
                                    {/* Outer glow */}
                                    <circle cx={star.x} cy={star.y} r="8" fill={`url(#glow-${c.id})`} opacity="0.6" />
                                    {/* Inner bright star */}
                                    <circle cx={star.x} cy={star.y} r="2.5" fill="#fff" />
                                </g>
                            ))}
                        </g>
                    ))}

                    {/* Render Labels */}
                    {constellations.map(c => (
                        <g key={`label-${c.id}`} transform={`translate(${c.labelPos.x}, ${c.labelPos.y})`} className="opacity-90">
                            <text x="0" y="0" fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">{c.name}</text>
                            <text x="0" y="14" fill="var(--theme-text-muted)" fontSize="10" textAnchor="middle">{c.plays} plays</text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Total Label */}
            <div className="absolute bottom-5 right-5 flex flex-col items-end z-10 bg-[var(--theme-panel)]/80 px-3 py-1.5 rounded-xl backdrop-blur-md border border-[var(--theme-border)]">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-bold">Total</span>
                <span className="text-2xl font-black text-white leading-none">146</span>
            </div>
        </div>
    );
}
