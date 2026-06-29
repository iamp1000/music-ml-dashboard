import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface RawHistoryHeaderProps {
    backHref: string;
    title: string;
}

export function RawHistoryHeader({ backHref, title }: RawHistoryHeaderProps) {
    return (
        <div className="flex items-center gap-4 mb-8">
            <Link prefetch={false} href={backHref} className="p-2 bg-[var(--theme-panel)] border border-[var(--theme-border)] rounded-full hover:border-[var(--theme-accent)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{title}</h1>
            </div>
        </div>
    );
}
