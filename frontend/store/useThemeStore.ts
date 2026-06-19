import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
    theme: 'theme-olive' | 'theme-cyan';
    setTheme: (theme: 'theme-olive' | 'theme-cyan') => void;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'theme-olive', // Default to Olive Green
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'dashboard-theme',
        }
    )
);
