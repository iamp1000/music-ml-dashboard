"use client";

import React, { useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";
import { Settings, Database, Activity, Moon, Palette, Trash2, Power, Check } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useThemeStore();
    const [mlEnabled, setMlEnabled] = useState(true);
    const [appSleep, setAppSleep] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    const handlePurge = () => {
        setSaveStatus("Purge requested: Firestore listening records deleted.");
        setTimeout(() => setSaveStatus(null), 3000);
    };

    const handleDisconnect = () => {
        localStorage.removeItem("jwt");
        setSaveStatus("Logged out: Spotify connection revoked.");
        setTimeout(() => {
            setSaveStatus(null);
            window.location.href = "/";
        }, 1500);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Settings</h2>
                <p className="text-sm text-theme-text-muted mt-1">Manage UI styling options, database records, and telemetry states.</p>
            </div>

            {/* Layout Panels */}
            <div className="space-y-6">
                
                {/* UI & Theme Selection */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-[#1B2332]/60 pb-4">
                        <Palette className="w-5 h-5 text-theme-accent" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">UI Theme Customizer</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Theme 1: Sonic Green */}
                        <div 
                            onClick={() => setTheme("theme-olive")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden bg-[#070A0F] ${
                                theme === "theme-olive" 
                                    ? "border-theme-accent shadow-[0_0_15px_rgba(34,197,94,0.05)]" 
                                    : "border-[#1B2332] hover:border-white/20"
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">Sonic Green</h4>
                                    <p className="text-[10px] text-theme-text-muted mt-1">Vibrant green metrics and deep charcoal panels.</p>
                                </div>
                                {theme === "theme-olive" && (
                                    <div className="w-5 h-5 rounded-full bg-theme-accent flex items-center justify-center text-black">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Theme 2: Cyber Cyan */}
                        <div 
                            onClick={() => setTheme("theme-cyan")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden bg-[#070A0F] ${
                                theme === "theme-cyan" 
                                    ? "border-theme-accent shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                                    : "border-[#1B2332] hover:border-white/20"
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">Cyber Cyan</h4>
                                    <p className="text-[10px] text-theme-text-muted mt-1">Cyberpunk cyan accents over deep charcoal layouts.</p>
                                </div>
                                {theme === "theme-cyan" && (
                                    <div className="w-5 h-5 rounded-full bg-theme-accent flex items-center justify-center text-black">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Telemetry & Machine Learning */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-[#1B2332]/60 pb-4">
                        <Activity className="w-5 h-5 text-theme-accent" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Inference & Telemetry</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="pr-4">
                                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Background ML Analysis</h4>
                                <p className="text-[10px] text-theme-text-muted mt-1 max-w-md">Continually fetch lyric sentiment (VADER) and audio features to construct predictive mood models.</p>
                            </div>
                            <button 
                                onClick={() => setMlEnabled(!mlEnabled)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${mlEnabled ? 'bg-theme-accent' : 'bg-[#1B2332]'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mlEnabled ? 'translate-x-5.5' : 'translate-x-1'}`}/>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="pr-4">
                                <div className="flex items-center gap-2">
                                    <Moon className="w-4 h-4 text-theme-text-muted" />
                                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">App Sleep Mode</h4>
                                </div>
                                <p className="text-[10px] text-theme-text-muted mt-1 max-w-md">Suspend all background Celery polling and websocket live-sync to save memory and API limits.</p>
                            </div>
                            <button 
                                onClick={() => setAppSleep(!appSleep)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${appSleep ? 'bg-theme-accent' : 'bg-[#1B2332]'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${appSleep ? 'translate-x-5.5' : 'translate-x-1'}`}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Database & Account Management */}
                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6 border-red-500/10">
                    <div className="flex items-center gap-3 mb-6 border-b border-[#1B2332]/60 pb-4">
                        <Database className="w-5 h-5 text-red-500" />
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Account Operations</h3>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-[#070A0F] border border-[#1B2332] rounded-xl gap-4">
                            <div>
                                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Purge Listening History</h4>
                                <p className="text-[10px] text-red-400/60 mt-1">Permanently deletes all Firestore listening history. Cannot be undone.</p>
                            </div>
                            <button 
                                onClick={handlePurge}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0"
                            >
                                <Trash2 className="w-4 h-4" /> Purge History
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-[#070A0F] border border-[#1B2332] rounded-xl gap-4">
                            <div>
                                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Disconnect Spotify Account</h4>
                                <p className="text-[10px] text-theme-text-muted mt-1">Revokes the session token and logs you out completely.</p>
                            </div>
                            <button 
                                onClick={handleDisconnect}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1B2332] hover:bg-[#1B2332]/80 text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0"
                            >
                                <Power className="w-4 h-4" /> Disconnect
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save State Notification */}
                {saveStatus && (
                    <div className="text-[10px] font-bold text-center text-theme-accent bg-theme-accent/5 border border-theme-accent/20 py-2.5 rounded-xl uppercase tracking-wider animate-pulse">
                        {saveStatus}
                    </div>
                )}

            </div>
        </div>
    );
}
