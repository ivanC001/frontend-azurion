import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import {
  UpdateWhatsappAutoReplyConfigRequest,
  WhatsappAutoReplyConfig,
  WhatsappAutoReplySchedule,
} from '@features/crm/data/crm-api.types';

const DAY_NAMES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

@Component({
  selector: 'app-whatsapp-auto-reply-config',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './whatsapp-auto-reply-config.html',
  styleUrl: './whatsapp-auto-reply-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappAutoReplyConfigComponent implements OnInit {
  private readonly api = inject(CrmApiService);

  readonly canManage = input(false);
  protected readonly config = signal<WhatsappAutoReplyConfig | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly dayNames = DAY_NAMES;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getCrmWhatsappAutoReplyConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(this.readError(error, 'No se pudo cargar la automatizacion.'));
      },
    });
  }

  protected updateField<K extends keyof WhatsappAutoReplyConfig>(
    field: K,
    value: WhatsappAutoReplyConfig[K],
  ): void {
    this.config.update((current) => (current ? { ...current, [field]: value } : current));
    this.success.set('');
  }

  protected updateSchedule(
    index: number,
    field: keyof WhatsappAutoReplySchedule,
    value: string | boolean,
  ): void {
    this.config.update((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        horarios: current.horarios.map((schedule, currentIndex) =>
          currentIndex === index ? { ...schedule, [field]: value } : schedule,
        ),
      };
    });
    this.success.set('');
  }

  protected save(): void {
    const config = this.config();
    if (!config || !this.canManage() || this.saving()) {
      return;
    }
    if (config.activo && !config.mensaje.trim()) {
      this.error.set('Escribe el mensaje antes de activar la respuesta automatica.');
      return;
    }
    const request: UpdateWhatsappAutoReplyConfigRequest = {
      activo: config.activo,
      modo: config.modo,
      mensaje: config.mensaje.trim(),
      cooldownMinutos: Number(config.cooldownMinutos),
      horarios: config.horarios,
    };
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.api.updateCrmWhatsappAutoReplyConfig(request).subscribe({
      next: (saved) => {
        this.config.set(saved);
        this.saving.set(false);
        this.success.set('Automatizacion guardada.');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(this.readError(error, 'No se pudo guardar la automatizacion.'));
      },
    });
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; detail?: string } };
    return candidate.error?.message || candidate.error?.detail || fallback;
  }
}
