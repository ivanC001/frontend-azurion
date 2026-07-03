import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class UiToastService {
  private readonly messageService = inject(MessageService);

  success(detail: string, summary = 'Operacion completada', life = 3200): void {
    this.show('success', summary, detail, life);
  }

  info(detail: string, summary = 'Informacion', life = 3200): void {
    this.show('info', summary, detail, life);
  }

  warn(detail: string, summary = 'Atencion', life = 3600): void {
    this.show('warn', summary, detail, life);
  }

  error(detail: string, summary = 'No se pudo completar', life = 4200): void {
    this.show('error', summary, detail, life);
  }

  clear(): void {
    this.messageService.clear('app');
  }

  private show(severity: ToastSeverity, summary: string, detail: string, life: number): void {
    const message = detail.trim();
    if (!message) {
      return;
    }

    this.messageService.add({
      key: 'app',
      severity,
      summary,
      detail: message,
      life,
    });
  }
}
