'use client';

import React, { useEffect } from 'react';
import ScrollyTellingCanvas from '../components/ScrollyTellingCanvas';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Home() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Fade in text elements based on scroll
    const scenes = gsap.utils.toArray('.scene-content');
    scenes.forEach((scene: any, i) => {
      gsap.fromTo(scene, 
        { opacity: 0, y: 50 },
        {
          opacity: 1, 
          y: 0,
          scrollTrigger: {
            trigger: scene,
            start: "top center+=200",
            end: "center center",
            scrub: true,
          }
        }
      );
      
      // Fade out on scroll past
      gsap.to(scene, {
        opacity: 0,
        y: -50,
        scrollTrigger: {
          trigger: scene,
          start: "center center",
          end: "bottom center-=200",
          scrub: true,
        }
      });
    });
    
    // UI Connections animation in Scene 3
    gsap.fromTo('.ui-bracket', 
      { strokeDashoffset: 200 },
      { 
        strokeDashoffset: 0,
        scrollTrigger: {
          trigger: '#scene-3',
          start: 'top center',
          end: 'center center',
          scrub: true
        }
      }
    );
  }, []);

  const handleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://music-ml-server.onrender.com';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    window.location.href = `${cleanUrl}/auth/login`;
  };

  return (
    <main className="relative bg-[#0A0D14] text-white min-h-screen overflow-x-hidden selection:bg-white selection:text-black">
      {/* The background canvas that handles the neural symphony */}
      <ScrollyTellingCanvas />

      {/* Persistent UI */}
      <div className="fixed top-8 left-8 z-50 font-mono text-sm tracking-widest text-gray-400">
        <span id="coordinate-display">A - 00.032</span>
      </div>

      <div className="fixed top-8 right-8 z-50 font-mono text-sm tracking-widest text-gray-400">
        LUNA v2.0
      </div>

      {/* Scrollable Container */}
      <div className="relative z-10 w-full" id="scrolly-container">
        
        {/* Scene 1: The Baseline */}
        <section id="scene-1" className="h-[150vh] flex items-center justify-center pointer-events-none">
          <div className="scene-content max-w-2xl text-center px-6">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
              Before the noise, there is the baseline.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-mono">
              A static frequency. A mind waiting for variance.
            </p>
          </div>
        </section>

        {/* Scene 2: The Variance */}
        <section id="scene-2" className="h-[200vh] flex items-center justify-center pointer-events-none">
          <div className="scene-content max-w-2xl text-center px-6">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
              Then, the variance begins.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-mono">
              Every artist you discover, every track you loop at 2 AM, every genre you bleed into... becomes a Node.
            </p>
          </div>
        </section>

        {/* Scene 3: The Intertwining */}
        <section id="scene-3" className="h-[200vh] relative pointer-events-none">
          <div className="scene-content absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl text-center px-6">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
              These nodes don't exist in a vacuum.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-mono">
              Your daily routines collide with your listening habits. A heavy bassline alters your momentum. An acoustic bridge shifts your entire trajectory.
            </p>
          </div>

          {/* Architectural Overlays */}
          <div className="absolute top-[30%] left-[20%] font-mono text-sm tracking-wider text-gray-300 flex items-end">
            <svg className="w-32 h-32 mr-2 overflow-visible">
              <polyline className="ui-bracket fill-none stroke-current stroke-2" strokeDasharray="200" points="128,128 16,128 16,16" />
            </svg>
            <div>
              <div className="text-xs mb-1">C.</div>
              <div className="border-b border-current pb-1 mb-1">INTERACTION</div>
            </div>
          </div>

          <div className="absolute bottom-[30%] right-[20%] font-mono text-sm tracking-wider text-gray-300 flex items-start flex-row-reverse">
            <svg className="w-32 h-32 ml-2 overflow-visible transform rotate-180">
              <polyline className="ui-bracket fill-none stroke-current stroke-2" strokeDasharray="200" points="128,128 16,128 16,16" />
            </svg>
            <div className="text-right">
              <div className="text-xs mb-1">E.</div>
              <div className="border-b border-current pb-1 mb-1">ILLUSTRATION</div>
            </div>
          </div>
        </section>

        {/* Scene 4: The Neurology */}
        <section id="scene-4" className="h-[200vh] flex items-center justify-center pointer-events-none">
          <div className="scene-content max-w-2xl text-center px-6 mix-blend-difference">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6 text-white">
              It’s not just an algorithm. It’s neurology.
            </h2>
            <p className="text-gray-300 text-lg md:text-xl font-mono">
              Your timeline literally rewires your mind. The frequency of your life dictates the shape of your variance.
            </p>
          </div>
        </section>

        {/* Scene 5: The Sync */}
        <section id="scene-5" className="h-[150vh] flex items-center justify-center relative">
          <div className="scene-content max-w-md text-center px-6">
            <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-8">
              Map your variance.
              <br />
              Intertwine your timeline.
            </h2>
            <button 
              onClick={handleLogin}
              className="group relative inline-flex items-center justify-center w-full gap-3 px-8 py-5 rounded-full bg-white text-black font-mono font-bold tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] pointer-events-auto"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transition-transform group-hover:rotate-12">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 7.3c-3.96-2.34-10.44-2.58-14.22-1.44-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.72-1.259.36z"/>
              </svg>
              CONNECT SPOTIFY
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}
