
import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, ChecklistItem, ActivityLog } from '../types';
import { Icons } from './Icons';
import { cn, formatTime, formatDateCN, generateId } from '../utils';
import { format } from 'date-fns';

interface TaskDetailPanelProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  event,
  onClose,
  onUpdate,
  onDelete
}) => {
  // Local state for immediate feedback before saving/syncing
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');
  
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Sync props to state when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDesc(event.description || '');
      setChecklist(event.checklist || []);
      setIsDescExpanded(false);
    }
  }, [event]);

  if (!event) return null;

  // --- Handlers ---
  
  const handleStatusChange = (status: CalendarEvent['status']) => {
      onUpdate(event.id, { 
          status, 
          progress: status === 'done' ? 100 : (status === 'todo' ? 0 : 50) 
      });
  };

  const handlePriorityChange = (priority: 'P0' | 'P1' | 'P2' | 'P3') => {
      onUpdate(event.id, { priority });
  };

  const addCheckItem = () => {
      if (!newCheckItem.trim()) return;
      const newItem: ChecklistItem = { id: generateId(), title: newCheckItem, checked: false };
      const newList = [...checklist, newItem];
      setChecklist(newList);
      onUpdate(event.id, { checklist: newList });
      setNewCheckItem('');
  };

  const toggleCheckItem = (itemId: string) => {
      const newList = checklist.map(item => 
          item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      setChecklist(newList);
      onUpdate(event.id, { checklist: newList });
  };

  const addActivity = (type: 'comment' | 'memo', content: string) => {
      if (!content.trim()) return;
      const newLog: ActivityLog = {
          id: generateId(),
          type,
          content,
          timestamp: Date.now(),
          user: 'Me'
      };
      const newLogs = [newLog, ...(event.activityLog || [])];
      onUpdate(event.id, { activityLog: newLogs });
      setNewComment('');
  };

  // --- Derived ---
  const completedChecks = checklist.filter(c => c.checked).length;
  const totalChecks = checklist.length;
  const checkProgress = totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      ></div>

      {/* Slide-out Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl pointer-events-auto flex flex-col animate-slide-in-right overflow-hidden">
        
        {/* === ZONE A: Sticky Header === */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white z-20 shrink-0">
             <div className="flex items-center text-xs text-slate-500 gap-1.5 font-medium">
                 <Icons.Briefcase size={14} className="text-indigo-500" />
                 <span>{event.projectName || 'Inbox'}</span>
                 {event.stageName && (
                     <>
                        <Icons.ChevronRight size={12} className="text-slate-300" />
                        <span>{event.stageName}</span>
                     </>
                 )}
             </div>
             
             <div className="flex items-center gap-3">
                 {/* Status Dropdown */}
                 <div className="relative group">
                     <button className={cn(
                         "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                         event.status === 'done' ? "bg-emerald-100 text-emerald-700" :
                         event.status === 'blocked' ? "bg-rose-100 text-rose-700" :
                         event.status === 'in-progress' ? "bg-blue-100 text-blue-700" :
                         "bg-slate-100 text-slate-600"
                     )}>
                         <div className={cn("w-2 h-2 rounded-full", 
                             event.status === 'done' ? "bg-emerald-500" :
                             event.status === 'blocked' ? "bg-rose-500" :
                             event.status === 'in-progress' ? "bg-blue-500" : "bg-slate-400"
                         )}></div>
                         <span>
                             {event.status === 'done' ? '已完成' :
                              event.status === 'blocked' ? '已阻塞' :
                              event.status === 'in-progress' ? '进行中' : '待办'}
                         </span>
                         <Icons.ChevronDown size={12} />
                     </button>
                     {/* Dropdown Menu */}
                     <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover:block animate-fade-in z-50">
                         {['todo', 'in-progress', 'done', 'blocked'].map((s) => (
                             <button
                                key={s}
                                onClick={() => handleStatusChange(s as any)}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 text-slate-700 capitalize flex items-center gap-2"
                             >
                                 <div className={cn("w-2 h-2 rounded-full", 
                                     s === 'done' ? "bg-emerald-500" :
                                     s === 'blocked' ? "bg-rose-500" :
                                     s === 'in-progress' ? "bg-blue-500" : "bg-slate-400"
                                 )}></div>
                                 {s}
                             </button>
                         ))}
                     </div>
                 </div>

                 <div className="h-6 w-px bg-slate-200"></div>

                 <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                     <Icons.X size={20} />
                 </button>
             </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
            
            {/* === ZONE B: Hero Section === */}
            <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex items-start gap-4 mb-6">
                    <button 
                        onClick={() => handleStatusChange(event.status === 'done' ? 'todo' : 'done')}
                        className={cn(
                        "mt-1.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                        event.status === 'done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-500 text-transparent"
                    )}>
                        <Icons.CheckCircle size={16} className={cn(event.status === 'done' ? "scale-100" : "scale-0")} />
                    </button>
                    
                    <textarea 
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            // Debounce save in real app
                        }}
                        onBlur={() => onUpdate(event.id, { title })}
                        placeholder="任务标题..."
                        rows={1}
                        className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none resize-none placeholder:text-slate-300 leading-tight"
                        style={{ minHeight: '40px' }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Assignee */}
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                           {event.assignee ? <img src={event.assignee.avatar} className="w-full h-full rounded-full"/> : <Icons.User size={16} />}
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">负责人</div>
                            <div className="text-sm font-medium text-slate-700">{event.assignee?.name || '未指派'}</div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                           <Icons.Calendar size={16} />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">截止日期</div>
                            <div className={cn("text-sm font-medium", new Date() > event.end ? "text-rose-500" : "text-slate-700")}>
                                {format(event.end, 'MM月dd日 HH:mm')}
                            </div>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer relative">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border",
                             event.priority === 'P0' ? "bg-rose-100 text-rose-600 border-rose-200" :
                             event.priority === 'P1' ? "bg-amber-100 text-amber-600 border-amber-200" :
                             "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                           <Icons.Flag size={16} />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">优先级</div>
                            <div className="text-sm font-medium text-slate-700">{event.priority || 'P2 - 普通'}</div>
                        </div>
                        {/* Priority Selector Hover */}
                        <div className="absolute top-full left-0 bg-white shadow-xl border rounded-lg p-1 hidden group-hover:flex z-10">
                             {['P0','P1','P2'].map(p => (
                                 <button key={p} onClick={() => handlePriorityChange(p as any)} className="px-2 py-1 hover:bg-slate-100 text-xs font-bold rounded">{p}</button>
                             ))}
                        </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                           <Icons.Layout size={16} />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">标签</div>
                            <div className="flex gap-1">
                                {event.tags && event.tags.length > 0 ? event.tags.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">{t}</span>
                                )) : <span className="text-sm text-slate-400">无标签</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === ZONE C: Context === */}
            <div className="p-6 space-y-8">
                
                {/* Description */}
                <div>
                     <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Icons.AlignLeft size={14} /> 描述
                         </h3>
                         <button 
                            onClick={() => setIsDescExpanded(!isDescExpanded)} 
                            className="text-xs text-indigo-500 hover:text-indigo-700"
                         >
                             {isDescExpanded ? '收起' : '展开'}
                         </button>
                     </div>
                     <div className={cn("relative group transition-all duration-300 ease-in-out", isDescExpanded ? "min-h-[200px]" : "h-24 overflow-hidden")}>
                         <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            onBlur={() => onUpdate(event.id, { description: desc })}
                            placeholder="添加详细描述 (支持 Markdown)..."
                            className="w-full h-full bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 focus:border-indigo-300 outline-none resize-none"
                         />
                         {!isDescExpanded && (
                             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                         )}
                     </div>
                </div>

                {/* Checklist */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Icons.CheckCircle size={14} /> 子任务 ({completedChecks}/{totalChecks})
                         </h3>
                    </div>
                    
                    {/* Progress Bar */}
                    {totalChecks > 0 && (
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-4">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${checkProgress}%` }}
                            ></div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {checklist.map(item => (
                            <div key={item.id} className="group flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                                <button 
                                    onClick={() => toggleCheckItem(item.id)}
                                    className={cn(
                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                        item.checked ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 hover:border-indigo-500"
                                    )}
                                >
                                    {item.checked && <Icons.CheckCircle size={12} />}
                                </button>
                                <span className={cn("text-sm flex-1", item.checked ? "text-slate-400 line-through" : "text-slate-700")}>
                                    {item.title}
                                </span>
                                <button onClick={() => {
                                    const newList = checklist.filter(c => c.id !== item.id);
                                    setChecklist(newList);
                                    onUpdate(event.id, { checklist: newList });
                                }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500">
                                    <Icons.X size={14} />
                                </button>
                            </div>
                        ))}
                        
                        {/* Add Item */}
                        <div className="flex items-center gap-3 p-2 pl-3 opacity-60 focus-within:opacity-100 transition-opacity">
                            <Icons.Plus size={16} className="text-slate-400" />
                            <input 
                                type="text"
                                value={newCheckItem}
                                onChange={(e) => setNewCheckItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
                                placeholder="添加子任务..."
                                className="bg-transparent outline-none text-sm w-full"
                            />
                        </div>
                    </div>
                </div>

                 {/* Dependencies Blocking Alert */}
                {event.status === 'blocked' && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
                        <Icons.Lock className="text-rose-500 mt-0.5" size={16} />
                        <div>
                            <h4 className="text-sm font-bold text-rose-700">任务被阻塞</h4>
                            <p className="text-xs text-rose-600 mt-1">
                                此任务依赖的前置任务尚未完成。请先完成 <span className="font-bold underline cursor-pointer">调研竞品</span>。
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* === ZONE D: Activity Stream === */}
            <div className="bg-slate-100/50 border-t border-slate-200 p-6 pb-24 min-h-[300px]">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                     <Icons.MessageSquare size={14} /> 进展与备忘 (Activity & Memos)
                 </h3>
                 
                 <div className="space-y-6">
                     {/* System Log */}
                     <div className="flex gap-4">
                         <div className="w-8 flex flex-col items-center">
                             <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">Sys</div>
                             <div className="w-px h-full bg-slate-200 my-1"></div>
                         </div>
                         <div className="pb-4">
                             <div className="text-xs text-slate-500">
                                 <span className="font-bold text-slate-700">System</span> created this task
                                 <span className="mx-2 text-slate-300">•</span>
                                 {formatDateCN(new Date(event.start))}
                             </div>
                         </div>
                     </div>

                     {/* Existing Logs */}
                     {event.activityLog?.map(log => (
                         <div key={log.id} className="flex gap-4 group">
                             <div className="w-8 flex flex-col items-center">
                                 <div className={cn(
                                     "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border",
                                     log.type === 'memo' ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-white text-slate-600 border-slate-200"
                                 )}>
                                     {log.type === 'memo' ? <Icons.FileText size={14}/> : log.user?.[0]}
                                 </div>
                                 <div className="w-px h-full bg-slate-200 my-1 group-last:hidden"></div>
                             </div>
                             <div className="pb-4 flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-xs font-bold text-slate-700">{log.user || 'User'}</span>
                                     <span className="text-[10px] text-slate-400">{formatTime(new Date(log.timestamp))}</span>
                                     {log.type === 'memo' && (
                                         <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded font-medium">Linked Memo</span>
                                     )}
                                 </div>
                                 
                                 {log.type === 'memo' ? (
                                     <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-slate-700 relative hover:shadow-sm transition-shadow cursor-pointer">
                                         <Icons.Link size={12} className="absolute top-3 right-3 text-amber-400" />
                                         {log.content}
                                     </div>
                                 ) : (
                                     <div className="text-sm text-slate-600 bg-white p-2 rounded-lg border border-slate-100 inline-block shadow-sm">
                                         {log.content}
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

        </div>

        {/* Bottom Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex gap-3 items-center">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" title="Attach File">
                <Icons.Paperclip size={20} />
            </button>
            <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addActivity('comment', newComment)}
                  placeholder="添加评论，或者输入 '#' 关联备忘录..."
                  className="w-full bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <button 
                    onClick={() => addActivity('comment', newComment)}
                    className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                >
                    <Icons.ChevronRight size={14} />
                </button>
            </div>
            {/* Quick Link Memo Button for Demo */}
            <button 
                onClick={() => addActivity('memo', '客户反馈：希望能增加暗黑模式的调研，参考竞品X的设计。')}
                className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors" 
                title="Mock Link Memo"
            >
                <Icons.FileText size={20} />
            </button>
        </div>

      </div>
    </div>
  );
};
