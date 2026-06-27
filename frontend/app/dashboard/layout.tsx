"use client";

import { useThemeStore } from "@/store/useThemeStore";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LiveSyncPlayer from "@/components/LiveSyncPlayer";
import { ParticleCanvas } from "@/components/effects/ParticleCanvas";
import { 
    LayoutDashboard, Activity, Compass, Settings, Clock
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { theme, gradientColors } = useThemeStore();
    const [mounted, setMounted] = useState(false);
    const [isAuth, setIsAuth] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const verifyAuth = async () => {
            // Check URL for token first (from backend redirect)
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            if (urlToken) {
                localStorage.setItem("jwt", urlToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const token = localStorage.getItem("jwt");
            if (!token) {
                router.replace("/");
                setMounted(true);
                return;
            }
            
            try {
                // Actually verify the token with the backend
                const res = await fetch("https://music-ml-dashboard.onrender.com/api/auth/profile", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                if (res.ok) {
                    setIsAuth(true);
                } else {
                    localStorage.removeItem("jwt");
                    router.replace("/");
                }
            } catch (err) {
                console.error("Auth verification failed", err);
                router.replace("/");
            } finally {
                setMounted(true);
            }
        };

        verifyAuth();
    }, [router]);

    if (!mounted || !isAuth) {
        return <div className="min-h-screen bg-[#060910]"></div>;
    }

    const navItems = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
        { href: "/dashboard/raw-history", icon: Clock, label: "Listening History" },
        { href: "/dashboard/history", icon: Activity, label: "Analytics Hub" },
        { href: "/dashboard/discovery", icon: Compass, label: "Music & Discovery" },
        { href: "/dashboard/settings", icon: Settings, label: "Settings" },
    ];

    const glassStyle = theme === 'theme-glass' 
        ? { background: `linear-gradient(135deg, ${gradientColors.join(', ')})` }
        : {};

    return (
        <div 
            className={`${theme} min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] transition-colors duration-500 font-sans flex overflow-hidden relative`}
            style={glassStyle}
        >
            {/* OS Background Elements */}
            <div className="os-background" />
            <div className="os-noise" />
            <ParticleCanvas />
            
            {/* ═══ Sidebar ═══ */}
            <aside className="group w-[90px] hover:w-[260px] border-r border-[var(--theme-border)] bg-[var(--theme-panel)]/80 backdrop-blur-xl flex flex-col hidden lg:flex sticky top-0 h-screen shrink-0 transition-all duration-400 ease-out z-50">
                
                {/* Gradient accent line at top */}


                {/* Branding */}
                <div className="px-5 pt-6 pb-4 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        {/* Equalizer bars logo */}
                        <div className="flex items-end gap-[3px] h-7 shrink-0">
                            <span className="w-[3px] rounded-full h-3" style={{ background: "#8B5CF6" }} />
                            <span className="w-[3px] rounded-full h-5" style={{ background: "#3B82F6" }} />
                            <span className="w-[3px] rounded-full h-7 animate-pulse" style={{ background: "#22C55E" }} />
                            <span className="w-[3px] rounded-full h-4" style={{ background: "#EAB308" }} />
                            <span className="w-[3px] rounded-full h-2" style={{ background: "#F97316" }} />
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-[15px] font-black tracking-wider text-white leading-none">SonicLens</span>
                            <span className="text-[9px] text-[var(--theme-text-muted)] mt-1 font-semibold uppercase tracking-[0.15em]">for Spotify</span>
                        </div>
                    </div>
                </div>

                {/* Section label */}
                <div className="px-5 pt-4 pb-2 overflow-hidden whitespace-nowrap">
                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-300">Menu</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link prefetch={false} 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                                    isActive 
                                        ? "bg-white/5 text-white font-bold" 
                                        : "text-[var(--theme-text-muted)] hover:text-white"
                                }`}
                            >
                                {/* Active indicator dot */}
                                {isActive && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
                                )}
                                
                                {/* Icon container */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white/5"}`}>
                                    <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-[#8293B4] group-hover:text-white"} transition-colors`} />
                                </div>
                                
                                <span className={`text-[13px] tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? "text-white" : ""}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Player */}
                <div className="p-3 border-t border-[var(--theme-border)] overflow-hidden">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap min-w-[230px]">
                        <LiveSyncPlayer />
                    </div>
                </div>
            </aside>

            {/* ═══ Main Content ═══ */}
            <main className="flex-1 overflow-y-auto h-screen relative">
                <div className="w-full max-w-[1500px] mx-auto min-h-full flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>
                    <div className="py-6 text-center text-[9px] text-[var(--theme-text-muted)]/30 uppercase tracking-[0.25em] font-bold">
                        SonicLens Dashboard v2.0
                    </div>
                </div>
            </main>
        </div>
    );
}
