'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const EmotionalScatterPlot: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{valence: number, arousal: number, size: number}[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Fetch initial history
    fetch('http://localhost:8000/telemetry/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(historyResp => {
      if (historyResp.status === 'success' && historyResp.data) {
        const historyData = historyResp.data.map((item: any) => ({
          valence: (item.valence * 2) - 1,
          arousal: (item.arousal * 2) - 1,
          size: 6
        }));
        setData(historyData);
      }
    })
    .catch(err => console.error("Error fetching history:", err));

    // Connect WebSocket for live updates
    const ws = new WebSocket(`ws://localhost:8000/ws/stream/live?token=${token}`);
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.metrics) {
        const v = (parsed.metrics.valence * 2) - 1;
        const a = (parsed.metrics.arousal * 2) - 1;
        setData(prev => {
          const newData = [...prev, { valence: v, arousal: a, size: 8 }];
          return newData.length > 50 ? newData.slice(newData.length - 50) : newData;
        });
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = 600;
    const height = 400;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent')
      .style('border-radius', '12px');

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([-1, 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([-1, 1])
      .range([innerHeight, 0]);

    // Grid lines
    const makeXGridLines = () => d3.axisBottom(xScale).ticks(5);
    const makeYGridLines = () => d3.axisLeft(yScale).ticks(5);

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(makeXGridLines()
        .tickSize(-innerHeight)
        .tickFormat(() => '')
      )
      .call(g => g.selectAll('.tick line')
        .attr('stroke', '#374151')
        .attr('stroke-dasharray', '2,2'))
      .call(g => g.select('.domain').remove());

    g.append('g')
      .attr('class', 'grid')
      .call(makeYGridLines()
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .call(g => g.selectAll('.tick line')
        .attr('stroke', '#374151')
        .attr('stroke-dasharray', '2,2'))
      .call(g => g.select('.domain').remove());

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight / 2})`)
      .call(xAxis)
      .attr('color', '#6B7280')
      .call(g => g.select('.domain').attr('stroke', '#4B5563').attr('stroke-width', 2));

    g.append('g')
      .attr('transform', `translate(${innerWidth / 2},0)`)
      .call(yAxis)
      .attr('color', '#6B7280')
      .call(g => g.select('.domain').attr('stroke', '#4B5563').attr('stroke-width', 2));

    // Scatter points
    g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.valence))
      .attr('cy', d => yScale(d.arousal))
      .attr('r', d => d.size)
      .attr('fill', d => d.valence > 0 ? (d.arousal > 0 ? '#10B981' : '#3B82F6') : (d.arousal > 0 ? '#EF4444' : '#8B5CF6'))
      .attr('opacity', (_, i) => 0.2 + (0.8 * (i / data.length)))
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 1.5)
      .style('transition', 'all 0.3s ease');

    // Connect dots with a path to show emotional trajectory
    const line = d3.line<any>()
      .x(d => xScale(d.valence))
      .y(d => yScale(d.arousal))
      .curve(d3.curveCatmullRom);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5)
      .attr('d', line);

    // Labels
    g.append('text')
      .attr('x', innerWidth)
      .attr('y', innerHeight / 2 - 10)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .style('text-anchor', 'end')
      .text('Positive Valence');

    g.append('text')
      .attr('x', innerWidth / 2 + 10)
      .attr('y', 10)
      .attr('fill', '#9CA3AF')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text('High Arousal');

  }, [data]);

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 tracking-wide">
        Affect Trajectory
      </h2>
      <div className="relative">
        <svg ref={svgRef} className="filter drop-shadow-lg"></svg>
        <div className="absolute top-4 left-4 flex flex-col gap-2 text-xs font-mono">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Angry / Anxious</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Happy / Excited</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Sad / Depressed</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Calm / Relaxed</div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalScatterPlot;

