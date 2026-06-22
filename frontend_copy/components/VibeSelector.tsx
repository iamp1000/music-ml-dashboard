"use client";

import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";

const VIBES = ["None", "Gym", "Driving", "Study", "Chill", "Party", "Work", "Commute"];

export default function VibeSelector() {
    const [currentVibe, setCurrentVibe] = useState("None");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchVibe = async () => {
            const token = localStorage.getItem("jwt");
            if (!token) return;
            try {
                const res = await fetch(`https://music-ml-dashboard.onrender.com/api/context?token=${token}`);
                const data = await res.json();
                if (data.status === "success" && data.context) {
                    setCurrentVibe(data.context);
                }
            } catch (e) {
                console.error("Failed to fetch context", e);
            }
        };
        fetchVibe();
    }, []);

    // Whenever vibe changes, update the backend
    const updateVibe = async (vibe: string) => {
        setIsUpdating(true);
        setCurrentVibe(vibe);
        const token = localStorage.getItem("jwt");
        if (token) {
            try {
                await fetch(`https://music-ml-dashboard.onrender.com/api/context?token=${token}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ context: vibe })
                });
            } catch (e) {
                console.error("Failed to update context", e);
            }
        }
        setIsUpdating(false);
    };

    return (
        <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-4 w-full">
            <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-theme-accent" />
                <h3 className="text-sm font-bold text-white">Current Context</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {VIBES.map((vibe) => (
                    <button
                        key={vibe}
                        onClick={() => updateVibe(vibe)}
                        disabled={isUpdating}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                            currentVibe === vibe 
                                ? "bg-theme-accent text-black border-theme-accent" 
                                : "bg-[#131823] text-gray-400 border-[#1B2332] hover:border-theme-accent/50 hover:text-white"
                        }`}
                    >
                        {vibe}
                    </button>
                ))}
                
                <div className="flex items-center gap-2 ml-auto relative">
                    <input 
                        list="vibe-suggestions"
                        type="text"
                        placeholder="Type custom context..."
                        className="bg-[#131823] border border-[#1B2332] text-xs px-3 py-1.5 rounded-full text-white outline-none focus:border-theme-accent transition-colors w-36"
                        disabled={isUpdating}
                        onBlur={(e) => {
                            const custom = e.target.value.trim();
                            if (custom && custom !== currentVibe) updateVibe(custom);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const custom = e.currentTarget.value.trim();
                                if (custom && custom !== currentVibe) {
                                    updateVibe(custom);
                                    e.currentTarget.blur();
                                }
                            }
                        }}
                    />
                    <datalist id="vibe-suggestions">
                        {VIBES.filter(v => v !== "None").map(v => <option key={v} value={v} />)}
                    </datalist>
                </div>
            </div>
            {currentVibe && !VIBES.includes(currentVibe) && currentVibe !== "None" && (
                <div className="mt-3 text-xs text-theme-accent">
                    Active Custom Context: <span className="font-bold">{currentVibe}</span>
                </div>
            )}
        </div>
    );
}
