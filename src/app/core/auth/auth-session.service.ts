import { Injectable, inject, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { ApiUrlService } from '@core/api/api-url.service';
import { APP_SETTINGS } from '@core/config/app-settings';

export interface LoginResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresInSeconds: number;
  readonly username: string;
  readonly tenantId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly modules: readonly string[];
  readonly adminGeneral: boolean;
  readonly adminEmpresa: boolean;
  readonly issuedAt: string;
  readonly sucursales?: readonly {
    readonly id: number;
    readonly codigo: string;
    readonly nombre: string;
  }[];
  readonly userId?: number;
  readonly nombres?: string | null;
  readonly email?: string | null;
  readonly empresa?: {
    readonly id: number;
    readonly ruc: string;
    readonly razonSocial: string;
    readonly tenantId: string;
    readonly schemaName: string;
    readonly logoPanelUrl?: string | null;
    readonly activo: boolean;
  } | null;
}

const SESSION_KEY = 'azurios.session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly settings = inject(APP_SETTINGS);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly router = inject(Router);
  private persistAcrossRestarts = false;
  private readonly session = signal<LoginResponse | null>(this.readSession());
  private redirectingToLogin = false;

  readonly currentSession = this.session.asReadonly();

  setSession(session: LoginResponse, persist = this.persistAcrossRestarts): void {
    const normalized = this.normalizeSession(session);
    this.redirectingToLogin = false;
    this.persistAcrossRestarts = persist;
    this.session.set(normalized);
    this.removeStoredSession();
    this.storage(persist)?.setItem(SESSION_KEY, JSON.stringify(normalized));
  }

  clearSession(): void {
    this.session.set(null);
    this.persistAcrossRestarts = false;
    this.removeStoredSession();
  }

  hasActiveSession(): boolean {
    const session = this.session();
    return !!session?.accessToken && !this.isTokenExpired(session);
  }

  isTokenExpired(session: LoginResponse | null = this.session()): boolean {
    if (!session?.accessToken) {
      return true;
    }

    const jwtExpiry = this.jwtExpiryMillis(session.accessToken);
    if (jwtExpiry !== null) {
      return Date.now() >= jwtExpiry;
    }

    const issuedAtTime = Date.parse(session.issuedAt ?? '');
    const expiresInSeconds = Number(session.expiresInSeconds ?? 0);

    if (!Number.isFinite(issuedAtTime) || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
      return true;
    }

    return Date.now() >= issuedAtTime + expiresInSeconds * 1000;
  }

  expireSession(): void {
    const loginUrl = this.session()?.adminGeneral ? '/auth/login' : '/auth';
    this.clearSession();

    const currentUrl = this.router.url;
    if (this.redirectingToLogin || currentUrl === loginUrl) {
      return;
    }

    this.redirectingToLogin = true;
    void this.router
      .navigate([loginUrl], {
        replaceUrl: true,
        queryParams: currentUrl && currentUrl !== '/' ? { redirectUrl: currentUrl } : undefined,
      })
      .finally(() => {
        this.redirectingToLogin = false;
      });
  }

  hasPermission(permission: string): boolean {
    const session = this.session();
    if (!session) {
      return false;
    }
    if (session.adminGeneral) {
      return true;
    }
    return session.permissions?.includes(permission) ?? false;
  }

  hasModule(moduleCode: string | readonly string[]): boolean {
    const session = this.session();
    if (!session) {
      return false;
    }
    if (session.adminGeneral) {
      return true;
    }

    const activeModules = new Set(
      (session.modules ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean),
    );
    const requiredModules = Array.isArray(moduleCode) ? moduleCode : [moduleCode];
    return requiredModules.every((value) => activeModules.has(value.trim().toUpperCase()));
  }

  updateEmpresaData(patch: Partial<NonNullable<NonNullable<LoginResponse['empresa']>>>): void {
    const current = this.session();
    if (!current?.empresa) {
      return;
    }

    const next: LoginResponse = {
      ...current,
      empresa: {
        ...current.empresa,
        ...patch,
      },
    };

    this.setSession(next);
  }

  updateModules(modules: readonly string[]): void {
    const current = this.session();
    if (!current) {
      return;
    }

    this.setSession({
      ...current,
      modules: [...modules],
    });
  }

  apiHeaders(tenantId?: string | null): HttpHeaders {
    const session = this.session();
    let headers = new HttpHeaders({
      [this.settings.tenancy.headerName]:
        tenantId || session?.tenantId || this.settings.tenancy.defaultTenantId,
    });

    if (session?.accessToken && !this.isTokenExpired(session)) {
      headers = headers.set(
        'Authorization',
        `${session.tokenType || 'Bearer'} ${session.accessToken}`,
      );
    }

    return headers;
  }

  private readSession(): LoginResponse | null {
    const sessionRaw = this.storage(false)?.getItem(SESSION_KEY) ?? null;
    const persistentRaw = this.storage(true)?.getItem(SESSION_KEY) ?? null;
    const raw = sessionRaw || persistentRaw;
    if (!raw) {
      return null;
    }

    try {
      const parsed = this.normalizeSession(JSON.parse(raw) as LoginResponse);
      if (this.isTokenExpired(parsed)) {
        this.removeStoredSession();
        return null;
      }
      this.persistAcrossRestarts = !sessionRaw && !!persistentRaw;
      return parsed;
    } catch {
      this.removeStoredSession();
      return null;
    }
  }

  private jwtExpiryMillis(token: string): number | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as { exp?: unknown };
      const exp = Number(payload.exp);
      return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private storage(persistent: boolean): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return persistent ? window.localStorage : window.sessionStorage;
  }

  private removeStoredSession(): void {
    this.storage(false)?.removeItem(SESSION_KEY);
    this.storage(true)?.removeItem(SESSION_KEY);
  }

  private normalizeSession(session: LoginResponse): LoginResponse {
    return {
      ...session,
      empresa: session.empresa
        ? {
            ...session.empresa,
            logoPanelUrl: this.apiUrl.publicFileUrl(session.empresa.logoPanelUrl),
          }
        : session.empresa,
      roles: [...(session.roles ?? [])],
      permissions: [...(session.permissions ?? [])],
      modules: [...(session.modules ?? [])]
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    };
  }
}
