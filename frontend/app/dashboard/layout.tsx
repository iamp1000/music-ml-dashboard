"use client";

import { useThemeStore } from "@/store/useThemeStore";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LiveSyncPlayer from "@/components/LiveSyncPlayer";
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
            className={`${theme} min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] transition-colors duration-500 font-sans flex overflow-hidden`}
            style={glassStyle}
        >
            
            {/* ═══ Sidebar ═══ */}
            <aside className="w-[220px] border-r border-[var(--theme-border)] bg-[var(--theme-panel)] flex flex-col hidden lg:flex sticky top-0 h-screen shrink-0">
                
                {/* Gradient accent line at top */}


                {/* Branding */}
                <div className="px-5 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        {/* Equalizer bars logo */}
                        <div className="flex items-end gap-[3px] h-7">
                            <span className="w-[3px] rounded-full h-3" style={{ background: "var(--theme-accent)" }} />
                            <span className="w-[3px] rounded-full h-5" style={{ background: "var(--theme-accent)" }} />
                            <span className="w-[3px] rounded-full h-7 animate-pulse" style={{ background: "var(--theme-accent)" }} />
                            <span className="w-[3px] rounded-full h-4" style={{ background: "var(--theme-accent)" }} />
                            <span className="w-[3px] rounded-full h-2" style={{ background: "var(--theme-accent)" }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-black tracking-wider text-white leading-none">SonicLens</span>
                            <span className="text-[9px] text-[var(--theme-text-muted)] mt-1 font-semibold uppercase tracking-[0.15em]">for Spotify</span>
                        </div>
                    </div>
                </div>

                {/* Section label */}
                <div className="px-5 pt-4 pb-2">
                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-[0.2em]">Menu</span>
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
                                        ? "text-[var(--theme-accent)] font-bold" 
                                        : "text-[var(--theme-text-muted)] hover:text-white"
                                }`}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "var(--theme-accent)" }} />
                                )}
                                
                                {/* Icon container */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isActive 
                                        ? "bg-[var(--theme-accent)]/10" 
                                        : "bg-transparent group-hover:bg-white/5"
                                }`}>
                                    <item.icon className="w-[18px] h-[18px]" />
                                </div>
                                
                                <span className="text-[13px] tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Player */}
                <div className="p-3 border-t border-[var(--theme-border)]">
                    <LiveSyncPlayer />
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
