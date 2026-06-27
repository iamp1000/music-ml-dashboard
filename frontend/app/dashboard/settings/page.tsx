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
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Settings</h2>
                <p className="text-sm text-theme-text-muted mt-1">Configure your dashboard preferences.</p>
            </div>

            {/* Theme & Aesthetics Settings */}
            <div className="bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-2xl overflow-hidden mt-6">
                <div className="p-6 border-b border-[var(--theme-border)]">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Palette className="w-5 h-5 text-theme-accent" />
                        Theme & Aesthetics
                    </h3>
                    <p className="text-xs text-theme-text-muted mt-2">
                        Customize the visual appearance of your dashboard. Your choices are saved in your browser and will persist across sessions.
                    </p>
                </div>
                
                <div className="p-6 space-y-4 max-w-md">
                    <button 
                        onClick={() => setTheme('theme-olive')}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                            theme === 'theme-olive' ? "bg-[var(--theme-bg)]/50 border-[var(--theme-accent)] shadow-[0_0_15px_rgba(34,197,94,0.15)]" : "border-[var(--theme-border)]/50 hover:bg-[var(--theme-bg)]/50"
                        }`}
                    >
                        <div className="w-8 h-8 rounded-full bg-[#1a201b] border-2 border-[#86A789] shrink-0"></div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-white">Olive Green</span>
                            <span className="text-[10px] text-theme-text-muted uppercase">Default Solid</span>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setTheme('theme-cyan')}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                            theme === 'theme-cyan' ? "bg-[var(--theme-bg)]/50 border-[var(--theme-accent)] shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-[var(--theme-border)]/50 hover:bg-[var(--theme-bg)]/50"
                        }`}
                    >
                        <div className="w-8 h-8 rounded-full bg-[#0f172a] border-2 border-[#06b6d4] shrink-0"></div>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-white">Dark Cyan</span>
                            <span className="text-[10px] text-theme-text-muted uppercase">Solid Accent</span>
                        </div>
                    </button>

                    <div className="pt-2">
                        <div 
                            onClick={() => setTheme('theme-glass')}
                            className={`w-full flex flex-col gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                                theme === 'theme-glass' ? "bg-[var(--theme-bg)]/50 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-[var(--theme-border)]/50 hover:bg-[var(--theme-bg)]/50"
                            }`}
                        >
                            <div className="flex items-center gap-4 w-full">
                                <div 
                                    className="w-8 h-8 rounded-full border-2 border-white/50 shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${gradientColors.join(', ')})` }}
                                ></div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold text-white">Glassmorphism</span>
                                    <span className="text-[10px] text-theme-text-muted uppercase">Custom Gradient Setup</span>
                                </div>
                            </div>

                            {theme === 'theme-glass' && (
                                <div className="w-full space-y-3 pt-3 border-t border-[var(--theme-border)]/50" onClick={(e) => e.stopPropagation()}>
                                    <p className="text-[10px] text-theme-text-muted text-left">Custom Gradient Colors (2-3)</p>
                                    <div className="flex flex-col gap-2">
                                        {gradientColors.map((color, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={color}
                                                    onChange={(e) => handleColorChange(idx, e.target.value)}
                                                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                                                />
                                                <div className="text-xs font-mono text-theme-text-muted uppercase flex-1 text-left">{color}</div>
                                                
                                                {gradientColors.length > 2 && (
                                                    <button 
                                                        onClick={() => removeColor(idx)}
                                                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {gradientColors.length < 3 && (
                                        <button 
                                            onClick={addColor}
                                            className="w-full flex items-center justify-center gap-2 py-2 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Add Color
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
