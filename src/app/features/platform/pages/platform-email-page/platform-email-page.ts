import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  PlatformEmailConfig,
  PlatformEmailConfigRequest,
  PlatformEmailSecurity,
  PlatformEmailService,
} from '../../data/platform-email.service';

type SmtpProvider = 'CUSTOM' | 'GOOGLE' | 'MICROSOFT' | 'SES';

interface PlatformEmailForm {
  nombreRemitente: string;
  correoRemitente: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: PlatformEmailSecurity;
  smtpUsername: string;
  smtpPassword: string;
  activo: boolean;
  avisosHabilitados: boolean;
  reportesHabilitados: boolean;
  dobleFactorHabilitado: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-email-page',
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './platform-email-page.html',
  styleUrl: './platform-email-page.scss',
})
export class PlatformEmailPage {
  private readonly service = inject(PlatformEmailService);

  protected readonly config = signal<PlatformEmailConfig | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly testing = signal(false);
  protected readonly toggling = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly testEmailTo = signal('');

  protected readonly enabledChannels = computed(() => {
    const value = this.config();
    if (!value) {
      return 0;
    }
    return [
      value.avisosHabilitados,
      value.reportesHabilitados,
      value.dobleFactorHabilitado,
    ].filter(Boolean).length;
  });

  protected readonly providerOptions: { label: string; value: SmtpProvider }[] = [
    { label: 'Personalizado', value: 'CUSTOM' },
    { label: 'Google Workspace / Gmail', value: 'GOOGLE' },
    { label: 'Microsoft 365 / Outlook', value: 'MICROSOFT' },
    { label: 'Amazon SES', value: 'SES' },
  ];
  protected readonly securityOptions = [
    { label: 'TLS / STARTTLS', value: 'TLS' },
    { label: 'SSL', value: 'SSL' },
    { label: 'Sin cifrado', value: 'NONE' },
  ];

  protected provider: SmtpProvider = 'CUSTOM';
  protected form: PlatformEmailForm = this.emptyForm();

  constructor() {
    this.load();
  }

  protected load(): void {
    this.clearMessages();
    this.loading.set(true);
    this.service
      .getConfig()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (config) => this.applyConfig(config),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected applyProvider(provider: SmtpProvider): void {
    this.provider = provider;
    const presets: Record<SmtpProvider, Partial<PlatformEmailForm> | null> = {
      GOOGLE: { smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecurity: 'TLS' },
      MICROSOFT: { smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecurity: 'TLS' },
      SES: { smtpHost: 'email-smtp.us-east-1.amazonaws.com', smtpPort: 587, smtpSecurity: 'TLS' },
      CUSTOM: null,
    };
    const preset = presets[provider];
    if (preset) {
      Object.assign(this.form, preset);
    }
  }

  protected save(): void {
    this.clearMessages();
    if (!this.validateForm()) {
      return;
    }

    const request: PlatformEmailConfigRequest = {
      nombreRemitente: this.form.nombreRemitente.trim(),
      correoRemitente: this.form.correoRemitente.trim(),
      replyTo: this.form.replyTo.trim() || null,
      smtpHost: this.form.smtpHost.trim(),
      smtpPort: Number(this.form.smtpPort),
      smtpSecurity: this.form.smtpSecurity,
      smtpUsername: this.form.smtpUsername.trim(),
      smtpPassword: this.form.smtpPassword.trim() || null,
      activo: this.form.activo,
      avisosHabilitados: this.form.avisosHabilitados,
      reportesHabilitados: this.form.reportesHabilitados,
      dobleFactorHabilitado: this.form.dobleFactorHabilitado,
    };

    this.saving.set(true);
    this.service
      .saveConfig(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (config) => {
          this.applyConfig(config);
          this.successMessage.set(
            config.verificado
              ? 'Configuracion de correo actualizada.'
              : 'Configuracion guardada. Envia una prueba para verificar y activar el correo.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected sendTest(): void {
    this.clearMessages();
    const destination = this.testEmailTo().trim();
    if (!this.isEmail(destination)) {
      this.errorMessage.set('Ingresa un correo destino valido para realizar la prueba.');
      return;
    }
    if (!this.config()) {
      this.errorMessage.set('Guarda primero la configuracion SMTP.');
      return;
    }

    this.testing.set(true);
    this.service
      .sendTest(destination)
      .pipe(finalize(() => this.testing.set(false)))
      .subscribe({
        next: (config) => {
          this.applyConfig(config);
          this.successMessage.set(
            'Prueba enviada correctamente. El correo global de Azurion quedo verificado y activo.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleActive(): void {
    this.clearMessages();
    const config = this.config();
    if (!config) {
      this.errorMessage.set('Guarda y verifica la configuracion antes de activarla.');
      return;
    }

    const operation = config.activo ? this.service.deactivate() : this.service.activate();
    this.toggling.set(true);
    operation.pipe(finalize(() => this.toggling.set(false))).subscribe({
      next: (saved) => {
        this.applyConfig(saved);
        this.successMessage.set(
          saved.activo
            ? 'Correo global de Azurion activado.'
            : 'Correo global de Azurion desactivado.',
        );
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected statusLabel(): string {
    return {
      PENDIENTE: 'Pendiente de prueba',
      VERIFICADO: 'Activo y verificado',
      ERROR: 'Error de conexion',
      INACTIVO: 'Inactivo',
    }[this.config()?.estado || 'PENDIENTE'];
  }

  protected statusTone(): string {
    return (this.config()?.estado || 'PENDIENTE').toLowerCase();
  }

  private applyConfig(config: PlatformEmailConfig | null): void {
    this.config.set(config);
    this.form = this.toForm(config);
    this.provider = this.detectProvider(config?.smtpHost);
    if (!this.testEmailTo() && config?.correoRemitente) {
      this.testEmailTo.set(config.correoRemitente);
    }
  }

  private validateForm(): boolean {
    if (
      !this.form.nombreRemitente.trim() ||
      !this.form.smtpHost.trim() ||
      !this.form.smtpUsername.trim()
    ) {
      this.errorMessage.set('Completa remitente, host SMTP y usuario SMTP.');
      return false;
    }
    if (!this.isEmail(this.form.correoRemitente.trim())) {
      this.errorMessage.set('Ingresa un correo remitente valido.');
      return false;
    }
    if (this.form.replyTo.trim() && !this.isEmail(this.form.replyTo.trim())) {
      this.errorMessage.set('El correo Reply-To no tiene un formato valido.');
      return false;
    }
    const port = Number(this.form.smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      this.errorMessage.set('El puerto SMTP debe estar entre 1 y 65535.');
      return false;
    }
    if (!this.config()?.smtpPasswordConfigured && !this.form.smtpPassword.trim()) {
      this.errorMessage.set('La contrasena SMTP es obligatoria la primera vez.');
      return false;
    }
    return true;
  }

  private toForm(config: PlatformEmailConfig | null): PlatformEmailForm {
    return {
      nombreRemitente: config?.nombreRemitente || 'Azurion',
      correoRemitente: config?.correoRemitente || '',
      replyTo: config?.replyTo || '',
      smtpHost: config?.smtpHost || '',
      smtpPort: Number(config?.smtpPort || 587),
      smtpSecurity: config?.smtpSecurity || 'TLS',
      smtpUsername: config?.smtpUsername || '',
      smtpPassword: '',
      activo: Boolean(config?.activo),
      avisosHabilitados: config?.avisosHabilitados ?? true,
      reportesHabilitados: config?.reportesHabilitados ?? true,
      dobleFactorHabilitado: config?.dobleFactorHabilitado ?? true,
    };
  }

  private emptyForm(): PlatformEmailForm {
    return this.toForm(null);
  }

  private detectProvider(host?: string | null): SmtpProvider {
    const normalized = (host || '').toLowerCase();
    if (normalized.includes('gmail')) {
      return 'GOOGLE';
    }
    if (normalized.includes('office365') || normalized.includes('outlook')) {
      return 'MICROSOFT';
    }
    if (normalized.includes('amazonaws.com')) {
      return 'SES';
    }
    return 'CUSTOM';
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private resolveError(error: unknown): string {
    const candidate = error as { error?: { message?: string; error?: string }; message?: string };
    return (
      candidate?.error?.message ||
      candidate?.error?.error ||
      candidate?.message ||
      'No se pudo completar la operacion.'
    );
  }
}
