import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, finalize, timeout } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthApiService } from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login-page',
  imports: [RouterLink, FormsModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule],
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

  ngOnInit(): void {
    this.loginMode = this.route.snapshot.data['loginMode'] === 'tenant' ? 'tenant' : 'general';

    if (this.session.currentSession() && this.session.hasActiveSession()) {
      void this.router.navigateByUrl(this.resolvePostLoginUrl(), { replaceUrl: true });
      return;
    }

    if (this.session.currentSession() && !this.session.hasActiveSession()) {
      this.session.clearSession();
    }
  }

  protected login(mode: 'general' | 'tenant'): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set(null);
    this.loginMode = mode;

    const credentials = mode === 'general' ? this.adminCredentials : this.tenantCredentials;
    const username = credentials.username.trim();
    const password = credentials.password;

    if (!username || !password) {
      this.errorMessage.set('Ingresa usuario y contrasena.');
      return;
    }

    if (password.length < 8) {
      this.errorMessage.set('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    const tenantId = mode === 'tenant' ? this.tenantCredentials.tenantId.trim() : '';
    if (mode === 'tenant' && !tenantId) {
      this.errorMessage.set('Debes ingresar el RUC de la empresa.');
      return;
    }

    if (mode === 'tenant' && !/^[0-9]{11}$/.test(tenantId)) {
      this.errorMessage.set('El RUC debe tener 11 digitos.');
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
        timeout({ first: 3500 }),
        finalize(() => {
          clearTimeout(loadingSafetyTimer);
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response?.accessToken) {
            this.errorMessage.set(
              'La respuesta del servidor no incluyo token. Verifica credenciales o RUC.',
            );
            return;
          }

          this.session.setSession(
            response,
            mode === 'general' ? this.rememberAdmin : this.rememberTenant,
          );
          void this.router.navigateByUrl(this.resolvePostLoginUrl(), { replaceUrl: true });
        },
        error: (error: unknown) => {
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

    const normalized = input.value.replace(/[^0-9]/g, '').slice(0, 11);
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
          return 'Debes ingresar un RUC valido para iniciar sesion en empresa.';
        }

        if (fallbackMessage.includes('credenciales') || fallbackMessage.includes('unauthorized')) {
          return 'Credenciales o RUC invalidos. Verifique sus datos y, si persiste, comuniquese con el administrador.';
        }
      }

      if (
        this.loginMode === 'general' &&
        fallbackMessage.includes('tenant') &&
        (fallbackMessage.includes('requerido') || fallbackMessage.includes('required'))
      ) {
        return 'Este usuario pertenece a una empresa. Cambia a "Usuario Empresa", ingresa el RUC y vuelve a intentar.';
      }

      return apiError?.details?.[0] || apiError?.message || 'No se pudo iniciar sesion.';
    }

    return 'No se pudo iniciar sesion.';
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
