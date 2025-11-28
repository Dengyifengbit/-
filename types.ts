
export type ViewMode = 'day' | 'week' | 'month' | 'gantt';

export interface ChecklistItem {
  id: string;
  title: string;
  checked: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'system' | 'comment' | 'memo';
  content: string; // The text content or memo excerpt
  timestamp: number;
  user?: string; // 'System' or user name
}

export interface Project {
  id: string;
  title: string;
}

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
  status?: 'todo' | 'done' | 'in-progress' | 'blocked'; // Enhanced status
  tags?: string[];
  color?: string;
  description?: string;
  
  // Project Management Fields
  progress?: number; // 0-100
  owner?: string;
  parentId?: string;
  dependencies?: string[];
  isMilestone?: boolean;

  // Detail Panel Fields
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  assignee?: { name: string; avatar: string };
  checklist?: ChecklistItem[];
  linkedMemos?: string[]; // IDs of linked memos
  activityLog?: ActivityLog[];
  projectName?: string; // Simplified project context
  stageName?: string; // Simplified stage context
}

export interface DragItem {
  type: 'task';
  id: string;
  title: string;
  duration?: number;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  streak: number;
  completedDates: string[];
  color: string;
  goal: number;
}
