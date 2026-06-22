"use client";

import { useThemeStore } from "@/store/useThemeStore";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LiveSyncPlayer from "@/components/LiveSyncPlayer";
import { ThemeSettings } from "@/components/ThemeSettings";
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
                const res = await fetch("https://music-ml-dashboard.onrender.com/auth/profile", {
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
        return <div className="min-h-screen bg-[#111827]"></div>;
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
            className={`${theme} min-h-screen bg-[#0A0D14] text-theme-text transition-colors duration-500 font-sans flex overflow-hidden`}
            style={glassStyle}
        >
            
            {/* Sidebar */}
            <aside className="w-72 border-r border-[#1B2332] bg-[#06080C] flex flex-col hidden lg:flex sticky top-0 h-screen shrink-0">
                {/* Branding Logo Block */}
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-end gap-1.5 h-6">
                            <span className="w-1 bg-theme-accent h-3 rounded-full shadow-[0_0_8px_var(--theme-accent)]"></span>
                            <span className="w-1 bg-theme-accent h-5 rounded-full shadow-[0_0_8px_var(--theme-accent)]"></span>
                            <span className="w-1 bg-theme-accent h-6 rounded-full shadow-[0_0_8px_var(--theme-accent)] animate-[pulse_1.5s_infinite]"></span>
                            <span className="w-1 bg-theme-accent h-4 rounded-full shadow-[0_0_8px_var(--theme-accent)]"></span>
                            <span className="w-1 bg-theme-accent h-2.5 rounded-full shadow-[0_0_8px_var(--theme-accent)]"></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-black tracking-wider text-white leading-none">SonicLens</span>
                            <span className="text-[10px] text-theme-text-muted mt-1 font-medium uppercase tracking-wide">for Spotify</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 border ${
                                    isActive 
                                        ? "bg-theme-accent/5 border-theme-accent/20 text-theme-accent font-semibold shadow-[0_0_20px_var(--theme-accent)/0.02]" 
                                        : "hover:bg-white/2 text-theme-text-muted hover:text-white border-transparent"
                                }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className="text-sm tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Player Bottom */}
                <div className="p-4 border-t border-[#1B2332]/60">
                    <LiveSyncPlayer />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen relative bg-theme-bg">
                <div className="w-full max-w-[1400px] mx-auto p-6 md:p-8 min-h-full flex flex-col justify-between">
                    <div className="flex-1">
                        {children}
                    </div>
                    <div className="mt-8 text-center text-[10px] text-theme-text-muted/40 uppercase tracking-widest font-semibold pb-4">
                        SonicLens Dashboard v2.0
                    </div>
                </div>
                <ThemeSettings />
            </main>
        </div>
    );
}
