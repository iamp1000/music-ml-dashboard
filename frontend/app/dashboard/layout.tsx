"use client";

import { useThemeStore } from "@/store/useThemeStore";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LiveSyncPlayer from "@/components/LiveSyncPlayer";
import { ParticleCanvas } from "@/components/effects/ParticleCanvas";
import { 
    LayoutDashboard, Activity, Compass, Settings, Clock, Search
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { theme, gradientColors } = useThemeStore();
    const [mounted, setMounted] = useState(false);
    const [isAuth, setIsAuth] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const verifyAuth = async () => {
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
        return <div className="min-h-screen bg-[var(--theme-bg)]"></div>;
    }

    const navItems = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
        { href: "/dashboard/raw-history", icon: Clock, label: "History" },
        { href: "/dashboard/history", icon: Activity, label: "Analytics" },
        { href: "/dashboard/discovery", icon: Compass, label: "Discovery" },
    ];

    const bottomItems = [
        { href: "/dashboard/settings", icon: Settings, label: "Settings" },
    ];

    const glassStyle = theme === 'theme-glass' 
        ? { background: `linear-gradient(135deg, ${gradientColors.join(', ')})` }
        : {};

    return (
        <div 
            className={`${theme} min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans flex overflow-hidden relative selection:bg-[var(--theme-accent)]/30`}
            style={glassStyle}
        >
            {/* Background Layer */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--theme-accent)]/5 via-[var(--theme-bg)] to-[var(--theme-bg)] opacity-60"></div>
            <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            <div className="z-0 pointer-events-none absolute inset-0"><ParticleCanvas /></div>
            
            {/* Sidebar */}
            <aside className="group w-20 hover:w-[260px] border-r border-white/5 bg-black/20 backdrop-blur-3xl flex flex-col hidden lg:flex sticky top-0 h-screen shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-50">
                
                {/* Branding */}
                <div className="px-6 py-8 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--theme-accent)] to-blue-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--theme-accent)]/20">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                            <span className="text-[14px] font-bold tracking-wide text-white leading-tight">SonicLens</span>
                            <span className="text-[10px] text-[var(--theme-text-muted)] font-medium">Intelligence OS</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide py-4">
                    <div className="px-2 mb-2">
                        <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200">Main</span>
                    </div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                prefetch={false} 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                                    isActive 
                                        ? "bg-white/10 text-white font-medium shadow-sm" 
                                        : "text-[var(--theme-text-muted)] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {isActive && (
                                    <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-full bg-[var(--theme-accent)] rounded-r-full" />
                                )}
                                
                                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-[var(--theme-accent)]" : ""}`} />
                                <span className={`text-sm tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75`}>{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="mt-8 px-2 mb-2">
                        <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200">System</span>
                    </div>
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                prefetch={false} 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 relative ${
                                    isActive 
                                        ? "bg-white/10 text-white font-medium shadow-sm" 
                                        : "text-[var(--theme-text-muted)] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {isActive && (
                                    <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-full bg-[var(--theme-accent)] rounded-r-full" />
                                )}
                                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-[var(--theme-accent)]" : ""}`} />
                                <span className={`text-sm tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Player */}
                <div className="p-4 border-t border-white/5 bg-black/10">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap min-w-[220px]">
                        <LiveSyncPlayer />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen relative z-10 scrollbar-thin">
                <div className="w-full max-w-[1600px] mx-auto min-h-full flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>
                    <div className="py-8 text-center">
                        <span className="text-[10px] text-[var(--theme-text-muted)]/50 uppercase tracking-[0.3em] font-medium">
                            SonicLens © 2026
                        </span>
                    </div>
                </div>
            </main>
        </div>
    );
}
