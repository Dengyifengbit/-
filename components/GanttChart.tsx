
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, differenceInMinutes, addMinutes, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';
import { CalendarEvent } from '../types';
import { cn } from '../utils';
import { Icons } from './Icons';

interface GanttChartProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date) => void;
  onEventUpdate: (id: string, updates: Partial<CalendarEvent>) => void;
  onClose: () => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

export const GanttChart: React.FC<GanttChartProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventDrop,
  onEventUpdate,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [showResources, setShowResources] = useState(false);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  
  // Interaction State for Left Panel
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [hoverRowId, setHoverRowId] = useState<string | null>(null); // For Drag Highlighting

  // Interaction State for Dependency Linking
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Configuration ---
  const getConfig = () => {
    switch (zoomLevel) {
      case 'day':
        return { pxPerDay: 200, tickFormat: 'd日 HH:mm', daysView: 7 };
      case 'week':
        return { pxPerDay: 80, tickFormat: 'd日', daysView: 30 };
      case 'month':
      default:
        return { pxPerDay: 40, tickFormat: 'MM/dd', daysView: 90 };
    }
  };
  const config = getConfig();

  const timelineStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const timelineDays = Array.from({ length: config.daysView }).map((_, i) => addDays(timelineStart, i));
  const totalWidth = config.daysView * config.pxPerDay;

  // --- Data Processing (Tree Flattening) ---
  const { visibleEvents, flattenedEvents } = useMemo(() => {
      // 1. Build Tree
      const rootEvents = events.filter(e => !e.parentId);
      const childMap: Record<string, CalendarEvent[]> = {};
      events.forEach(e => {
          if (e.parentId) {
              if (!childMap[e.parentId]) childMap[e.parentId] = [];
              childMap[e.parentId].push(e);
          }
      });

      // 2. Flatten based on collapsed state
      const flat: { event: CalendarEvent; depth: number }[] = [];
      
      const traverse = (ev: CalendarEvent, depth: number) => {
          flat.push({ event: ev, depth });
          if (!collapsedParents.has(ev.id) && childMap[ev.id]) {
              childMap[ev.id].forEach(child => traverse(child, depth + 1));
          }
      };
      
      rootEvents.forEach(root => traverse(root, 0));
      return { visibleEvents: flat, flattenedEvents: flat.map(f => f.event) };
  }, [events, collapsedParents]);

  // --- Timeline Drag & Drop (Rescheduling) ---
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('gantt-event-id', event.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('gantt-event-id');
    if (eventId) {
        const event = events.find(ev => ev.id === eventId);
        
        if (event && timelineRef.current) {
            const rect = timelineRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left + timelineRef.current.scrollLeft;
            
            // Calculate days offset
            const daysOffset = Math.floor(offsetX / config.pxPerDay);
            const newStart = addDays(timelineStart, daysOffset);
            // Maintain time of day
            newStart.setHours(event.start.getHours(), event.start.getMinutes());
            
            onEventDrop(event, newStart);
        }
    }
  };

  // --- Left Panel Structure Drag & Drop ---
  const handleStructureDragStart = (e: React.DragEvent, event: CalendarEvent) => {
      e.dataTransfer.setData('structure-id', event.id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleStructureDrop = (e: React.DragEvent, targetEvent: CalendarEvent) => {
      e.preventDefault();
      setHoverRowId(null);
      const draggedId = e.dataTransfer.getData('structure-id');
      
      if (!draggedId || draggedId === targetEvent.id) return;
      
      // Prevent circular dependency (cannot drop parent into child)
      let curr = targetEvent.parentId;
      let isInvalid = false;
      while (curr) {
          if (curr === draggedId) { isInvalid = true; break; }
          const parent = events.find(ev => ev.id === curr);
          curr = parent ? parent.parentId : undefined;
      }
      if (isInvalid) {
          alert("Cannot move a parent into its own child.");
          return;
      }

      // Execute Move (Grouping)
      onEventUpdate(draggedId, { parentId: targetEvent.id });
  };

  const handleStructureDragOver = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setHoverRowId(targetId);
  };

  const toggleCollapse = (id: string) => {
      const newSet = new Set(collapsedParents);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setCollapsedParents(newSet);
  };
  
  // --- Inline Editing ---
  const startEditing = (event: CalendarEvent) => {
      setEditingId(event.id);
      setTempTitle(event.title);
  };

  const saveEditing = () => {
      if (editingId && tempTitle.trim()) {
          onEventUpdate(editingId, { title: tempTitle });
      }
      setEditingId(null);
  };

  // --- Dependency Linking Logic ---
  const checkCircularDependency = (sourceId: string, targetId: string) => {
      // Check if targetId is an ancestor of sourceId via dependencies
      const visited = new Set<string>();
      const queue = [sourceId];
      
      while(queue.length > 0) {
          const currId = queue.shift()!;
          if(currId === targetId) return true; // Circular detected
          
          if(visited.has(currId)) continue;
          visited.add(currId);

          const currEvent = events.find(e => e.id === currId);
          if(currEvent && currEvent.dependencies) {
              queue.push(...currEvent.dependencies);
          }
      }
      return false;
  };

  const handleLinkStart = (e: React.MouseEvent, sourceId: string) => {
      e.stopPropagation();
      setLinkSourceId(sourceId);
      
      if(timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect();
          setMousePos({
              x: e.clientX - rect.left + timelineRef.current.scrollLeft,
              y: e.clientY - rect.top + timelineRef.current.scrollTop
          });
      }
  };

  const handleLinkMove = (e: React.MouseEvent) => {
      if(linkSourceId && timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect();
          setMousePos({
              x: e.clientX - rect.left + timelineRef.current.scrollLeft,
              y: e.clientY - rect.top + timelineRef.current.scrollTop
          });
      }
  };

  const handleLinkEnd = (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      if(linkSourceId && linkSourceId !== targetId) {
          // 1. Validation
          if (checkCircularDependency(linkSourceId, targetId)) {
              alert("Circular dependency detected!");
          } else {
              // 2. Update Data
              const targetEvent = events.find(e => e.id === targetId);
              if (targetEvent) {
                  const currentDeps = targetEvent.dependencies || [];
                  if (!currentDeps.includes(linkSourceId)) {
                      onEventUpdate(targetId, { dependencies: [...currentDeps, linkSourceId] });
                  }
              }
          }
      }
      setLinkSourceId(null);
      setMousePos(null);
  };

  const cancelLink = () => {
      setLinkSourceId(null);
      setMousePos(null);
  };

  // --- Helper to Render Bars ---
  const renderBar = (item: { event: CalendarEvent, depth: number }, index: number) => {
      const { event } = item;
      const startDiff = differenceInDays(event.start, timelineStart);
      const durationDays = Math.max(differenceInDays(event.end, event.start), 0.5); // Min width
      
      const left = startDiff * config.pxPerDay;
      const width = durationDays * config.pxPerDay;
      const pixelWidth = event.isMilestone ? 24 : width;
      
      // Text visibility logic
      const isTextOutside = pixelWidth < 100 || event.isMilestone;

      // Status Color Logic
      let bgClass = "bg-slate-300";
      let borderClass = "border-slate-400";
      const now = new Date();
      const isOverdue = now > event.end && event.status !== 'done';

      if (event.isMilestone) {
          bgClass = "bg-amber-400";
          borderClass = "border-amber-500";
      } else if (event.status === 'done') {
          bgClass = "bg-emerald-400";
          borderClass = "border-emerald-500";
      } else if (isOverdue) {
          bgClass = "bg-rose-400";
          borderClass = "border-rose-500";
      } else {
          bgClass = "bg-blue-500";
          borderClass = "border-blue-600";
      }

      if (event.tags?.includes('phase')) {
          bgClass = "bg-slate-700";
          borderClass = "border-slate-800";
      }

      return (
          <div 
             key={event.id}
             className="absolute h-8 hover:z-40 group/bar flex items-center"
             style={{ 
                 left, 
                 width: isTextOutside ? 'auto' : pixelWidth, 
                 top: index * 40 + 8, // 40px row height
             }}
          >
             {/* Rich Tooltip */}
             {!linkSourceId && (
                 <div className="absolute left-0 bottom-full mb-2 w-64 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-[60]">
                    <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs">
                        <div className="font-bold text-sm mb-1">{event.title}</div>
                        <div className="flex justify-between text-slate-400 mb-2">
                            <span>{format(event.start, 'MM/dd HH:mm')} - {format(event.end, 'MM/dd HH:mm')}</span>
                            <span>{event.progress || 0}%</span>
                        </div>
                        {event.description && (
                            <div className="text-slate-300 border-t border-slate-600 pt-2 italic">
                                {event.description}
                            </div>
                        )}
                    </div>
                    <div className="w-2 h-2 bg-slate-800 rotate-45 ml-4 -mt-1"></div>
                 </div>
             )}

             {/* Connection Handles (Visible on Hover or while Linking) */}
             {/* Target Handle (Left) */}
             <div 
                className={cn(
                    "absolute -left-2 w-4 h-4 rounded-full flex items-center justify-center z-50 cursor-crosshair transition-opacity",
                    linkSourceId && linkSourceId !== event.id ? "opacity-100 bg-white/50" : "opacity-0 group-hover/bar:opacity-100"
                )}
                onMouseUp={(e) => handleLinkEnd(e, event.id)}
             >
                 <div className={cn("w-2 h-2 rounded-full", linkSourceId ? "bg-indigo-500 animate-pulse" : "bg-slate-400 hover:bg-indigo-500")}></div>
             </div>

             {/* Source Handle (Right) */}
             <div 
                 className={cn(
                     "absolute -right-2 w-4 h-4 rounded-full flex items-center justify-center z-50 cursor-crosshair transition-opacity",
                     "opacity-0 group-hover/bar:opacity-100"
                 )}
                 onMouseDown={(e) => handleLinkStart(e, event.id)}
             >
                 <div className="w-2 h-2 rounded-full bg-slate-400 hover:bg-indigo-500"></div>
             </div>


             {/* Bar Content */}
             {event.isMilestone ? (
                 <div className="flex items-center gap-2">
                    <div 
                        onClick={() => onEventClick(event)}
                        className={cn(
                            "w-6 h-6 rotate-45 transform border-2 shadow-sm cursor-pointer hover:scale-110 transition-transform flex-shrink-0",
                            bgClass, borderClass
                        )}
                    ></div>
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap bg-white/50 px-1 rounded">{event.title}</span>
                 </div>
             ) : (
                 <>
                     <div 
                        draggable={!linkSourceId} // Disable drag rescheduling while linking
                        onDragStart={(e) => handleDragStart(e, event)}
                        onClick={() => onEventClick(event)}
                        className={cn(
                            "h-full rounded-md border shadow-sm relative overflow-hidden transition-all hover:shadow-lg",
                            !linkSourceId && "cursor-grab active:cursor-grabbing",
                            bgClass, borderClass
                        )}
                        style={{ width: pixelWidth }}
                     >
                        <div 
                            className="absolute top-0 left-0 bottom-0 bg-black/20" 
                            style={{ width: `${event.progress || 0}%` }}
                        ></div>
                        
                        {!isTextOutside && (
                            <div className="absolute inset-0 flex items-center px-2">
                                <span className="text-xs font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                    {event.title}
                                </span>
                            </div>
                        )}

                        {event.description && (
                            <div className="absolute top-0 right-0 p-1">
                                <Icons.AlignLeft size={10} className="text-white drop-shadow-md" />
                            </div>
                        )}
                     </div>
                     
                     {isTextOutside && (
                         <span className="ml-2 text-xs font-bold text-slate-700 whitespace-nowrap bg-white/50 px-1 rounded cursor-pointer" onClick={() => onEventClick(event)}>
                             {event.title}
                         </span>
                     )}
                 </>
             )}
          </div>
      );
  };

  // --- Render Dependency Lines ---
  const renderDependencies = () => {
      return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40">
              {/* Existing Dependencies */}
              {visibleEvents.map((item, index) => {
                  if (!item.event.dependencies) return null;
                  return item.event.dependencies.map(depId => {
                      const depIdx = visibleEvents.findIndex(x => x.event.id === depId);
                      if (depIdx === -1) return null;

                      const depItem = visibleEvents[depIdx];
                      
                      // Coords
                      const startX = (differenceInDays(depItem.event.end, timelineStart) * config.pxPerDay);
                      const startY = (depIdx * 40) + 24;
                      
                      const endX = (differenceInDays(item.event.start, timelineStart) * config.pxPerDay);
                      const endY = (index * 40) + 24;

                      // Bezier Logic
                      return (
                          <path 
                             key={`${depId}-${item.event.id}`}
                             d={`M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`}
                             fill="none"
                             stroke="#64748b"
                             strokeWidth="1.5"
                             markerEnd="url(#arrowhead)"
                          />
                      );
                  });
              })}

              {/* Active Linking Line */}
              {linkSourceId && mousePos && (() => {
                  const sourceIdx = visibleEvents.findIndex(x => x.event.id === linkSourceId);
                  if(sourceIdx === -1) return null;
                  const sourceItem = visibleEvents[sourceIdx];
                  
                  const startX = (differenceInDays(sourceItem.event.end, timelineStart) * config.pxPerDay);
                  const startY = (sourceIdx * 40) + 24;
                  
                  return (
                      <path 
                        d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                  );
              })()}

              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                </marker>
              </defs>
          </svg>
      );
  };

  // --- Mobile Feed View (Unchanged) ---
  const MobileFeed = () => {
      return (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              {events.sort((a,b) => a.start.getTime() - b.start.getTime()).map(event => (
                  <div key={event.id} className="relative pl-10 mb-6" onClick={() => onEventClick(event)}>
                      <div className={cn(
                          "absolute left-[26px] top-3 w-3 h-3 rounded-full border-2 bg-white",
                          event.status === 'done' ? "border-emerald-500" : "border-blue-500"
                      )}></div>
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 active:scale-95 transition-transform">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800">{event.title}</h4>
                              {event.owner && (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold border border-slate-200">
                                      {event.owner[0]}
                                  </div>
                              )}
                          </div>
                          <div className="flex gap-2 text-xs text-slate-500 mb-3">
                              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{format(event.start, 'MMM d')}</span>
                              <span>to</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{format(event.end, 'MMM d')}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${event.progress || 0}%` }}></div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      );
  }

  // --- Desktop Split View ---
  if (isMobile) {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-fade-in">
             <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
                <button onClick={onClose}><Icons.ChevronLeft className="text-slate-600" /></button>
                <h2 className="font-bold text-slate-800">Timeline Feed</h2>
                <div className="w-6"></div>
             </div>
             <MobileFeed />
          </div>
      )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col animate-fade-in">
      {/* 1. Global Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-20">
         <div className="flex items-center gap-4">
             <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100"><Icons.ChevronLeft /></button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600"><Icons.Briefcase size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-slate-800">Q4 产品发布</h2>
                    <p className="text-[10px] text-slate-500">最后更新: 刚刚</p>
                </div>
                <Icons.ChevronDown size={14} className="text-slate-400" />
             </div>
         </div>

         <div className="flex items-center gap-3">
             <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                 {(['day', 'week', 'month'] as ZoomLevel[]).map(z => (
                     <button 
                        key={z} 
                        onClick={() => setZoomLevel(z)}
                        className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", zoomLevel === z ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                     >
                        {z === 'day' ? '日' : z === 'week' ? '周' : '月'}
                     </button>
                 ))}
             </div>
             <div className="h-6 w-px bg-slate-200"></div>
             <button 
                onClick={() => setShowResources(!showResources)}
                className={cn("p-2 rounded-lg transition-colors", showResources ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100")}
                title="Resource Panel"
             >
                 <Icons.Users size={18} />
             </button>
         </div>
      </div>

      {/* 2. Main Split View */}
      <div className="flex-1 flex overflow-hidden" onMouseUp={cancelLink}>
         {/* Left Pane: Task Grid */}
         <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
             <div className="h-10 border-b border-slate-100 flex items-center px-4 bg-slate-50/50">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-1">Task Name</span>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-16 text-center">Owner</span>
             </div>
             <div className="flex-1 overflow-hidden hover:overflow-y-auto custom-scrollbar">
                 {visibleEvents.map(({ event, depth }, i) => (
                     <div 
                        key={event.id}
                        draggable 
                        onDragStart={(e) => handleStructureDragStart(e, event)}
                        onDragOver={(e) => handleStructureDragOver(e, event.id)}
                        onDragLeave={() => setHoverRowId(null)}
                        onDrop={(e) => handleStructureDrop(e, event)}
                        className={cn(
                            "h-10 flex items-center px-4 border-b border-slate-50 transition-colors group relative cursor-pointer",
                            hoverRowId === event.id ? "bg-indigo-50 border-b-2 border-indigo-500" : "hover:bg-slate-50"
                        )}
                     >
                         <div className="flex-1 flex items-center min-w-0" style={{ paddingLeft: depth * 16 }}>
                             {/* Collapse Toggle */}
                             {(events.some(e => e.parentId === event.id)) ? (
                                 <button onClick={() => toggleCollapse(event.id)} className="mr-1 text-slate-400 hover:text-slate-600">
                                     {collapsedParents.has(event.id) ? <Icons.ChevronRight size={12}/> : <Icons.ChevronDown size={12}/>}
                                 </button>
                             ) : <span className="w-4 inline-block mr-1"></span>}
                             
                             {/* Editable Title */}
                             {editingId === event.id ? (
                                 <input 
                                    autoFocus
                                    className="w-full text-xs font-bold border border-indigo-300 rounded px-1 outline-none bg-white shadow-sm text-slate-800"
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    onBlur={saveEditing}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    onClick={(e) => e.stopPropagation()} 
                                 />
                             ) : (
                                <span 
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(event);
                                    }}
                                    className={cn("text-xs truncate select-none hover:text-indigo-600 transition-colors cursor-text", event.parentId ? "text-slate-600" : "font-bold text-slate-800")}
                                    title="Double click to edit"
                                >
                                    {event.title}
                                </span>
                             )}
                             
                             {/* Desc Icon */}
                             {event.description && <Icons.AlignLeft size={10} className="text-slate-300 ml-2" />}
                         </div>
                         <div className="w-16 flex justify-center">
                             {event.owner ? (
                                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center border border-slate-200">
                                     {event.owner[0]}
                                 </div>
                             ) : <span className="text-slate-300">-</span>}
                         </div>
                     </div>
                 ))}
                 <div className="h-40 flex items-center justify-center text-xs text-slate-300 italic">
                     Drag rows to group • Double-click to rename
                 </div>
             </div>
         </div>

         {/* Right Pane: Timeline Canvas */}
         <div 
            className="flex-1 bg-slate-50/50 overflow-x-auto overflow-y-auto relative custom-scrollbar select-none"
            ref={timelineRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseMove={handleLinkMove}
         >
             <div style={{ width: totalWidth, height: visibleEvents.length * 40 + 200 }} className="relative">
                 {/* Header Scale */}
                 <div className="sticky top-0 h-10 bg-white border-b border-slate-200 z-20 flex items-end shadow-sm">
                     {timelineDays.map((day, i) => (
                         <div key={i} className="absolute bottom-0 border-l border-slate-100 pl-2 pb-1 text-[10px] font-medium text-slate-400" style={{ left: i * config.pxPerDay }}>
                             {format(day, config.tickFormat)}
                         </div>
                     ))}
                 </div>
                 
                 {/* Grid Lines */}
                 <div className="absolute inset-0 top-10 pointer-events-none z-0">
                     {timelineDays.map((_, i) => (
                         <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200/50 dashed" style={{ left: i * config.pxPerDay }}></div>
                     ))}
                 </div>

                 {/* Now Marker */}
                 {(() => {
                     const diff = differenceInDays(new Date(), timelineStart);
                     if (diff >= 0 && diff < config.daysView) {
                         return <div className="absolute top-10 bottom-0 border-l-2 border-rose-400 border-dashed z-10" style={{ left: diff * config.pxPerDay }}></div>
                     }
                     return null;
                 })()}

                 {/* Canvas Content */}
                 <div className="relative pt-2">
                     {renderDependencies()}
                     {visibleEvents.map((item, i) => renderBar(item, i))}
                 </div>
             </div>
         </div>
      </div>

      {/* 3. Resource Panel (Unchanged) */}
      {showResources && !isMobile && (
          <div className="h-48 bg-white border-t border-slate-200 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.05)] z-30 animate-fade-in">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Workload</span>
                  <button onClick={() => setShowResources(false)}><Icons.X size={14} className="text-slate-400 hover:text-slate-600"/></button>
              </div>
              <div className="flex-1 p-4 overflow-x-auto flex gap-4">
                  {['Alex', 'Sarah', 'Mike'].map(name => (
                      <div key={name} className="min-w-[200px] border border-slate-100 rounded-xl p-3 bg-white shadow-sm flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{name[0]}</div>
                              <span className="text-sm font-bold text-slate-700">{name}</span>
                          </div>
                          <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400"><span>Today</span><span>6h / 8h</span></div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 w-3/4"></div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
};
