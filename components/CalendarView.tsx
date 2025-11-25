import React from 'react';
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { CalendarEvent, ViewMode, Task } from '../types';
import { cn, getEventStyle } from '../utils';

interface CalendarViewProps {
  viewMode: ViewMode;
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
  onDropTask: (date: Date, task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  viewMode,
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onDropTask
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-indigo-50/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-indigo-50/30');
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-indigo-50/30');
    const taskData = e.dataTransfer.getData('application/json');
    if (taskData) {
      const task = JSON.parse(taskData);
      onDropTask(date, task);
    }
  };

  // --- Day View ---
  if (viewMode === 'day') {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));

    return (
      <div className="flex flex-col h-full overflow-y-auto no-scrollbar relative">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/20 p-4 shadow-sm">
            <h2 className="text-2xl font-light text-slate-800 tracking-tight">{format(currentDate, 'EEEE, MMMM do')}</h2>
        </div>
        <div className="flex-1 relative min-h-[1440px] bg-white/30 backdrop-blur-sm m-4 rounded-3xl border border-white/40 shadow-sm overflow-hidden"> 
          {hours.map(hour => (
            <div 
                key={hour} 
                className="absolute w-full border-b border-slate-100/60 flex items-start group"
                style={{ top: `${(hour / 24) * 100}%`, height: `${100/24}%` }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                    const slotDate = new Date(currentDate);
                    slotDate.setHours(hour, 0, 0, 0);
                    handleDrop(e, slotDate);
                }}
                onClick={() => {
                    const slotDate = new Date(currentDate);
                    slotDate.setHours(hour, 0, 0, 0);
                    onSlotClick(slotDate);
                }}
            >
              <div className="w-16 text-right pr-4 text-xs font-medium text-slate-400 -mt-2.5">
                {format(new Date().setHours(hour), 'h a')}
              </div>
              <div className="flex-1 h-full group-hover:bg-white/40 transition-colors border-l border-slate-100/60"></div>
            </div>
          ))}

          {dayEvents.map(event => {
            const style = getEventStyle(event);
            return (
              <div
                key={event.id}
                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                className={cn(
                  "absolute left-20 right-4 rounded-xl p-3 text-xs border-l-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm overflow-hidden backdrop-blur-md",
                  event.type === 'event' ? "bg-blue-50/80 border-blue-400 text-slate-700" : "bg-amber-50/80 border-amber-400 text-slate-700",
                  event.color && `border-l-[${event.color}]`
                )}
                style={style}
              >
                <div className="font-bold text-sm mb-0.5">{event.title}</div>
                <div className="opacity-75 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
                    {format(event.start, 'h:mm')} - {format(event.end, 'h:mm a')}
                </div>
              </div>
            );
          })}
          
          {isSameDay(new Date(), currentDate) && (
            <div 
              className="absolute left-16 right-0 border-t border-red-400 z-20 pointer-events-none"
              style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 1440 * 100}%` }}
            >
              <div className="absolute -left-1.5 -top-1 w-2 h-2 bg-red-400 rounded-full shadow-sm"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Week View ---
  if (viewMode === 'week') {
    const start = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-white/20 bg-white/40 backdrop-blur-md z-10">
          <div className="p-4"></div>
          {days.map(day => (
            <div key={day.toISOString()} className={cn("p-4 text-center border-l border-white/20 transition-colors", isSameDay(day, new Date()) ? "bg-white/40" : "")}>
              <div className={cn("text-xs font-bold uppercase mb-1 tracking-widest", isSameDay(day, new Date()) ? "text-indigo-600" : "text-slate-400")}>{format(day, 'EEE')}</div>
              <div className={cn("text-xl font-light w-10 h-10 rounded-full flex items-center justify-center mx-auto transition-all", isSameDay(day, new Date()) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 scale-110" : "text-slate-700")}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          <div className="grid grid-cols-8 min-h-[1440px]">
            {/* Time Axis */}
            <div className="bg-white/30 backdrop-blur-sm sticky left-0 z-20">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] relative">
                   <span className="absolute -top-2.5 right-4 text-[10px] font-medium text-slate-400">
                     {format(new Date().setHours(hour), 'h a')}
                   </span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {days.map(day => {
               const dayEvents = events.filter(e => isSameDay(e.start, day));
               return (
                <div key={day.toISOString()} className="relative border-l border-white/30 h-full bg-white/20 hover:bg-white/30 transition-colors">
                  {hours.map(hour => (
                    <div 
                        key={hour} 
                        className="h-[60px] border-b border-white/20"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                             const slotDate = new Date(day);
                             slotDate.setHours(hour, 0, 0, 0);
                             handleDrop(e, slotDate);
                        }}
                        onClick={() => {
                             const slotDate = new Date(day);
                             slotDate.setHours(hour, 0, 0, 0);
                             onSlotClick(slotDate);
                        }}
                    ></div>
                  ))}
                  
                  {/* Render Events */}
                  {dayEvents.map(event => {
                    const style = getEventStyle(event);
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                        className={cn(
                          "absolute inset-x-1 rounded-lg px-2 py-1.5 text-[10px] font-medium border-l-2 cursor-pointer hover:scale-[1.03] transition-all duration-200 shadow-sm overflow-hidden z-10 backdrop-blur-md group",
                           event.type === 'event' 
                             ? "bg-[#D6E4FF]/90 border-blue-400 text-slate-800" 
                             : "bg-[#FDE68A]/90 border-amber-400 text-slate-800" // Morandi colors would be better here
                        )}
                        style={style}
                      >
                         <div className="truncate font-bold text-xs">{event.title}</div>
                         <div className="opacity-0 group-hover:opacity-70 transition-opacity truncate">
                           {format(event.start, 'h:mm')}
                         </div>
                      </div>
                    );
                  })}
                  
                   {/* Current time line if today */}
                   {isSameDay(day, new Date()) && (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none opacity-60"
                        style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 1440 * 100}%` }}
                      >
                         <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-400 rounded-full"></div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Month View ---
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
        {/* Month Header */}
        <div className="grid grid-cols-7 border-b border-white/30 bg-white/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold uppercase text-slate-400 tracking-widest">
                {day}
            </div>
            ))}
        </div>

        {/* Month Grid */}
        <div className="flex-1 grid grid-rows-5 lg:grid-rows-6">
            {weeks.map((week, wIndex) => (
                <div key={wIndex} className="grid grid-cols-7 border-b border-white/20 last:border-0 h-full">
                    {week.map((day, dIndex) => {
                        const dayEvents = events.filter(e => isSameDay(e.start, day));
                        return (
                            <div 
                                key={dIndex} 
                                className={cn(
                                    "border-r border-white/20 p-2 transition-all relative group",
                                    !isSameMonth(day, monthStart) ? "bg-slate-50/20 text-slate-300" : "bg-white/10 hover:bg-white/40",
                                )}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => {
                                    const slotDate = new Date(day);
                                    slotDate.setHours(9, 0, 0, 0); // Default to 9am
                                    handleDrop(e, slotDate);
                                }}
                                onClick={() => {
                                    const slotDate = new Date(day);
                                    slotDate.setHours(9, 0, 0, 0);
                                    onSlotClick(slotDate);
                                }}
                            >
                                <div className="flex justify-center mb-1">
                                    <span className={cn(
                                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all",
                                        isSameDay(day, new Date()) ? "bg-indigo-600 text-white shadow-md scale-110" : "text-slate-600",
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                
                                <div className="space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar mt-1">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div 
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                            className={cn(
                                                "text-[10px] px-2 py-1 rounded-md truncate cursor-pointer shadow-sm transition-transform hover:scale-105",
                                                event.type === 'event' ? "bg-white/80 text-indigo-900" : "bg-amber-100/80 text-amber-900"
                                            )}
                                        >
                                           <span className="opacity-50 mr-1">•</span>
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[9px] text-slate-500 text-center font-medium bg-white/30 rounded-full mx-2">
                                            {dayEvents.length - 3} more
                                        </div>
                                    )}
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
