import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
    theme: 'theme-olive' | 'theme-cyan' | 'theme-glass';
    gradientColors: string[];
    setTheme: (theme: 'theme-olive' | 'theme-cyan' | 'theme-glass') => void;
    setGradientColors: (colors: string[]) => void;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'theme-olive', // Default
            gradientColors: ['#0f172a', '#3b0764', '#0a0a0a'], // Default custom gradient
            setTheme: (theme) => set({ theme }),
            setGradientColors: (colors) => set({ gradientColors: colors }),
        }),
        {
            name: 'dashboard-theme',
        }
    )
);
