import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import { WhatsappReengagementGuide } from '@features/crm/data/crm-api.types';

/**
 * Muestra que le falta al tenant para poder reenganchar por WhatsApp.
 *
 * El contenido no esta escrito aca: lo calcula el backend mirando el catalogo real
 * del WABA, asi que los avisos cambian solos cuando el usuario aprueba una plantilla
 * o corrige la conexion. Este componente solo lo pinta.
 */
@Component({
  selector: 'app-whatsapp-reengagement-guide',
  standalone: true,
  imports: [],
  templateUrl: './whatsapp-reengagement-guide.html',
  styleUrl: './whatsapp-reengagement-guide.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappReengagementGuideComponent implements OnInit {
  private readonly api = inject(CrmApiService);

  protected readonly guide = signal<WhatsappReengagementGuide | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly expanded = signal(false);
  protected readonly copied = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getCrmWhatsappReengagementGuide().subscribe({
      next: (guide) => {
        this.guide.set(guide);
        this.loading.set(false);
        // Si ya esta todo listo no hace falta ocupar pantalla: se abre solo cuando
        // hay algo que resolver.
        this.expanded.set(!guide.listoParaProgramar || guide.advertencias.length > 0);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(this.readError(error, 'No se pudo cargar la guia de reenganche.'));
      },
    });
  }

  protected toggle(): void {
    this.expanded.update((current) => !current);
  }

  protected async copyTemplate(): Promise<void> {
    const body = this.guide()?.plantillaSugerida.cuerpo;
    if (!body) {
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Sin permiso de portapapeles el texto sigue visible y seleccionable a mano.
      this.error.set('No se pudo copiar. Selecciona el texto y copialo manualmente.');
    }
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; detail?: string } };
    return candidate.error?.message || candidate.error?.detail || fallback;
  }
}
