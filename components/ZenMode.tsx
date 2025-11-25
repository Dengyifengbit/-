import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Task } from '../types';
import { cn } from '../utils';

interface ZenModeProps {
  activeTask?: Task;
  onExit: () => void;
  onComplete: (task: Task) => void;
}

export const ZenMode: React.FC<ZenModeProps> = ({ activeTask, onExit, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'rain' | 'cafe' | 'off'>('off');

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play ding sound
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center animate-fade-in overflow-hidden">
      {/* Background Ambience Visuals */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[100px] animate-float opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[100px] animate-float opacity-50" style={{ animationDelay: '2s' }}></div>
      </div>

      <button onClick={onExit} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
        <Icons.X size={32} />
      </button>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6">
        <div className="mb-12">
           <span className="inline-block px-3 py-1 rounded-full border border-white/20 text-xs tracking-[0.2em] text-white/70 uppercase mb-4">Focus Mode</span>
           <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-2">
             {activeTask ? activeTask.title : "Deep Work Session"}
           </h2>
           {activeTask && (
             <div className="flex gap-2 justify-center mt-4">
               {activeTask.tags.map(tag => (
                 <span key={tag} className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">{tag}</span>
               ))}
             </div>
           )}
        </div>

        {/* Timer Ring */}
        <div className="relative mb-12 group cursor-pointer" onClick={toggleTimer}>
           <div className="w-64 h-64 rounded-full border-4 border-white/10 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle
                   cx="128"
                   cy="128"
                   r="124"
                   fill="none"
                   stroke="currentColor"
                   strokeWidth="4"
                   strokeDasharray="779"
                   strokeDashoffset={779 - (779 * (1500 - timeLeft) / 1500)} // Progress based on 25 mins
                   className="text-indigo-400 transition-all duration-1000 ease-linear"
                   strokeLinecap="round"
                 />
              </svg>
              <div className="text-6xl font-light tabular-nums tracking-wider font-mono">
                {formatTime(timeLeft)}
              </div>
              <div className="absolute bottom-12 text-xs uppercase tracking-widest text-white/50">
                 {isActive ? "Pause" : "Start"}
              </div>
           </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8">
           <div className="flex gap-2 bg-white/10 p-1 rounded-xl backdrop-blur-sm">
              <button 
                onClick={() => setAmbientSound('off')}
                className={cn("p-3 rounded-lg transition-all", ambientSound === 'off' ? "bg-white/20 text-white" : "text-white/40 hover:text-white")}
                title="Silence"
              >
                <Icons.VolumeX size={20} />
              </button>
              <button 
                onClick={() => setAmbientSound('rain')}
                className={cn("p-3 rounded-lg transition-all", ambientSound === 'rain' ? "bg-white/20 text-white" : "text-white/40 hover:text-white")}
                title="Rain"
              >
                <Icons.CloudRain size={20} />
              </button>
              <button 
                onClick={() => setAmbientSound('cafe')}
                className={cn("p-3 rounded-lg transition-all", ambientSound === 'cafe' ? "bg-white/20 text-white" : "text-white/40 hover:text-white")}
                title="Cafe"
              >
                <Icons.Coffee size={20} />
              </button>
           </div>

           {activeTask && (
             <button 
               onClick={() => onComplete(activeTask)}
               className="bg-emerald-500/80 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium backdrop-blur-sm transition-all hover:scale-105"
             >
               <Icons.CheckCircle size={20} />
               Complete Task
             </button>
           )}
        </div>
      </div>
    </div>
  );
};
