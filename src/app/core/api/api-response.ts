export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message: string;
  readonly timestamp: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly string[];
  readonly timestamp?: string;
}
