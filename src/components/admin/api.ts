import { apiFetch } from '../../utils/api';

export async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  return (await response.json()) as T;
}

export function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface VisitCountResponse {
  totalVisits: number;
}

export interface SchoolsResponse {
  data: Array<{
    school: string;
    visitCount: number;
    uniqueUsers: number;
    pageViews?: number;
  }>;
}

export interface UsersResponse {
  users: Array<{
    nationalNumber: string;
    name: string;
    role: string;
    school: string;
    phone: string;
    directorate?: string;
  }>;
}

export interface UserHistoryResponse {
  data: Array<{
    nationalNumber: string;
    name: string;
    school: string;
    loginCount: number;
    lastLogin: string | null;
  }>;
}

export interface TimeResponse {
  data: {
    hourly: Array<{ hour: number; count: number }>;
    daily: Array<{ day: string; count: number }>;
  };
}

export interface VisitsResponse {
  count: number;
  visits: Array<{
    timestamp: string | null;
    nationalNumber: string;
    name: string;
    school: string;
  }>;
}

export interface NotificationsResponse {
  notifications: import('./types').AdminNotification[];
}

export interface ReportsSchoolResponse {
  data: Array<{ school: string; loginCount: number; uniqueUsers: number }>;
}

export interface ReportsUserResponse {
  data: Array<{
    nationalNumber: string;
    name: string;
    school: string;
    role?: string;
    loginCount: number;
    lastLogin: string | null;
  }>;
}
