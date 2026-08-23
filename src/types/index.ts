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
  postReviews: boolean;
  viewMembers: boolean;
  exportTasks: boolean;
  importTasks: boolean;
  manageShows: boolean;
  deleteReview: boolean;
  deleteShow: boolean;
  viewIdeas: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  viewAllTasks: true,
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
  postReviews: false,
  viewMembers: true,
  exportTasks: false,
  importTasks: false,
  manageShows: false,
  deleteReview: false,
  deleteShow: false,
  viewIdeas: true,
};

export interface Show {
  id: string;
  name: string;
  subtitle: string;
  posterUrl: string;
  date: string;
  published: boolean;
  createdAt: number;
  createdBy: string;
}

export interface Match {
  id: string;
  showId: string;
  title: string;
  imageUrl: string;
  order: number;
  createdAt: number;
}

export interface ShowReviewPoint {
  text: string;
  positive: boolean;
}

export interface ShowOverallReview {
  id: string;
  showId: string;
  points: ShowReviewPoint[];
  description?: string | null;
  verdict: string;
  rating: number;
  createdAt: number;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorTwitter?: string | null;
}

export interface ShowReview {
  id: string;
  matchId: string;
  showId: string;
  points: ShowReviewPoint[];
  description?: string | null;
  verdict: string;
  rating: number;
  createdAt: number;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorTwitter?: string | null;
}

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
  type?: 'short' | 'video' | 'writing' | 'x_content' | 'podcast' | 'design';
  status?: TaskStatus;
  done: boolean;
  driveLink?: string;
  linkedIdeaId?: string;
  teamMemberIds?: string[];
  createdAt: number;
  titleSetAt?: number;
  points?: number;
  bonusPoints?: number;
  bonusNote?: string;
  twitterUrl?: string;
  producerId?: string;
  isBonus?: boolean;
  pointsApproved?: boolean;
  pointsApprovedBy?: string;
  pointsApprovedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  createdAt: number;
  createdBy: string;
  attendees?: Record<string, boolean>;
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
  type?: 'short' | 'video' | 'writing' | 'x_content' | 'podcast' | 'design';
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
