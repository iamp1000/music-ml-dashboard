"use client";

import React, { useState } from "react";
import { Activity } from "lucide-react";

const VIBES = ["None", "Gym", "Driving", "Study", "Chill", "Party", "Work", "Commute"];

export default function VibeSelector() {
    const [currentVibe, setCurrentVibe] = useState("None");
    const [isUpdating, setIsUpdating] = useState(false);

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
                
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const custom = formData.get("customVibe")?.toString().trim();
                        if (custom) updateVibe(custom);
                    }}
                    className="flex items-center gap-2 ml-auto"
                >
                    <input 
                        name="customVibe"
                        type="text"
                        placeholder="Custom context..."
                        className="bg-[#131823] border border-[#1B2332] text-xs px-3 py-1.5 rounded-full text-white outline-none focus:border-theme-accent transition-colors w-32"
                        disabled={isUpdating}
                    />
                    <button 
                        type="submit" 
                        disabled={isUpdating}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#1B2332] text-white hover:bg-theme-accent hover:text-black transition-colors"
                    >
                        Set
                    </button>
                </form>
            </div>
            {currentVibe && !VIBES.includes(currentVibe) && currentVibe !== "None" && (
                <div className="mt-3 text-xs text-theme-accent">
                    Active Custom Context: <span className="font-bold">{currentVibe}</span>
                </div>
            )}
        </div>
    );
}
