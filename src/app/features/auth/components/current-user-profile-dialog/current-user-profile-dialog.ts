import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, of, switchMap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { AuthApiService, CurrentUserProfile } from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { ApiUrlService } from '@core/api/api-url.service';
import { UiToastService } from '@core/services/ui-toast.service';
import { isValidProfilePhotoFile } from '@core/utils/file-validators';

interface PersonalProfileForm {
  nombres: string;
  apellidos: string;
  telefono: string;
  cargo: string;
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
  private readonly apiUrl = inject(ApiUrlService);
  private readonly toast = inject(UiToastService);

  protected readonly loading = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profile = signal<CurrentUserProfile | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedPhoto = signal<File | null>(null);
  protected readonly selectedPhotoPreview = signal<string | null>(null);
  protected readonly photoUrl = computed(
    () => this.selectedPhotoPreview() || this.apiUrl.publicFileUrl(this.profile()?.fotoPerfilUrl),
  );
  protected readonly displayName = computed(() => {
    const current = this.profile();
    return (
      [current?.nombres, current?.apellidos].filter(Boolean).join(' ').trim() ||
      current?.username ||
      'Usuario'
    );
  });
  protected readonly initials = computed(() => {
    const source = this.displayName();
    return source
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly assignedBranches = computed(
    () =>
      this.profile()
        ?.sucursales.map((branch) => branch.nombre)
        .join(', ') || 'Sin sucursal asignada',
  );

  protected personalForm: PersonalProfileForm = this.emptyPersonalForm();
  protected passwordForm: PasswordForm = this.emptyPasswordForm();

  constructor() {
    effect(() => {
      if (this.visible() && !this.profile() && !this.loading() && !this.errorMessage()) {
        this.load();
      }
    });
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
      .updateCurrentProfile({
        nombres,
        apellidos: this.nullIfBlank(this.personalForm.apellidos),
        telefono: this.nullIfBlank(this.personalForm.telefono),
        cargo: this.nullIfBlank(this.personalForm.cargo),
        email: profile.email,
      })
      .pipe(
        switchMap((updated) => {
          const photo = this.selectedPhoto();
          return photo ? this.authApi.updateCurrentProfilePhoto(photo) : of(updated);
        }),
        finalize(() => this.savingProfile.set(false)),
      )
      .subscribe({
        next: (updated) => {
          this.applyUpdatedProfile(updated);
          this.clearSelectedPhoto();
          this.toast.success('Tus datos personales fueron actualizados.', 'Perfil actualizado');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  protected selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    if (!isValidProfilePhotoFile(file)) {
      this.toast.warn('Selecciona una imagen PNG, JPG o WEBP de máximo 1 MB.', 'Foto no válida');
      return;
    }
    this.clearSelectedPhoto();
    this.selectedPhoto.set(file);
    this.selectedPhotoPreview.set(URL.createObjectURL(file));
  }

  protected deletePhoto(): void {
    const profile = this.profile();
    if (!profile?.fotoPerfilUrl || this.savingProfile()) {
      this.clearSelectedPhoto();
      return;
    }
    this.savingProfile.set(true);
    this.authApi
      .deleteCurrentProfilePhoto()
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (updated) => {
          this.clearSelectedPhoto();
          this.applyUpdatedProfile(updated);
          this.toast.success('La foto del perfil fue eliminada.', 'Perfil actualizado');
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
          this.personalForm = this.formFromProfile(profile);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resetTransientState(): void {
    this.clearSelectedPhoto();
    this.profile.set(null);
    this.errorMessage.set(null);
    this.personalForm = this.emptyPersonalForm();
    this.passwordForm = this.emptyPasswordForm();
  }

  private emptyPersonalForm(): PersonalProfileForm {
    return { nombres: '', apellidos: '', telefono: '', cargo: '' };
  }

  private formFromProfile(profile: CurrentUserProfile): PersonalProfileForm {
    return {
      nombres: profile.nombres || '',
      apellidos: profile.apellidos || '',
      telefono: profile.telefono || '',
      cargo: profile.cargo || '',
    };
  }

  private applyUpdatedProfile(profile: CurrentUserProfile): void {
    this.profile.set(profile);
    this.personalForm = this.formFromProfile(profile);
    this.authSession.updateCurrentProfile({
      nombres: profile.nombres,
      apellidos: profile.apellidos,
      telefono: profile.telefono,
      cargo: profile.cargo,
      fotoPerfilUrl: profile.fotoPerfilUrl,
    });
  }

  private clearSelectedPhoto(): void {
    const preview = this.selectedPhotoPreview();
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    this.selectedPhoto.set(null);
    this.selectedPhotoPreview.set(null);
  }

  private nullIfBlank(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
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
