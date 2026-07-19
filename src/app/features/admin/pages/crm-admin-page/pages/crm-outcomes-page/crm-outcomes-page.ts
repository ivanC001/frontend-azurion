import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of } from 'rxjs';

import {
  AdminSaasApiService,
  CrmOportunidad,
  CrmResultadosResumen,
  PageResponse,
} from '../../../../data/admin-saas-api.service';

type OutcomeFilter = 'TODOS' | 'GANADA' | 'PERDIDA';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-outcomes-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './crm-outcomes-page.html',
  styleUrl: './crm-outcomes-page.scss',
})
export class CrmOutcomesPage implements OnDestroy {
  private readonly api = inject(AdminSaasApiService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filtersOpen = signal(false);
  protected readonly query = signal('');
  protected readonly resultFilter = signal<OutcomeFilter>('TODOS');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly responsible = signal('');
  protected readonly page = signal(0);
  protected readonly pageSize = 20;
  protected readonly pageData = signal<PageResponse<CrmOportunidad>>({
    content: [],
    page: 0,
    size: this.pageSize,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true,
  });
  protected readonly summary = signal<CrmResultadosResumen>({
    ganadas: 0,
    perdidas: 0,
    montoGanado: 0,
    montoPerdido: 0,
  });

  protected readonly resultOptions: ReadonlyArray<{ label: string; value: OutcomeFilter; icon: string }> = [
    { label: 'Todos los cierres', value: 'TODOS', icon: 'pi pi-chart-line' },
    { label: 'Ganadas', value: 'GANADA', icon: 'pi pi-trophy' },
    { label: 'Perdidas', value: 'PERDIDA', icon: 'pi pi-times-circle' },
  ];

  protected readonly metrics = computed(() => {
    const value = this.summary();
    const closed = value.ganadas + value.perdidas;
    const conversion = closed ? Math.round((value.ganadas / closed) * 100) : 0;
    return [
      { label: 'Cierres evaluados', value: String(closed), detail: 'ganadas y perdidas', icon: 'pi pi-flag', tone: 'blue' },
      { label: 'Ganadas', value: String(value.ganadas), detail: `S/ ${this.money(value.montoGanado)}`, icon: 'pi pi-trophy', tone: 'green' },
      { label: 'Perdidas', value: String(value.perdidas), detail: `S/ ${this.money(value.montoPerdido)}`, icon: 'pi pi-times-circle', tone: 'red' },
      { label: 'Tasa de cierre', value: `${conversion}%`, detail: 'ganadas sobre cierres', icon: 'pi pi-percentage', tone: 'amber' },
    ];
  });

  protected readonly pageLabel = computed(() => {
    const data = this.pageData();
    if (!data.totalElements) {
      return '0 de 0 resultados';
    }
    const start = data.page * data.size + 1;
    const end = Math.min(start + data.content.length - 1, data.totalElements);
    return `${start}-${end} de ${data.totalElements} resultados`;
  });

  constructor() {
    this.load(true);
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  protected load(includeSummary = false): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const request = this.api.listCrmResultadosPage({
      query: this.query().trim() || null,
      estado: this.resultFilter() === 'TODOS' ? null : this.resultFilter(),
      responsableId: this.responsible().trim() || null,
      cierreDesde: this.dateFrom() || null,
      cierreHasta: this.dateTo() || null,
      page: this.page(),
      size: this.pageSize,
    });

    const source = includeSummary
      ? forkJoin({ page: request, summary: this.api.getCrmReporteGanadasPerdidas() })
      : forkJoin({ page: request, summary: of(this.summary()) });

    source.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ page, summary }) => {
        this.pageData.set(page);
        this.summary.set(summary);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.page.set(0);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.load(), 350);
  }

  protected selectResult(value: OutcomeFilter): void {
    this.resultFilter.set(value);
    this.page.set(0);
    this.load();
  }

  protected applyFilters(): void {
    this.page.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.query.set('');
    this.resultFilter.set('TODOS');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.responsible.set('');
    this.page.set(0);
    this.load();
  }

  protected previousPage(): void {
    if (this.pageData().first) {
      return;
    }
    this.page.update((value) => Math.max(0, value - 1));
    this.load();
  }

  protected nextPage(): void {
    if (this.pageData().last) {
      return;
    }
    this.page.update((value) => value + 1);
    this.load();
  }

  protected contactName(item: CrmOportunidad): string {
    return item.clienteNombre || item.prospectoNombre || 'Sin contacto';
  }

  protected closureDate(item: CrmOportunidad): string | null {
    return item.fechaCierreReal || item.fechaGanada || item.fechaPerdida || item.updatedAt || null;
  }

  protected money(value: number | null | undefined): string {
    return Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { message?: string; details?: string[] } }).error;
      return payload?.details?.[0] || payload?.message || 'No se pudieron cargar los resultados comerciales.';
    }
    return 'No se pudieron cargar los resultados comerciales.';
  }
}
