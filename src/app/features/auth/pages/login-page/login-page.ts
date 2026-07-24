import { Component, OnInit, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, timeout } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DialogModule } from 'primeng/dialog';

import { AuthApiService } from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { ApiErrorPayload } from '@core/api/api-error.interceptor';

interface ActiveSessionConflict {
  replacementToken: string;
  deviceName: string;
  lastActivityAt: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login-page',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    DialogModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected rememberAdmin = false;
  protected rememberTenant = false;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sessionConflict = signal<ActiveSessionConflict | null>(null);
  protected readonly replacingSession = signal(false);
  protected loginMode: 'general' | 'tenant' = 'general';
  protected adminCredentials = {
    username: '',
    password: '',
  };
  protected tenantCredentials = {
    username: '',
    password: '',
    tenantId: '',
  };

  constructor() {
    effect(() => {
      if (this.session.currentSession() && this.session.hasActiveSession()) {
        void this.router.navigateByUrl(this.resolvePostLoginUrl(), { replaceUrl: true });
      }
    });
  }

  ngOnInit(): void {
    this.loginMode = this.route.snapshot.data['loginMode'] === 'tenant' ? 'tenant' : 'general';
    this.errorMessage.set(this.session.consumeSessionNotice());

    if (this.session.currentSession() && !this.session.hasActiveSession()) {
      this.session.clearSession();
    }
  }

  protected login(mode: 'general' | 'tenant'): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set(null);
    this.sessionConflict.set(null);
    this.loginMode = mode;

    const credentials = mode === 'general' ? this.adminCredentials : this.tenantCredentials;
    const username = credentials.username.trim();
    const password = credentials.password;

    if (!username || !password) {
      this.errorMessage.set('Ingresa usuario y contrasena.');
      return;
    }

    const tenantId = mode === 'tenant' ? this.tenantCredentials.tenantId.trim() : '';
    if (mode === 'tenant' && !tenantId) {
      this.errorMessage.set('Debes ingresar el identificador fiscal o tenant de la empresa.');
      return;
    }

    if (mode === 'tenant' && !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(tenantId)) {
      this.errorMessage.set('Ingresa un identificador fiscal o tenant valido.');
      return;
    }

    this.loading.set(true);
    const loadingSafetyTimer = setTimeout(() => {
      if (this.loading()) {
        this.loading.set(false);
        if (!this.errorMessage()) {
          this.errorMessage.set('No hubo respuesta del servidor a tiempo. Intenta nuevamente.');
        }
      }
    }, 4000);

    this.resolveLoginRequest(username, password, tenantId)
      .pipe(
        timeout({ first: 10_000 }),
        finalize(() => {
          clearTimeout(loadingSafetyTimer);
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response?.accessToken) {
            this.errorMessage.set(
              'La respuesta del servidor no incluyo token. Verifica las credenciales y la empresa.',
            );
            return;
          }

          this.completeLogin(response);
        },
        error: (error: unknown) => {
          const conflict = this.resolveSessionConflict(error);
          if (conflict) {
            this.sessionConflict.set(conflict);
            return;
          }
          this.errorMessage.set(this.resolveError(error));
          if (error instanceof HttpErrorResponse) {
            console.error('[AUTH][LOGIN] Error backend', {
              status: error.status,
              url: error.url,
              body: error.error,
            });
          } else {
            console.error('[AUTH][LOGIN] Error', error);
          }
        },
      });
  }

  protected replaceActiveSession(): void {
    const conflict = this.sessionConflict();
    if (!conflict || this.replacingSession()) {
      return;
    }

    this.replacingSession.set(true);
    this.errorMessage.set(null);
    this.authApi
      .replaceSession(conflict.replacementToken)
      .pipe(
        timeout({ first: 10_000 }),
        finalize(() => this.replacingSession.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.sessionConflict.set(null);
          this.completeLogin(response);
        },
        error: (error: unknown) => {
          this.sessionConflict.set(null);
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  protected cancelSessionReplacement(): void {
    if (!this.replacingSession()) {
      this.sessionConflict.set(null);
    }
  }

  protected formatLastActivity(value: string | null): string {
    if (!value) {
      return 'Actividad reciente';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? 'Actividad reciente'
      : parsed.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected switchMode(mode: 'general' | 'tenant'): void {
    if (this.loading()) {
      return;
    }

    this.loginMode = mode;
    this.errorMessage.set(null);
  }

  protected sanitizeTenantRuc(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const normalized = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9._/-]/g, '')
      .slice(0, 40);
    input.value = normalized;
    this.tenantCredentials.tenantId = normalized;
  }

  protected focusTenantAccess(): void {
    void this.router.navigate(['/auth']);
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const timeoutError = error as { name?: string };
      if (timeoutError.name === 'TimeoutError') {
        return 'El servicio no respondio a tiempo. Intenta nuevamente en unos momentos.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as { status?: number; error?: unknown };
      if (httpError.status === 0) {
        return 'No se pudo conectar con el servidor. Intenta nuevamente en unos momentos.';
      }

      const backendMessage = this.extractBackendMessage(httpError.error);
      const normalizedMessage = backendMessage.toLowerCase();

      if (this.loginMode === 'tenant' && backendMessage) {
        if (
          normalizedMessage.includes('empresa no existe') ||
          normalizedMessage.includes('ruc no existe') ||
          normalizedMessage.includes('tenant no existe') ||
          normalizedMessage.includes('tenant invalido') ||
          normalizedMessage.includes('tenant inválido')
        ) {
          return backendMessage;
        }
      }

      if (backendMessage) {
        return backendMessage;
      }

      const apiError = httpError.error as { message?: string; details?: string[] } | null;
      const fallbackMessage = [apiError?.message, ...(apiError?.details ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (this.loginMode === 'tenant') {
        if (
          (fallbackMessage.includes('tenant') ||
            fallbackMessage.includes('ruc') ||
            fallbackMessage.includes('empresa')) &&
          (fallbackMessage.includes('no existe') ||
            fallbackMessage.includes('not found') ||
            fallbackMessage.includes('invalido') ||
            fallbackMessage.includes('invalid'))
        ) {
          return 'La empresa no existe o no esta habilitada. Comuniquese con el administrador.';
        }

        if (
          fallbackMessage.includes('tenant_requerido') ||
          fallbackMessage.includes('tenant requerido') ||
          fallbackMessage.includes('ruc')
        ) {
          return 'Debes ingresar un identificador fiscal o tenant valido.';
        }

        if (fallbackMessage.includes('credenciales') || fallbackMessage.includes('unauthorized')) {
          return 'Credenciales o empresa invalidas. Verifica los datos y, si persiste, comunicate con el administrador.';
        }
      }

      if (
        this.loginMode === 'general' &&
        fallbackMessage.includes('tenant') &&
        (fallbackMessage.includes('requerido') || fallbackMessage.includes('required'))
      ) {
        return 'Este usuario pertenece a una empresa. Cambia a "Usuario Empresa", identifica el tenant y vuelve a intentar.';
      }

      return apiError?.details?.[0] || apiError?.message || 'No se pudo iniciar sesion.';
    }

    return 'No se pudo iniciar sesion.';
  }

  private resolveSessionConflict(error: unknown): ActiveSessionConflict | null {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
      return null;
    }
    const payload = error.error as ApiErrorPayload | null;
    if (payload?.code !== 'ACTIVE_SESSION_EXISTS' || !payload.replacementToken) {
      return null;
    }
    return {
      replacementToken: payload.replacementToken,
      deviceName: payload.activeSession?.deviceName || 'Otro navegador o dispositivo',
      lastActivityAt: payload.activeSession?.lastActivityAt || null,
    };
  }

  private completeLogin(
    response: import('@core/auth/auth-session.service').LoginResponse,
  ): void {
    if (!response?.accessToken) {
      this.errorMessage.set(
        'La respuesta del servidor no incluyo token. Verifica las credenciales y la empresa.',
      );
      return;
    }
    this.session.setSession(
      response,
      this.loginMode === 'general' ? this.rememberAdmin : this.rememberTenant,
    );
  }

  private extractBackendMessage(errorBody: unknown): string {
    if (!errorBody) {
      return '';
    }

    if (typeof errorBody === 'string') {
      return errorBody;
    }

    if (typeof errorBody === 'object') {
      const payload = errorBody as { message?: string; details?: string[]; error?: string };
      if (payload.details?.length) {
        return payload.details[0];
      }

      if (payload.message) {
        return payload.message;
      }

      if (payload.error) {
        return payload.error;
      }
    }

    return '';
  }

  private resolveLoginRequest(
    username: string,
    password: string,
    tenantId: string,
  ): Observable<import('@core/auth/auth-session.service').LoginResponse> {
    if (this.loginMode === 'general') {
      return this.authApi.loginPublic({
        username,
        password,
      });
    }

    return this.authApi.loginTenant({
      username,
      password,
      tenantId,
    });
  }

  private resolvePostLoginUrl(): string {
    const redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl')?.trim();
    if (redirectUrl && redirectUrl.startsWith('/')) {
      return redirectUrl;
    }

    return '/admin';
  }
}
