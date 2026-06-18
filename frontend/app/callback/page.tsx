'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Extract query string
    const query = window.location.search;
    
    // Redirect to backend callback to process the token if code is present
    if (query.includes('code=')) {
      window.location.href = `http://localhost:8000/auth/callback${query}`;
    } else {
      // Fallback if no code is present
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
