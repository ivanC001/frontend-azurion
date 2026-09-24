import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import {
  CrmLeadNotificationConfig,
  CrmLeadNotificationDispatch,
} from '@features/crm/data/crm-api.types';

/**
 * Avisos por correo cuando entra un lead o un mensaje nuevo.
 *
 * Los correos salen por el SMTP que el tenant ya configuro para sus cotizaciones:
 * aqui solo se decide a quien avisar y cada cuanto.
 */
@Component({
  selector: 'app-crm-lead-notification-config',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './crm-lead-notification-config.html',
  styleUrl: './crm-lead-notification-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmLeadNotificationConfigComponent implements OnInit {
  private readonly api = inject(CrmApiService);

  readonly canManage = input(false);

  protected readonly config = signal<CrmLeadNotificationConfig | null>(null);
  protected readonly history = signal<readonly CrmLeadNotificationDispatch[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected nuevoCorreo = '';

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getCrmLeadNotificationConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.readError(error, 'No se pudo cargar la configuracion de avisos.'));
      },
    });
  }

  protected toggleHistory(): void {
    const next = !this.historyOpen();
    this.historyOpen.set(next);
    if (next && this.history().length === 0) {
      this.api.getCrmLeadNotificationHistory().subscribe({
        next: (items) => this.history.set(items),
        error: (error: unknown) =>
          this.error.set(this.readError(error, 'No se pudo cargar el historial de avisos.')),
      });
    }
  }

  protected patch(change: Partial<CrmLeadNotificationConfig>): void {
    const current = this.config();
    if (!current) {
      return;
    }
    this.config.set({ ...current, ...change });
  }

  protected addCorreo(): void {
    const current = this.config();
    const email = this.nuevoCorreo.trim().toLowerCase();
    if (!current || !email) {
      return;
    }
    if (!email.includes('@')) {
      this.error.set('Escribe un correo valido.');
      return;
    }
    if (current.correosCopia.includes(email)) {
      this.nuevoCorreo = '';
      return;
    }
    this.patch({ correosCopia: [...current.correosCopia, email] });
    this.nuevoCorreo = '';
    this.error.set('');
  }

  protected removeCorreo(email: string): void {
    const current = this.config();
    if (!current) {
      return;
    }
    this.patch({ correosCopia: current.correosCopia.filter((item) => item !== email) });
  }

  protected save(): void {
    const current = this.config();
    if (!current || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .updateCrmLeadNotificationConfig({
        activo: current.activo,
        notificarLeadNuevo: current.notificarLeadNuevo,
        notificarMensajeNuevo: current.notificarMensajeNuevo,
        notificarResponsable: current.notificarResponsable,
        correosCopia: current.correosCopia,
        cooldownMinutos: current.cooldownMinutos,
      })
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.saving.set(false);
          this.success.set('Avisos por correo actualizados.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(this.readError(error, 'No se pudo guardar la configuracion.'));
        },
      });
  }

  protected tipoLabel(tipo: string): string {
    return tipo === 'LEAD_NUEVO' ? 'Lead nuevo' : 'Mensaje nuevo';
  }

  protected estadoLabel(estado: string): string {
    switch (estado) {
      case 'ENVIADO':
        return 'Enviado';
      case 'ERROR':
        return 'Fallo';
      case 'OMITIDO':
        return 'Omitido';
      default:
        return 'Pendiente';
    }
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; details?: string[] } };
    return candidate.error?.details?.[0] || candidate.error?.message || fallback;
  }
}
