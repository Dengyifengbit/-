import React from 'react';
import { Icons } from './Icons';
import { Habit } from '../types';
import { cn } from '../utils';
import { format, isSameDay } from 'date-fns';

interface HabitTrackerProps {
  habits: Habit[];
  onToggleHabit: (id: string) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, onToggleHabit }) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex items-center gap-6 px-4 py-2">
      {habits.map((habit) => {
        const isCompletedToday = habit.completedDates.includes(today);
        
        // Icon Mapping (simplified)
        const IconComponent = (Icons as any)[habit.icon] || Icons.CheckCircle;

        return (
          <div key={habit.id} className="group relative flex flex-col items-center cursor-pointer" onClick={() => onToggleHabit(habit.id)}>
             {/* Tooltip / Streak Badge */}
             <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap z-50">
                {habit.streak} day streak!
             </div>

            <div className={cn(
              "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2",
              isCompletedToday 
                ? "bg-white border-transparent shadow-md scale-105" 
                : "bg-white/40 border-white/50 hover:bg-white/60"
            )}>
              {/* Animated Ring Background if completed */}
              {isCompletedToday && (
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
              )}
              
              <IconComponent 
                size={20} 
                className={cn(
                  "transition-all duration-300 z-10",
                  isCompletedToday ? "text-indigo-600 scale-110" : "text-slate-500 group-hover:text-slate-700"
                )} 
              />
              
              {/* Completion Ring SVG */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke={habit.color}
                  strokeWidth="2"
                  strokeDasharray="138"
                  strokeDashoffset={isCompletedToday ? "0" : "138"}
                  className="transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[10px] mt-1 font-medium text-slate-600 tracking-wide">{habit.title}</span>
          </div>
        );
      })}
      
      <button className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors ml-2">
         <Icons.Plus size={14} />
      </button>
    </div>
  );
};
