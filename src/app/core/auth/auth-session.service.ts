import { Injectable, inject, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

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
  private readonly router = inject(Router);
  private readonly session = signal<LoginResponse | null>(this.readSession());
  private redirectingToLogin = false;

  readonly currentSession = this.session.asReadonly();

  setSession(session: LoginResponse): void {
    const normalized = this.normalizeSession(session);
    this.redirectingToLogin = false;
    this.session.set(normalized);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  }

  clearSession(): void {
    this.session.set(null);
    localStorage.removeItem(SESSION_KEY);
  }

  hasActiveSession(): boolean {
    const session = this.session();
    return !!session?.accessToken && !this.isTokenExpired(session);
  }

  isTokenExpired(session: LoginResponse | null = this.session()): boolean {
    if (!session?.accessToken) {
      return true;
    }

    const issuedAtTime = Date.parse(session.issuedAt ?? '');
    const expiresInSeconds = Number(session.expiresInSeconds ?? 0);

    if (!Number.isFinite(issuedAtTime) || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
      return false;
    }

    return Date.now() >= issuedAtTime + expiresInSeconds * 1000;
  }

  expireSession(): void {
    this.clearSession();

    const currentUrl = this.router.url;
    if (this.redirectingToLogin || currentUrl.startsWith('/auth/login')) {
      return;
    }

    this.redirectingToLogin = true;
    void this.router
      .navigate(['/auth/login'], {
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
    if (session.adminEmpresa || session.adminGeneral) {
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
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      return this.normalizeSession(JSON.parse(raw) as LoginResponse);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  private normalizeSession(session: LoginResponse): LoginResponse {
    return {
      ...session,
      roles: [...(session.roles ?? [])],
      permissions: [...(session.permissions ?? [])],
      modules: [...(session.modules ?? [])]
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    };
  }
}
