"use client";

import React, { useMemo } from "react";
import { Sunrise, Sun, Moon, Bird } from "lucide-react";

export default function CircadianFlux({ history = [] }: { history?: any[] }) {
    // Process real data into the 4 buckets
    const processedData = useMemo(() => {
        const buckets = {
            morning: { count: 0, valSum: 0 },
            afternoon: { count: 0, valSum: 0 },
            evening: { count: 0, valSum: 0 },
            night: { count: 0, valSum: 0 }
        };

        (history || []).forEach(track => {
            if (!track.time) return;
            const hour = new Date(track.time).getHours();
            let bucket = "";
            if (hour >= 6 && hour < 12) bucket = "morning";
            else if (hour >= 12 && hour < 18) bucket = "afternoon";
            else if (hour >= 18 && hour <= 23) bucket = "evening";
            else bucket = "night";

            // @ts-ignore
            buckets[bucket].count += 1;
            // @ts-ignore
            buckets[bucket].valSum += (track.valence ?? 0.5);
        });

        const getBadge = (val: number) => {
            if (val > 0.7) return "Uplifting / Bright";
            if (val < 0.3) return "Somber / Dark";
            return "Neutral / Balanced";
        };

        return [
            {
                id: "morning",
                label: "Morning",
                time: "(6AM-12PM)",
                plays: buckets.morning.count,
                valence: buckets.morning.count > 0 ? Math.round((buckets.morning.valSum / buckets.morning.count) * 100) + "%" : "0%",
                badge: buckets.morning.count > 0 ? getBadge(buckets.morning.valSum / buckets.morning.count) : "No Data",
                color: "#FCD34D", 
                icon: Sunrise,
                sparkline: "M 0 10 L 10 12 L 20 8 L 30 10 L 40 5",
                lineY: 40 
            },
            {
                id: "afternoon",
                label: "Afternoon",
                time: "(12PM-6PM)",
                plays: buckets.afternoon.count,
                valence: buckets.afternoon.count > 0 ? Math.round((buckets.afternoon.valSum / buckets.afternoon.count) * 100) + "%" : "0%",
                badge: buckets.afternoon.count > 0 ? getBadge(buckets.afternoon.valSum / buckets.afternoon.count) : "No Data",
                color: "#FDBA74", 
                icon: Sun,
                sparkline: "M 0 15 L 10 12 L 20 18 L 30 5 L 40 2",
                lineY: 105
            },
            {
                id: "evening",
                label: "Evening",
                time: "(6PM-12AM)",
                plays: buckets.evening.count,
                valence: buckets.evening.count > 0 ? Math.round((buckets.evening.valSum / buckets.evening.count) * 100) + "%" : "0%",
                badge: buckets.evening.count > 0 ? getBadge(buckets.evening.valSum / buckets.evening.count) : "No Data",
                color: "#67E8F9", 
                icon: Moon,
                sparkline: "M 0 10 L 10 5 L 20 15 L 30 2 L 40 8",
                lineY: 170
            },
            {
                id: "night",
                label: "Night",
                time: "(12AM-6AM)",
                plays: buckets.night.count,
                valence: buckets.night.count > 0 ? Math.round((buckets.night.valSum / buckets.night.count) * 100) + "%" : "0%",
                badge: buckets.night.count > 0 ? getBadge(buckets.night.valSum / buckets.night.count) : "No Data",
                color: "#38BDF8", 
                icon: Bird, 
                sparkline: "M 0 5 L 10 10 L 20 8 L 30 15 L 40 12",
                lineY: 235
            }
        ];
    }, [history]);

    return (
        <div className="bg-[#1A1C23] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden h-full">
            
            {/* Header */}
            <div className="flex items-start z-10 mb-6 relative">
                <div className="w-1 h-10 bg-cyan-600 rounded-full mr-3 absolute -left-1 top-1"></div>
                <div className="flex flex-col ml-3">
                    <h3 className="text-[16px] font-bold text-[#FCD34D] tracking-wide">
                        CIRCADIAN FLUX
                    </h3>
                    <p className="text-[14px] text-gray-300 font-normal mt-0.5">
                        Energy Flux Over Time
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex relative w-full h-full">
                
                {/* Left: SVG Radial Chart */}
                <div className="absolute left-[-20%] top-0 bottom-0 w-[50%] h-full flex items-center justify-center pointer-events-none">
                    <svg viewBox="0 0 200 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="glow-flux" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="8" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Radar grid lines */}
                        <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" fill="none">
                            <circle cx="20" cy="150" r="40" />
                            <circle cx="20" cy="150" r="80" />
                            <circle cx="20" cy="150" r="120" />
                            <circle cx="20" cy="150" r="160" />
                        </g>
                        
                        {/* Center core */}
                        <circle cx="20" cy="150" r="20" fill="#ffffff" fillOpacity="0.1" />
                        <circle cx="20" cy="150" r="30" fill="#ffffff" fillOpacity="0.05" />

                        {/* Organic Radial Segments */}
                        {/* Morning */}
                        <path d="M 20 110 A 40 40 0 0 1 50 120 L 100 50 A 120 120 0 0 0 20 30 Z" fill="#FCD34D" fillOpacity="0.3" stroke="#FCD34D" strokeWidth="2" strokeOpacity="0.8" filter="url(#glow-flux)" />
                        {/* Afternoon */}
                        <path d="M 50 120 A 40 40 0 0 1 60 150 L 140 150 A 120 120 0 0 0 100 50 Z" fill="#FDBA74" fillOpacity="0.25" stroke="#FDBA74" strokeWidth="2" strokeOpacity="0.8" filter="url(#glow-flux)" />
                        {/* Evening */}
                        <path d="M 60 150 A 40 40 0 0 1 45 180 L 110 230 A 120 120 0 0 0 140 150 Z" fill="#67E8F9" fillOpacity="0.25" stroke="#67E8F9" strokeWidth="2" strokeOpacity="0.8" filter="url(#glow-flux)" />
                        {/* Night */}
                        <path d="M 45 180 A 40 40 0 0 1 20 190 L 20 270 A 120 120 0 0 0 110 230 Z" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="2" strokeOpacity="0.6" filter="url(#glow-flux)" />

                        {/* Icons placed within segments */}
                        <g stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.8">
                            <path d="M60 80 A10 10 0 0 1 80 80 M55 85 L85 85 M70 65 L70 70 M60 70 L63 73 M80 70 L77 73" />
                            <circle cx="105" cy="120" r="8" />
                            <path d="M105 105 L105 108 M105 132 L105 135 M90 120 L93 120 M117 120 L120 120 M95 110 L97 112 M113 128 L115 130 M115 110 L113 112 M97 128 L95 130" />
                            <path d="M95 190 A12 12 0 0 0 105 175 A14 14 0 0 1 105 200 A12 12 0 0 0 95 190 Z" />
                            <path d="M115 175 L117 180 L122 182 L117 184 L115 189 L113 184 L108 182 L113 180 Z" fill="#ffffff" strokeWidth="0" />
                            <path d="M60 220 C60 210, 75 210, 75 220 L75 230 C75 240, 60 240, 60 230 Z" />
                            <circle cx="64" cy="223" r="2" />
                            <circle cx="71" cy="223" r="2" />
                            <path d="M67 225 L67 228" />
                        </g>

                        {/* Connection lines from chart to data rows */}
                        <g stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" fill="none">
                            <line x1="85" y1="75" x2="160" y2="75" />
                            <circle cx="160" cy="75" r="3" fill="#FCD34D" stroke="none" />

                            <line x1="125" y1="125" x2="160" y2="125" />
                            <circle cx="160" cy="125" r="3" fill="#FDBA74" stroke="none" />

                            <line x1="110" y1="185" x2="160" y2="185" />
                            <circle cx="160" cy="185" r="3" fill="#67E8F9" stroke="none" />

                            <line x1="75" y1="230" x2="160" y2="230" />
                            <circle cx="160" cy="230" r="3" fill="#38BDF8" stroke="none" />
                        </g>
                    </svg>
                </div>

                {/* Right: Data Rows */}
                <div className="ml-[40%] w-[60%] flex flex-col justify-between py-2 z-10 h-full">
                    {processedData.map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between w-full relative">
                            {/* Text Info */}
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[15px] text-white font-medium">{item.label}</span>
                                    <span className="text-[12px] text-gray-400">{item.time}</span>
                                </div>
                                <div className="mt-1 px-2.5 py-1 bg-white/5 rounded-md border border-white/5 w-fit">
                                    <span className="text-[11px] text-gray-400">{item.badge}</span>
                                </div>
                            </div>
                            
                            {/* Valence Stat */}
                            <div className="flex flex-col items-center justify-center min-w-[50px]">
                                <span className="text-[18px] font-bold" style={{ color: item.color }}>{item.valence}</span>
                                <span className="text-[11px] text-gray-400">valence</span>
                            </div>

                            <div className="w-[1px] h-10 bg-white/10 mx-2"></div>

                            {/* Plays Stat */}
                            <div className="flex flex-col items-center justify-center min-w-[40px] relative">
                                <svg width="40" height="20" className="absolute -top-3 right-0 opacity-50">
                                    <path d={item.sparkline} fill="none" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="text-[18px] font-bold text-white leading-none mt-2">{item.plays}</span>
                                <span className="text-[11px] text-gray-400 mt-1">plays</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
