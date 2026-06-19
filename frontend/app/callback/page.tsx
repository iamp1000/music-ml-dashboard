'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if there is a hash with a token from the backend
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('token');
      
      if (token) {
        localStorage.setItem('auth_token', token);
        router.push('/dashboard');
        return;
      }
    }

    // Fallback: If Spotify redirected here with a code, forward it to the backend
    const query = window.location.search;
    if (query.includes('code=')) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      window.location.href = `${API_URL}/auth/callback${query}`;
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white text-xl tracking-[0.2em] uppercase font-bold">
      <div className="flex gap-2">
        <span className="text-zinc-500">Authenticating</span>
        <span className="text-rose-600 animate-pulse">...</span>
      </div>
    </div>
  );
}

