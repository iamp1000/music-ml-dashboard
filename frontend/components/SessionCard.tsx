"use client";

import React from "react";
import { Music, ListMusic } from "lucide-react";

export interface Track {
    track_name: string;
    [key: string]: unknown;
}

export interface Session {
    dominant_mood: string;
    start_time: string;
    end_time: string;
    tracks: Track[];
}

export interface SessionCardProps {
    session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
    return (
        <div className="group relative rounded-3xl overflow-hidden border border-white/5 bg-[#12141A] hover:bg-[#151820] hover:border-white/10 transition-all p-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--theme-accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
                        <ListMusic className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                            {session.dominant_mood} Session
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-gray-300 font-medium border border-white/5">
                                {session.tracks.length} tracks
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium">
                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                    {new Date(session.start_time).toLocaleDateString()}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pl-13">
                {session.tracks.slice(0, 5).map((track, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full pl-1 pr-3 py-1">
                        <div className="w-5 h-5 rounded-full bg-[#1A1C23] flex items-center justify-center">
                            <Music className="w-2.5 h-2.5 text-[var(--theme-accent)]" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-300 truncate max-w-[120px]">{track.track_name}</span>
                    </div>
                ))}
                {session.tracks.length > 5 && (
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1">
                        <span className="text-[11px] font-bold text-gray-500">+{session.tracks.length - 5} more</span>
                    </div>
                )}
            </div>
        </div>
    );
}
