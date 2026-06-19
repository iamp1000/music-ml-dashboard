"use client";

import { useThemeStore } from "@/store/useThemeStore";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LiveSyncPlayer from "@/components/LiveSyncPlayer";
import { ThemeSettings } from "@/components/ThemeSettings";
import { 
    User, Activity, Mic2, BarChart2, Radio, Network, 
    BrainCircuit, LineChart, Sparkles, Settings
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useThemeStore();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-[#111827]"></div>;
    }

    const navItems = [
        { href: "/dashboard", icon: User, label: "1. Profile Overview" },
        { href: "/dashboard/history", icon: Activity, label: "2. Complete History" },
        { href: "/dashboard/top-artists", icon: Mic2, label: "3. Top Artists" },
        { href: "/dashboard/history-over-time", icon: BarChart2, label: "4. History Over Time" },
        { href: "/dashboard/features", icon: Radio, label: "5. Audio Features" },
        { href: "/dashboard/discovery", icon: Network, label: "6. Discovery Engine" },
        { href: "/dashboard/neural", icon: BrainCircuit, label: "7. Neural Network" },
        { href: "/dashboard/mood", icon: LineChart, label: "8. Mood Correlation" },
        { href: "/dashboard/recommendations", icon: Sparkles, label: "9. Recommendations" },
        { href: "/dashboard/settings", icon: Settings, label: "10. Settings" },
    ];

    return (
        <div className={`${theme} min-h-screen bg-theme-bg text-theme-text transition-colors duration-500 font-sans flex`}>
            
            {/* Sidebar */}
            <aside className="w-72 border-r border-theme-border bg-theme-panel backdrop-blur-xl flex flex-col hidden lg:flex sticky top-0 h-screen">
                <div className="p-6">
                    <h1 className="text-xl font-black tracking-tighter uppercase mb-1">
                        Analytics <span className="text-theme-accent">&</span> Insights
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                                    isActive 
                                        ? "bg-theme-accent text-theme-bg font-semibold shadow-lg shadow-theme-accent/20" 
                                        : "hover:bg-theme-bg/50 text-theme-text-muted hover:text-theme-text border border-transparent hover:border-theme-border"
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-theme-border">
                    <LiveSyncPlayer />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 h-screen relative">
                <div className="w-full max-w-6xl mx-auto h-full">
                    {children}
                </div>
                <ThemeSettings />
            </main>
        </div>
    );
}
