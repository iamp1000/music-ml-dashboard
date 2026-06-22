'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollyTellingCanvas from '../components/ScrollyTellingCanvas';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fade in text elements based on scroll
    gsap.utils.toArray<HTMLElement>('.fade-text').forEach((text, i) => {
      gsap.fromTo(text, 
        { opacity: 0, y: 50 }, 
        { 
          opacity: 1, 
          y: 0, 
          scrollTrigger: {
            trigger: text,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play reverse play reverse',
          }
        }
      );
    });

    // Draw SVG architectural lines
    gsap.utils.toArray<SVGPathElement>('.draw-line').forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      
      gsap.to(path, {
        strokeDashoffset: 0,
        scrollTrigger: {
          trigger: path,
          start: 'top 70%',
          end: 'bottom 30%',
          scrub: true,
        }
      });
    });
  }, []);

  return (
    <main ref={containerRef} id="scrolly-container" className="relative w-full">
      {/* 
        The ScrollyTellingCanvas handles the background wavy lines and nodes.
        It is fixed to the viewport.
      */}
      <ScrollyTellingCanvas />

      {/* Global Overlays exactly matching the reference image */}
      <div className="fixed top-4 left-4 z-50 text-label">
        A - 00.032
      </div>
      
      {/* Top Left Bracket Logo */}
      <svg className="fixed top-12 left-4 z-50 w-8 h-8" viewBox="0 0 40 40">
        <path d="M 40 0 L 0 0 L 0 40" className="architectural-line opacity-50" />
      </svg>

      <div className="fixed bottom-4 right-4 z-50 text-label">
        0.05
      </div>

      {/* The Scrolling Content */}
      <div className="relative z-10 w-full">
        
        {/* Scene 1: The Baseline */}
        <section className="h-[150vh] flex flex-col justify-center items-center w-full relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[100px] text-label opacity-30">
            01.
          </div>
          <div className="max-w-2xl text-center px-6 mt-[20vh] fade-text">
            <h1 className="text-4xl font-light mb-6 tracking-wide">The Baseline</h1>
            <p className="text-xl text-gray-400 font-light leading-relaxed">
              Before the noise, there is the baseline. An empty timeline. 
              Music is the first frequency that breaks the silence.
            </p>
          </div>
        </section>

        {/* Scene 2: The Variance */}
        <section className="h-[200vh] flex flex-col justify-center items-start pl-[10vw] w-full relative">
          <div className="max-w-md fade-text">
            <h2 className="text-3xl font-light mb-4">The Variance</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Every song, every genre, every artist we listen to becomes a node. 
              These nodes intertwine with our daily activity, pulling us into new emotional frequencies.
            </p>
          </div>
          
          {/* Architectural Overlay specific to this section (matches reference) */}
          <div className="absolute right-[20vw] top-[30vh]">
             <svg width="200" height="100" className="absolute -left-[210px] top-4">
               <path d="M 0 50 L 150 50 L 200 100" className="architectural-line draw-line" />
             </svg>
             <div className="text-label">E. <br/> ILLUSTRATION</div>
          </div>
        </section>

        {/* Scene 3: The Intertwining (TVA Style) */}
        <section className="h-[200vh] flex flex-col justify-center items-end pr-[15vw] w-full relative">
          <div className="max-w-md text-right fade-text">
            <h2 className="text-3xl font-light mb-4">The Intertwining</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Like a temporal loom, your listening history branches. 
              We map these patterns to show how deeply they influence your mood and shape your day.
            </p>
          </div>

          <div className="absolute left-[15vw] top-[40vh]">
             <div className="text-label mb-2">C. <br/> INTERACTION</div>
             <svg width="200" height="100" className="absolute left-0 top-8">
               <path d="M 0 0 L 150 0 L 200 50" className="architectural-line draw-line" />
             </svg>
          </div>
        </section>

        {/* Scene 4: The Neurology */}
        <section className="h-[200vh] flex flex-col justify-center items-center w-full relative">
          <div className="max-w-2xl text-center fade-text bg-[#111418]/80 p-8 rounded-2xl backdrop-blur-sm">
            <h2 className="text-3xl font-light mb-4">The Neurology</h2>
            <p className="text-lg text-gray-400 font-light leading-relaxed">
              Each node has a major impact on our brain. A major variance. 
              The frequencies align, lighting up pathways of memory, focus, and energy.
            </p>
          </div>
        </section>

        {/* Scene 5: Sync */}
        <section className="h-[150vh] flex flex-col justify-center items-center w-full relative pb-32">
           <div className="max-w-md text-center fade-text">
            <h2 className="text-4xl font-light mb-8">Sync Your Timeline</h2>
            <button className="px-8 py-4 bg-white text-black font-medium tracking-widest text-sm hover:bg-gray-200 transition-colors">
              CONNECT SPOTIFY
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}
