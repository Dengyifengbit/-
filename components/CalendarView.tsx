import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { CalendarEvent, ViewMode, Task } from '../types';
import { cn, getEventStyle } from '../utils';
import { Icons } from './Icons';

interface CalendarViewProps {
  viewMode: ViewMode;
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
  onDropTask: (date: Date, task: Task) => void;
  onSelectDate: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  viewMode,
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onDropTask,
  onSelectDate
}) => {
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-indigo-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-indigo-50');
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-indigo-50');
    const taskData = e.dataTransfer.getData('application/json');
    if (taskData) {
      const task = JSON.parse(taskData);
      onDropTask(date, task);
    }
  };

  // --- Agenda / Detail View (Used for Day & Week modes) ---
  if (viewMode === 'day' || viewMode === 'week') {
    const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeekDate, i));
    
    const dayEvents = events
        .filter(e => isSameDay(e.start, currentDate))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
      <div className="flex flex-col h-full bg-white/40 backdrop-blur-md rounded-3xl border border-white/40 shadow-sm overflow-hidden">
        
        {/* 1. Week Strip Header */}
        <div className="flex items-center justify-between p-4 bg-white/40 border-b border-white/30 backdrop-blur-md z-10">
           {weekDays.map(day => {
               const isSelected = isSameDay(day, currentDate);
               const isToday = isSameDay(day, new Date());
               return (
                   <button 
                      key={day.toISOString()}
                      onClick={() => onSelectDate(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                          // Drop on date header sets time to 9am
                          const target = new Date(day);
                          target.setHours(9,0,0,0);
                          handleDrop(e, target);
                      }}
                      className={cn(
                          "flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all duration-300 relative group",
                          isSelected 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" 
                            : "hover:bg-white/60 text-slate-500 hover:scale-105",
                          isToday && !isSelected && "text-indigo-600 font-bold"
                      )}
                   >
                       <span className={cn("text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80", isSelected ? "text-indigo-100" : "")}>
                           {format(day, 'EEE')}
                       </span>
                       <span className="text-xl font-medium">{format(day, 'd')}</span>
                       {isToday && !isSelected && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full absolute bottom-2"></div>}
                   </button>
               )
           })}
        </div>

        {/* 2. Agenda Content */}
        <div 
            className="flex-1 overflow-y-auto p-6 relative no-scrollbar"
            onDragOver={handleDragOver}
            onDrop={(e) => {
                // Drop in empty space adds to current day end of list? Or 9am
                const target = new Date(currentDate);
                target.setHours(9,0,0,0);
                handleDrop(e, target);
            }}
        >
             {/* Date Title */}
             <div className="mb-8">
                 <h2 className="text-3xl font-light text-slate-800 flex items-baseline gap-3">
                     {format(currentDate, 'EEEE')}
                     <span className="text-lg text-slate-400 font-normal">{format(currentDate, 'MMMM do')}</span>
                 </h2>
                 <p className="text-slate-500 mt-1 flex items-center gap-2">
                     <Icons.Clock size={14} /> 
                     {dayEvents.length} events scheduled
                 </p>
             </div>

             {/* Timeline Flow */}
             <div className="relative pl-8 border-l border-indigo-100 space-y-8 min-h-[500px]">
                 {dayEvents.length === 0 && (
                     <div className="absolute top-10 left-8 right-0 text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                         <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-300">
                             <Icons.Calendar size={32} />
                         </div>
                         <h3 className="text-slate-600 font-medium">No events for today</h3>
                         <p className="text-xs text-slate-400 mt-1">Click the + button or drag tasks here</p>
                     </div>
                 )}

                 {dayEvents.map((event, index) => (
                     <div key={event.id} className="relative group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                         {/* Time Dot & Line */}
                         <div className="absolute -left-[39px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 flex items-center justify-center bg-indigo-500"></div>
                         
                         {/* Time Label */}
                         <div className="absolute -left-28 top-4 w-16 text-right">
                             <span className="text-sm font-bold text-slate-600 block">{format(event.start, 'HH:mm')}</span>
                             <span className="text-xs text-slate-400 font-medium">{format(event.end, 'HH:mm')}</span>
                         </div>

                         {/* Card */}
                         <div 
                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                            className={cn(
                                "bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 hover:translate-x-1 transition-all cursor-pointer relative overflow-hidden",
                                event.status === 'done' ? "opacity-60 grayscale-[0.5]" : ""
                            )}
                         >
                             <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", event.type === 'task-block' ? "bg-amber-400" : "bg-indigo-500")}></div>
                             
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h3 className={cn("text-lg font-bold text-slate-800", event.status === 'done' && "line-through text-slate-500")}>
                                        {event.title}
                                    </h3>
                                    {event.owner && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                <Icons.User size={12} className="text-slate-400"/>
                                                <span className="text-xs text-slate-600 font-medium">{event.owner}</span>
                                            </div>
                                        </div>
                                    )}
                                 </div>
                                 <div className="flex gap-2">
                                    {event.isMilestone && <Icons.Milestone className="text-amber-500" size={18} />}
                                    {event.status === 'done' && <Icons.CheckCircle className="text-emerald-500" size={18} />}
                                 </div>
                             </div>

                             {/* Metadata Grid */}
                             <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
                                {event.description && (
                                    <div className="col-span-2 flex gap-2 text-slate-500 bg-slate-50 p-2 rounded-lg items-start">
                                        <Icons.AlignLeft size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{event.description}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Icons.Clock size={14} />
                                    <span>{((event.end.getTime() - event.start.getTime()) / 60000)} mins</span>
                                </div>
                                {event.tags && event.tags.length > 0 && (
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Icons.Layout size={14} />
                                        <div className="flex gap-1">
                                            {event.tags.map(t => <span key={t} className="text-xs bg-slate-100 px-1.5 rounded text-slate-600">#{t}</span>)}
                                        </div>
                                    </div>
                                )}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
      </div>
    );
  }

  // --- Month View (Unchanged but cleaned up) ---
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      <div className="glass-panel rounded-3xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-white/30 bg-white/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold uppercase text-slate-400 tracking-widest">
                {day}
            </div>
            ))}
        </div>

        <div className="flex-1 grid grid-rows-5 lg:grid-rows-6">
            {weeks.map((week, wIndex) => (
                <div key={wIndex} className="grid grid-cols-7 border-b border-white/20 last:border-0 h-full">
                    {week.map((day, dIndex) => {
                        const dayEvents = events.filter(e => isSameDay(e.start, day));
                        return (
                            <div 
                                key={dIndex} 
                                className={cn(
                                    "border-r border-white/20 p-2 transition-all relative group cursor-pointer",
                                    !isSameMonth(day, monthStart) ? "bg-slate-50/20 text-slate-300" : "bg-white/10 hover:bg-white/40",
                                )}
                                onClick={() => onSelectDate(day)}
                            >
                                <div className="flex justify-center mb-1">
                                    <span className={cn(
                                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all",
                                        isSameDay(day, new Date()) ? "bg-indigo-600 text-white shadow-md scale-110" : "text-slate-600",
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar mt-1">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div 
                                            key={event.id}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full mx-auto mb-1",
                                                event.type === 'event' ? "bg-indigo-400" : "bg-amber-400"
                                            )}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};