"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Settings, Database, Activity, Moon, Palette, Trash2, Power } from "lucide-react";

export default function SettingsPage() {
    // Fake local states for demonstration
    const [mlEnabled, setMlEnabled] = useState(true);
    const [appSleep, setAppSleep] = useState(false);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 overflow-y-auto py-8">
            <GlassCard title="10. Application Settings" icon={<Settings className="w-5 h-5"/>} className="w-full max-w-4xl min-h-[70vh] flex flex-col">
                <div className="flex flex-col h-full flex-1 gap-8 mt-6">
                    
                    {/* UI & Theme Settings */}
                    <section className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-theme-border/50 pb-4">
                            <Palette className="w-5 h-5 text-theme-accent" />
                            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">UI & Theme Engine</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-xl border border-theme-border/30 hover:border-theme-accent/50 cursor-pointer transition-colors bg-gradient-to-br from-emerald-900/20 to-black relative overflow-hidden group">
                                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                <h4 className="font-bold mb-1">Forest Gold (Active)</h4>
                                <p className="text-xs text-theme-text-muted">Deep greens and premium gold accents.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-theme-border/30 hover:border-blue-500/50 cursor-pointer transition-colors bg-gradient-to-br from-blue-900/20 to-black opacity-50 hover:opacity-100">
                                <h4 className="font-bold mb-1 text-gray-300">Cyber Blue</h4>
                                <p className="text-xs text-gray-500">Neon blues and deep purple dark mode.</p>
                            </div>
                        </div>
                    </section>

                    {/* Machine Learning & Telemetry */}
                    <section className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-theme-border/50 pb-4">
                            <Activity className="w-5 h-5 text-theme-chart-2" />
                            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">Telemetry & Machine Learning</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm">Background ML Analysis</h4>
                                    <p className="text-xs text-theme-text-muted mt-1 max-w-md">Continually fetch lyric sentiment (VADER) and audio features to construct predictive mood models.</p>
                                </div>
                                <button 
                                    onClick={() => setMlEnabled(!mlEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mlEnabled ? 'bg-theme-accent' : 'bg-zinc-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mlEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Moon className="w-4 h-4 text-theme-chart-3" />
                                        <h4 className="font-bold text-sm">App Sleep Mode</h4>
                                    </div>
                                    <p className="text-xs text-theme-text-muted mt-1 max-w-md">Suspend all background Celery polling and websocket live-sync to save memory and API limits.</p>
                                </div>
                                <button 
                                    onClick={() => setAppSleep(!appSleep)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${appSleep ? 'bg-theme-chart-3' : 'bg-zinc-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appSleep ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Database Management */}
                    <section className="bg-theme-bg/30 border border-theme-border/50 rounded-2xl p-6 border-red-500/20">
                        <div className="flex items-center gap-3 mb-6 border-b border-theme-border/50 pb-4">
                            <Database className="w-5 h-5 text-red-400" />
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Database Management</h3>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-4 bg-red-950/20 rounded-xl border border-red-900/30">
                                <div>
                                    <h4 className="font-bold text-sm text-red-200">Purge Telemetry History</h4>
                                    <p className="text-xs text-red-400/60 mt-1">Permanently deletes all Firestore listening history. Cannot be undone.</p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors">
                                    <Trash2 className="w-4 h-4" /> Purge History
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                                <div>
                                    <h4 className="font-bold text-sm">Disconnect Spotify Account</h4>
                                    <p className="text-xs text-zinc-500 mt-1">Revokes the token and logs you out completely.</p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors">
                                    <Power className="w-4 h-4" /> Disconnect
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </GlassCard>
        </div>
    );
}
