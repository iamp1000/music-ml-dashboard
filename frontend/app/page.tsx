'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Dynamically import the new Physics Canvas
const PhysicsCanvas = dynamic(() => import('@/components/PhysicsCanvas'), { ssr: false });

const queryClient = new QueryClient();

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Setup GSAP scroll animations
    const ctx = gsap.context(() => {
      // Hero exit animation
      gsap.to('.hero-content', {
        y: -100,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        }
      });

      // Feature 1 enter
      gsap.fromTo('.feature-1-content', 
        { y: 100, opacity: 0 },
        {
          y: 0, opacity: 1,
          scrollTrigger: {
            trigger: '.feature-1-section',
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
          }
        }
      );

      // Feature 2 enter
      gsap.fromTo('.feature-2-content', 
        { y: 100, opacity: 0 },
        {
          y: 0, opacity: 1,
          scrollTrigger: {
            trigger: '.feature-2-section',
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
          }
        }
      );
    }, containerRef);

    return () => {
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <main ref={containerRef} className="relative w-full bg-[#050505] text-white selection:bg-[#ff6baf]/30 font-sans overflow-hidden">
        
        {/* Pinned 3D Physics Scene */}
        <PhysicsCanvas />

        {/* Ambient Dark Gradient to ensure text readability */}
        <div className="fixed inset-0 z-[1] bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />

        {/* Grid Overlay for texture */}
        <div 
          className="fixed inset-0 z-[2] opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Scrollable Content Container */}
        <div className="relative z-10 w-full">
          
          {/* Top Nav (Fixed) */}
          <motion.nav 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fixed top-0 left-0 w-full flex justify-between items-center p-6 md:p-16 xl:p-24 pointer-events-none mix-blend-difference"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#ff6baf] animate-pulse" />
              <span className="text-sm font-bold tracking-[0.2em] text-white/90 uppercase">LUNA</span>
            </div>
            <div className="text-xs font-mono tracking-widest text-white/40">
              V 2.0.0
            </div>
          </motion.nav>

          {/* Section 1: Hero */}
          <section className="hero-section h-[100vh] flex flex-col justify-center px-6 md:px-16 xl:px-24">
            <motion.div
              className="hero-content max-w-4xl"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <div className="inline-block px-4 py-1 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                <span className="text-xs font-mono tracking-widest text-[#00ddff] uppercase">
                  Cinematic Physics
                </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.9] mb-8">
                SEE<br />
                YOUR<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6baf] to-[#4d6bff]">
                  SOUND.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/60 max-w-xl mb-12 font-light leading-relaxed">
                Connect Spotify to power a real-time, reactive 3D physics engine driven entirely by your music's frequencies.
              </p>

              <div className="flex items-center gap-6 pointer-events-auto">
                <motion.button 
                  onClick={() => window.location.href = 'http://localhost:8000/auth/login'}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative px-8 py-4 rounded-lg bg-white text-black font-bold tracking-widest uppercase text-sm overflow-hidden transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#1DB954]">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 7.3c-3.96-2.34-10.44-2.58-14.22-1.44-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.72-1.259.36z"/>
                    </svg>
                    Sync Spotify
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </section>

          {/* Section 2: Features */}
          <section className="feature-1-section h-[150vh] flex flex-col justify-center px-6 md:px-16 xl:px-24">
            <div className="feature-1-content max-w-3xl ml-auto text-right">
              <h2 className="text-4xl md:text-6xl font-black mb-6">Generative Audio Engine</h2>
              <p className="text-xl text-white/60 font-light">
                Every beat, every vocal stem is analyzed in real-time. The 3D scene responds physically, altering gravity, damping, and impulse forces to match the mood of the song.
              </p>
            </div>
          </section>

          {/* Section 3: Telemetry */}
          <section className="feature-2-section h-[150vh] flex flex-col justify-center px-6 md:px-16 xl:px-24">
            <div className="feature-2-content max-w-3xl">
              <h2 className="text-4xl md:text-6xl font-black mb-6">Live Telemetry</h2>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="text-xs font-mono text-[#ff6baf] mb-2 uppercase">Acoustic Valence</div>
                  <div className="text-4xl font-light">Real-time</div>
                </div>
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="text-xs font-mono text-[#4d6bff] mb-2 uppercase">Spatial Context</div>
                  <div className="text-4xl font-light">Dynamic</div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="h-[50vh] flex flex-col justify-end px-6 md:px-16 xl:px-24 pb-12">
            <div className="flex justify-between items-end w-full mix-blend-difference">
              <div className="hidden md:flex gap-8 text-xs font-mono text-white/30 tracking-widest">
                <span>LAT: 34.0522° N</span>
                <span>LONG: 118.2437° W</span>
              </div>
              <div className="text-xs font-mono text-white/30 tracking-widest text-right w-full md:w-auto">
                SPACE // TIME // AUDIO
              </div>
            </div>
          </section>

        </div>
      </main>
    </QueryClientProvider>
  );
}
