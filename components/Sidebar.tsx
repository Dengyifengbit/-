
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Task } from '../types';
import { cn, formatDateCN } from '../utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface SidebarProps {
  tasks: Task[];
  onAddTask: (title: string, date: Date) => void;
  onToggleTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  tasks, 
  onAddTask, 
  onToggleTask, 
  onDragStart,
  selectedDate,
  onSelectDate
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeFilter, setActiveFilter] = useState<'inbox' | 'today' | 'week'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  // Sync internal calendar month when selectedDate changes externally
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  // --- Derived State ---
  const filteredTasks = tasks.filter(t => {
    // 1. Search Filter
    if (searchQuery) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // 2. Date/Category Filter
    const taskDate = t.date; // String YYYY-MM-DD
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (activeFilter === 'inbox') return t.tags.includes('inbox') && !t.date;
    
    if (!taskDate) return false; 
    
    // Logic: If filter is today, show items for selectedDate.
    // If filter is week, we might want to show more, but for now strict day filtering is better for Calendar app.
    return taskDate === selectedDateStr;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'todo')
    .sort((a, b) => (a.startTime || '23:59').localeCompare(b.startTime || '23:59'));
    
  const doneTasks = filteredTasks.filter(t => t.status === 'done')
    .sort((a, b) => b.createdAt - a.createdAt);

  const completionRate = filteredTasks.length > 0 
    ? Math.round((doneTasks.length / filteredTasks.length) * 100) 
    : 0;

  // --- Handlers ---
  const handleTaskCreation = () => {
      if (newTaskTitle.trim()) {
        onAddTask(newTaskTitle, selectedDate);
        setNewTaskTitle('');
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleTaskCreation();
    }
  };

  const renderMiniCalendar = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-slate-700">{format(currentMonth, 'yyyy年 M月')}</span>
          <div className="flex gap-1">
             <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-200 rounded-full"><Icons.ChevronLeft size={16}/></button>
             <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-200 rounded-full"><Icons.ChevronRight size={16}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center mb-2">
           {['日','一','二','三','四','五','六'].map(d => (
             <span key={d} className="text-[10px] text-slate-400 font-bold">{d}</span>
           ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
           {days.map(day => {
             const dayStr = format(day, 'yyyy-MM-dd');
             const hasTask = tasks.some(t => t.date === dayStr && t.status === 'todo');
             const isSelected = isSameDay(day, selectedDate);
             const isCurrentMonth = isSameMonth(day, currentMonth);

             return (
               <button
                 key={day.toISOString()}
                 onClick={() => {
                     onSelectDate(day);
                     setActiveFilter('today');
                 }}
                 className={cn(
                   "relative w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs transition-all",
                   !isCurrentMonth && "text-slate-300",
                   isSelected ? "bg-indigo-600 text-white shadow-md scale-105 font-bold" : "hover:bg-slate-100 text-slate-600",
                   isSameDay(day, new Date()) && !isSelected && "text-indigo-600 font-bold border border-indigo-200"
                 )}
               >
                 {format(day, 'd')}
                 {hasTask && !isSelected && (
                   <span className="absolute bottom-1 w-1 h-1 bg-rose-400 rounded-full"></span>
                 )}
               </button>
             );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[400px] h-full flex flex-shrink-0 relative z-20 shadow-2xl shadow-slate-200/50">
       <div className="absolute inset-0 glass-panel border-r border-white/40 bg-white/80"></div>
       
       <div className="relative flex flex-col w-full h-full z-10">
        
        {/* --- Top Control Center --- */}
        <div className="flex-shrink-0 border-b border-slate-100">
          <div className="p-5 pb-2">
             <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-6 tracking-tight">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                  <Icons.Layout size={18} />
                </div>
                FlowState <span className="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">Pro</span>
             </h1>
             
             <div className="relative group">
                <Icons.Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="搜索标题、备注..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all placeholder:text-slate-400"
                />
             </div>
          </div>

          <div className="border-t border-slate-50">
             {renderMiniCalendar()}
          </div>

          <div className="flex px-4 pb-4 gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: '今天', icon: Icons.Calendar },
              { id: 'inbox', label: '收件箱', icon: Icons.Inbox },
              { id: 'week', label: '最近7天', icon: Icons.Clock },
            ].map(filter => (
               <button 
                 key={filter.id}
                 onClick={() => {
                   setActiveFilter(filter.id as any);
                   if (filter.id === 'today') onSelectDate(new Date());
                 }}
                 className={cn(
                   "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
                   activeFilter === filter.id 
                     ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                     : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                 )}
               >
                 <filter.icon size={14} />
                 {filter.label}
               </button>
            ))}
          </div>
        </div>

        {/* --- Task Dashboard --- */}
        <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden relative">
           
           <div className="p-6 pb-2 sticky top-0 bg-white/60 backdrop-blur-md z-10 border-b border-white/50">
              <div className="flex justify-between items-end mb-2">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {activeFilter === 'inbox' ? '收件箱' : formatDateCN(selectedDate).split('，')[0]}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                       {activeFilter === 'inbox' ? '未归档任务' : formatDateCN(selectedDate).split('，')[1]}
                    </p>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-indigo-600 tabular-nums">{doneTasks.length}<span className="text-sm text-slate-400 font-normal">/{filteredTasks.length}</span></span>
                 </div>
              </div>
              
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                   style={{ width: `${completionRate}%` }}
                 ></div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
              
              <section>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 进行中
                 </h3>
                 <div className="space-y-3">
                    {todoTasks.length === 0 && (
                       <div className="text-center py-8 text-slate-400">
                          <Icons.Coffee size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">暂无待办，享受当下</p>
                       </div>
                    )}
                    {todoTasks.map(task => (
                       <div
                         key={task.id}
                         draggable
                         onDragStart={(e) => onDragStart(e, task)}
                         className="group relative bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-move active:scale-95 duration-200 flex gap-4"
                       >
                          <div className="flex flex-col items-center pt-0.5 min-w-[3rem] border-r border-slate-100 pr-3">
                             <span className="text-sm font-bold text-slate-700 font-mono tracking-tight">
                                {task.startTime || '全天'}
                             </span>
                             {task.endTime && (
                               <span className="text-[10px] text-slate-400 font-mono">{task.endTime}</span>
                             )}
                          </div>

                          <div className="flex-1 min-w-0">
                             <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-800 leading-tight truncate">{task.title}</h4>
                                <button 
                                  onClick={() => onToggleTask(task.id)}
                                  className="text-slate-300 hover:text-indigo-600 transition-colors"
                                >
                                   <div className="w-5 h-5 rounded-md border-2 border-slate-200 hover:border-indigo-500 transition-colors"></div>
                                </button>
                             </div>
                             {task.location && (
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                                   <Icons.MapPin size={10} /> {task.location}
                                </p>
                             )}
                             {task.tags.length > 0 && (
                                <div className="flex gap-1.5 mt-2">
                                   {task.tags.map(tag => (
                                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                         {tag}
                                      </span>
                                   ))}
                                </div>
                             )}
                          </div>
                          
                          <div className={cn(
                             "absolute left-0 top-3 bottom-3 w-1 rounded-r-md",
                             task.tags.includes('work') ? "bg-emerald-400" : "bg-indigo-400"
                          )}></div>
                       </div>
                    ))}
                 </div>
              </section>

              {doneTasks.length > 0 && (
                <section>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 已完成 ({doneTasks.length})
                   </h3>
                   <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                      {doneTasks.map(task => (
                         <div
                           key={task.id}
                           className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-center gap-3"
                         >
                            <button 
                                onClick={() => onToggleTask(task.id)}
                                className="text-emerald-500"
                            >
                                <Icons.CheckCircle size={18} />
                            </button>
                            <span className="text-sm text-slate-500 line-through decoration-slate-400 flex-1 truncate">
                               {task.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                               {format(new Date(task.createdAt), 'HH:mm')}
                            </span>
                         </div>
                      ))}
                   </div>
                </section>
              )}
           </div>

           {/* Quick Add Button */}
           <div className="absolute bottom-6 left-6 right-6 z-20">
               <div className="relative group shadow-xl shadow-indigo-100 rounded-2xl">
                 <div className="absolute inset-0 bg-white/80 rounded-2xl blur-sm"></div>
                 <div className="relative bg-white border border-slate-200 rounded-2xl flex items-center p-1.5 pr-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
                    <button 
                        onClick={handleTaskCreation}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                       <Icons.Plus size={20} />
                    </button>
                    <input 
                       type="text" 
                       placeholder="新建日程... (如: 会议 14:00)" 
                       className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 ml-1"
                       value={newTaskTitle}
                       onChange={(e) => setNewTaskTitle(e.target.value)}
                       onKeyDown={handleKeyDown}
                    />
                 </div>
               </div>
           </div>

        </div>
      </div>
    </div>
  );
};
