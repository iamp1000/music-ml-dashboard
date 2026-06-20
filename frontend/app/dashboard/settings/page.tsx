"use client";

import React, { useState, useEffect } from "react";
import { Key, Save, Database, Server, Loader2, CheckCircle2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // We get the user id from local storage profile data
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data && data.data.id) {
                        setUserId(data.data.id);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // DeepSeek API configuration is now handled automatically by the server-side environment.
    const handleSave = async () => {
        // No-op for now
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
            {/* Page Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">Engine Settings</h2>
                <p className="text-sm text-theme-text-muted mt-1">Configure your LLM providers and background processing variables.</p>
            </div>

            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#1B2332]/50">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Server className="w-5 h-5 text-theme-accent" />
                        Machine Learning Pipeline
                    </h3>
                    <p className="text-xs text-theme-text-muted mt-2">
                        Advanced psychological telemetry (valence, energy, lyrical analysis, and mood) is now processed automatically by our server-side secure ML pipeline. You no longer need to provide your own API key.
                    </p>
                </div>
                </div>
            </div>

            <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-theme-accent" />
                    Batch Processing Status
                </h3>
                <p className="text-xs text-theme-text-muted mb-4">
                    The Celery background worker runs automatically every 2 minutes. It will only consume your API key if you have accumulated at least 10 unanalyzed tracks to optimize memory and API costs.
                </p>
                <div className="bg-[#070A0F] border border-[#1B2332] p-4 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-text-muted uppercase">Worker Status</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-md uppercase tracking-wider">Active</span>
                </div>
            </div>
        </div>
    );
}
