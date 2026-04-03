export interface UserPermissions {
  viewAllTasks: boolean;
  addTaskSelf: boolean;
  addTaskOthers: boolean;
  deleteTask: boolean;
  editTask: boolean;
  editMember: boolean;
  deleteMember: boolean;
  setTaskComplete: boolean;
  setTaskIncomplete: boolean;
  changeTaskStatus: boolean;
  managePolls: boolean;
  viewMembers: boolean;
  exportTasks: boolean;
  importTasks: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  viewAllTasks: false,
  addTaskSelf: true,
  addTaskOthers: false,
  deleteTask: false,
  editTask: false,
  editMember: false,
  deleteMember: false,
  setTaskComplete: true,
  setTaskIncomplete: false,
  changeTaskStatus: false,
  managePolls: false,
  viewMembers: true,
  exportTasks: false,
  importTasks: false,
};

export interface User {
  id: string;
  name: string;
  email: string;
  jobRole: 'صانع محتوى' | 'كاتب' | 'مصمم' | 'ممنتج';
  isAdmin?: boolean;
  approved?: boolean;
  color: string;
  photoURL?: string;
  twitterHandle?: string;
  createdAt: number;
  permissions?: UserPermissions;
}

export interface Task {
  id: string;
  memberId: string;
  title: string;
  desc?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: 'short' | 'video' | 'writing' | 'x_content' | 'podcast';
  status?: TaskStatus;
  done: boolean;
  driveLink?: string;
  linkedIdeaId?: string;
  teamMemberIds?: string[];
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}

export interface Idea {
  id: string;
  text: string;
  type: 'short' | 'video';
  ownerId?: string | null;
  createdBy?: string;
  linkedTaskId?: string | null;
  createdAt: number;
}

export interface ImportRow {
  memberName: string;
  memberId: string | null;
  title: string;
  desc: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  type?: 'short' | 'video' | 'writing' | 'x_content' | 'podcast';
  error?: string;
}

export type TaskStatus = 'pending' | 'done' | 'ready' | 'published' | 'cancelled';

export interface StatusInfo {
  label: string;
  badge: string;
  cls: string;
  color: string;
}

export const STATUS_MAP: Record<TaskStatus, StatusInfo> = {
  pending:   { label: 'معلقة',      badge: 'badge-gray',  cls: '',          color: 'var(--muted)' },
  done:      { label: 'مكتملة',     badge: 'badge-green', cls: 'done',      color: 'var(--green)' },
  ready:     { label: 'جاهز للنشر', badge: 'badge-gold',  cls: 'ready',     color: 'var(--gold)' },
  published: { label: 'تم النشر',   badge: 'badge-green', cls: 'published', color: 'var(--gold)' },
  cancelled: { label: 'ملغية',      badge: 'badge-red',   cls: 'cancelled', color: 'var(--red)' },
};

export const COLORS = ['#81050f', '#c9a84c', '#0066ff', '#9b00e8', '#00d46a', '#ff7b00', '#00b4d8', '#e040fb'];

export const PRIORITY_MAP: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--muted)',
  medium: 'var(--gold)',
  high: 'var(--red)',
};
