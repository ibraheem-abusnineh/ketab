export type AdminTab =
  | 'overview'
  | 'statistics'
  | 'reports'
  | 'history'
  | 'users'
  | 'requests'
  | 'notifications'
  | 'courses'
  | 'data';

export interface NotificationChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface AdminNotification {
  id: string;
  type: 'profile_update' | 'profile_edit_request';
  userId: string;
  userName: string;
  timestamp: string;
  changes: NotificationChange[];
  read: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
}

export interface SchoolStat {
  school: string;
  visitCount: number;
  uniqueUsers: number;
  pageViews?: number;
}

export interface UserHistoryRow {
  nationalNumber: string;
  name: string;
  school: string;
  role?: string;
  loginCount: number;
  lastLogin: string | null;
}

export interface DailyPoint {
  day: string;
  count: number;
}

export interface HourlyPoint {
  hour: number;
  count: number;
}

export interface VisitEvent {
  timestamp: string | null;
  nationalNumber: string;
  name: string;
  school: string;
}

export interface DirectoryUser {
  nationalNumber: string;
  name: string;
  role: 'parent' | 'teacher' | 'supervisor' | 'student' | 'developer' | 'guest' | 'qra-employ';
  school: string;
  phone: string;
  directorate?: string;
}
