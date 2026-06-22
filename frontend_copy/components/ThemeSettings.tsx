"use client";

import React, { useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import { Palette, X, Plus, Trash2 } from 'lucide-react';
import { cn } from './GlassCard';

export function ThemeSettings() {
    const { theme, setTheme, gradientColors, setGradientColors } = useThemeStore();
    const [open, setOpen] = useState(false);

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
        <div className="fixed bottom-6 right-6 z-50">
            <button 
                onClick={() => setOpen(!open)}
                className="p-3 bg-theme-panel border border-theme-border rounded-full shadow-2xl hover:border-theme-accent transition-colors group"
            >
                <Palette className="w-6 h-6 text-theme-text-muted group-hover:text-theme-accent transition-colors" />
            </button>

            {open && (
                <div className="absolute bottom-16 right-0 w-80 bg-theme-panel backdrop-blur-xl border border-theme-border p-5 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-6 border-b border-theme-border pb-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Theme & Aesthetics</h4>
                        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-4 h-4 text-theme-text-muted hover:text-white" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setTheme('theme-olive')}
                            className={cn(
                                "w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                                theme === 'theme-olive' ? "bg-theme-bg/50 border-theme-accent shadow-[0_0_15px_rgba(34,197,94,0.15)]" : "border-theme-border/50 hover:bg-theme-bg/50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#1a201b] border-2 border-[#86A789] shrink-0"></div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold text-white">Olive Green</span>
                                <span className="text-[10px] text-theme-text-muted uppercase">Default Solid</span>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setTheme('theme-cyan')}
                            className={cn(
                                "w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                                theme === 'theme-cyan' ? "bg-theme-bg/50 border-theme-accent shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-theme-border/50 hover:bg-theme-bg/50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-full bg-[#0f172a] border-2 border-[#06b6d4] shrink-0"></div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold text-white">Dark Cyan</span>
                                <span className="text-[10px] text-theme-text-muted uppercase">Solid Accent</span>
                            </div>
                        </button>

                        <div className="pt-2">
                            <button 
                                onClick={() => setTheme('theme-glass')}
                                className={cn(
                                    "w-full flex flex-col gap-4 p-4 rounded-xl border transition-all duration-300",
                                    theme === 'theme-glass' ? "bg-theme-bg/50 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-theme-border/50 hover:bg-theme-bg/50"
                                )}
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
                                    <div className="w-full space-y-3 pt-3 border-t border-theme-border/50" onClick={(e) => e.stopPropagation()}>
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
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
