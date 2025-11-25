
import React, { useState, useEffect } from 'react';
import { addDays, addMonths, subDays, subMonths, format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { HabitTracker } from './components/HabitTracker';
import { ZenMode } from './components/ZenMode';
import { GanttChart } from './components/GanttChart';
import { Icons } from './components/Icons';
import { Task, CalendarEvent, ViewMode, Habit } from './types';
import { generateId, parseSmartInput } from './utils';

const App = () => {
  // --- Data State ---
  // We initialize with some dummy data that is "Synced" by ID
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const id1 = '1';
  const id2 = '2';
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: id1, title: '准备 Q4 季度汇报 PPT', status: 'todo', createdAt: Date.now(), tags: ['work'], date: todayStr, startTime: '09:00', endTime: '10:30', location: '第一会议室' },
    { id: id2, title: '预约牙医', status: 'todo', createdAt: Date.now(), tags: ['life'], date: todayStr },
  ]);
  
  // Events now need a 'status' field to sync with Tasks for Gantt visualization
  const [events, setEvents] = useState<CalendarEvent[]>([
    { 
      id: id1, // Linked to Task 1
      title: '准备 Q4 季度汇报 PPT', 
      start: new Date(new Date().setHours(9, 0, 0, 0)), 
      end: new Date(new Date().setHours(10, 30, 0, 0)), 
      type: 'event',
      status: 'todo',
      tags: ['work'],
      color: '#A0C1B8',
      description: 'Location: 第一会议室'
    }
  ]);

  const [habits, setHabits] = useState<Habit[]>([
    { id: 'h1', title: '喝水', icon: 'Droplets', streak: 12, completedDates: [], color: '#60A5FA', goal: 7 },
    { id: 'h2', title: '阅读', icon: 'BookOpen', streak: 5, completedDates: [], color: '#F472B6', goal: 7 },
    { id: 'h3', title: '冥想', icon: 'Zap', streak: 3, completedDates: [], color: '#A78BFA', goal: 7 },
  ]);

  // --- UI State ---
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(undefined);
  
  // Zen Mode
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeZenTask, setActiveZenTask] = useState<Task | undefined>(undefined);

  // --- Helpers for Syncing ---
  
  // Helper to sync a Task change to an Event (e.g. title rename)
  const syncTaskToEvent = (task: Task) => {
    setEvents(prev => prev.map(e => {
        if (e.id === task.id) {
            return { 
                ...e, 
                title: task.title, 
                description: task.description || e.description,
                status: task.status, // Sync status
                tags: task.tags
            };
        }
        return e;
    }));
  };

  // --- Handlers ---

  const handleAddTask = (rawInput: string, currentContextDate: Date) => {
    const { title, time, date: parsedDate } = parseSmartInput(rawInput);
    
    // Determine date: Use parsed date if explicitly stated (e.g. "Tomorrow"), else context date
    let finalDate = currentContextDate;
    if (parsedDate && !isSameDay(parsedDate, new Date())) {
        finalDate = parsedDate;
    }

    const commonId = generateId();

    const newTask: Task = {
      id: commonId,
      title: title,
      status: 'todo',
      createdAt: Date.now(),
      tags: ['inbox'],
      date: format(finalDate, 'yyyy-MM-dd'),
      startTime: time 
    };
    
    // 1. Add to Task List
    setTasks(prev => [newTask, ...prev]);

    // 2. If time is present, ALSO Add to Calendar Events
    if (time) {
        const [h, m] = time.split(':').map(Number);
        const start = new Date(finalDate);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
        
        const newEvent: CalendarEvent = {
            id: commonId, // SHARE ID
            title: title,
            start: start,
            end: end,
            type: 'event', // Default to event so it shows in main calendar flow
            status: 'todo',
            tags: ['inbox'],
            description: 'Created via Quick Add',
            color: '#98B6C3' 
        };
        setEvents(prev => [...prev, newEvent]);
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id === id) {
            const newStatus = t.status === 'todo' ? 'done' : 'todo';
            // Sync status to event immediately
            setEvents(events => events.map(e => e.id === id ? { ...e, status: newStatus } : e));
            return { ...t, status: newStatus };
        }
        return t;
    }));
  };

  const handleToggleHabit = (id: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setHabits(prev => prev.map(h => {
        if (h.id !== id) return h;
        const isDone = h.completedDates.includes(today);
        return {
            ...h,
            completedDates: isDone 
                ? h.completedDates.filter(d => d !== today)
                : [...h.completedDates, today],
            streak: isDone ? h.streak : h.streak + 1 
        };
    }));
  };

  const handleDropTaskOnCalendar = (date: Date, task: Task) => {
    // Check if event already exists for this task (by ID)
    const existingEvent = events.find(e => e.id === task.id);
    
    const start = date;
    const end = new Date(date.getTime() + 60 * 60 * 1000);

    if (existingEvent) {
        // Update existing event
        setEvents(prev => prev.map(e => e.id === task.id ? { ...e, start, end } : e));
    } else {
        // Create new event
        const newEvent: CalendarEvent = {
            id: task.id,
            title: task.title,
            start: start,
            end: end,
            type: 'event',
            status: task.status,
            tags: task.tags,
            description: task.description
        };
        setEvents(prev => [...prev, newEvent]);
    }

    // Sync back to Task (Update Date and Time)
    const timeStr = format(start, 'HH:mm');
    const dateStr = format(start, 'yyyy-MM-dd');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, date: dateStr, startTime: timeStr } : t));
  };
  
  // Handler for Gantt Drag Drop
  const handleEventDrop = (event: CalendarEvent, newStart: Date) => {
      const duration = event.end.getTime() - event.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      
      const updatedEvent = { ...event, start: newStart, end: newEnd };
      handleSaveEvent(updatedEvent);
  };

  const handleDateNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 7) : subDays(prev, 7));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    const isNew = !editingEvent;
    
    if (!isNew && editingEvent) {
      // Update Existing Event
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } as CalendarEvent : e));
      
      // Sync update to Task
      setTasks(prev => prev.map(t => {
          if (t.id === editingEvent.id) {
              return {
                  ...t,
                  title: eventData.title || t.title,
                  description: eventData.description || t.description,
                  startTime: eventData.start ? format(eventData.start, 'HH:mm') : t.startTime,
                  date: eventData.start ? format(eventData.start, 'yyyy-MM-dd') : t.date
              };
          }
          return t;
      }));

    } else {
      // Create New Event
      const commonId = generateId();
      const newEvent: CalendarEvent = {
        id: commonId,
        title: eventData.title || '无标题',
        start: eventData.start || new Date(),
        end: eventData.end || new Date(new Date().getTime() + 3600000),
        type: eventData.type || 'event',
        status: 'todo',
        tags: ['work'], // Default tag
        description: eventData.description,
        color: eventData.type === 'task-block' ? '#E8D5B5' : '#98B6C3'
      };
      setEvents(prev => [...prev, newEvent]);

      // ALSO Create corresponding Task
      const newTask: Task = {
          id: commonId,
          title: newEvent.title,
          status: 'todo',
          createdAt: Date.now(),
          tags: ['work'], // Default tag
          date: format(newEvent.start, 'yyyy-MM-dd'),
          startTime: format(newEvent.start, 'HH:mm'),
          endTime: format(newEvent.end, 'HH:mm'),
          description: newEvent.description
      };
      setTasks(prev => [newTask, ...prev]);
    }
  };

  const handleDelete = (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-slate-50">
      {/* Zen Mode Overlay */}
      {isZenMode && (
        <ZenMode 
          activeTask={activeZenTask} 
          onExit={() => setIsZenMode(false)}
          onComplete={(task) => {
             handleToggleTask(task.id);
             setIsZenMode(false);
          }}
        />
      )}
      
      {/* Gantt View Overlay (Full Screen replacement essentially) */}
      {viewMode === 'gantt' && (
        <GanttChart 
            events={events}
            currentDate={currentDate}
            onEventClick={(event) => {
                setEditingEvent(event);
                setIsModalOpen(true);
            }}
            onEventDrop={handleEventDrop}
            onClose={() => setViewMode('week')}
        />
      )}

      {/* Sidebar - Synced via currentDate */}
      <Sidebar 
        tasks={tasks} 
        onAddTask={handleAddTask} 
        onToggleTask={handleToggleTask}
        onDragStart={(e, task) => {
          e.dataTransfer.setData('application/json', JSON.stringify(task));
          e.dataTransfer.effectAllowed = 'move';
        }}
        selectedDate={currentDate} 
        onSelectDate={setCurrentDate}
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative z-10 transition-all">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-5">
          <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
               {viewMode === 'month' ? format(currentDate, 'yyyy年 MMMM') : 
                viewMode === 'day' ? format(currentDate, 'MMMM do, EEEE') :
                `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d')}`
               }
             </h2>
             <div className="text-slate-500 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                今天是 {format(new Date(), 'EEEE')}
             </div>
          </div>

          {/* Central Habit Tracker - Floating Island */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-white/60 backdrop-blur-md border border-white/50 rounded-full shadow-lg px-2 hidden xl:flex">
             <HabitTracker habits={habits} onToggleHabit={handleToggleHabit} />
          </div>

          <div className="flex items-center gap-4">
             {/* Project Panorama Button (Entry to Gantt) */}
             <button 
                onClick={() => setViewMode('gantt')}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
             >
                <Icons.ChartGantt size={16} /> 项目全景
             </button>

             {/* Zen Mode Trigger */}
             <button 
                onClick={() => setIsZenMode(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 hover:scale-105 transition-all shadow-lg shadow-slate-300/50"
             >
                <Icons.Zap size={16} /> 专注模式
             </button>

             <div className="h-8 w-px bg-slate-300/50 mx-2"></div>

             {/* View Switcher */}
             <div className="flex bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-white/40 shadow-sm">
                {[
                    { id: 'day', label: '日' }, 
                    { id: 'week', label: '周' }, 
                    { id: 'month', label: '月' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setViewMode(m.id as ViewMode)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === m.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {m.label}
                  </button>
                ))}
             </div>
             
             {/* Nav Arrows */}
             <div className="flex items-center gap-2">
                <button onClick={() => handleDateNavigate('prev')} className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-600">
                  <Icons.ChevronLeft size={20} />
                </button>
                <button onClick={() => handleDateNavigate('next')} className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-600">
                  <Icons.ChevronRight size={20} />
                </button>
             </div>
          </div>
        </header>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden relative p-4 pt-0">
           <CalendarView 
             viewMode={viewMode}
             currentDate={currentDate}
             events={events}
             onEventClick={(event) => {
               setEditingEvent(event);
               setIsModalOpen(true);
             }}
             onSlotClick={(date) => {
               setEditingEvent(null);
               setSelectedSlot(date);
               setIsModalOpen(true);
             }}
             onDropTask={handleDropTaskOnCalendar}
           />
           
           {/* Floating FAB */}
           <button 
             onClick={() => {
                setEditingEvent(null);
                const slot = new Date(currentDate);
                slot.setHours(9, 0, 0, 0);
                setSelectedSlot(slot);
                setIsModalOpen(true);
             }}
             className="absolute bottom-10 right-10 w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-full shadow-2xl hover:scale-110 hover:shadow-indigo-500/40 transition-all flex items-center justify-center z-30 group"
           >
              <Icons.Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>
      </main>

      <EventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingEvent}
        selectedDate={selectedSlot}
        onSave={handleSaveEvent}
        onDelete={(id) => {
            handleDelete(id);
            setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
