"use client";
import React, { useEffect, useRef } from "react";
import anime from "animejs";

interface AttentionDecayHeatmapProps {
    data: {
        morning: number;
        afternoon: number;
        evening: number;
        night: number;
    };
}

export default function AttentionDecayHeatmap({ data }: AttentionDecayHeatmapProps) {
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gridRef.current) return;

        anime({
            targets: '.heatmap-bar',
            height: (el: HTMLElement) => {
                const val = parseFloat(el.dataset.val || "0");
                return `${Math.max(10, val * 100)}%`;
            },
            delay: anime.stagger(100),
            duration: 1500,
            easing: 'easeOutElastic(1, .8)'
        });
    }, [data]);

    const periods = [
        { label: "MRN", val: data.morning || 0.2 },
        { label: "AFT", val: data.afternoon || 0.8 },
        { label: "EVE", val: data.evening || 0.4 },
        { label: "NGT", val: data.night || 0.1 }
    ];

    return (
        <div className="relative w-full h-full flex flex-col justify-end p-4">
            <div ref={gridRef} className="flex items-end justify-between w-full h-32 gap-2 border-b border-[#1B2332] pb-2">
                {periods.map((p, i) => (
                    <div key={i} className="flex flex-col items-center justify-end h-full w-full gap-2">
                        <div 
                            className="heatmap-bar w-full bg-gradient-to-t from-theme-accent/20 to-theme-accent rounded-t-sm"
                            data-val={p.val}
                            style={{ height: '0%' }}
                        />
                        <span className="text-[10px] font-bold text-theme-text-muted">{p.label}</span>
                    </div>
                ))}
            </div>
            <div className="text-center mt-3">
                <p className="text-[10px] uppercase font-bold tracking-widest text-theme-text-muted">Attention Decay</p>
            </div>
        </div>
    );
}
