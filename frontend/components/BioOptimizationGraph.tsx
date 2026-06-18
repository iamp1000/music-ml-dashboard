'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const BioOptimizationGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{time: number, hr: number, reward: number}[]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/stream/live");
    let t = 0;
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.telemetry) {
        setData(prev => {
          const newData = [...prev, { time: t++, hr: parsed.telemetry.hr, reward: parsed.telemetry.reward }];
          return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
        });
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(data, d => d.time) || 0;
    const xMax = d3.max(data, d => d.time) || 19;
    
    const xScale = d3.scaleLinear().domain([xMin, Math.max(xMax, 19)]).range([0, innerWidth]);
    const yHrScale = d3.scaleLinear().domain([50, 100]).range([innerHeight, 0]);
    const yRewardScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Grid
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yHrScale).tickSize(-innerWidth).tickFormat(() => ''))
      .call(g => g.select('.domain').remove());

    // Lines
    const hrLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yHrScale(d.hr));

    const rewardLine = d3.line<any>()
      .curve(d3.curveMonotoneX)
      .x(d => xScale(d.time))
      .y(d => yRewardScale(d.reward));

    // Draw Reward Line (glow effect)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#8B5CF6') // Purple
      .attr('stroke-width', 3)
      .attr('d', rewardLine)
      .attr('filter', 'drop-shadow(0px 0px 8px rgba(139, 92, 246, 0.6))');

    // Draw HR Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10B981') // Emerald
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', hrLine);

    // Axes
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
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">DRL Bio-Optimization</h3>
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Heart Rate (BPM)</span>
          <span className="text-purple-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400"></div> AI Reward Signal</span>
        </div>
      </div>
      <div className="flex-grow w-full relative">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
      </div>
    </div>
  );
};

export default BioOptimizationGraph;
