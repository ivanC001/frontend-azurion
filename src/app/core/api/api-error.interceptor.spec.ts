import { HttpErrorResponse } from '@angular/common/http';

import {
  GENERIC_CONNECTION_ERROR,
  GENERIC_OPERATION_ERROR,
  normalizeHttpError,
} from './api-error.interceptor';

describe('api error normalization', () => {
  it('preserves backend validation the user can correct', () => {
    const normalized = normalizeHttpError(errorResponse(400, {
      code: 'CRM_CLIENTE_DOCUMENTO_REQUERIDO',
      message: 'Completa el numero de documento',
      details: ['numeroDocumento: es obligatorio'],
      userActionable: true,
      traceId: 'trace-validation',
    }));

    expect(normalized.error).toEqual({
      code: 'CRM_CLIENTE_DOCUMENTO_REQUERIDO',
      message: 'Completa el numero de documento',
      details: ['numeroDocumento: es obligatorio'],
      timestamp: undefined,
      userActionable: true,
      traceId: 'trace-validation',
    });
  });

  it('hides technical details from internal server failures', () => {
    const normalized = normalizeHttpError(errorResponse(500, {
      code: 'EMAIL_SEND_ERROR',
      message: 'Connection refused by smtp.internal:587',
      details: ['password authentication failed'],
      userActionable: false,
      traceId: 'trace-email',
    }));

    expect(normalized.error).toEqual({
      code: 'OPERATION_FAILED',
      message: GENERIC_OPERATION_ERROR,
      details: [],
      userActionable: false,
      traceId: 'trace-email',
    });
  });

  it('sanitizes legacy 5xx responses even without the new contract', () => {
    const normalized = normalizeHttpError(errorResponse(503, {
      message: 'jdbc:postgresql://internal-db/azurion refused connection',
    }));

    expect(normalized.error.message).toBe(GENERIC_OPERATION_ERROR);
    expect(normalized.error.message).not.toContain('internal-db');
  });

  it('uses a safe message for network failures', () => {
    const normalized = normalizeHttpError(errorResponse(0, new ProgressEvent('error')));

    expect(normalized.error.message).toBe(GENERIC_CONNECTION_ERROR);
    expect(normalized.error.userActionable).toBe(false);
  });

  it('keeps legacy 409 validation messages during backend migration', () => {
    const normalized = normalizeHttpError(errorResponse(409, {
      code: 'DATA_CONFLICT',
      message: 'Ya existe un cliente con ese documento',
    }));

    expect(normalized.error.message).toBe('Ya existe un cliente con ese documento');
    expect(normalized.error.userActionable).toBe(true);
  });

  it('preserves the active-session replacement challenge', () => {
    const normalized = normalizeHttpError(errorResponse(409, {
      code: 'ACTIVE_SESSION_EXISTS',
      message: 'La cuenta ya tiene una sesion activa en otro dispositivo.',
      activeSession: {
        deviceName: 'Edge en Windows',
        lastActivityAt: '2026-07-23T02:30:00Z',
      },
      replacementToken: 'one-use-token',
    }));

    expect(normalized.error.code).toBe('ACTIVE_SESSION_EXISTS');
    expect(normalized.error.activeSession?.deviceName).toBe('Edge en Windows');
    expect(normalized.error.replacementToken).toBe('one-use-token');
  });

  function errorResponse(status: number, error: unknown): HttpErrorResponse {
    return new HttpErrorResponse({
      error,
      status,
      statusText: status === 0 ? 'Unknown Error' : 'Error',
      url: 'https://azurion.test/api/resource',
    });
  }
});
