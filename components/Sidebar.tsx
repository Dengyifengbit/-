import React, { useState } from 'react';
import { Icons } from './Icons';
import { Task } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  tasks: Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ tasks, onAddTask, onToggleTask, onDragStart }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'projects'>('inbox');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      onAddTask(newTaskTitle);
      setNewTaskTitle('');
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');

  return (
    <div className="w-80 h-full flex flex-col flex-shrink-0 relative z-20">
       <div className="absolute inset-0 glass-panel border-r border-white/40"></div>
       
       <div className="relative flex flex-col h-full z-10">
        {/* Header */}
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
              <Icons.Layout size={18} />
            </div>
            FlowState
          </h1>
        </div>

        {/* Mini Calendar Placeholder */}
        <div className="px-6 mb-6">
          <div className="glass-card rounded-2xl p-4">
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-semibold text-slate-700 text-sm">October 2023</h3>
               <div className="flex gap-1">
                 <button className="p-1 hover:bg-black/5 rounded-full"><Icons.ChevronLeft size={14}/></button>
                 <button className="p-1 hover:bg-black/5 rounded-full"><Icons.ChevronRight size={14}/></button>
               </div>
             </div>
             <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
               <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
             </div>
             <div className="grid grid-cols-7 text-center text-xs gap-y-2 text-slate-600">
                {[...Array(31)].map((_, i) => (
                  <div key={i} className={cn("w-6 h-6 mx-auto rounded-full flex items-center justify-center cursor-pointer hover:bg-black/5 transition-all", i === 24 ? "bg-slate-800 text-white shadow-md hover:bg-slate-700" : "")}>
                    {i + 1}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-6 text-sm font-medium text-slate-500 border-b border-white/20">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={cn("pb-3 border-b-2 transition-all", activeTab === 'inbox' ? "text-slate-800 border-indigo-500" : "border-transparent hover:text-slate-700")}
          >
            Inbox <span className="ml-1 bg-white/60 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] shadow-sm">{todoTasks.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={cn("pb-3 border-b-2 transition-all", activeTab === 'projects' ? "text-slate-800 border-indigo-500" : "border-transparent hover:text-slate-700")}
          >
            Projects
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {activeTab === 'inbox' ? (
            <>
              {todoTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                      <Icons.CheckCircle size={32} className="mb-2 opacity-20" />
                      <p className="text-sm">All caught up!</p>
                  </div>
              )}
              {todoTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, task)}
                  className="group relative bg-white/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-move active:scale-95 duration-200"
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => onToggleTask(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                    >
                      <Icons.CheckCircle size={18} />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 font-medium leading-snug">{task.title}</p>
                      {task.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-white/50 border border-white/50 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
              <div className="p-4 text-center text-slate-400 text-sm italic">
                  Project folders coming soon...
              </div>
          )}
        </div>

        {/* Quick Add */}
        <div className="p-4 pt-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/40 rounded-xl blur opacity-50 transition-opacity group-hover:opacity-100"></div>
            <input
              type="text"
              placeholder="Add a task..."
              className="relative w-full bg-white/60 border border-white/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:bg-white focus:shadow-md transition-all placeholder:text-slate-400"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              onClick={() => {
                  if(newTaskTitle.trim()) {
                      onAddTask(newTaskTitle);
                      setNewTaskTitle('');
                  }
              }}
              className="absolute right-2 top-2 text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors z-10"
            >
              <Icons.Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
