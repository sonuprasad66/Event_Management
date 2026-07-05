export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  role: string;
  sessionId: string;
  tokenId: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    timezone: string;
  };
  session?: {
    id: string;
    tokenId: string;
  };
}
