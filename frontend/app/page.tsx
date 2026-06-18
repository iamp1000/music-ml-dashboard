'use client';

import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import gsap from 'gsap';


const queryClient = new QueryClient();

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const introBgRef = useRef<HTMLDivElement>(null);
  const nameLayerRef = useRef<HTMLDivElement>(null);
  const preloaderTextRef = useRef<HTMLDivElement>(null);
  const tPanelDarkRef = useRef<HTMLDivElement>(null);
  const tPanelAccentRef = useRef<HTMLDivElement>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);


  useEffect(() => {
    // Exact Luke Baffait inspired preloader sequence
    const tl = gsap.timeline();

    // 1. Show preloader text (AFFECTIVE.)
    tl.fromTo(preloaderTextRef.current,
      { opacity: 0, y: 50, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out' }
    )
    // 2. Hold, then fade out preloader text
    .to(preloaderTextRef.current, {
      opacity: 0, y: -50, duration: 0.8, ease: 'expo.in', delay: 0.5
    })
    // 3. Transition panels slide up
    .to(tPanelAccentRef.current, {
      scaleY: 0, duration: 1.2, ease: 'expo.inOut'
    }, "-=0.2")
    .to(tPanelDarkRef.current, {
      scaleY: 0, duration: 1.2, ease: 'expo.inOut'
    }, "-=1.0")
    // 4. Hide intro background
    .to(introBgRef.current, {
      autoAlpha: 0, duration: 0.1
    }, "-=0.5")
    // 5. Reveal Hero Content
    .fromTo(titleRef.current,
      { y: 100, opacity: 0, clipPath: 'inset(100% 0 0 0)' },
      { y: 0, opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.out' },
      "-=0.5"
    )
    .fromTo(taglineRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' },
      "-=1.2"
    )
    ;

  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <main ref={containerRef} className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#0a0a0a] text-white">
        
        {/* Preloader Overlays */}
        <div ref={introBgRef} className="absolute inset-0 z-50 bg-[#0a0a0a]"></div>
        
        <div ref={nameLayerRef} className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div ref={preloaderTextRef} className="flex gap-2 text-2xl font-bold tracking-[0.2em] uppercase">
            <span>A</span>
            <span className="text-zinc-500">FFECTIVE</span>
            <span className="text-rose-600">.</span>
          </div>
        </div>

        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col">
          <div ref={tPanelDarkRef} className="h-1/2 w-full bg-[#111] origin-top"></div>
          <div ref={tPanelAccentRef} className="h-1/2 w-full bg-rose-600 origin-bottom"></div>
        </div>

        {/* Hero Background Canvas (Minimal Grain) */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.svg')] pointer-events-none mix-blend-difference"></div>

        {/* Main Content */}
        <div ref={contentRef} className="z-10 relative flex flex-col items-center justify-center w-full max-w-7xl px-6 min-h-screen">
          
          <div className="w-full flex flex-col items-center justify-center text-center">
            <h1 
              ref={titleRef}
              className="text-[12vw] md:text-[8vw] font-black tracking-tighter uppercase mb-6 leading-none mix-blend-difference"
            >
              Emotion<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-600">
                Mapped.
              </span>
            </h1>
            <p 
              ref={taglineRef}
              className="text-lg md:text-2xl text-zinc-400 font-light max-w-2xl mt-4 tracking-wide"
            >
              Real-time music emotion recognition bridging your Spotify listening behaviors and physiological biofeedback.
            </p>
            
            <div className="mt-16 overflow-hidden">
              <a 
                href="http://localhost:8000/auth/login"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 w-0 bg-gradient-to-r from-rose-600 to-indigo-600 transition-all duration-[400ms] ease-out group-hover:w-full"></div>
                <span className="relative flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.3 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.539-1.56.24z"/>
                  </svg>
                  Connect with Spotify
                </span>
              </a>
            </div>
          </div>
          
          {/* Bottom Bar matching the aesthetic */}
          <div className="absolute bottom-8 w-full flex justify-between items-center px-12 text-xs text-zinc-600 uppercase tracking-[0.3em] font-semibold">
            <div>Affective SaaS v1.0</div>
            <div>Designed for you</div>
          </div>
        </div>

      </main>
    </QueryClientProvider>
  );
}
