import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isSameDay, addMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatTime = (date: Date) => format(date, 'h:mm a');

// Simple NLP Simulation
export const parseSmartInput = (input: string): { title: string; date?: Date; time?: string } => {
  const lower = input.toLowerCase();
  const now = new Date();
  let targetDate = new Date();
  
  // Detect "Tomorrow"
  if (lower.includes('tomorrow')) {
    targetDate.setDate(now.getDate() + 1);
  }
  
  // Detect Time (e.g., 14:00, 2pm, 2:30pm)
  const timeRegex = /(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?/i;
  const timeMatch = input.match(timeRegex);
  
  let timeStr = undefined;
  if (timeMatch) {
    // Very basic parsing, in a real app use a library like chrono-node
    timeStr = timeMatch[0];
  }

  // Clean title
  const title = input
    .replace(/tomorrow/i, '')
    .replace(timeRegex, '')
    .replace(/\s+/g, ' ')
    .trim();

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
