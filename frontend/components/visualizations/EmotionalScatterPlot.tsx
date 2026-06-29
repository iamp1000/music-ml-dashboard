'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface EmotionalScatterPlotProps {
  history?: any[];
}

const EmotionalScatterPlot: React.FC<EmotionalScatterPlotProps> = ({ history }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    name: string;
    artist: string;
    valence: number;
    energy: number;
  }>({ visible: false, x: 0, y: 0, name: '', artist: '', valence: 0, energy: 0 });

  const data = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.filter(h => h.valence !== undefined && (h.energy !== undefined || h.arousal !== undefined)).map((item, i) => ({
      x: ((item.valence ?? 0.5) * 2) - 1,     // Map 0-1 to -1 to 1
      y: ((item.energy ?? item.arousal ?? 0.5) * 2) - 1,
      name: item.track_name || `Track ${i + 1}`,
      artist: item.artist_name || 'Unknown Artist',
      rawValence: item.valence ?? 0.5,
      rawEnergy: item.energy ?? item.arousal ?? 0.5
    }));
  }, [history]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const width = 500;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow-scatter");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([-1, 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([-1, 1]).range([innerHeight, 0]);

    // Enhanced quadrant rendering
    const quadrants = [
      { name: 'Energetic / Happy', x: 'right', y: 'top', color: '#FCD34D' }, // Yellow
      { name: 'Frantic / Angry', x: 'left', y: 'top', color: '#ef4444' }, // Red
      { name: 'Somber / Sad', x: 'left', y: 'bottom', color: '#8b5cf6' }, // Purple
      { name: 'Calm / Relaxed', x: 'right', y: 'bottom', color: '#38BDF8' }, // Blue
    ];

    quadrants.forEach(q => {
      g.append('text')
        .attr('x', q.x === 'right' ? innerWidth - 10 : 10)
        .attr('y', q.y === 'top' ? 20 : innerHeight - 10)
        .attr('text-anchor', q.x === 'right' ? 'end' : 'start')
        .attr('fill', q.color)
        .attr('opacity', 0.4)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.05em')
        .text(q.name);
    });

    // Crosshairs (Grid)
    g.append('line')
      .attr('x1', xScale(0))
      .attr('y1', 0)
      .attr('x2', xScale(0))
      .attr('y2', innerHeight)
      .attr('stroke', '#ffffff')
      .attr('stroke-opacity', 0.1)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(0))
      .attr('x2', innerWidth)
      .attr('y2', yScale(0))
      .attr('stroke', '#ffffff')
      .attr('stroke-opacity', 0.1)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    // Data points
    g.selectAll('.dot')
      .data(data)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 0)
      .attr('fill', d => {
        if (d.x > 0 && d.y > 0) return '#FCD34D'; // Yellow
        if (d.x <= 0 && d.y > 0) return '#ef4444'; // Red
        if (d.x <= 0 && d.y <= 0) return '#8b5cf6'; // Purple
        return '#38BDF8'; // Blue
      })
      .attr('filter', 'url(#glow-scatter)')
      .attr('opacity', 0.8)
      .style('cursor', 'crosshair')
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).attr('r', 8).attr('opacity', 1);
        
        // Calculate tooltip position relative to container
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
           setTooltip({
              visible: true,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              name: d.name,
              artist: d.artist,
              valence: Math.round(d.rawValence * 100),
              energy: Math.round(d.rawEnergy * 100)
           });
        }
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('r', 5).attr('opacity', 0.8);
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .transition()
      .duration(800)
      .delay((_, i) => i * 15)
      .attr('r', 5);

  }, [data]);

  return (
    <div ref={containerRef} className="bg-[#1A1C23] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden h-full">
      {/* Header matching other components */}
      <div className="flex items-start z-10 mb-2 relative">
          <div className="w-1 h-10 bg-purple-500 rounded-full mr-3 absolute -left-1 top-1"></div>
          <div className="flex flex-col ml-3">
              <h3 className="text-[16px] font-bold text-[#FCD34D] tracking-wide uppercase">
                  Emotional Scatter
              </h3>
              <p className="text-[14px] text-gray-300 font-normal mt-0.5">
                  Valence vs Energy Matrix
              </p>
          </div>
      </div>

      <div className="flex-grow w-full relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading emotional data...</p>
          </div>
        ) : (
          <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet"></svg>
        )}
      </div>

      {/* Interactive Tooltip */}
      {tooltip.visible && (
        <div 
          className="absolute z-50 pointer-events-none transition-opacity duration-150"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 15,
          }}
        >
          <div className="bg-[#2A2D3A] border border-white/10 rounded-lg shadow-xl px-4 py-3 min-w-[200px] backdrop-blur-xl">
            <p className="text-white font-bold text-[14px] truncate">{tooltip.name}</p>
            <p className="text-gray-400 text-[12px] truncate mb-2">{tooltip.artist}</p>
            <div className="flex justify-between items-center text-[11px]">
               <span className="text-white/60">Valence</span>
               <span className="text-[#FCD34D] font-mono">{tooltip.valence}%</span>
            </div>
            <div className="flex justify-between items-center text-[11px] mt-1">
               <span className="text-white/60">Energy</span>
               <span className="text-cyan-400 font-mono">{tooltip.energy}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalScatterPlot;
