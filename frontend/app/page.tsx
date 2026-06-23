'use client';

import React from 'react';
import { PlayCircle } from 'lucide-react';

export default function LandingPage() {
  const handleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    // Using production URL or falling back gracefully if not defined
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://music-ml-dashboard.onrender.com';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    window.location.href = `${cleanUrl}/api/auth/login`;
  };

  return (
    <main className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative overflow-hidden">
      
      {/* Background visual flair */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#22C55E]/10 blur-[120px]"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#3B82F6]/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="w-20 h-20 bg-[#1C1C24] border border-[#2D2D3A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
          <PlayCircle className="w-10 h-10 text-[#22C55E]" />
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6">
          Music ML <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#3B82F6]">
            Dashboard
          </span>
        </h1>
        
        <p className="text-[#8293B4] text-lg sm:text-xl mb-12 max-w-2xl leading-relaxed">
          Advanced audio telemetry and neural tracking for your Spotify activity. 
          Discover your listening habits through live AI analysis and multidimensional data models.
        </p>

        <button 
          onClick={handleLogin}
          className="group relative flex items-center gap-4 px-8 py-4 bg-[#22C55E] text-black font-bold rounded-full overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 relative z-10">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 7.3c-3.96-2.34-10.44-2.58-14.22-1.44-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.72-1.259.36z"/>
          </svg>
          <span className="relative z-10 tracking-wide uppercase">Connect with Spotify</span>
        </button>
        
        <p className="mt-6 text-sm text-[#475569] font-medium tracking-wide">
          Secure authentication via Spotify
        </p>

      </div>
    </main>
  );
}
