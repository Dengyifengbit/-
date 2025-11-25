import React, { useState, useEffect } from 'react';
import { addDays, addMonths, subDays, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { HabitTracker } from './components/HabitTracker';
import { ZenMode } from './components/ZenMode';
import { Icons } from './components/Icons';
import { Task, CalendarEvent, ViewMode, Habit } from './types';
import { generateId, parseSmartInput } from './utils';

const App = () => {
  // --- Data State ---
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Prepare Q4 presentation', status: 'todo', createdAt: Date.now(), tags: ['work'] },
    { id: '2', title: 'Call insurance company', status: 'todo', createdAt: Date.now(), tags: ['life'] },
    { id: '3', title: 'Read Chapter 4', status: 'todo', createdAt: Date.now(), tags: ['study'] },
  ]);
  
  const [events, setEvents] = useState<CalendarEvent[]>([
    { 
      id: 'e1', 
      title: 'Design Review', 
      start: new Date(new Date().setHours(10, 0, 0, 0)), 
      end: new Date(new Date().setHours(11, 30, 0, 0)), 
      type: 'event',
      color: '#A0C1B8'
    },
    { 
        id: 'e2', 
        title: 'Deep Work: Coding', 
        start: new Date(new Date().setHours(14, 0, 0, 0)), 
        end: new Date(new Date().setHours(16, 0, 0, 0)), 
        type: 'task-block',
        color: '#B6A6CA'
      }
  ]);

  const [habits, setHabits] = useState<Habit[]>([
    { id: 'h1', title: 'Drink Water', icon: 'Droplets', streak: 12, completedDates: [], color: '#60A5FA', goal: 7 },
    { id: 'h2', title: 'Reading', icon: 'BookOpen', streak: 5, completedDates: [], color: '#F472B6', goal: 7 },
    { id: 'h3', title: 'Meditation', icon: 'Zap', streak: 3, completedDates: [], color: '#A78BFA', goal: 7 },
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

  // --- Handlers ---

  const handleAddTask = (rawInput: string) => {
    const { title } = parseSmartInput(rawInput);
    const newTask: Task = {
      id: generateId(),
      title: title,
      status: 'todo',
      createdAt: Date.now(),
      tags: ['inbox']
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'todo' ? 'done' : 'todo' } : t));
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
            streak: isDone ? h.streak : h.streak + 1 // Simplified streak logic
        };
    }));
    // Play haptic/sound effect here logically
  };

  const handleDropTaskOnCalendar = (date: Date, task: Task) => {
    const newEvent: CalendarEvent = {
      id: generateId(),
      title: task.title,
      start: date,
      end: new Date(date.getTime() + 60 * 60 * 1000), 
      type: 'task-block',
      description: `Imported from task: ${task.title}`
    };
    setEvents(prev => [...prev, newEvent]);
    setTasks(prev => prev.filter(t => t.id !== task.id));
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
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } as CalendarEvent : e));
    } else {
      const newEvent: CalendarEvent = {
        id: generateId(),
        title: eventData.title || 'Untitled',
        start: eventData.start || new Date(),
        end: eventData.end || new Date(new Date().getTime() + 3600000),
        type: eventData.type || 'event',
        description: eventData.description,
        color: eventData.type === 'task-block' ? '#E8D5B5' : '#98B6C3'
      };
      setEvents(prev => [...prev, newEvent]);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
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

      <Sidebar 
        tasks={tasks} 
        onAddTask={handleAddTask} 
        onToggleTask={handleToggleTask}
        onDragStart={(e, task) => {
          e.dataTransfer.setData('application/json', JSON.stringify(task));
          e.dataTransfer.effectAllowed = 'move';
        }}
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-5">
          <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
               {viewMode === 'month' ? format(currentDate, 'MMMM yyyy') : 
                viewMode === 'day' ? format(currentDate, 'MMMM do, yyyy') :
                `Week of ${format(startOfWeek(currentDate), 'MMM d')}`
               }
             </h2>
             <div className="text-slate-500 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Today is {format(new Date(), 'EEEE')}
             </div>
          </div>

          {/* Central Habit Tracker - Floating Island */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-white/60 backdrop-blur-md border border-white/50 rounded-full shadow-lg px-2 hidden lg:flex">
             <HabitTracker habits={habits} onToggleHabit={handleToggleHabit} />
          </div>

          <div className="flex items-center gap-4">
             {/* Zen Mode Trigger */}
             <button 
                onClick={() => setIsZenMode(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 hover:scale-105 transition-all shadow-lg shadow-slate-300/50"
             >
                <Icons.Zap size={16} /> Focus
             </button>

             <div className="h-8 w-px bg-slate-300/50 mx-2"></div>

             {/* View Switcher */}
             <div className="flex bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-white/40 shadow-sm">
                {(['day', 'week', 'month'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-4 py-1.5 rounded-lg capitalize text-sm font-medium transition-all ${viewMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {m}
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
                setSelectedSlot(new Date());
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
            setEvents(prev => prev.filter(e => e.id !== id));
            setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
