import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { ApiUrlService } from '@core/api/api-url.service';
import { AuthApiService } from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register-page',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected form = {
    username: '',
    password: '',
    confirmPassword: '',
  };

  ngOnInit(): void {
    if (this.session.currentSession()) {
      void this.router.navigate(['/admin'], { replaceUrl: true });
    }
  }

  protected register(): void {
    if (this.loading()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.username.trim() || !this.form.password || !this.form.confirmPassword) {
      this.errorMessage.set('Completa usuario y contrasena.');
      return;
    }

    if (this.form.password.length < 8) {
      this.errorMessage.set('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage.set('La confirmacion de contrasena no coincide.');
      return;
    }

    this.loading.set(true);
    const loadingSafetyTimer = setTimeout(() => {
      if (this.loading()) {
        this.loading.set(false);
        if (!this.errorMessage() && !this.successMessage()) {
          this.errorMessage.set('No hubo respuesta del servidor a tiempo. Intenta nuevamente.');
        }
      }
    }, 20000);

    this.authApi
      .registerAdminGeneral({
        username: this.form.username.trim(),
        password: this.form.password,
      })
      .pipe(timeout(15000))
      .pipe(
        finalize(() => {
          clearTimeout(loadingSafetyTimer);
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Usuario general registrado correctamente. Ahora inicia sesion.');
          this.form = {
            username: '',
            password: '',
            confirmPassword: '',
          };
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const timeoutError = error as { name?: string };
      if (timeoutError.name === 'TimeoutError') {
        return 'La solicitud tardo demasiado. Verifica backend y vuelve a intentar.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 0) {
        return `No se pudo conectar con la API. Verifica que el backend este activo en ${this.apiUrl.baseUrl('saasCore')}.`;
      }

      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo registrar el usuario.';
    }

    return 'No se pudo registrar el usuario.';
  }
}
