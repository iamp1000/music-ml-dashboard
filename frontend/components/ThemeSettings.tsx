"use client";

import React, { useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import { Palette, X } from 'lucide-react';
import { cn } from './GlassCard';

export function ThemeSettings() {
    const { theme, setTheme } = useThemeStore();
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <button 
                onClick={() => setOpen(!open)}
                className="p-3 bg-theme-panel border border-theme-border rounded-full shadow-2xl hover:border-theme-accent transition-colors group"
            >
                <Palette className="w-6 h-6 text-theme-text-muted group-hover:text-theme-accent transition-colors" />
            </button>

            {open && (
                <div className="absolute bottom-16 right-0 w-64 bg-theme-panel backdrop-blur-xl border border-theme-border p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-theme-text">Dashboard Theme</h4>
                        <button onClick={() => setOpen(false)}>
                            <X className="w-4 h-4 text-theme-text-muted hover:text-white" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={() => setTheme('theme-olive')}
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg border transition-colors",
                                theme === 'theme-olive' ? "bg-theme-bg border-theme-accent" : "border-transparent hover:bg-theme-bg/50"
                            )}
                        >
                            <div className="w-6 h-6 rounded-full bg-[#1a201b] border border-[#86A789]"></div>
                            <span className="text-sm">Olive Green</span>
                        </button>
                        
                        <button 
                            onClick={() => setTheme('theme-cyan')}
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg border transition-colors",
                                theme === 'theme-cyan' ? "bg-theme-bg border-theme-accent" : "border-transparent hover:bg-theme-bg/50"
                            )}
                        >
                            <div className="w-6 h-6 rounded-full bg-[#0f172a] border border-[#06b6d4]"></div>
                            <span className="text-sm">Dark Cyan</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
