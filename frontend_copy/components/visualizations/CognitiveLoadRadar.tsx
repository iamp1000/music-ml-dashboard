"use client";
import React, { useEffect, useRef } from "react";
import anime from "animejs";

interface CognitiveLoadRadarProps {
    data: {
        average_complexity: number;
        overload_risk: boolean;
    };
}

export default function CognitiveLoadRadar({ data }: CognitiveLoadRadarProps) {
    const radarRef = useRef<SVGGElement>(null);
    const pulseRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
        if (!radarRef.current || !pulseRef.current) return;

        const isOverload = data.overload_risk;
        const speed = isOverload ? 800 : 3000;

        // Rotating radar
        anime({
            targets: radarRef.current,
            rotate: 360,
            duration: speed * 2,
            easing: 'linear',
            loop: true
        });

        // Pulsing background
        anime({
            targets: pulseRef.current,
            r: [30, 45],
            opacity: [0.6, 0],
            duration: speed,
            easing: 'easeOutExpo',
            loop: true
        });

    }, [data]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full max-w-[150px] max-h-[150px]">
                {/* Background circles */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1B2332" strokeWidth="1" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#1B2332" strokeWidth="1" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="#1B2332" strokeWidth="1" />
                
                {/* Pulse */}
                <circle 
                    ref={pulseRef} 
                    cx="50" cy="50" r="30" 
                    fill={data.overload_risk ? "rgba(239, 68, 68, 0.2)" : "rgba(167, 139, 250, 0.2)"} 
                />

                {/* Radar Sweep */}
                <g ref={radarRef} style={{ transformOrigin: '50px 50px' }}>
                    <path 
                        d="M 50,50 L 50,5 A 45,45 0 0,1 95,50 Z" 
                        fill={data.overload_risk ? "rgba(239, 68, 68, 0.4)" : "rgba(167, 139, 250, 0.4)"}
                    />
                    <line x1="50" y1="50" x2="50" y2="5" stroke={data.overload_risk ? "#ef4444" : "#a855f7"} strokeWidth="1" />
                </g>

                {/* Core */}
                <circle cx="50" cy="50" r="3" fill={data.overload_risk ? "#ef4444" : "#a855f7"} />
            </svg>
            <div className="absolute bottom-0 text-center bg-[#0A0D14]/80 px-2 rounded-md backdrop-blur-sm">
                <p className={`text-sm font-bold ${data.overload_risk ? 'text-red-400' : 'text-theme-accent'}`}>
                    {(data.average_complexity * 100).toFixed(0)}% Load
                </p>
                <p className="text-[9px] uppercase font-bold tracking-widest text-theme-text-muted">
                    {data.overload_risk ? "OVERLOAD RISK" : "COGNITIVE LOAD"}
                </p>
            </div>
        </div>
    );
}
