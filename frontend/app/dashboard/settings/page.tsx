"use client";

import React, { useState, useEffect } from "react";
import { Key, Save, Database, Server, Loader2, CheckCircle2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // We get the user id from local storage profile data
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem("jwt");
                if (!token) return;
                
                const res = await fetch("https://music-ml-server.onrender.com/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data && data.data.id) {
                        const uid = data.data.id;
                        setUserId(uid);
                        
                        // Fetch existing settings
                        const docRef = doc(db, "users", uid, "settings", "ml_config");
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists() && docSnap.data().deepseek_api_key) {
                            setApiKey(docSnap.data().deepseek_api_key);
                        }
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

    const handleSave = async () => {
        if (!userId) return;
        
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const docRef = doc(db, "users", userId, "settings", "ml_config");
            await setDoc(docRef, {
                deepseek_api_key: apiKey,
                updated_at: new Date().toISOString()
            }, { merge: true });
            
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Error saving API key:", err);
            alert("Failed to save API key. Make sure you are authenticated.");
        } finally {
            setIsSaving(false);
        }
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
                        To compute advanced psychological telemetry (valence, energy, lyrical analysis, and mood), the system processes your listening history in batches through an LLM. You must provide your own API key.
                    </p>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <label className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-theme-text-muted" />
                            DeepSeek API Key
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                disabled={isLoading}
                                className="w-full bg-[#070A0F] border border-[#1B2332] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-theme-accent transition-colors placeholder:text-gray-700 disabled:opacity-50"
                            />
                        </div>
                        <p className="text-[10px] text-theme-text-muted mt-2">
                            Used exclusively for processing track lyrics in batches of 10-20 songs. Keys are saved securely to your personal Firebase document.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isLoading || isSaving}
                            className="bg-theme-accent text-black font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Configuration
                        </button>
                        
                        {saveSuccess && (
                            <span className="text-green-500 text-xs flex items-center gap-1 animate-in fade-in">
                                <CheckCircle2 className="w-4 h-4" />
                                Saved successfully
                            </span>
                        )}
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
