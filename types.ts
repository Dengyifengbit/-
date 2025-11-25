
export type ViewMode = 'day' | 'week' | 'month' | 'gantt';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  createdAt: number;
  tags: string[];
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'task-block';
  status?: 'todo' | 'done'; // Synced from Task
  tags?: string[]; // Synced from Task for Fishbone grouping
  color?: string; // Hex code or tailwind class
  description?: string;
}

export interface DragItem {
  type: 'task';
  id: string;
  title: string;
  duration?: number; // projected duration in minutes
}

export interface Habit {
  id: string;
  title: string;
  icon: string; // lucide icon name
  streak: number;
  completedDates: string[]; // ISO date strings YYYY-MM-DD
  color: string;
  goal: number; // times per week or just daily boolean
}
