import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, input, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  EmailSmtpSecurity,
  TenantEmailConfig,
  TenantEmailConfigRequest,
  TenantEmailConfigService,
} from './tenant-email-config.service';
import { CrmInboxChannelStateService } from '../../services/crm-inbox-channel-state.service';

interface EmailConfigForm {
  nombreRemitente: string;
  correoRemitente: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: EmailSmtpSecurity;
  smtpUsername: string;
  smtpPassword: string;
  activo: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-email-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, SelectModule],
  templateUrl: './email-settings.html',
  styleUrl: './email-settings.scss',
})
export class EmailSettings implements OnInit {
  readonly canManage = input(false);
  private readonly service = inject(TenantEmailConfigService);
  private readonly crmInboxChannels = inject(CrmInboxChannelStateService);

  protected readonly config = signal<TenantEmailConfig | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly testing = signal(false);
  protected readonly toggling = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly testEmailTo = signal('');

  protected readonly securityOptions = [
    { label: 'TLS / STARTTLS', value: 'TLS' },
    { label: 'SSL', value: 'SSL' },
    { label: 'Sin seguridad', value: 'NONE' },
  ];

  protected form: EmailConfigForm = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.service.getConfig()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.form = this.toForm(config);
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected save(): void {
    this.clearMessages();
    if (!this.canManage()) {
      this.error.set('No tienes permisos para administrar la configuracion de correo.');
      return;
    }
    if (!this.isValidForm()) {
      return;
    }
    const request: TenantEmailConfigRequest = {
      nombreRemitente: this.form.nombreRemitente.trim(),
      correoRemitente: this.form.correoRemitente.trim(),
      replyTo: this.form.replyTo.trim() || null,
      smtpHost: this.form.smtpHost.trim(),
      smtpPort: Number(this.form.smtpPort),
      smtpSecurity: this.form.smtpSecurity,
      smtpUsername: this.form.smtpUsername.trim(),
      smtpPassword: this.form.smtpPassword.trim() || null,
      activo: this.form.activo,
    };
    this.saving.set(true);
    this.service.saveConfig(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.form = { ...this.toForm(config), smtpPassword: '' };
          this.crmInboxChannels.updateChannel('CORREO', Boolean(config.activo), 'Correo');
          this.message.set('Configuracion guardada. Envia un correo de prueba para verificarla.');
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected sendTest(): void {
    if (this.testing()) {
      return;
    }
    this.clearMessages();
    const correoDestino = this.testEmailTo().trim();
    if (!correoDestino) {
      this.error.set('Ingresa el correo destino para la prueba.');
      return;
    }
    this.testing.set(true);
    this.service.testEmail(correoDestino)
      .pipe(finalize(() => this.testing.set(false)))
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.form = { ...this.toForm(config), smtpPassword: '' };
          this.crmInboxChannels.updateChannel('CORREO', Boolean(config.activo), 'Correo');
          this.message.set('Correo de prueba enviado correctamente. Configuracion verificada.');
        },
        error: (error: unknown) => this.error.set(this.resolveError(error) || 'No se pudo enviar el correo de prueba.'),
      });
  }

  protected toggleActive(): void {
    this.clearMessages();
    const config = this.config();
    if (!config) {
      this.error.set('Guarda la configuracion antes de activar o desactivar.');
      return;
    }
    const operation = config.activo ? this.service.deactivate() : this.service.activate();
    this.toggling.set(true);
    operation.pipe(finalize(() => this.toggling.set(false))).subscribe({
      next: (saved) => {
        this.config.set(saved);
        this.form = { ...this.toForm(saved), smtpPassword: '' };
        this.crmInboxChannels.updateChannel('CORREO', Boolean(saved.activo), 'Correo');
        this.message.set(saved.activo ? 'Configuracion de correo activada.' : 'Configuracion de correo desactivada.');
      },
      error: (error: unknown) => this.error.set(this.resolveError(error)),
    });
  }

  protected statusLabel(): string {
    const status = this.config()?.estado || 'PENDIENTE';
    return {
      PENDIENTE: 'Pendiente',
      VERIFICADO: 'Verificado',
      ERROR: 'Error',
      INACTIVO: 'Inactivo',
    }[status] ?? status;
  }

  protected statusTone(): string {
    const status = this.config()?.estado || 'PENDIENTE';
    return status.toLowerCase();
  }

  private isValidForm(): boolean {
    if (!this.form.nombreRemitente.trim() || !this.form.correoRemitente.trim() || !this.form.smtpHost.trim() || !this.form.smtpUsername.trim()) {
      this.error.set('Completa nombre remitente, correo remitente, host SMTP y usuario SMTP.');
      return false;
    }
    if (!Number(this.form.smtpPort || 0)) {
      this.error.set('El puerto SMTP es obligatorio.');
      return false;
    }
    if (!this.config()?.smtpPasswordConfigured && !this.form.smtpPassword.trim()) {
      this.error.set('La contrasena SMTP es obligatoria la primera vez.');
      return false;
    }
    return true;
  }

  private toForm(config: TenantEmailConfig | null): EmailConfigForm {
    return {
      nombreRemitente: config?.nombreRemitente || '',
      correoRemitente: config?.correoRemitente || '',
      replyTo: config?.replyTo || '',
      smtpHost: config?.smtpHost || '',
      smtpPort: Number(config?.smtpPort || 587),
      smtpSecurity: config?.smtpSecurity || 'TLS',
      smtpUsername: config?.smtpUsername || '',
      smtpPassword: '',
      activo: Boolean(config?.activo),
    };
  }

  private emptyForm(): EmailConfigForm {
    return this.toForm(null);
  }

  private clearMessages(): void {
    this.message.set(null);
    this.error.set(null);
  }

  private resolveError(error: unknown): string {
    const candidate = error as { error?: { message?: string; error?: string }; message?: string };
    return candidate?.error?.message || candidate?.error?.error || candidate?.message || 'No se pudo completar la operacion.';
  }
}
