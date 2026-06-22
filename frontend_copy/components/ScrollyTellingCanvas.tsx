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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // State object manipulated by ScrollTrigger
    const state = {
      progress: 0,
    };

    // ScrollTrigger to map entire page scroll to state.progress (0 to 1)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#scrolly-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      }
    });

    tl.to(state, { progress: 1, ease: 'none' });

    // Mathematical parameters derived from state.progress
    // Scene 1 (0.0 - 0.2): Flat line
    // Scene 2 (0.2 - 0.4): Wavy lines
    // Scene 3 (0.4 - 0.6): Intersecting / Chaos
    // Scene 4 (0.6 - 0.8): Brain morph
    // Scene 5 (0.8 - 1.0): Dispersal

    const linesCount = 40;
    const pointsPerLine = 200;

    // Load the brain scan image and extract target pixels
    const targetPixels: {x: number, y: number}[] = [];
    const img = new Image();
    img.src = '/assets/brain_scan.png'; // Make sure this image is high contrast!
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      const octx = offscreen.getContext('2d');
      if (!octx) return;
      
      // Calculate a scaled size for the brain image to fit center screen
      const scale = Math.min(width, height) * 0.6 / Math.max(img.width, img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      
      offscreen.width = width;
      offscreen.height = height;
      
      // Draw centered
      const ox = (width - dw) / 2;
      const oy = (height - dh) / 2;
      
      octx.drawImage(img, ox, oy, dw, dh);
      
      const imgData = octx.getImageData(0, 0, width, height);
      const data = imgData.data;
      
      // Sample pixels
      for (let y = 0; y < height; y += 4) { // Step size determines particle density
        for (let x = 0; x < width; x += 4) {
          const index = (y * width + x) * 4;
          // If pixel is bright enough (white/gray)
          if (data[index] > 100) {
            targetPixels.push({ x, y });
          }
        }
      }
      
      // Shuffle target pixels so assignment looks organic
      targetPixels.sort(() => Math.random() - 0.5);
    };

    // Pre-allocate points for lines
    // Each line has an array of points {x, y, targetIndex}
    const lines: { offset: number, points: { x: number, target: number }[] }[] = [];
    let pixelCounter = 0;

    for (let i = 0; i < linesCount; i++) {
      const points = [];
      for (let j = 0; j < pointsPerLine; j++) {
        points.push({
          x: (j / (pointsPerLine - 1)) * width,
          target: pixelCounter++ // Will be modulo'd later if we don't have enough pixels
        });
      }
      lines.push({ offset: i, points });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0A0D14';
      ctx.fillRect(0, 0, width, height);
      
      time += 0.01;
      
      // Calculate derived parameters based on progress
      const p = state.progress;
      
      let baseAmplitude = 0;
      let frequency = 0.005;
      let chaos = 0;
      let morphFactor = 0;
      let disperseFactor = 0;
      
      if (p < 0.2) {
        // Scene 1: Flat line to slight wave
        const localP = p / 0.2;
        baseAmplitude = localP * 20;
      } else if (p < 0.4) {
        // Scene 2: Wavy lines expanding
        const localP = (p - 0.2) / 0.2;
        baseAmplitude = 20 + localP * 100;
        frequency = 0.005 + localP * 0.005;
      } else if (p < 0.6) {
        // Scene 3: Chaos and intertwining
        const localP = (p - 0.4) / 0.2;
        baseAmplitude = 120 + localP * 50;
        frequency = 0.01 + localP * 0.01;
        chaos = localP * Math.PI * 2; // phase shifts
      } else if (p < 0.8) {
        // Scene 4: Morph into brain
        const localP = Math.min((p - 0.6) / 0.15, 1); // Morph finishes slightly before 0.8
        baseAmplitude = 170;
        frequency = 0.02;
        chaos = Math.PI * 2;
        // Ease the morph factor for snap effect
        morphFactor = localP < 0.5 ? 4 * localP * localP * localP : 1 - Math.pow(-2 * localP + 2, 3) / 2;
      } else {
        // Scene 5: Dispersal
        const localP = (p - 0.8) / 0.2;
        morphFactor = 1;
        disperseFactor = localP;
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

      const numActiveLines = p < 0.1 ? 1 : Math.min(linesCount, Math.ceil((p - 0.1) * 5 * linesCount));

      for (let i = 0; i < numActiveLines; i++) {
        const line = lines[i];
        
        ctx.beginPath();
        
        for (let j = 0; j < pointsPerLine; j++) {
          const pt = line.points[j];
          
          // Base math position
          const wavePhase = (pt.x * frequency) + time + (line.offset * chaos * 0.1);
          const ySine = height / 2 + Math.sin(wavePhase) * baseAmplitude + Math.cos(wavePhase * 0.5) * (baseAmplitude * 0.5);
          const currentY = ySine + (line.offset - linesCount/2) * (10 * Math.max(0, 1 - chaos/Math.PI));
          
          let drawX = pt.x;
          let drawY = currentY;

          // If morphing into the brain
          if (morphFactor > 0 && targetPixels.length > 0) {
            const tPix = targetPixels[pt.target % targetPixels.length];
            // Disperse factor pushes them outwards randomly
            const dispX = disperseFactor > 0 ? (Math.random() - 0.5) * disperseFactor * 1000 : 0;
            const dispY = disperseFactor > 0 ? (Math.random() - 0.5) * disperseFactor * 1000 : 0;
            
            drawX = drawX + (tPix.x + dispX - drawX) * morphFactor;
            drawY = drawY + (tPix.y + dispY - drawY) * morphFactor;
          }

          if (j === 0) {
            ctx.moveTo(drawX, drawY);
          } else {
            ctx.lineTo(drawX, drawY);
          }
          
          // Draw nodes randomly on the lines
          if (j % 50 === 0 && morphFactor === 0 && p > 0.15) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(drawX, drawY, 3 + Math.sin(time + j)*2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        
        if (morphFactor < 0.9) {
          ctx.stroke(); // Don't draw the connecting line fully when it's a particle brain
        } else {
          // Draw them as points when fully morphed
          for (let j = 0; j < pointsPerLine; j++) {
            const pt = line.points[j];
            const tPix = targetPixels[pt.target % targetPixels.length];
            const dispX = disperseFactor > 0 ? (Math.random() - 0.5) * disperseFactor * 1000 : 0;
            const dispY = disperseFactor > 0 ? (Math.random() - 0.5) * disperseFactor * 1000 : 0;
            
            let drawX = pt.x + (tPix.x + dispX - pt.x) * morphFactor;
            let drawY = height/2 + Math.sin((pt.x * frequency) + time) * baseAmplitude; 
            drawY = drawY + (tPix.y + dispY - drawY) * morphFactor;
            
            ctx.fillRect(drawX, drawY, 2, 2);
          }
        }
      }
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
      style={{ background: '#0A0D14' }}
    />
  );
}
