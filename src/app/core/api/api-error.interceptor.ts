import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface ApiErrorPayload {
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
  readonly timestamp?: string;
  readonly userActionable: boolean;
  readonly traceId?: string;
  readonly activeSession?: {
    readonly deviceName?: string;
    readonly lastActivityAt?: string;
  };
  readonly replacementToken?: string;
}

export const GENERIC_OPERATION_ERROR =
  'No se pudo completar la operacion en este momento. Intenta nuevamente.';
export const GENERIC_CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Intenta nuevamente en unos momentos.';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      return throwError(() => normalizeHttpError(error));
    }),
  );

export function normalizeHttpError(error: HttpErrorResponse): HttpErrorResponse {
  const payload = asPayload(error.error);
  const normalized = normalizePayload(error.status, payload);

  return new HttpErrorResponse({
    error: normalized,
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url ?? undefined,
  });
}

function normalizePayload(status: number, payload: Partial<ApiErrorPayload> | null): ApiErrorPayload {
  const traceId = cleanText(payload?.traceId);

  if (payload?.userActionable === true) {
    return userPayload(payload, status, traceId);
  }

  if (payload?.userActionable === false || status === 0 || status >= 500) {
    return systemPayload(status, traceId);
  }

  if (status === 413) {
    return {
      code: 'FILE_TOO_LARGE',
      message: 'El archivo supera el tamano permitido.',
      details: [],
      userActionable: true,
      traceId,
    };
  }

  if (status === 401) {
    return safeClientPayload('AUTH_ERROR', 'Tu sesion no es valida o ha vencido.', traceId);
  }

  if (status === 403) {
    return safeClientPayload('ACCESS_DENIED', 'No tienes permiso para realizar esta operacion.', traceId);
  }

  if (status === 404) {
    return safeClientPayload('NOT_FOUND', 'No se encontro el recurso solicitado.', traceId);
  }

  // Compatibilidad temporal para APIs antiguas que aun no envian userActionable.
  if (status === 400 || status === 409 || status === 422) {
    return userPayload(payload, status, traceId);
  }

  return systemPayload(status, traceId);
}

function userPayload(
  payload: Partial<ApiErrorPayload> | null,
  status: number,
  traceId?: string,
): ApiErrorPayload {
  const details = Array.isArray(payload?.details)
    ? payload.details.map(cleanText).filter((detail): detail is string => Boolean(detail))
    : [];

  return {
    code: cleanText(payload?.code) || `REQUEST_${status || 'INVALID'}`,
    message: cleanText(payload?.message) || details[0] || 'Revisa los datos ingresados.',
    details,
    timestamp: cleanText(payload?.timestamp),
    userActionable: true,
    traceId,
    activeSession: payload?.activeSession,
    replacementToken: cleanText(payload?.replacementToken),
  };
}

function systemPayload(status: number, traceId?: string): ApiErrorPayload {
  return {
    code: status === 0 ? 'CONNECTION_ERROR' : 'OPERATION_FAILED',
    message: status === 0 ? GENERIC_CONNECTION_ERROR : GENERIC_OPERATION_ERROR,
    details: [],
    userActionable: false,
    traceId,
  };
}

function safeClientPayload(code: string, message: string, traceId?: string): ApiErrorPayload {
  return { code, message, details: [], userActionable: true, traceId };
}

function asPayload(value: unknown): Partial<ApiErrorPayload> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Partial<ApiErrorPayload>;
}

function cleanText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
