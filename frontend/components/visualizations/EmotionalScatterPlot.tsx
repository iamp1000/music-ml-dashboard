'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

interface EmotionalScatterPlotProps {
  history?: any[];
}

const EmotionalScatterPlot: React.FC<EmotionalScatterPlotProps> = ({ history }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const data = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.slice(0, 50).map((item, i) => ({
      x: ((item.valence ?? 0.5) * 2) - 1,     // Map 0-1 to -1 to 1
      y: ((item.energy ?? item.arousal ?? 0.5) * 2) - 1,
      name: item.track_name || `Track ${i + 1}`,
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

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([-1, 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([-1, 1]).range([innerHeight, 0]);

    // Enhanced quadrant rendering
    const quadrants = [
      { name: 'Excited', x: 'right', y: 'top', icon: '🔥', color: '#ef4444' },
      { name: 'Happy', x: 'left', y: 'top', icon: '😊', color: '#22c55e' },
      { name: 'Sad', x: 'left', y: 'bottom', icon: '😢', color: '#8b5cf6' },
      { name: 'Calm', x: 'right', y: 'bottom', icon: '😌', color: '#3b82f6' },
    ];

    quadrants.forEach(q => {
      g.append('text')
        .attr('x', q.x === 'right' ? innerWidth - 20 : 20)
        .attr('y', q.y === 'top' ? 20 : innerHeight - 20)
        .attr('text-anchor', q.x === 'right' ? 'end' : 'start')
        .attr('fill', q.color)
        .attr('opacity', 0.2)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(`${q.icon} ${q.name}`);
    });

    // Crosshairs
    g.append('line')
      .attr('x1', xScale(0))
      .attr('y1', 0)
      .attr('x2', xScale(0))
      .attr('y2', innerHeight)
      .attr('stroke', '#3f3f46')
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(0))
      .attr('x2', innerWidth)
      .attr('y2', yScale(0))
      .attr('stroke', '#3f3f46')
      .attr('stroke-dasharray', '4,4');

    // Emotional trajectory line connecting the dots
    const line = d3.line<any>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveCatmullRom);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.15)
      .attr('d', line);

    // Data points with fade-in
    g.selectAll('.dot')
      .data(data)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 0)
      .attr('fill', d => {
        if (d.x > 0 && d.y > 0) return '#ef4444';
        if (d.x < 0 && d.y > 0) return '#22c55e';
        if (d.x < 0 && d.y < 0) return '#8b5cf6';
        return '#3b82f6';
      })
      .attr('opacity', (_, i) => 0.3 + (0.7 * (i / data.length)))
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 1)
      .transition()
      .duration(800)
      .delay((_, i) => i * 20)
      .attr('r', (_, i) => i === data.length - 1 ? 8 : 5);

  }, [data]);

  if (!data || data.length === 0) {
    return (
      <motion.div
        className="flex flex-col w-full h-full relative p-4 bg-slate-900/50 rounded-2xl border border-slate-800 items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-sm text-gray-500">No emotional data available yet.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col w-full h-full relative p-4 bg-slate-900/50 rounded-2xl border border-slate-800"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-2">
        Emotional Scatter Plot
      </h3>
      <div className="flex-grow w-full relative min-h-[300px]">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet"></svg>
      </div>
    </motion.div>
  );
};

export default EmotionalScatterPlot;
