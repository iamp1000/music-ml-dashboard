'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const DissonanceChart: React.FC = () => {
  const audioBarRef = useRef<HTMLDivElement>(null);
  const lyricBarRef = useRef<HTMLDivElement>(null);
  
  const [audioValence, setAudioValence] = useState(0);
  const [lyricalValence, setLyricalValence] = useState(0);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/stream/live");
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.dissonance) {
        setAudioValence(parsed.dissonance.acoustic_valence);
        setLyricalValence(parsed.dissonance.lyrical_valence);
        
        gsap.to(audioBarRef.current, {
          width: `${parsed.dissonance.acoustic_valence * 100}%`,
          duration: 0.5,
          ease: 'expo.out'
        });

        gsap.to(lyricBarRef.current, {
          width: `${parsed.dissonance.lyrical_valence * 100}%`,
          duration: 0.5,
          ease: 'expo.out'
        });
      }
    };
    return () => ws.close();
  }, []);

  const dissonanceScore = Math.abs(audioValence - lyricalValence);
  const isHighDissonance = dissonanceScore > 0.4;

  return (
    <div className="flex flex-col w-full h-full justify-center gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Multi-modal Dissonance</h3>
        {isHighDissonance ? (
          <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full border border-rose-500/30">High Dissonance Detected</span>
        ) : (
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700">Aligned Sentiment</span>
        )}
      </div>
      
      <div className="flex flex-col gap-4">
        {/* Acoustic Valence */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Acoustic Valence (CNN)</span>
            <span className="text-emerald-400">{audioValence.toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div ref={audioBarRef} className="h-full w-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"></div>
          </div>
        </div>

        {/* Lyrical Valence */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Lyrical Sentiment (BERT)</span>
            <span className="text-rose-400">{lyricalValence.toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div ref={lyricBarRef} className="h-full w-0 bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DissonanceChart;
