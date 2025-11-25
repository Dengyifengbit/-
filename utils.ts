
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isSameDay, addMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

export const formatDateCN = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
};

// Enhanced NLP Simulation
export const parseSmartInput = (input: string): { title: string; date?: Date; time?: string } => {
  const lower = input.toLowerCase();
  const now = new Date();
  let targetDate = new Date();
  
  // Detect "Tomorrow" or "明天"
  if (lower.includes('tomorrow') || lower.includes('明天')) {
    targetDate.setDate(now.getDate() + 1);
  }
  
  // Detect Time
  // Support: 14:00, 2:30pm, 2pm, 14.30
  const timeRegex = /((?:\d{1,2})[:.](\d{2})|(?:\d{1,2})\s*(?:am|pm|am|pm))/i;
  const timeMatch = input.match(timeRegex);
  
  let timeStr = undefined;
  if (timeMatch) {
    let rawTime = timeMatch[0];
    
    // Normalize simple cases
    if (rawTime.toLowerCase().includes('pm') && !rawTime.includes(':')) {
         // "2pm" case
         const h = parseInt(rawTime);
         const hour = h < 12 ? h + 12 : h;
         timeStr = `${hour.toString().padStart(2, '0')}:00`;
    } else if (rawTime.includes(':') || rawTime.includes('.')) {
        // "14:00" or "2:30"
        const separator = rawTime.includes(':') ? ':' : '.';
        let [hStr, mStr] = rawTime.split(separator);
        let h = parseInt(hStr);
        // adjust for pm if exists later in string? (regex above is simple)
        if (rawTime.toLowerCase().includes('pm') && h < 12) h += 12;
        if (rawTime.toLowerCase().includes('am') && h === 12) h = 0;
        
        timeStr = `${h.toString().padStart(2, '0')}:${mStr.slice(0,2)}`;
    }
  }

  // Clean title
  // Remove tomorrow, time strings
  let title = input
    .replace(/tomorrow/i, '')
    .replace(/明天/i, '');
    
  if (timeMatch) {
      title = title.replace(timeMatch[0], '');
  }

  title = title.replace(/\s+/g, ' ').trim();
  if (!title) title = "新任务";

  return { title, date: targetDate, time: timeStr };
};

export const getEventStyle = (event: { start: Date; end: Date }, dayStartHour: number = 0) => {
  const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
  const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
  const duration = endMinutes - startMinutes;
  
  // 1440 minutes in a day
  const top = (startMinutes / 1440) * 100;
  const height = (duration / 1440) * 100;

  return {
    top: `${top}%`,
    height: `${height}%`,
  };
};
