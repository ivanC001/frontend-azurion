import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import { WhatsappFailedSend } from '@features/crm/data/crm-api.types';

/**
 * Registro de los envios que Meta no pudo entregar.
 *
 * Existe porque el motivo de un fallo llega por webhook segundos despues del envio,
 * cuando el usuario ya cerro la pantalla: el mensaje se muestra como enviado y recien
 * despues pasa a fallido. Sin este panel habia que abrir conversacion por conversacion
 * para enterarse, y un problema de cuenta podia tumbar todos los envios en silencio.
 */
@Component({
  selector: 'app-whatsapp-failed-sends',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './whatsapp-failed-sends.html',
  styleUrl: './whatsapp-failed-sends.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappFailedSendsComponent implements OnInit {
  private readonly api = inject(CrmApiService);

  protected readonly failures = signal<readonly WhatsappFailedSend[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly expanded = signal(false);
  protected readonly detailOpen = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getCrmWhatsappFailedSends().subscribe({
      next: (failures) => {
        this.failures.set(failures);
        this.loading.set(false);
        // Si hay fallos conviene verlos; si no, el panel no estorba.
        this.expanded.set(failures.length > 0);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(this.readError(error, 'No se pudo cargar el registro de envios.'));
      },
    });
  }

  protected toggle(): void {
    this.expanded.update((current) => !current);
  }

  protected toggleDetail(id: number): void {
    this.detailOpen.update((current) => (current === id ? null : id));
  }

  /**
   * Cuando el mismo codigo tumba varios envios, el problema es uno solo: la cuenta.
   * Mostrarlo una vez arriba evita que el usuario crea que son fallos distintos.
   */
  protected readonly repeatedCause = () => {
    const codes = new Set(this.failures().map((failure) => failure.codigo));
    return codes.size === 1 && this.failures().length > 1 ? this.failures()[0] : null;
  };

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; detail?: string } };
    return candidate.error?.message || candidate.error?.detail || fallback;
  }
}
