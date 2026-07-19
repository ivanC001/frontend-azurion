import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, firstValueFrom, map } from 'rxjs';

import {
  AdminSaasApiService,
  CrmActividad,
  CrmOportunidad,
  CrmProspecto,
  PageResponse,
} from '../../../../data/admin-saas-api.service';
import {
  ExcelCellValue,
  ExcelReportColumn,
  ExcelReportService,
} from '../../../../data/excel-report.service';

type CrmReportKind = 'PROSPECTOS' | 'SEGUIMIENTO' | 'OPORTUNIDADES';
type CrmSourceRecord = CrmProspecto | CrmActividad | CrmOportunidad;

interface CrmReportRow {
  readonly [key: string]: ExcelCellValue;
}

interface CrmReportOption {
  readonly value: CrmReportKind;
  readonly label: string;
  readonly detail: string;
  readonly icon: string;
  readonly tone: string;
}

interface CrmReportColumn extends ExcelReportColumn {
  readonly align?: 'left' | 'center' | 'right';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-reports-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './crm-reports-page.html',
  styleUrl: './crm-reports-page.scss',
})
export class CrmReportsPage implements OnDestroy {
  private readonly api = inject(AdminSaasApiService);
  private readonly excelReport = inject(ExcelReportService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly reportOptions: readonly CrmReportOption[] = [
    { value: 'PROSPECTOS', label: 'Prospectos', detail: 'Captacion y calificacion', icon: 'pi pi-address-book', tone: 'green' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento', detail: 'Actividades y resultados', icon: 'pi pi-comments', tone: 'blue' },
    { value: 'OPORTUNIDADES', label: 'Oportunidades', detail: 'Pipeline y cierres', icon: 'pi pi-briefcase', tone: 'violet' },
  ];

  protected readonly reportKind = signal<CrmReportKind>('PROSPECTOS');
  protected readonly query = signal('');
  protected readonly status = signal('');
  protected readonly responsible = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly filtersOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly pageSize = 20;
  protected readonly pageData = signal<PageResponse<CrmReportRow>>(this.emptyPage());

  protected readonly columns = computed<readonly CrmReportColumn[]>(() => {
    if (this.reportKind() === 'PROSPECTOS') {
      return [
        { key: 'id', label: 'ID', width: 10, format: 'number', align: 'center' },
        { key: 'nombre', label: 'Prospecto', width: 24 },
        { key: 'documento', label: 'Documento', width: 18 },
        { key: 'contacto', label: 'Contacto', width: 28 },
        { key: 'origen', label: 'Origen / canal', width: 19 },
        { key: 'campania', label: 'Campania', width: 20 },
        { key: 'interes', label: 'Interes principal', width: 28 },
        { key: 'presupuesto', label: 'Presupuesto', width: 16, format: 'currency', align: 'right' },
        { key: 'estado', label: 'Estado', width: 16, align: 'center' },
        { key: 'nivel', label: 'Nivel / temperatura', width: 19 },
        { key: 'responsable', label: 'Responsable', width: 22 },
        { key: 'fecha', label: 'Fecha de interes', width: 17, format: 'date' },
      ];
    }
    if (this.reportKind() === 'SEGUIMIENTO') {
      return [
        { key: 'id', label: 'ID', width: 10, format: 'number', align: 'center' },
        { key: 'contacto', label: 'Prospecto / cliente', width: 25 },
        { key: 'oportunidad', label: 'Oportunidad', width: 26 },
        { key: 'tipo', label: 'Tipo', width: 16, align: 'center' },
        { key: 'asunto', label: 'Asunto', width: 30 },
        { key: 'estado', label: 'Estado', width: 16, align: 'center' },
        { key: 'resultado', label: 'Resultado comercial', width: 26 },
        { key: 'contactoResultado', label: 'Resultado contacto', width: 22 },
        { key: 'interes', label: 'Nivel de interes', width: 18 },
        { key: 'programada', label: 'Programada', width: 19, format: 'datetime' },
        { key: 'realizada', label: 'Realizada', width: 19, format: 'datetime' },
        { key: 'responsable', label: 'Responsable', width: 22 },
      ];
    }
    return [
      { key: 'id', label: 'ID', width: 10, format: 'number', align: 'center' },
      { key: 'titulo', label: 'Oportunidad', width: 30 },
      { key: 'cliente', label: 'Cliente / prospecto', width: 25 },
      { key: 'tipo', label: 'Tipo', width: 18 },
      { key: 'etapa', label: 'Etapa', width: 17, align: 'center' },
      { key: 'estado', label: 'Estado', width: 16, align: 'center' },
      { key: 'montoEstimado', label: 'Monto estimado', width: 17, format: 'currency', align: 'right' },
      { key: 'montoReal', label: 'Monto real', width: 17, format: 'currency', align: 'right' },
      { key: 'probabilidad', label: 'Probabilidad', width: 15, format: 'number', align: 'right' },
      { key: 'cierreEstimado', label: 'Cierre estimado', width: 18, format: 'date' },
      { key: 'cierreReal', label: 'Cierre real', width: 18, format: 'date' },
      { key: 'responsable', label: 'Responsable', width: 22 },
      { key: 'motivo', label: 'Motivo de perdida', width: 28 },
    ];
  });

  protected readonly statusOptions = computed<readonly string[]>(() => {
    if (this.reportKind() === 'PROSPECTOS') {
      return ['NUEVO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'CONVERTIDO', 'DESCARTADO'];
    }
    if (this.reportKind() === 'SEGUIMIENTO') {
      return ['PENDIENTE', 'REALIZADA', 'CANCELADA'];
    }
    return ['ABIERTA', 'GANADA', 'PERDIDA'];
  });

  protected readonly pageLabel = computed(() => {
    const page = this.pageData();
    if (!page.totalElements) {
      return '0 de 0 registros';
    }
    const first = page.page * page.size + 1;
    const last = Math.min(first + page.content.length - 1, page.totalElements);
    return `${first}-${last} de ${page.totalElements} registros`;
  });

  protected readonly activeFilters = computed(() =>
    [this.status(), this.responsible(), this.dateFrom(), this.dateTo()].filter(Boolean).length,
  );

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  protected selectReport(kind: CrmReportKind): void {
    if (kind === this.reportKind()) {
      return;
    }
    this.reportKind.set(kind);
    this.status.set('');
    this.pageData.set(this.emptyPage());
    this.load(0);
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.load(0), 350);
  }

  protected load(page = this.pageData().page): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.requestPage(page, this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.pageData.set(response),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected clearFilters(): void {
    this.status.set('');
    this.responsible.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.load(0);
  }

  protected previousPage(): void {
    if (!this.pageData().first) {
      this.load(Math.max(0, this.pageData().page - 1));
    }
  }

  protected nextPage(): void {
    if (!this.pageData().last) {
      this.load(this.pageData().page + 1);
    }
  }

  protected async exportCsv(): Promise<void> {
    await this.exportReport('csv');
  }

  protected async exportExcel(): Promise<void> {
    await this.exportReport('xlsx');
  }

  protected displayCell(row: CrmReportRow, column: CrmReportColumn): string {
    const value = row[column.key];
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (column.format === 'currency') {
      return `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (column.format === 'date' || column.format === 'datetime') {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) {
        return String(value);
      }
      return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(column.format === 'datetime' ? { hour: '2-digit', minute: '2-digit' } : {}),
      }).format(parsed);
    }
    if (column.key === 'probabilidad') {
      return `${value}%`;
    }
    return String(value);
  }

  protected isStatusColumn(column: CrmReportColumn): boolean {
    return column.key === 'estado' || column.key === 'etapa';
  }

  private requestPage(page: number, size: number): Observable<PageResponse<CrmReportRow>> {
    const query = this.query().trim() || null;
    const estado = this.status() || null;
    const responsableId = this.responsible().trim() || null;

    if (this.reportKind() === 'PROSPECTOS') {
      return this.api.listCrmProspectosPage({
        query,
        estado,
        responsableId,
        fechaDesde: this.dateFrom() || null,
        fechaHasta: this.dateTo() || null,
        page,
        size,
      }).pipe(map((response) => this.mapPage(response, (item) => this.mapProspect(item))));
    }
    if (this.reportKind() === 'SEGUIMIENTO') {
      return this.api.listCrmActividadesPage({
        query,
        estado,
        usuarioId: responsableId,
        fechaDesde: this.dateFrom() || null,
        fechaHasta: this.dateTo() || null,
        page,
        size,
      }).pipe(map((response) => this.mapPage(response, (item) => this.mapActivity(item))));
    }
    return this.api.listCrmOportunidadesPage({
      query,
      estado,
      responsableId,
      cierreDesde: this.dateFrom() || null,
      cierreHasta: this.dateTo() || null,
      page,
      size,
    }).pipe(map((response) => this.mapPage(response, (item) => this.mapOpportunity(item))));
  }

  private mapPage<T extends CrmSourceRecord>(
    source: PageResponse<T>,
    mapper: (item: T) => CrmReportRow,
  ): PageResponse<CrmReportRow> {
    return { ...source, content: source.content.map(mapper) };
  }

  private mapProspect(item: CrmProspecto): CrmReportRow {
    const company = item.razonSocial || item.nombreComercial;
    return {
      id: item.id,
      nombre: company ? `${item.nombre} - ${company}` : item.nombre,
      documento: [item.tipoDocumento, item.numeroDocumento].filter(Boolean).join(' ') || '',
      contacto: [item.telefono, item.correo].filter(Boolean).join(' / '),
      origen: [item.origen, item.canalIngreso].filter(Boolean).join(' / '),
      campania: item.campania || '',
      interes: item.interesPrincipal || item.interesDetalle || item.tipoInteres || '',
      presupuesto: Number(item.presupuestoEstimado || 0),
      estado: item.estado,
      nivel: [item.nivelInteres, item.temperatura].filter(Boolean).join(' / '),
      responsable: item.responsableId,
      fecha: item.fechaInteres || item.createdAt || '',
    };
  }

  private mapActivity(item: CrmActividad): CrmReportRow {
    return {
      id: item.id,
      contacto: item.clienteNombre || item.prospectoNombre || 'Sin contacto',
      oportunidad: item.oportunidadTitulo || '',
      tipo: item.tipoActividad,
      asunto: item.asunto,
      estado: item.estado,
      resultado: item.resultado || '',
      contactoResultado: item.resultadoContacto || item.estadoProspectoResultado || '',
      interes: item.nivelInteres || '',
      programada: item.fechaProgramada,
      realizada: item.fechaRealizada || '',
      responsable: item.usuarioId,
    };
  }

  private mapOpportunity(item: CrmOportunidad): CrmReportRow {
    return {
      id: item.id,
      titulo: item.titulo,
      cliente: item.clienteNombre || item.prospectoNombre || 'Sin contacto',
      tipo: item.tipoOportunidad || '',
      etapa: item.etapaNombre || item.etapa,
      estado: item.estado,
      montoEstimado: Number(item.montoEstimado || 0),
      montoReal: Number(item.montoReal || 0),
      probabilidad: Number(item.probabilidad || 0),
      cierreEstimado: item.fechaCierreEstimada || '',
      cierreReal: item.fechaCierreReal || item.fechaGanada || item.fechaPerdida || '',
      responsable: item.responsableId,
      motivo: item.motivoPerdida || '',
    };
  }

  private async exportReport(format: 'csv' | 'xlsx'): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      const rows = await this.fetchExportRows();
      if (!rows.length) {
        this.errorMessage.set('No hay registros para exportar con los filtros actuales.');
        return;
      }
      const fileBase = `azurion-crm-${this.reportKind().toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'xlsx') {
        await this.excelReport.exportWorkbook(`${fileBase}.xlsx`, [{
          name: this.reportKind(),
          title: `Reporte CRM - ${this.currentReport().label}`,
          subtitle: 'Detalle filtrado y paginado desde el servidor',
          columns: this.columns().map(({ align, ...column }) => column),
          rows,
          totalKeys: this.reportKind() === 'OPORTUNIDADES' ? ['montoEstimado', 'montoReal'] : undefined,
        }]);
      } else {
        const columns = this.columns();
        const lines = [
          columns.map((column) => this.csvEscape(column.label)).join(','),
          ...rows.map((row) => columns.map((column) => this.csvEscape(this.displayCell(row, column))).join(',')),
        ];
        this.downloadText(`\uFEFF${lines.join('\r\n')}`, `${fileBase}.csv`);
      }
      const capped = rows.length === 5000 ? ' Se aplico el limite seguro de 5,000 filas.' : '';
      this.successMessage.set(`Reporte ${format.toUpperCase()} generado con ${rows.length} registro(s).${capped}`);
    } catch (error: unknown) {
      this.errorMessage.set(this.resolveError(error));
    } finally {
      this.exporting.set(false);
    }
  }

  private async fetchExportRows(): Promise<CrmReportRow[]> {
    const pageSize = 100;
    const first = await firstValueFrom(this.requestPage(0, pageSize));
    const rows = [...first.content];
    const pages = Math.min(first.totalPages, 50);
    for (let page = 1; page < pages; page += 1) {
      const response = await firstValueFrom(this.requestPage(page, pageSize));
      rows.push(...response.content);
    }
    return rows.slice(0, 5000);
  }

  private currentReport(): CrmReportOption {
    return this.reportOptions.find((item) => item.value === this.reportKind()) ?? this.reportOptions[0];
  }

  private emptyPage(): PageResponse<CrmReportRow> {
    return { content: [], page: 0, size: this.pageSize, totalElements: 0, totalPages: 1, first: true, last: true };
  }

  private csvEscape(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private downloadText(content: string, fileName: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { message?: string; details?: string[] } }).error;
      return payload?.details?.[0] || payload?.message || 'No se pudo cargar el reporte CRM.';
    }
    return 'No se pudo cargar el reporte CRM.';
  }
}
