import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import {
  AuthApiService,
  CurrentUserProfile,
} from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { UiToastService } from '@core/services/ui-toast.service';

interface PersonalProfileForm {
  nombres: string;
}

interface PasswordForm {
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmarContrasena: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-current-user-profile-dialog',
  imports: [DialogModule, FormsModule, InputTextModule],
  templateUrl: './current-user-profile-dialog.html',
  styleUrl: './current-user-profile-dialog.scss',
})
export class CurrentUserProfileDialog {
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  private readonly authApi = inject(AuthApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly toast = inject(UiToastService);

  protected readonly loading = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profile = signal<CurrentUserProfile | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly initials = computed(() => {
    const source = this.profile()?.nombres || this.profile()?.username || 'US';
    return source
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly assignedBranches = computed(() =>
    this.profile()?.sucursales.map((branch) => branch.nombre).join(', ') || 'Sin sucursal asignada',
  );

  protected personalForm: PersonalProfileForm = this.emptyPersonalForm();
  protected passwordForm: PasswordForm = this.emptyPasswordForm();

  ngDoCheck(): void {
    if (this.visible() && !this.profile() && !this.loading() && !this.errorMessage()) {
      this.load();
    }
  }

  protected retry(): void {
    this.errorMessage.set(null);
    this.load();
  }

  protected close(): void {
    if (this.savingProfile() || this.savingPassword()) {
      return;
    }
    this.resetTransientState();
    this.visibleChange.emit(false);
  }

  protected savePersonalData(): void {
    const profile = this.profile();
    if (!profile?.puedeEditarDatosPersonales || this.savingProfile()) {
      return;
    }

    const nombres = this.personalForm.nombres.trim();
    if (!nombres) {
      this.toast.warn('Ingresa tu nombre completo para actualizar el perfil.', 'Perfil');
      return;
    }

    this.savingProfile.set(true);
    this.authApi
      .updateCurrentProfile({ nombres })
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.personalForm = { nombres: updated.nombres };
          this.authSession.updateCurrentProfile(updated.nombres);
          this.toast.success('Tus datos personales fueron actualizados.', 'Perfil actualizado');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  protected changePassword(): void {
    const profile = this.profile();
    if (!profile?.puedeCambiarContrasena || this.savingPassword()) {
      return;
    }

    if (!this.passwordForm.contrasenaActual) {
      this.toast.warn('Ingresa tu contrasena actual.', 'Seguridad');
      return;
    }
    if (this.passwordForm.nuevaContrasena.length < 8) {
      this.toast.warn('La nueva contrasena debe tener al menos 8 caracteres.', 'Seguridad');
      return;
    }
    if (this.passwordForm.nuevaContrasena !== this.passwordForm.confirmarContrasena) {
      this.toast.warn('La confirmacion no coincide con la nueva contrasena.', 'Seguridad');
      return;
    }

    this.savingPassword.set(true);
    this.authApi
      .changeCurrentPassword({
        contrasenaActual: this.passwordForm.contrasenaActual,
        nuevaContrasena: this.passwordForm.nuevaContrasena,
      })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm = this.emptyPasswordForm();
          this.toast.success('La contrasena se actualizo correctamente.', 'Seguridad');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authApi
      .getCurrentProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.personalForm = { nombres: profile.nombres };
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resetTransientState(): void {
    this.profile.set(null);
    this.errorMessage.set(null);
    this.personalForm = this.emptyPersonalForm();
    this.passwordForm = this.emptyPasswordForm();
  }

  private emptyPersonalForm(): PersonalProfileForm {
    return { nombres: '' };
  }

  private emptyPasswordForm(): PasswordForm {
    return { contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' };
  }

  private showError(error: unknown): void {
    this.toast.error(this.resolveError(error), 'No se pudo completar');
  }

  private resolveError(error: unknown): string {
    if (
      error &&
      typeof error === 'object' &&
      'error' in error &&
      error.error &&
      typeof error.error === 'object' &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message;
    }
    return 'No se pudo actualizar el perfil. Intenta nuevamente.';
  }
}
