import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { APP_SETTINGS, appSettings } from '@core/config/app-settings';
import { AuthSessionService, LoginResponse } from './auth-session.service';

const SESSION_KEY = 'azurios.session';

describe('AuthSessionService', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: APP_SETTINGS, useValue: appSettings },
        {
          provide: Router,
          useValue: {
            url: '/admin',
            navigate: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('uses session storage by default', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(validSession());

    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(service.hasActiveSession()).toBe(true);
  });

  it('only persists across browser restarts when remember is enabled', () => {
    const service = TestBed.inject(AuthSessionService);

    service.setSession(validSession(), true);

    expect(window.localStorage.getItem(SESSION_KEY)).toBeTruthy();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('fails closed when stored expiration metadata is invalid', () => {
    const invalid = { ...validSession(), accessToken: 'not-a-jwt', issuedAt: 'invalid', expiresInSeconds: 0 };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(invalid));

    const service = TestBed.inject(AuthSessionService);

    expect(service.currentSession()).toBeNull();
    expect(service.hasActiveSession()).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('uses the signed JWT expiration instead of stale client metadata', () => {
    const expiredJwt = jwtWithExpiration(Math.floor(Date.now() / 1000) - 60);
    const session = {
      ...validSession(),
      accessToken: expiredJwt,
      issuedAt: new Date().toISOString(),
      expiresInSeconds: 3600,
    };
    const service = TestBed.inject(AuthSessionService);

    service.setSession(session);

    expect(service.hasActiveSession()).toBe(false);
    expect(service.apiHeaders().has('Authorization')).toBe(false);
  });

  it('returns tenant users to the company login when the session expires', () => {
    const service = TestBed.inject(AuthSessionService);
    const router = TestBed.inject(Router);
    service.setSession(validSession());

    service.expireSession();

    expect(router.navigate).toHaveBeenCalledWith(['/auth'], {
      replaceUrl: true,
      queryParams: { redirectUrl: '/admin' },
    });
  });

  it('returns platform administrators to the administrator login', () => {
    const service = TestBed.inject(AuthSessionService);
    const router = TestBed.inject(Router);
    service.setSession({
      ...validSession(),
      tenantId: null,
      adminGeneral: true,
      adminEmpresa: false,
      roles: ['ADMIN_GENERAL'],
    });

    service.expireSession();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      replaceUrl: true,
      queryParams: { redirectUrl: '/admin' },
    });
  });

  function validSession(): LoginResponse {
    return {
      accessToken: 'opaque-token',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      username: 'tester',
      tenantId: '20123456789',
      roles: ['ADMIN_EMPRESA'],
      permissions: [],
      modules: [' crm '],
      adminGeneral: false,
      adminEmpresa: true,
      issuedAt: new Date().toISOString(),
    };
  }

  function jwtWithExpiration(exp: number): string {
    const encode = (value: object) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`;
  }
});
