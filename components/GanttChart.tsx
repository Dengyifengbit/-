
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, differenceInMinutes, addMinutes, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { CalendarEvent } from '../types';
import { cn } from '../utils';
import { Icons } from './Icons';

interface GanttChartProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date) => void;
  onClose: () => void;
}

type ZoomLevel = 'day' | 'week' | 'month';
type GanttViewType = 'tracks' | 'fishbone';

export const GanttChart: React.FC<GanttChartProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventDrop,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewType, setViewType] = useState<GanttViewType>('tracks');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // --- Configuration ---
  const getConfig = () => {
    switch (zoomLevel) {
      case 'day':
        return {
          pxPerMin: 2,
          tickLabelFormat: 'HH:mm',
          majorTickMinutes: 60,
          viewDurationDays: 1,
          headerFormat: 'MM月dd日'
        };
      case 'week':
        return {
          pxPerMin: 0.25, 
          tickLabelFormat: 'MM/dd',
          majorTickMinutes: 360, // 6 hours
          viewDurationDays: 7, 
          headerFormat: 'EEE'
        };
      case 'month':
      default:
        return {
          pxPerMin: 0.05, 
          tickLabelFormat: 'd',
          majorTickMinutes: 1440,
          viewDurationDays: 30,
          headerFormat: 'MM月'
        };
    }
  };

  const config = getConfig();

  const timelineStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const timelineEnd = addDays(timelineStart, config.viewDurationDays);
  const totalMinutes = differenceInMinutes(timelineEnd, timelineStart);
  const totalWidth = totalMinutes * config.pxPerMin;

  // --- Bin Packing Algorithm for Time Tracks ---
  // Calculates layout rows so events stack nicely like video tracks
  const packedEvents = useMemo(() => {
      // 1. Sort events by start time
      const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
      
      const tracks: CalendarEvent[][] = [];
      const placedEvents: { event: CalendarEvent; trackIndex: number }[] = [];

      sorted.forEach(ev => {
          let placed = false;
          // Try to fit in existing tracks
          for (let i = 0; i < tracks.length; i++) {
              const lastInTrack = tracks[i][tracks[i].length - 1];
              // Simple check: if start time > last event end time in this track
              // Add a small buffer for visual spacing
              if (ev.start.getTime() >= lastInTrack.end.getTime()) {
                  tracks[i].push(ev);
                  placedEvents.push({ event: ev, trackIndex: i });
                  placed = true;
                  break;
              }
          }
          // Create new track
          if (!placed) {
              tracks.push([ev]);
              placedEvents.push({ event: ev, trackIndex: tracks.length - 1 });
          }
      });
      return placedEvents;
  }, [events]);


  // --- Hooks ---
  useEffect(() => {
    if (scrollContainerRef.current && viewType === 'tracks') {
      const now = new Date();
      const diff = differenceInMinutes(now, timelineStart);
      if (diff > 0) {
        scrollContainerRef.current.scrollLeft = (diff * config.pxPerMin) - 100;
      }
    }
  }, [zoomLevel, timelineStart, viewType]);

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('gantt-event-id', event.id);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('gantt-event-id');
    const event = events.find(ev => ev.id === eventId);
    
    if (event && scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
        const newMinutes = offsetX / config.pxPerMin;
        const snappedMinutes = Math.round(newMinutes / 15) * 15;
        const newStart = addMinutes(timelineStart, snappedMinutes);
        onEventDrop(event, newStart);
    }
  };


  // --- Render Components ---

  const renderTimeTracks = () => {
     // Generate Ticks
     const ticks = [];
     for (let m = 0; m <= totalMinutes; m += config.majorTickMinutes) {
       ticks.push({
         offset: m * config.pxPerMin,
         label: format(addMinutes(timelineStart, m), config.tickLabelFormat),
         date: addMinutes(timelineStart, m)
       });
     }

     return (
        <div 
            className="flex-1 overflow-x-auto overflow-y-auto bg-[#1e1e24] relative cursor-crosshair select-none custom-scrollbar"
            ref={scrollContainerRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ WebkitOverflowScrolling: 'touch' }} // Smooth scroll on iOS
        >
            <div style={{ width: Math.max(totalWidth, 800), height: '100%', minHeight: '600px' }} className="relative pb-20">
                
                {/* Dark Ruler */}
                <div className="sticky top-0 h-10 bg-[#2b2b36] border-b border-white/10 z-20 flex items-end text-xs text-slate-400 font-mono select-none shadow-md">
                    {ticks.map((tick, i) => (
                        <div key={i} className="absolute bottom-0 border-l border-white/20 pl-1 pb-1 text-[10px] md:text-xs" style={{ left: tick.offset }}>
                            {tick.label}
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute inset-0 top-10 pointer-events-none z-0">
                    {ticks.map((tick, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: tick.offset }}></div>
                    ))}
                </div>

                {/* Now Indicator */}
                {(() => {
                    const now = new Date();
                    const diff = differenceInMinutes(now, timelineStart);
                    if (diff >= 0) {
                        return (
                            <div className="absolute top-0 bottom-0 border-l border-rose-500 z-30 pointer-events-none" style={{ left: diff * config.pxPerMin }}>
                                <div className="absolute top-0 -left-2 bg-rose-500 text-white text-[10px] px-1 rounded-b-sm font-bold">NOW</div>
                            </div>
                        )
                    }
                    return null;
                })()}

                {/* Tracks Container */}
                <div className="pt-6 px-0 relative z-10">
                    {packedEvents.map(({ event, trackIndex }) => {
                        const startDiff = differenceInMinutes(event.start, timelineStart);
                        const duration = differenceInMinutes(event.end, event.start);
                        const left = startDiff * config.pxPerMin;
                        const width = Math.max(duration * config.pxPerMin, 10);
                        const isDone = event.status === 'done';
                        
                        return (
                            <div
                                key={event.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, event)}
                                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                className={cn(
                                    "absolute h-10 md:h-10 rounded-lg shadow-lg border flex items-center px-2 md:px-3 text-[10px] md:text-xs font-bold transition-all group cursor-pointer md:cursor-grab active:cursor-grabbing hover:z-50 hover:scale-[1.02] hover:shadow-xl hover:brightness-110",
                                    isDone 
                                        ? "bg-slate-700 border-slate-600 text-slate-400" 
                                        : "bg-indigo-600 border-indigo-400 text-white"
                                )}
                                style={{
                                    left: left,
                                    width: width,
                                    top: trackIndex * 50 // 40px height + 10px gap
                                }}
                            >
                                <span className="truncate w-full">{event.title}</span>
                                
                                {/* Progress Bar (Simulated) */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                    <div className={cn("h-full", isDone ? "bg-emerald-400 w-full" : "bg-white/50 w-1/3")}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
     );
  };

  const renderFishbone = () => {
    // Group events by tag (or default 'Other')
    const grouped: Record<string, CalendarEvent[]> = {};
    const defaultTag = '杂项';
    
    events.forEach(ev => {
        const tag = (ev.tags && ev.tags[0]) ? ev.tags[0] : defaultTag;
        // Translate common tags for display
        const displayTag = tag === 'work' ? '工作' : tag === 'life' ? '生活' : tag === 'study' ? '学习' : tag;
        
        if (!grouped[displayTag]) grouped[displayTag] = [];
        grouped[displayTag].push(ev);
    });

    const categories = Object.keys(grouped);
    
    // SVG Config
    const width = 1000;
    const height = 600;
    const spineY = height / 2;
    const headX = width - 100;
    const tailX = 50;
    
    return (
        <div className="flex-1 bg-white relative overflow-auto flex items-center justify-center p-4 md:p-8 animate-fade-in custom-scrollbar">
             {/* Wrapper ensures min width on mobile so SVG doesn't squish */}
             <div className="relative w-full max-w-5xl aspect-video border-4 border-slate-900 bg-[#fdfbf7] rounded-xl shadow-2xl overflow-hidden p-4 md:p-8 min-w-[800px] overflow-x-auto">
                <div className="absolute top-4 left-4 text-xs md:text-sm font-bold text-slate-400 tracking-widest uppercase">Logic View • Ishikawa</div>
                
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-md">
                    {/* Spine */}
                    <line x1={tailX} y1={spineY} x2={headX} y2={spineY} stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                    
                    {/* Fish Head (Goal) */}
                    <g transform={`translate(${headX}, ${spineY})`}>
                        <path d="M0,-40 C40,-20 60,0 60,0 C60,0 40,20 0,40 Z" fill="#334155" />
                        <text x="70" y="5" fontSize="16" fontWeight="bold" fill="#334155" alignmentBaseline="middle">项目达成</text>
                        {/* Eye */}
                        <circle cx="20" cy="-10" r="4" fill="white" />
                    </g>
                    
                    {/* Fish Tail */}
                    <g transform={`translate(${tailX}, ${spineY})`}>
                         <path d="M0,0 L-40,-30 L-40,30 Z" fill="#334155" />
                    </g>

                    {/* Ribs & Spurs */}
                    {categories.map((cat, i) => {
                        const isTop = i % 2 === 0;
                        const spacing = (headX - tailX - 100) / (categories.length + 1);
                        const startX = tailX + spacing * (i + 1);
                        const endY = isTop ? spineY - 180 : spineY + 180;
                        const endX = startX + 60; // Slanted

                        return (
                            <g key={cat}>
                                {/* Rib */}
                                <line x1={startX} y1={spineY} x2={endX} y2={endY} stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                                
                                {/* Category Label */}
                                <rect x={endX - 30} y={isTop ? endY - 30 : endY + 10} width="80" height="24" rx="4" fill="#e2e8f0" />
                                <text x={endX + 10} y={isTop ? endY - 12 : endY + 28} fontSize="14" fontWeight="bold" fill="#475569" textAnchor="middle">{cat}</text>

                                {/* Task Spurs */}
                                {grouped[cat].map((ev, j) => {
                                    const spurY = isTop 
                                        ? spineY - 40 - (j * 35) 
                                        : spineY + 40 + (j * 35);
                                    
                                    // Interpolate X on the slanted rib line
                                    const progress = (Math.abs(spineY - spurY)) / 180;
                                    const spurRootX = startX + (60 * progress);
                                    const spurLen = 120;
                                    const isDone = ev.status === 'done';

                                    return (
                                        <g key={ev.id} className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => onEventClick(ev)}>
                                            {/* Spur Line */}
                                            <line 
                                                x1={spurRootX} y1={spurY} 
                                                x2={spurRootX + spurLen} y2={spurY} 
                                                stroke={isDone ? "#10b981" : "#94a3b8"} 
                                                strokeWidth="2" 
                                                strokeDasharray={isDone ? "" : "4 2"}
                                            />
                                            {/* Task Dot */}
                                            <circle cx={spurRootX} cy={spurY} r="4" fill={isDone ? "#10b981" : "#cbd5e1"} />
                                            
                                            {/* Task Label */}
                                            <text 
                                                x={spurRootX + 10} 
                                                y={spurY - 6} 
                                                fontSize="12" 
                                                fill={isDone ? "#059669" : "#64748b"}
                                                textDecoration={isDone ? "line-through" : "none"}
                                            >
                                                {ev.title}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
             </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] flex flex-col text-slate-200 animate-fade-in">
      {/* Top Toolbar (Responsive) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-3 bg-[#1e1e24] border-b border-white/5 shadow-md z-20 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <Icons.ChevronLeft size={18} /> <span className="hidden md:inline">返回</span>
          </button>
          
          {/* View Toggle */}
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
             <button 
                onClick={() => setViewType('tracks')}
                className={cn("px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold flex items-center gap-2 transition-all", viewType === 'tracks' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
             >
                <Icons.Tracks size={14} /> 时光轨道
             </button>
             <button 
                onClick={() => setViewType('fishbone')}
                className={cn("px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold flex items-center gap-2 transition-all", viewType === 'fishbone' ? "bg-amber-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
             >
                <Icons.Fish size={14} /> 逻辑骨架
             </button>
          </div>
        </div>

        {viewType === 'tracks' && (
            <div className="flex gap-2 self-end md:self-auto">
                {(['day', 'week', 'month'] as ZoomLevel[]).map(level => (
                    <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded-full border transition-all",
                        zoomLevel === level 
                        ? "bg-white text-black border-white" 
                        : "text-slate-400 border-white/10 hover:border-white/30"
                    )}
                    >
                    {level === 'day' ? '日' : level === 'week' ? '周' : '月'}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Content Area */}
      {viewType === 'tracks' ? renderTimeTracks() : renderFishbone()}
      
    </div>
  );
};
