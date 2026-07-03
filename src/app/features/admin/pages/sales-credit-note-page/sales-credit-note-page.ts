import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  NotaFiscalRecord,
  VentaRecord,
} from '../../data/admin-saas-api.service';

type MotivoCodigo = '01' | '02' | '03' | '04' | '06' | '07';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sales-credit-note-page',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './sales-credit-note-page.html',
  styleUrl: './sales-credit-note-page.scss',
})
export class SalesCreditNotePage {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly ventas = signal<VentaRecord[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly notas = signal<NotaFiscalRecord[]>([]);
  protected readonly selectedVentaId = signal<number | null>(null);
  protected readonly motivoCodigo = signal<MotivoCodigo>('01');
  protected readonly motivoDescripcion = signal('');
  protected readonly montoAjuste = signal<number>(0);

  protected readonly ventaOptions = computed(() =>
    this.ventas().map((venta) => ({
      label: `${venta.externalId} - ${venta.clienteNombre} (${venta.moneda} ${venta.total})`,
      value: venta.id,
    })),
  );

  protected readonly selectedVenta = computed(() => {
    const ventaId = this.selectedVentaId();
    if (!ventaId) {
      return null;
    }
    return this.ventas().find((item) => item.id === ventaId) ?? null;
  });

  protected readonly motivoOptions: Array<{ label: string; value: MotivoCodigo }> = [
    { label: '01 - Anulacion de la operacion', value: '01' },
    { label: '02 - Anulacion por error en RUC', value: '02' },
    { label: '03 - Correccion por error en descripcion', value: '03' },
    { label: '04 - Descuento global', value: '04' },
    { label: '06 - Devolucion total', value: '06' },
    { label: '07 - Devolucion por item', value: '07' },
  ];

  constructor() {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      ventas: this.api.listVentas(),
      notas: this.api.listNotasCredito(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ ventas, notas }) => {
          this.ventas.set(ventas);
          this.notas.set(notas);
        },
        error: () => this.errorMessage.set('No se pudo cargar ventas o notas de credito.'),
      });
  }

  protected registrarNotaCredito(): void {
    if (this.saving()) {
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.selectedVentaId()) {
      this.errorMessage.set('Selecciona una venta de referencia.');
      return;
    }
    if (!this.motivoDescripcion().trim()) {
      this.errorMessage.set('Ingresa el motivo de la nota de credito.');
      return;
    }
    if (Number(this.montoAjuste()) <= 0) {
      this.errorMessage.set('Ingresa un monto valido para la nota de credito.');
      return;
    }

    this.saving.set(true);
    this.api
      .registrarNotaCredito({
        ventaId: this.selectedVentaId() as number,
        motivoCodigo: this.motivoCodigo(),
        motivoDescripcion: this.motivoDescripcion().trim(),
        monto: Number(this.montoAjuste()),
        responsableId: this.actorId(),
        responsableNombre: this.actorName(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.nota) {
            this.upsertNota(response.nota);
          }
          this.refreshNotas(false);
          const status = response.facturacion?.status ?? 0;
          const message = response.facturacion?.message || 'Nota de credito registrada.';
          this.successMessage.set(
            `Nota ${response.externalId} enviada. Facturador ${status}: ${message}`,
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected refreshNotas(showError = true): void {
    this.api.listNotasCredito().subscribe({
      next: (notas) => this.notas.set(notas),
      error: () => {
        if (showError) {
          this.errorMessage.set('No se pudo cargar el historial de notas de credito.');
        }
      },
    });
  }

  protected estadoSeverity(nota: NotaFiscalRecord): 'success' | 'warn' | 'danger' | 'info' {
    const estado = this.statusLabel(nota);
    if (estado === 'ACEPTADO') {
      return 'success';
    }
    if (estado === 'RECHAZADO' || estado === 'ERROR') {
      return 'danger';
    }
    return 'warn';
  }

  protected statusLabel(nota: NotaFiscalRecord): string {
    return (nota.facturadorSunatEstado || nota.facturacionEstado || 'PENDIENTE')
      .trim()
      .toUpperCase();
  }

  protected openAsset(url?: string | null): void {
    const target = url?.trim();
    if (!target) {
      this.errorMessage.set('Archivo aun no disponible para esta nota.');
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  private upsertNota(nota: NotaFiscalRecord): void {
    const current = this.notas();
    const index = current.findIndex(
      (item) => item.id === nota.id || item.externalId === nota.externalId,
    );
    if (index < 0) {
      this.notas.set([nota, ...current]);
      return;
    }
    const next = [...current];
    next[index] = nota;
    this.notas.set(next);
  }

  private actorId(): string {
    const current = this.session.currentSession();
    return current?.userId ? String(current.userId) : current?.username || 'system';
  }

  private actorName(): string {
    const current = this.session.currentSession();
    return current?.nombres?.trim() || current?.username || 'Usuario';
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { status?: number; error?: { message?: string } };
      if (httpError.status === 403) {
        return 'No tienes permisos para registrar notas de credito.';
      }
      if (httpError.status === 0) {
        return 'No se pudo conectar con el backend.';
      }
      return httpError.error?.message || 'No se pudo registrar la nota de credito.';
    }
    return 'No se pudo registrar la nota de credito.';
  }
}
