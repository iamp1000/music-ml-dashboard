'use client';

import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white p-6 font-sans">
      <div className="text-center max-w-md w-full">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
          LUNA
        </h1>
        <p className="text-white/60 mb-12">
          Music ML Dashboard
        </p>

        <button 
          onClick={() => {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://music-ml-server.onrender.com';
            const cleanUrl = baseUrl.replace(/\/+$/, '');
            window.location.href = `${cleanUrl}/auth/login`;
          }}
          className="flex items-center justify-center w-full gap-3 px-8 py-4 rounded-full bg-[#1DB954] text-white font-bold tracking-wide hover:bg-[#1ed760] transition-colors shadow-lg"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 7.3c-3.96-2.34-10.44-2.58-14.22-1.44-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.72-1.259.36z"/>
          </svg>
          Login with Spotify
        </button>
      </div>
    </main>
  );
}
