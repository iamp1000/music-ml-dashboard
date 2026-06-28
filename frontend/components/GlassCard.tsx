import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    icon?: React.ReactNode;
}

export function GlassCard({ children, className, title, icon, ...props }: GlassCardProps) {
    return (
        <div 
            className={cn(
                "relative flex flex-col rounded-3xl bg-white/5 backdrop-blur-xl border border-white/5 shadow-2xl p-6 overflow-hidden transition-all duration-300",
                className
            )}
            {...props}
        >
            {/* Subtle glow effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            {title && (
                <div className="flex items-center gap-2 mb-4">
                    {icon && <div className="text-theme-accent">{icon}</div>}
                    <h3 className="font-semibold text-sm tracking-wide text-theme-text">{title}</h3>
                </div>
            )}
            <div className="flex-1 w-full h-full relative">
                {children}
            </div>
        </div>
    );
}
