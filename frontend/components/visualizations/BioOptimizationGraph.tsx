'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, Search, Mic, ChevronLeft, ChevronRight, Activity, Smile, Frown, Zap, Music } from 'lucide-react';

export default function ListeningJourneyTimeline({ history = [] }: { history?: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean, x: number, y: number, data: any }>({ visible: false, x: 0, y: 0, data: null });

  // Process History into Sessions
  const sessions = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...history]
      .filter(t => t.time)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    if (sorted.length === 0) return [];

    const grouped = [];
    let currentSession: any = null;

    sorted.forEach(track => {
      const trackTime = new Date(track.time).getTime();
      if (!currentSession) {
        currentSession = {
          tracks: [track],
          startTime: trackTime,
          endTime: trackTime,
        };
      } else {
        // Group if within 90 minutes
        if (trackTime - currentSession.endTime <= 90 * 60 * 1000) {
          currentSession.tracks.push(track);
          currentSession.endTime = trackTime;
        } else {
          grouped.push(currentSession);
          currentSession = {
            tracks: [track],
            startTime: trackTime,
            endTime: trackTime,
          };
        }
      }
    });
    if (currentSession) grouped.push(currentSession);

    // Map to graph data format
    return grouped.map(s => {
      const avgMood = s.tracks.reduce((acc: number, t: any) => acc + (t.valence ?? 0.5), 0) / s.tracks.length;
      const avgTempo = s.tracks.reduce((acc: number, t: any) => acc + (t.energy ?? 0.5), 0) / s.tracks.length;
      const midTime = new Date((s.startTime + s.endTime) / 2);
      return {
        date: midTime,
        mood: avgMood * 100, 
        tempo: avgTempo * 100, 
        tracks: s.tracks
      };
    });
  }, [history]);

  useEffect(() => {
    if (!svgRef.current || sessions.length === 0) return;

    // We get the exact dimensions of the container so the D3 graph fills it properly
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 400;
    
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(sessions, d => d.date) || new Date();
    const xMax = d3.max(sessions, d => d.date) || new Date();
    
    // Add 5% padding to X axis domain
    const timePadding = (xMax.getTime() - xMin.getTime()) * 0.05;
    const paddedMin = new Date(xMin.getTime() - timePadding);
    const paddedMax = new Date(xMax.getTime() + timePadding);

    const xScale = d3.scaleTime().domain([paddedMin, paddedMax]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Defs for gradients
    const defs = svg.append('defs');
    
    // Mood Area Gradient
    defs.append('linearGradient')
      .attr('id', 'moodGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#A855F7', opacity: 0.5 },
        { offset: '100%', color: '#A855F7', opacity: 0.01 }
      ])
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)
      .attr('stop-opacity', d => d.opacity);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale).ticks(8).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .selectAll('line').attr('stroke', '#ffffff');

    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(-innerHeight).tickFormat(() => ''))
      .call(g => g.select('.domain').remove())
      .selectAll('line').attr('stroke', '#ffffff');

    // Axes
    const yAxisTicks = ["0", "20", "40", "60", "80", "100"];
    g.append('g')
      .call(d3.axisLeft(yScale).tickValues([0, 20, 40, 60, 80, 100]).tickFormat((d) => `${d}`))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#6B7280').attr('font-size', '10px');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight + 15})`)
      .call(d3.axisBottom(xScale).ticks(7).tickFormat((d: any) => d3.timeFormat("%b %d")(d)))
      .call(g => g.select('.domain').remove())
      .selectAll('text').attr('fill', '#6B7280').attr('font-size', '10px');

    // Line Generators
    const moodLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.date))
      .y(d => yScale(d.mood));

    const tempoLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.date))
      .y(d => yScale(d.tempo));

    const moodArea = d3.area<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(d.mood));

    // Scatter points background logic (we just add a few random background dots for aesthetics)
    const scatterPoints = Array.from({ length: 15 }).map(() => ({
      x: paddedMin.getTime() + Math.random() * (paddedMax.getTime() - paddedMin.getTime()),
      y: Math.random() * 100,
      r: Math.random() * 2 + 1,
      opacity: Math.random() * 0.3 + 0.1
    }));

    g.selectAll('.bg-scatter')
      .data(scatterPoints)
      .join('circle')
      .attr('cx', d => xScale(new Date(d.x)))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => d.r)
      .attr('fill', '#A855F7')
      .attr('opacity', d => d.opacity);

    // Mood Area
    g.append('path')
      .datum(sessions)
      .attr('fill', 'url(#moodGradient)')
      .attr('d', moodArea);

    // Mood Line (Purple)
    g.append('path')
      .datum(sessions)
      .attr('fill', 'none')
      .attr('stroke', '#A855F7')
      .attr('stroke-width', 4)
      .attr('d', moodLine)
      .attr('filter', 'drop-shadow(0px 0px 8px rgba(168, 85, 247, 0.6))');

    // Tempo Line (Blue)
    g.append('path')
      .datum(sessions)
      .attr('fill', 'none')
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', 3)
      .attr('d', tempoLine)
      .attr('filter', 'drop-shadow(0px 0px 6px rgba(59, 130, 246, 0.5))');

    // Interactive Nodes for Hover Tooltip
    g.selectAll('.session-node')
      .data(sessions)
      .join('circle')
      .attr('class', 'session-node cursor-crosshair')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.mood))
      .attr('r', 8)
      .attr('fill', '#12101C')
      .attr('stroke', '#A855F7')
      .attr('stroke-width', 3)
      .attr('filter', 'drop-shadow(0px 0px 4px rgba(168, 85, 247, 0.9))')
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).attr('r', 12).attr('stroke', '#fff');
        setTooltip({
          visible: true,
          x: xScale(d.date) + margin.left,
          y: yScale(d.mood) + margin.top,
          data: d
        });
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('r', 8).attr('stroke', '#A855F7');
        setTooltip(prev => ({ ...prev, visible: false }));
      });

  }, [sessions]);

  // Determine date string for the header based on the data
  const headerDateStr = sessions.length > 0 
    ? `${d3.timeFormat("%b %d")(sessions[0].date)} - ${d3.timeFormat("%b %d, %Y")(sessions[sessions.length - 1].date)}`
    : "No History Data";

  return (
    <div ref={containerRef} className="bg-[#12101C] border border-white/5 rounded-2xl flex flex-col relative overflow-hidden h-full">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <ArrowLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
          <h2 className="text-[16px] font-bold text-white tracking-widest uppercase">
            Listening Journey Timeline
          </h2>
        </div>
        
        <div className="flex items-center bg-white/5 rounded-full px-4 py-2 w-64 border border-white/10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-transparent border-none outline-none text-[13px] text-white px-3 flex-1" 
          />
          <Mic className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white shrink-0" />
        </div>
      </div>

      {/* Sub-header (Controls) */}
      <div className="flex items-center justify-between px-6 py-4 relative z-10">
        <div className="flex gap-2">
          <button className="px-4 py-1.5 rounded-full bg-[#D9F99D] text-black font-bold text-[13px]">
            Timeline
          </button>
          <button className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white font-medium text-[13px] hover:bg-white/10">
            Grid View
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white font-medium text-[14px]">{headerDateStr}</span>
          <div className="flex gap-2">
            <button className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Legend */}
      <div className="absolute top-[100px] right-8 flex items-center gap-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_10px_#A855F7]"></div>
          <span className="text-[11px] text-gray-400">Mood Intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]"></div>
          <span className="text-[11px] text-gray-400">Tempo Line</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 w-full relative min-h-0">
        {sessions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm font-medium">
                No session data available.
            </div>
        )}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
        
        {/* Interactive Tooltip Overlay */}
        {tooltip.visible && tooltip.data && (
            <div 
                className="absolute z-50 bg-[#1A1C23]/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+15px)] flex flex-col gap-3 min-w-[220px]"
                style={{
                    left: tooltip.x,
                    top: tooltip.y,
                }}
            >
                {/* Tooltip Header */}
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-white font-bold text-sm">
                        {d3.timeFormat("%B %d, %I:%M %p")(tooltip.data.date)}
                    </span>
                    <div className="bg-white/10 px-2 py-0.5 rounded-md">
                        <span className="text-gray-300 text-[10px] uppercase font-bold">{tooltip.data.tracks.length} Tracks</span>
                    </div>
                </div>

                {/* Tooltip Stats */}
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Avg Mood</span>
                        <span className="text-[#A855F7] font-black text-lg">{Math.round(tooltip.data.mood)}<span className="text-[10px]">%</span></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Avg Energy</span>
                        <span className="text-[#3B82F6] font-black text-lg">{Math.round(tooltip.data.tempo)}<span className="text-[10px]">%</span></span>
                    </div>
                </div>

                {/* Track List (Max 3) */}
                <div className="flex flex-col gap-1.5 mt-1">
                    {tooltip.data.tracks.slice(0, 3).map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            <Music className="w-3 h-3 text-gray-500" />
                            <div className="flex flex-col overflow-hidden whitespace-nowrap text-ellipsis max-w-[180px]">
                                <span className="text-gray-200 text-xs font-medium truncate">{t.track_name}</span>
                                <span className="text-gray-500 text-[10px] truncate">{t.artist_name}</span>
                            </div>
                        </div>
                    ))}
                    {tooltip.data.tracks.length > 3 && (
                        <span className="text-gray-500 text-[10px] italic pl-5">+ {tooltip.data.tracks.length - 3} more</span>
                    )}
                </div>
                
                {/* Tooltip Arrow pointing down */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1A1C23] border-b border-r border-white/10 transform rotate-45"></div>
            </div>
        )}
      </div>

      {/* Bottom Legend */}
      <div className="flex justify-center gap-6 py-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shadow-[0_0_10px_#A855F7]"></div>
          <span className="text-[11px] text-gray-400">Mood Intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]"></div>
          <span className="text-[11px] text-gray-400">Tempo Line</span>
        </div>
      </div>
    </div>
  );
}
