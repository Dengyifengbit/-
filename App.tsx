
import React, { useState, useEffect } from 'react';
import { addDays, addMonths, subDays, subMonths, format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { EventModal } from './components/EventModal';
import { TaskDetailPanel } from './components/TaskDetailPanel';
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
  const today = new Date();
  
  // Mock Project Data
  const id_p1 = 'p1';
  const id_p2 = 'p2';
  const id_t1 = 't1';
  const id_t2 = 't2';
  const id_t3 = 't3';
  const id_m1 = 'm1';

  const [tasks, setTasks] = useState<Task[]>([
    { id: id_t1, title: '竞品调研', status: 'done', createdAt: Date.now(), tags: ['work'], date: format(subDays(today, 2), 'yyyy-MM-dd'), startTime: '09:00', endTime: '17:00' },
    { id: id_t2, title: '用户访谈', status: 'todo', createdAt: Date.now(), tags: ['work'], date: format(today, 'yyyy-MM-dd'), startTime: '10:00', endTime: '12:00' },
    { id: id_t3, title: 'API 接口设计', status: 'todo', createdAt: Date.now(), tags: ['dev'], date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '14:00', endTime: '18:00' },
    { id: id_m1, title: '需求评审里程碑', status: 'todo', createdAt: Date.now(), tags: ['milestone'], date: format(addDays(today, 2), 'yyyy-MM-dd') },
  ]);
  
  // Events with Project Management Fields
  const [events, setEvents] = useState<CalendarEvent[]>([
    // Phase 1 (Parent)
    { id: id_p1, title: '阶段一：需求分析', start: subDays(today, 2), end: today, type: 'event', status: 'todo', tags: ['phase'], color: '#94a3b8', progress: 50, projectName: 'Q4 产品发布' },
    // Phase 2 (Parent)
    { id: id_p2, title: '阶段二：开发', start: addDays(today, 1), end: addDays(today, 5), type: 'event', status: 'todo', tags: ['phase'], color: '#94a3b8', progress: 0, projectName: 'Q4 产品发布' },
    
    // Tasks
    { 
      id: id_t1, parentId: id_p1, title: '竞品调研', start: subDays(today, 2), end: subDays(today, 1), type: 'event', status: 'done', tags: ['work'], color: '#A0C1B8',
      progress: 100, owner: 'Alex', priority: 'P1', assignee: { name: 'Alex', avatar: '' }, projectName: 'Q4 产品发布', stageName: '需求分析'
    },
    { 
      id: id_t2, parentId: id_p1, title: '用户访谈', start: today, end: addDays(today, 0, ), type: 'event', status: 'blocked', tags: ['work'], color: '#98B6C3',
      progress: 30, owner: 'Sarah', dependencies: [id_t1], description: '客户要求修改配色，增加暗黑模式的调研。',
      priority: 'P0', assignee: { name: 'Sarah', avatar: '' }, projectName: 'Q4 产品发布', stageName: '需求分析',
      checklist: [
          { id: 'c1', title: '准备访谈提纲', checked: true },
          { id: 'c2', title: '邀约核心用户', checked: false },
          { id: 'c3', title: '整理录音', checked: false }
      ],
      activityLog: [
          { id: 'l1', type: 'system', content: 'Dependencies updated', timestamp: Date.now() - 100000 },
          { id: 'l2', type: 'memo', content: '会议纪要：用户对目前的导航结构感到困惑，建议简化。', timestamp: Date.now(), user: 'Sarah' }
      ]
    },
    { 
      id: id_t3, parentId: id_p2, title: 'API 接口设计', start: addDays(today, 1), end: addDays(today, 3), type: 'event', status: 'todo', tags: ['dev'], color: '#B6A6CA',
      progress: 0, owner: 'Mike', dependencies: [id_m1], priority: 'P2', projectName: 'Q4 产品发布', stageName: '开发'
    },
    
    // Milestone
    { 
      id: id_m1, parentId: id_p1, title: '需求评审会', start: addDays(today, 1), end: addDays(today, 1), type: 'event', status: 'todo', tags: ['milestone'], color: '#E2C2C6',
      isMilestone: true, owner: 'All', description: '全员必须参加，准备好PPT。', projectName: 'Q4 产品发布'
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
  
  // Advanced Task Panel State
  const [selectedTask, setSelectedTask] = useState<CalendarEvent | null>(null);

  // Zen Mode
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeZenTask, setActiveZenTask] = useState<Task | undefined>(undefined);

  // --- Handlers ---

  const handleAddTask = (rawInput: string, currentContextDate: Date) => {
    const { title, time, date: parsedDate } = parseSmartInput(rawInput);
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
    
    setTasks(prev => [newTask, ...prev]);

    if (time) {
        const [h, m] = time.split(':').map(Number);
        const start = new Date(finalDate);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000); 
        
        const newEvent: CalendarEvent = {
            id: commonId, 
            title: title,
            start: start,
            end: end,
            type: 'event', 
            status: 'todo',
            tags: ['inbox'],
            description: 'Created via Quick Add',
            color: '#98B6C3',
            progress: 0
        };
        setEvents(prev => [...prev, newEvent]);
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id === id) {
            const newStatus = t.status === 'todo' ? 'done' : 'todo';
            setEvents(events => events.map(e => e.id === id ? { ...e, status: newStatus, progress: newStatus === 'done' ? 100 : e.progress } : e));
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
    const existingEvent = events.find(e => e.id === task.id);
    const start = date;
    const end = new Date(date.getTime() + 60 * 60 * 1000);

    if (existingEvent) {
        setEvents(prev => prev.map(e => e.id === task.id ? { ...e, start, end } : e));
    } else {
        const newEvent: CalendarEvent = {
            id: task.id,
            title: task.title,
            start: start,
            end: end,
            type: 'event',
            status: task.status,
            tags: task.tags,
            description: task.description,
            progress: task.status === 'done' ? 100 : 0
        };
        setEvents(prev => [...prev, newEvent]);
    }

    const timeStr = format(start, 'HH:mm');
    const dateStr = format(start, 'yyyy-MM-dd');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, date: dateStr, startTime: timeStr } : t));
  };
  
  const handleEventDrop = (event: CalendarEvent, newStart: Date) => {
      const duration = event.end.getTime() - event.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      const updatedEvent = { ...event, start: newStart, end: newEnd };
      handleSaveEvent(updatedEvent);
  };

  // Sync structural or text changes from Gantt back to state
  const handleEventUpdate = (id: string, updates: Partial<CalendarEvent>) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      
      // Also sync title changes to Tasks if they exist
      if (updates.title) {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, title: updates.title! } : t));
      }
      // Sync Status
      if (updates.status) {
          const simpleStatus = updates.status === 'done' ? 'done' : 'todo';
          setTasks(prev => prev.map(t => t.id === id ? { ...t, status: simpleStatus } : t));
      }

      // Update selected task if it's currently open
      if (selectedTask && selectedTask.id === id) {
          setSelectedTask(prev => prev ? ({ ...prev, ...updates } as CalendarEvent) : null);
      }
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
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } as CalendarEvent : e));
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
      const commonId = generateId();
      const newEvent: CalendarEvent = {
        id: commonId,
        title: eventData.title || '无标题',
        start: eventData.start || new Date(),
        end: eventData.end || new Date(new Date().getTime() + 3600000),
        type: eventData.type || 'event',
        status: 'todo',
        tags: ['work'], 
        description: eventData.description,
        color: eventData.type === 'task-block' ? '#E8D5B5' : '#98B6C3',
        progress: 0
      };
      setEvents(prev => [...prev, newEvent]);

      const newTask: Task = {
          id: commonId,
          title: newEvent.title,
          status: 'todo',
          createdAt: Date.now(),
          tags: ['work'], 
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
      setSelectedTask(null);
  };

  // Helper to open the right modal/panel
  const handleOpenDetail = (event: CalendarEvent) => {
      if (event.tags?.includes('phase') || event.parentId) {
          // Complex task -> Slide out panel
          setSelectedTask(event);
      } else {
          // Simple event -> Modal
          setEditingEvent(event);
          setIsModalOpen(true);
      }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-slate-50 relative">
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
      
      {/* Task Detail Slide-out Panel */}
      <TaskDetailPanel 
         event={selectedTask} 
         onClose={() => setSelectedTask(null)}
         onUpdate={handleEventUpdate}
         onDelete={handleDelete}
      />

      {/* Gantt View Overlay */}
      {viewMode === 'gantt' && (
        <GanttChart 
            events={events}
            currentDate={currentDate}
            onEventClick={handleOpenDetail}
            onEventDrop={handleEventDrop}
            onEventUpdate={handleEventUpdate}
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
             onEventClick={handleOpenDetail}
             onSlotClick={(date) => {
               setEditingEvent(null);
               setSelectedSlot(date);
               setIsModalOpen(true);
             }}
             onDropTask={handleDropTaskOnCalendar}
             onSelectDate={setCurrentDate}
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
