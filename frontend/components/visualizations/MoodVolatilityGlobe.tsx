"use client";
import React, { useEffect, useRef } from "react";
import anime from "animejs";

interface MoodVolatilityGlobeProps {
    volatility: {
        valence_std: number;
        energy_std: number;
        chaos_score: number;
    };
}

export default function MoodVolatilityGlobe({ volatility }: MoodVolatilityGlobeProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        if (!pathRef.current) return;

        // Base paths for morphing based on chaos score
        const smoothPath = "M 50,0 C 77.6,0 100,22.4 100,50 C 100,77.6 77.6,100 50,100 C 22.4,100 0,77.6 0,50 C 0,22.4 22.4,0 50,0 Z";
        const chaoticPath1 = "M 50,0 C 80,10 100,20 90,50 C 80,80 60,100 50,90 C 30,80 10,90 5,50 C 0,10 20,0 50,0 Z";
        const chaoticPath2 = "M 50,5 C 70,0 100,30 95,50 C 90,70 80,95 50,100 C 20,100 0,80 5,50 C 10,20 20,10 50,5 Z";
        const hyperChaos = "M 50,-10 C 90,0 110,40 85,60 C 60,80 90,110 50,90 C 10,70 -10,90 5,50 C 20,10 -10,-5 50,-10 Z";

        const chaosLevel = volatility.chaos_score;
        let animationDuration = 3000;
        let pathTargets = [smoothPath, chaoticPath1, smoothPath];
        let glowColor = "rgba(167, 139, 250, 0.5)"; // Purple default

        if (chaosLevel > 0.3) {
            animationDuration = 2000;
            pathTargets = [chaoticPath1, chaoticPath2, smoothPath, chaoticPath1];
            glowColor = "rgba(236, 72, 153, 0.6)"; // Pink
        }
        if (chaosLevel > 0.6) {
            animationDuration = 800;
            pathTargets = [hyperChaos, chaoticPath2, chaoticPath1, hyperChaos];
            glowColor = "rgba(239, 68, 68, 0.8)"; // Red
        }

        // Apply drop shadow glow dynamically
        if (svgRef.current) {
            svgRef.current.style.filter = `drop-shadow(0 0 20px ${glowColor})`;
        }

        anime({
            targets: pathRef.current,
            d: pathTargets,
            duration: animationDuration,
            easing: 'easeInOutSine',
            direction: 'alternate',
            loop: true
        });

    }, [volatility]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <svg
                ref={svgRef}
                viewBox="-20 -20 140 140"
                className="w-full h-full max-w-[200px] max-h-[200px]"
                style={{ transition: 'filter 1s ease' }}
            >
                <defs>
                    <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={volatility.chaos_score > 0.6 ? "#ef4444" : "#a855f7"} />
                        <stop offset="100%" stopColor={volatility.chaos_score > 0.6 ? "#b91c1c" : "#3b82f6"} />
                    </linearGradient>
                </defs>
                <path
                    ref={pathRef}
                    d="M 50,0 C 77.6,0 100,22.4 100,50 C 100,77.6 77.6,100 50,100 C 22.4,100 0,77.6 0,50 C 0,22.4 22.4,0 50,0 Z"
                    fill="url(#globeGrad)"
                    opacity="0.8"
                />
            </svg>
            <div className="absolute bottom-2 text-center">
                <p className="text-xl font-black text-white">{volatility.chaos_score.toFixed(2)}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Chaos Score</p>
            </div>
        </div>
    );
}
