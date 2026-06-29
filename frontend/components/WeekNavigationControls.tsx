"use client";

export interface WeekNavigationControlsProps {
    weekOffset: number;
    onOlderWeekClick: () => void;
    onNewerWeekClick: () => void;
}

export function WeekNavigationControls({
    weekOffset,
    onOlderWeekClick,
    onNewerWeekClick
}: WeekNavigationControlsProps) {
    return (
        <div className="flex items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] overflow-hidden">
            <button
                onClick={onOlderWeekClick}
                className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[var(--theme-accent)]/10 transition-all border-r border-[var(--theme-border)]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="text-xs font-black text-white px-5 py-2 tracking-wide">
                {weekOffset === 0 ? "Current Week" : `${weekOffset}W Ago`}
            </span>
            <button
                onClick={onNewerWeekClick}
                disabled={weekOffset === 0}
                className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[var(--theme-accent)]/10 transition-all border-l border-[var(--theme-border)] disabled:opacity-25 disabled:cursor-not-allowed"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        </div>
    );
}
