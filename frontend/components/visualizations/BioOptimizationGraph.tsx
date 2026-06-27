'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

const EnhancedBioOptimizationGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{time: number, hr: number, reward: number}[]>([]);
  const [latestData, setLatestData] = useState<any>(null);

  useEffect(() => {
    // Simulated live data since there's no actual WebSocket backend running
    let t = 0;
    const interval = setInterval(() => {
      const newPoint = { 
        time: t++, 
        hr: 60 + Math.random() * 30 + Math.sin(t / 5) * 10, 
        reward: 40 + Math.random() * 20 + Math.cos(t / 5) * 10 
      };
      setLatestData(newPoint);
      setData(prev => {
        const newData = [...prev, newPoint];
        return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(data, d => d.time) || 0;
    const xMax = d3.max(data, d => d.time) || 19;
    
    const xScale = d3.scaleLinear().domain([xMin, Math.max(xMax, 19)]).range([0, innerWidth]);
    const yHrScale = d3.scaleLinear().domain([50, 100]).range([innerHeight, 0]);
    const yRewardScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // GRADIENT DEFINITIONS
    const defs = svg.append('defs');
    
    // Reward gradient
    defs.append('linearGradient')
      .attr('id', 'rewardGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#8B5CF6', opacity: 0.6 },
        { offset: '100%', color: '#8B5CF6', opacity: 0 }
      ])
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color)
      .attr('stop-opacity', d => d.opacity);

    // ANIMATED GRID
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yHrScale).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove());

    // LINE GENERATORS
    const hrLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yHrScale(d.hr));

    const rewardLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yRewardScale(d.reward));

    // REWARD LINE WITH GLOW (Primary)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8B5CF6')
      .attr('stroke-width', 4)
      .attr('d', rewardLine)
      .attr('filter', 'drop-shadow(0px 0px 12px rgba(139, 92, 246, 0.8))')
      .attr('opacity', 0.8);

    // AREA UNDER REWARD LINE
    const area = d3.area<any>()
      .x(d => xScale(d.time))
      .y0(innerHeight)
      .y1(d => yRewardScale(d.reward))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#rewardGradient)')
      .attr('d', area)
      .attr('opacity', 0.6);

    // HR LINE (Secondary - dashed)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10B981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8,4')
      .attr('d', hrLine)
      .attr('opacity', 0.7);

    // ANIMATED DATA POINTS ON REWARD LINE
    g.selectAll('.reward-point')
      .data(data.slice(-5))
      .join('circle')
      .attr('class', 'reward-point')
      .attr('cx', d => xScale(d.time))
      .attr('cy', d => yRewardScale(d.reward))
      .attr('r', (_, i) => 2 + (i * 1.5))
      .attr('fill', '#8B5CF6')
      .attr('opacity', 0.4 + (Math.random() * 0.6));

    // AXES
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(() => ''))
      .attr('color', '#3f3f46');

    g.append('g')
      .call(d3.axisLeft(yHrScale).ticks(5))
      .attr('color', '#10B981');

    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yRewardScale).ticks(5))
      .attr('color', '#8B5CF6');

  }, [data]);

  return (
    <motion.div 
      className="flex flex-col w-full h-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl pointer-events-none" />
      
      {/* Header with badges */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
          DRL Bio-Optimization
        </h3>
        <div className="flex gap-3">
          {latestData && (
            <>
              <motion.div
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
              >
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  {Math.round(latestData.hr)} BPM
                </span>
              </motion.div>
              <motion.div
                className="px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/50"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <span className="text-purple-400 font-bold text-xs flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                  {latestData.reward.toFixed(1)} Reward
                </span>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-grow w-full relative">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-xs mt-4 relative z-10">
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
          <span className="text-emerald-400">Heart Rate</span>
        </motion.div>
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"></div>
          <span className="text-purple-400">AI Reward</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EnhancedBioOptimizationGraph;
