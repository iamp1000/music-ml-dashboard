"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithRateLimit } from "@/utils/api";
import { ArrowLeft, Clock, Activity, Music, Calendar, Loader2 } from "lucide-react";

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchHistory = async () => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        try {
            const data = await fetchWithRateLimit(`https://music-ml-dashboard.onrender.com/api/history?token=${token}&limit=100`);
            if (data && data.data) {
                setHistory(data.data);
                groupIntoSessions(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const groupIntoSessions = (historyData: any[]) => {
        if (historyData.length === 0) {
            setSessions([]);
            return;
        }
        
        const grouped = [];
        let currentSession = {
            id: historyData[0].id,
            startTime: new Date(historyData[0].time),
            endTime: new Date(historyData[0].time),
            context: historyData[0].context || "None",
            tracks: [historyData[0]]
        };
        
        for (let i = 1; i < historyData.length; i++) {
            const track = historyData[i];
            const trackTime = new Date(track.time);
            const prevTrackTime = new Date(historyData[i-1].time);
            
            // prevTrackTime is newer than trackTime. Calculate difference in minutes.
            const diffMinutes = (prevTrackTime.getTime() - trackTime.getTime()) / 60000;
            
            if (diffMinutes > 20) {
                // Time gap > 20 mins, finalize current session and start new
                grouped.push(currentSession);
                currentSession = {
                    id: track.id,
                    startTime: trackTime, // This will be updated to the oldest track's time
                    endTime: trackTime,   // This is the newest track in the new session
                    context: track.context || "None",
                    tracks: [track]
                };
            } else {
                currentSession.tracks.push(track);
                currentSession.startTime = trackTime;
            }
        }
        grouped.push(currentSession);
        setSessions(grouped);
    };

    const updateSessionContext = async (session: any, newContext: string) => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        setUpdatingId(session.id);
        const trackIds = session.tracks.map((t: any) => t.id);

        try {
            const response = await fetch("https://music-ml-dashboard.onrender.com/api/history/session/context?token=" + token, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ document_ids: trackIds, context: newContext })
            });

            if (response.ok) {
                // Re-fetch history to reflect new AI analysis
                await fetchHistory();
            }
        } catch (e) {
            console.error("Failed to update context", e);
        }
        setUpdatingId(null);
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const formatDuration = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#06080C] text-white p-6 md:p-12 font-sans selection:bg-theme-accent selection:text-black">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-[#131823] border border-[#1B2332] rounded-full hover:border-theme-accent transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Listening History</h1>
                        <p className="text-theme-text-muted text-sm">Raw telemetry data & AI analysis grouped by sessions</p>
                    </div>
                </div>

                <div className="bg-[#0D111A] border border-[#1B2332] rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-theme-text-muted">Loading history...</div>
                    ) : sessions.length === 0 ? (
                        <div className="p-12 text-center text-theme-text-muted">No listening history found.</div>
                    ) : (
                        <div className="flex flex-col">
                            {sessions.map((session, idx) => (
                                <div key={session.id} className="border-b border-[#1B2332] last:border-b-0">
                                    <div className="bg-[#131823] px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                                        <div>
                                            <h3 className="text-white font-bold text-sm">
                                                Session: {formatTime(session.startTime.toISOString())} - {formatTime(session.endTime.toISOString())}
                                            </h3>
                                            <p className="text-xs text-theme-text-muted">{session.tracks.length} tracks</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">Context:</span>
                                            <select 
                                                value={session.context}
                                                onChange={(e) => updateSessionContext(session, e.target.value)}
                                                className="bg-[#0D111A] text-white border border-[#1B2332] rounded px-3 py-1.5 text-xs outline-none focus:border-theme-accent transition-colors"
                                                disabled={updatingId === session.id}
                                            >
                                                <option value="None">None</option>
                                                <option value="Gym">Gym</option>
                                                <option value="Driving">Driving</option>
                                                <option value="Study">Study</option>
                                                <option value="Chill">Chill</option>
                                                <option value="Party">Party</option>
                                                <option value="Work">Work</option>
                                                <option value="Commute">Commute</option>
                                            </select>
                                            {updatingId === session.id && <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="text-gray-400 text-[10px] uppercase tracking-wider bg-[#0A0D14]">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium">Track</th>
                                                    <th className="px-6 py-3 font-medium">Played</th>
                                                    <th className="px-6 py-3 font-medium">AI Mood</th>
                                                    <th className="px-6 py-3 font-medium">Time Fit</th>
                                                    <th className="px-6 py-3 font-medium text-right">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#1B2332]/50">
                                                {session.tracks.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-[#131823]/50 transition-colors">
                                                        <td className="px-6 py-3">
                                                            <div className="font-bold text-white max-w-[200px] truncate">{item.track_name}</div>
                                                            <div className="text-xs text-theme-text-muted max-w-[200px] truncate">{item.artist_name}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="text-gray-300">{formatDuration(item.played_ms)} / {formatDuration(item.duration_ms)}</div>
                                                            <div className="text-[10px] text-theme-accent mt-0.5">{item.listen_type}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="font-semibold text-white text-xs">{item.ai_mood || item.mood_category || "Unknown"}</div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5 max-w-[200px] truncate" title={item.ai_analysis}>
                                                                {item.ai_analysis || `Valence: ${(item.valence||0).toFixed(2)}`}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-gray-300 text-xs">
                                                            {item.time_of_day_fit || "Anytime"}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-400 text-xs font-mono">
                                                            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
