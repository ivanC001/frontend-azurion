import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthSessionService } from '../auth-session.service';

const AUTH_ENDPOINT_MARKERS = [
  '/v1/auth/login',
  '/v1/auth/public/login',
  '/v1/auth/tenant/login',
  '/v1/auth/session/replace',
  '/v1/auth/session/logout',
];

export const authSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(AuthSessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (shouldRedirectToLogin(req.url, error, sessionService)) {
        if (errorCode(error) === 'SESSION_REVOKED') {
          sessionService.revokeSession(
            'Tu sesión fue cerrada porque esta cuenta inició sesión en otro dispositivo',
          );
        } else {
          sessionService.expireSession();
        }
      }

      return throwError(() => error);
    }),
  );
};

function shouldRedirectToLogin(
  requestUrl: string,
  error: unknown,
  sessionService: AuthSessionService,
): boolean {
  if (!sessionService.currentSession()?.accessToken) {
    return false;
  }

  if (AUTH_ENDPOINT_MARKERS.some((marker) => requestUrl.includes(marker))) {
    return false;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  if (error.status === 401) {
    return true;
  }

  if (error.status !== 403) {
    return false;
  }

  const normalizedMessage = extractErrorMessage(error).toLowerCase();
  return (
    normalizedMessage.includes('invalid jwt token') ||
    normalizedMessage.includes('jwt expired') ||
    normalizedMessage.includes('expired jwt') ||
    normalizedMessage.includes('token expired') ||
    normalizedMessage.includes('token expirado') ||
    normalizedMessage.includes('token invalido') ||
    normalizedMessage.includes('token inv') ||
    normalizedMessage.includes('firma invalida')
  );
}

function errorCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || typeof error.error !== 'object' || !error.error) {
    return '';
  }
  return String((error.error as { code?: unknown }).code ?? '');
}

function extractErrorMessage(error: HttpErrorResponse): string {
  const payload = error.error as
    | string
    | { message?: string; error?: string; details?: string[] }
    | null
    | undefined;

  if (!payload) {
    return error.message || '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return payload.details?.[0] || payload.message || payload.error || error.message || '';
}
