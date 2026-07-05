export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { events: number; sessions: number };
}

export interface Session {
  id: string;
  browser: string;
  device: string;
  ipAddress: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
  _count?: { events: number; children: number };
}

export interface EventMedia {
  id: string;
  eventId: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  createdById: string;
  publishAtUtc: string;
  publishAtLocal?: string;
  timezoneName?: string;
  timezoneOffset?: string;
  sourceTimezone: string;
  deletedAt: string | null;
  deletedById: string | null;
  createdAt: string;
  updatedAt: string;
  status?: 'published' | 'waiting' | 'deleted';
  category?: Category;
  createdBy?: { id: string; username: string; email: string };
  deletedBy?: { id: string; username: string } | null;
  media?: EventMedia[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminStats {
  total: number;
  published: number;
  waiting: number;
  deleted: number;
  totalUsers: number;
}
