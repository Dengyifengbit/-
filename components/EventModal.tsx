
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { cn } from '../utils';
import { CalendarEvent } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
  initialData?: CalendarEvent | null;
  selectedDate?: Date;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  selectedDate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<'event' | 'task-block'>('event');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setStartTime(initialData.start.toTimeString().slice(0, 5));
      setEndTime(initialData.end.toTimeString().slice(0, 5));
      setType(initialData.type);
    } else {
      setTitle('');
      setDescription('');
      
      if (selectedDate) {
        const h = selectedDate.getHours().toString().padStart(2, '0');
        const m = selectedDate.getMinutes().toString().padStart(2, '0');
        if (h !== '00' || m !== '00') {
             setStartTime(`${h}:${m}`);
             const endDate = new Date(selectedDate.getTime() + 60*60*1000);
             setEndTime(endDate.toTimeString().slice(0,5));
        } else {
             setStartTime('09:00');
             setEndTime('10:00');
        }
      } else {
         setStartTime('09:00');
         setEndTime('10:00');
      }
      
      setType('event');
    }
  }, [initialData, isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title) return;

    const baseDate = initialData ? initialData.start : (selectedDate || new Date());
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const start = new Date(baseDate);
    start.setHours(startH, startM);
    
    const end = new Date(baseDate);
    end.setHours(endH, endM);

    onSave({
      id: initialData?.id,
      title,
      description,
      start,
      end,
      type
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-card bg-white/90 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 border border-white/60">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {initialData ? '编辑日程' : '新建日程'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <input
              autoFocus
              type="text"
              placeholder="需要做什么?"
              className="w-full text-xl font-medium border-b-2 border-slate-100 focus:border-indigo-400 outline-none py-2 bg-transparent placeholder:text-slate-300 transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">开始</label>
              <div className="flex items-center bg-slate-50/50 rounded-xl px-3 py-2.5 border border-slate-100 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <Icons.Clock size={16} className="text-slate-400 mr-2" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full font-medium text-slate-700"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">结束</label>
              <div className="flex items-center bg-slate-50/50 rounded-xl px-3 py-2.5 border border-slate-100 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <Icons.Clock size={16} className="text-slate-400 mr-2" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">类型</label>
             <div className="flex bg-slate-100/50 p-1 rounded-xl">
                <button 
                  onClick={() => setType('event')}
                  className={cn("flex-1 py-2 text-sm rounded-lg font-medium transition-all", type === 'event' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  日程
                </button>
                <button 
                   onClick={() => setType('task-block')}
                   className={cn("flex-1 py-2 text-sm rounded-lg font-medium transition-all", type === 'task-block' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                  专注块
                </button>
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">备注</label>
            <div className="relative">
              <Icons.AlignLeft className="absolute top-3 left-3 text-slate-400" size={16} />
              <textarea
                rows={3}
                placeholder="添加地点、链接或备注..."
                className="w-full bg-slate-50/50 rounded-xl py-2 pl-9 pr-3 text-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
          {initialData ? (
             <button 
              onClick={() => onDelete(initialData.id)}
              className="flex items-center text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl text-sm transition-colors font-medium"
             >
                <Icons.Trash2 size={16} className="mr-2" /> 删除
             </button>
          ) : <div></div>}
         
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
