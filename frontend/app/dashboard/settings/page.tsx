"use client";

import React from "react";
import { Palette, Plus, Trash2 } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";

export default function SettingsPage() {
    const { theme, setTheme, gradientColors, setGradientColors } = useThemeStore();

    const handleColorChange = (index: number, newColor: string) => {
        const newColors = [...gradientColors];
        newColors[index] = newColor;
        setGradientColors(newColors);
    };

    const addColor = () => {
        if (gradientColors.length < 3) {
            setGradientColors([...gradientColors, '#000000']);
        }
    };

    const removeColor = (index: number) => {
        if (gradientColors.length > 2) {
            const newColors = gradientColors.filter((_, i) => i !== index);
            setGradientColors(newColors);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
            {/* Page Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-sm font-medium text-[var(--theme-text-muted)] mt-2">Configure your dashboard preferences.</p>
            </div>

            {/* Theme & Aesthetics Settings */}
            <div className="bg-white/5 border border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden mt-6">
                <div className="p-8 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                        <Palette className="w-5 h-5 text-[var(--theme-accent)]" />
                        Theme & Aesthetics
                    </h3>
                    <p className="text-sm font-medium text-[var(--theme-text-muted)] mt-3">
                        Customize the visual appearance of your dashboard. Your choices are saved in your browser and will persist across sessions.
                    </p>
                </div>
                
                <div className="p-8 space-y-4 max-w-xl">
                    <button 
                        onClick={() => setTheme('theme-olive')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                            theme === 'theme-olive' ? "bg-white/10 border-green-500 shadow-sm" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                        }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-[#1a201b] border-2 border-[#86A789] shrink-0"></div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-semibold text-white">Olive Green</span>
                            <span className="text-xs font-medium text-[var(--theme-text-muted)]">Default Solid</span>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setTheme('theme-cyan')}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                            theme === 'theme-cyan' ? "bg-white/10 border-cyan-500 shadow-sm" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                        }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-[#0f172a] border-2 border-[#06b6d4] shrink-0"></div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-semibold text-white">Dark Cyan</span>
                            <span className="text-xs font-medium text-[var(--theme-text-muted)]">Solid Accent</span>
                        </div>
                    </button>

                    <div className="pt-2">
                        <div 
                            onClick={() => setTheme('theme-glass')}
                            className={`w-full flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                theme === 'theme-glass' ? "bg-white/10 border-white/30 shadow-md" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                            }`}
                        >
                            <div className="flex items-center gap-4 w-full">
                                <div 
                                    className="w-10 h-10 rounded-full border-2 border-white/50 shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${gradientColors.join(', ')})` }}
                                ></div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-semibold text-white">Glassmorphism</span>
                                    <span className="text-xs font-medium text-[var(--theme-text-muted)]">Custom Gradient Setup</span>
                                </div>
                            </div>

                            {theme === 'theme-glass' && (
                                <div className="w-full space-y-4 pt-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                                    <p className="text-xs font-semibold text-[var(--theme-text-muted)] text-left">Custom Gradient Colors (2-3)</p>
                                    <div className="flex flex-col gap-3">
                                        {gradientColors.map((color, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <input 
                                                    type="color" 
                                                    value={color}
                                                    onChange={(e) => handleColorChange(idx, e.target.value)}
                                                    className="w-10 h-10 p-0 border border-white/20 rounded-lg cursor-pointer bg-transparent shadow-sm"
                                                />
                                                <div className="text-sm font-mono font-medium text-[var(--theme-text-muted)] uppercase flex-1 text-left bg-black/20 px-3 py-2 rounded-lg border border-white/5">{color}</div>
                                                
                                                {gradientColors.length > 2 && (
                                                    <button 
                                                        onClick={() => removeColor(idx)}
                                                        className="p-2.5 hover:bg-rose-500/20 bg-black/20 border border-white/5 text-rose-400 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {gradientColors.length < 3 && (
                                        <button 
                                            onClick={addColor}
                                            className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Color
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
