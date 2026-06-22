'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollyTellingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const state = {
      progress: 0,
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#scrolly-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      }
    });

    tl.to(state, { progress: 1, ease: 'none' });

    const linesCount = 12; // About 12 thick parallel lines as seen in reference
    const pointsPerLine = 150;
    
    // Define some static nodes that will attach to specific lines at specific X positions
    const nodes = [
      { lineIndex: 0, xPercent: 0.5, type: 'solid-grey', size: 40 }, // Flat scene big circle
      { lineIndex: 3, xPercent: 0.35, type: 'solid-grey', size: 60 },
      { lineIndex: 5, xPercent: 0.55, type: 'hollow', size: 45 },
      { lineIndex: 7, xPercent: 0.65, type: 'solid-grey', size: 70 },
      { lineIndex: 2, xPercent: 0.8, type: 'solid-white', size: 25 },
      { lineIndex: 8, xPercent: 0.2, type: 'hollow', size: 30 },
      { lineIndex: 9, xPercent: 0.7, type: 'solid-grey', size: 55 },
      { lineIndex: 4, xPercent: 0.45, type: 'solid-white', size: 35 },
    ];

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#111418'; // Very dark, almost black, slightly tinted
      ctx.fillRect(0, 0, width, height);
      
      time += 0.005; // Auto scrolling time
      
      const p = state.progress;
      
      // We start flat (amplitude 0), then increase
      let amplitude = 0;
      let frequency = 0.003;
      let lineSpacing = 10;
      let chaos = 0;
      let thickness = 4;
      
      if (p < 0.2) {
        // Scene 1: Flat line (Only showing 1 main line, others faded/hidden)
        amplitude = 0;
        lineSpacing = 0;
      } else if (p < 0.5) {
        // Scene 2 & 3: Wavy, lines spreading out
        const localP = (p - 0.2) / 0.3;
        amplitude = localP * 150;
        lineSpacing = localP * 25;
        frequency = 0.003 + localP * 0.002;
        thickness = 4 + localP * 2;
      } else {
        // Scene 4 & 5: Maximum variance, TVA intertwining
        const localP = Math.min((p - 0.5) / 0.4, 1);
        amplitude = 150 + localP * 100;
        lineSpacing = 25 + localP * 15;
        frequency = 0.005 + localP * 0.003;
        chaos = localP * Math.PI * 0.5; // Phase shifts
        thickness = 6;
      }

      // Draw lines
      for (let i = 0; i < linesCount; i++) {
        // Opacity based on progress. Scene 1 shows only line 0.
        let lineOpacity = 1;
        if (p < 0.1) {
          lineOpacity = i === 0 ? 1 : 0;
        } else if (p < 0.2) {
          const localP = (p - 0.1) / 0.1;
          lineOpacity = i === 0 ? 1 : localP;
        }
        
        if (lineOpacity <= 0) continue;

        ctx.beginPath();
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Gradient stroke for smooth light effect
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgba(200, 200, 200, ${lineOpacity * 0.2})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${lineOpacity})`);
        gradient.addColorStop(1, `rgba(200, 200, 200, ${lineOpacity * 0.2})`);
        ctx.strokeStyle = gradient;

        for (let j = 0; j <= pointsPerLine; j++) {
          const x = (j / pointsPerLine) * width;
          
          // Math for the wave
          const phase = (x * frequency) + time + (i * chaos);
          const yOffset = Math.sin(phase) * amplitude + Math.cos(phase * 0.5) * (amplitude * 0.5);
          
          // Spread lines out
          const yCentered = height / 2 + yOffset;
          const yFinal = yCentered + (i - linesCount/2) * lineSpacing;

          if (j === 0) {
            ctx.moveTo(x, yFinal);
          } else {
            ctx.lineTo(x, yFinal);
          }
        }
        ctx.stroke();
      }

      // Draw Nodes
      nodes.forEach((node) => {
        // Check if node should be visible
        // Node 0 is visible immediately. Others fade in during Scene 2 (p > 0.2).
        let nodeOpacity = 1;
        if (node.lineIndex === 0) {
          nodeOpacity = p < 0.1 ? 1 : 1 - (p * 0.5); // Slightly fades as chaos grows
        } else {
          if (p < 0.2) nodeOpacity = 0;
          else {
            nodeOpacity = Math.min((p - 0.2) * 5, 1);
          }
        }

        if (nodeOpacity <= 0) return;

        const x = node.xPercent * width;
        const phase = (x * frequency) + time + (node.lineIndex * chaos);
        const yOffset = Math.sin(phase) * amplitude + Math.cos(phase * 0.5) * (amplitude * 0.5);
        const yCentered = height / 2 + yOffset;
        const yFinal = yCentered + (node.lineIndex - linesCount/2) * lineSpacing;

        ctx.save();
        ctx.globalAlpha = nodeOpacity;
        ctx.beginPath();

        if (node.type === 'solid-grey') {
          ctx.arc(x, yFinal, node.size, 0, Math.PI * 2);
          ctx.fillStyle = '#A0A0A0';
          ctx.fill();
        } else if (node.type === 'solid-white') {
          ctx.arc(x, yFinal, node.size, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else if (node.type === 'hollow') {
          ctx.arc(x, yFinal, node.size, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          
          // Inner hollow ring
          ctx.beginPath();
          ctx.arc(x, yFinal, node.size * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = '#D0D0D0';
          ctx.lineWidth = 4;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(x, yFinal, node.size * 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = '#D0D0D0';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      });

    };

    gsap.ticker.add(render);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', onResize);

    return () => {
      gsap.ticker.remove(render);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none -z-10"
    />
  );
}
