export type ViewMode = 'day' | 'week' | 'month';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  createdAt: number;
  tags: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'task-block';
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
