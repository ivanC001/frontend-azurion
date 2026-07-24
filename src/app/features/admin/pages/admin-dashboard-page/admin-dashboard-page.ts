import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, timeout } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Caja,
  Cliente,
  Empresa,
  Plan,
  Producto,
  Suscripcion,
  VentaRecord,
} from '@features/admin/data/admin-saas-api.service';

type KpiTone = 'success' | 'warn' | 'neutral';

interface KpiCard {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly trend: string;
  readonly tone: KpiTone;
}

interface GeneralRow {
  readonly empresa: string;
  readonly ruc: string;
  readonly tenantId: string;
  readonly plan: string;
  readonly estado: string;
  readonly activa: boolean;
}

interface TenantRow {
  readonly externalId: string;
  readonly clienteNombre: string;
  readonly clienteDocumento: string;
  readonly fechaVenta: string;
  readonly moneda: string;
  readonly total: number;
  readonly facturacionEstado: string | null | undefined;
}

interface ChartModel {
  readonly labels: string[];
  readonly primary: number[];
  readonly secondary: number[];
  readonly primaryName: string;
  readonly secondaryName: string;
}

interface BarPoint {
  readonly label: string;
  readonly value: number;
  readonly detail: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-dashboard-page',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TagModule,
  ],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage {
  private static readonly REQUEST_TIMEOUT_MS = 12000;
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService).currentSession;
  protected readonly chartGuides = [0, 25, 50, 75, 100];

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  private readonly empresas = signal<Empresa[]>([]);
  private readonly planes = signal<Plan[]>([]);
  private readonly suscripciones = signal<Suscripcion[]>([]);
  private readonly ventas = signal<VentaRecord[]>([]);
  private readonly cajas = signal<Caja[]>([]);
  private readonly productos = signal<Producto[]>([]);
  private readonly clientes = signal<Cliente[]>([]);

  protected readonly isGeneralAdmin = computed(() => {
    const current = this.session();
    const roles = current?.roles ?? [];
    return (
      !!current?.adminGeneral ||
      roles.some((role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN')
    );
  });

  protected readonly dashboardTitle = computed(() =>
    this.isGeneralAdmin() ? 'Dashboard General SaaS' : 'Dashboard Operativo Empresa',
  );

  protected readonly kpis = computed<KpiCard[]>(() => {
    return this.isGeneralAdmin() ? this.generalKpis() : this.tenantKpis();
  });

  protected readonly chartModel = computed<ChartModel>(() => {
    return this.isGeneralAdmin() ? this.buildGeneralChartModel() : this.buildTenantChartModel();
  });

  protected readonly chartSvg = computed(() => this.buildChartSvg(this.chartModel()));

  protected readonly barSeries = computed<BarPoint[]>(() => {
    return this.isGeneralAdmin() ? this.buildGeneralBars() : this.buildTenantBars();
  });

  protected readonly maxBarValue = computed(() => {
    const max = Math.max(...this.barSeries().map((item) => item.value), 0);
    return max <= 0 ? 1 : max;
  });

  protected readonly generalRows = computed<GeneralRow[]>(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const planById = new Map(this.planes().map((plan) => [plan.id, plan]));
    const suscripcionByEmpresa = new Map<number, Suscripcion>();
    for (const subscription of this.suscripciones()) {
      if (!suscripcionByEmpresa.has(subscription.empresaId)) {
        suscripcionByEmpresa.set(subscription.empresaId, subscription);
      }
    }

    const rows = this.empresas().map<GeneralRow>((empresa) => {
      const sub = suscripcionByEmpresa.get(empresa.id);
      const plan = sub ? planById.get(sub.planId) : null;
      return {
        empresa: empresa.razonSocial,
        ruc: empresa.ruc,
        tenantId: empresa.tenantId,
        plan: plan?.nombre || '-',
        estado: sub?.estado || 'SIN SUSCRIPCION',
        activa: empresa.activo,
      };
    });

    if (!q) {
      return rows;
    }

    return rows.filter((row) => {
      return (
        row.empresa.toLowerCase().includes(q) ||
        row.ruc.toLowerCase().includes(q) ||
        row.tenantId.toLowerCase().includes(q) ||
        row.plan.toLowerCase().includes(q) ||
        row.estado.toLowerCase().includes(q)
      );
    });
  });

  protected readonly tenantRows = computed<TenantRow[]>(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const rows = [...this.ventas()]
      .map<TenantRow>((venta) => ({
        externalId: venta.externalId,
        clienteNombre: venta.clienteNombre,
        clienteDocumento: venta.clienteDocumento,
        fechaVenta: venta.fechaVenta,
        moneda: venta.moneda,
        total: Number(venta.total),
        facturacionEstado: venta.facturacionEstado,
      }))
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime());

    if (!q) {
      return rows.slice(0, 8);
    }

    return rows
      .filter((row) => {
        return (
          row.externalId.toLowerCase().includes(q) ||
          row.clienteNombre.toLowerCase().includes(q) ||
          row.clienteDocumento.toLowerCase().includes(q) ||
          (row.facturacionEstado || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  });

  protected readonly quickLinks = computed(() => {
    if (this.isGeneralAdmin()) {
      return [
        { label: 'Nueva empresa', route: '/admin/empresas', icon: 'pi pi-building' },
        { label: 'Configurar planes', route: '/admin/planes', icon: 'pi pi-sparkles' },
        { label: 'Control empresas', route: '/admin/control-empresas', icon: 'pi pi-shield' },
        { label: 'Panel facturador', route: '/admin/facturador', icon: 'pi pi-send' },
      ];
    }

    return [
      { label: 'Nueva venta', route: '/admin/ventas/nueva', icon: 'pi pi-cart-plus' },
      { label: 'Abrir caja', route: '/admin/caja', icon: 'pi pi-wallet' },
      { label: 'Gestion productos', route: '/admin/productos', icon: 'pi pi-box' },
      { label: 'Clientes', route: '/admin/clientes', icon: 'pi pi-users' },
    ];
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    if (this.isGeneralAdmin()) {
      this.loadGeneral();
      return;
    }

    this.loadTenant();
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term || '');
  }

  protected statusSeverity(
    status: string | null | undefined,
  ): 'success' | 'warn' | 'danger' | 'secondary' {
    const value = (status || '').trim().toUpperCase();
    if (value === 'ACEPTADO' || value === 'ACTIVA') {
      return 'success';
    }
    if (value === 'RECHAZADO' || value === 'ERROR' || value === 'CANCELADA') {
      return 'danger';
    }
    if (value === 'PENDIENTE' || value === 'PROCESANDO' || value === 'SUSPENDIDA') {
      return 'warn';
    }
    return 'secondary';
  }

  protected empresaBadgeTone(activa: boolean): 'success' | 'danger' {
    return activa ? 'success' : 'danger';
  }

  protected barHeight(point: BarPoint): string {
    const ratio = point.value / this.maxBarValue();
    const percent = Math.max(6, Math.round(ratio * 100));
    return `${percent}%`;
  }

  private loadGeneral(): void {
    forkJoin({
      empresas: this.api.listEmpresas().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Empresa[])),
      ),
      planes: this.api.listPlanes().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Plan[])),
      ),
      suscripciones: this.api.listSuscripciones().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Suscripcion[])),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ empresas, planes, suscripciones }) => {
          this.empresas.set(empresas);
          this.planes.set(planes);
          this.suscripciones.set(suscripciones);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private loadTenant(): void {
    forkJoin({
      ventas: this.api.listVentas().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as VentaRecord[])),
      ),
      cajas: this.api.listCajas().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Caja[])),
      ),
      productos: this.api.listProductos().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Producto[])),
      ),
      clientes: this.api.listClientes().pipe(
        timeout(AdminDashboardPage.REQUEST_TIMEOUT_MS),
        catchError(() => of([] as Cliente[])),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ ventas, cajas, productos, clientes }) => {
          this.ventas.set(ventas);
          this.cajas.set(cajas);
          this.productos.set(productos);
          this.clientes.set(clientes);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private generalKpis(): KpiCard[] {
    const empresas = this.empresas();
    const suscripciones = this.suscripciones();
    const planes = this.planes();
    const activeEmpresas = empresas.filter((empresa) => empresa.activo).length;
    const activeSubs = suscripciones.filter((sub) => sub.estado.toUpperCase() === 'ACTIVA').length;
    const mrr = this.calculateMrr(suscripciones, planes);
    const subsGrowth = this.subscriptionMonthGrowth(suscripciones);

    return [
      {
        icon: 'pi pi-building',
        label: 'Empresas activas',
        value: String(activeEmpresas),
        hint: `Total registradas: ${empresas.length}`,
        trend: this.metricTrendLabel(activeEmpresas, empresas.length - activeEmpresas),
        tone: 'success',
      },
      {
        icon: 'pi pi-id-card',
        label: 'Suscripciones activas',
        value: String(activeSubs),
        hint: `Total suscripciones: ${suscripciones.length}`,
        trend: this.percentLabel(subsGrowth),
        tone: subsGrowth >= 0 ? 'success' : 'warn',
      },
      {
        icon: 'pi pi-sparkles',
        label: 'Planes disponibles',
        value: String(planes.length),
        hint: 'Catalogo comercial vigente',
        trend: planes.length > 0 ? '+100%' : '0%',
        tone: 'neutral',
      },
      {
        icon: 'pi pi-wallet',
        label: 'MRR estimado',
        value: `S/ ${mrr.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        hint: 'Suma de suscripciones activas',
        trend: this.percentLabel(subsGrowth),
        tone: subsGrowth >= 0 ? 'success' : 'warn',
      },
    ];
  }

  private tenantKpis(): KpiCard[] {
    const ventas = this.ventas();
    const productos = this.productos();
    const clientes = this.clientes();
    const cajas = this.cajas();

    const monthSales = this.sumMonthRevenue(ventas, 0);
    const previousMonthSales = this.sumMonthRevenue(ventas, 1);
    const monthGrowth = this.changePercent(monthSales, previousMonthSales);
    const todaySales = this.countTodaySales(ventas);
    const avgTicket =
      ventas.length > 0
        ? ventas.reduce((sum, row) => sum + Number(row.total), 0) / ventas.length
        : 0;
    const activeProducts = productos.filter((product) => product.activo).length;
    const openCajas = cajas.filter((caja) => caja.estado.toUpperCase() === 'ABIERTA').length;

    return [
      {
        icon: 'pi pi-chart-line',
        label: 'Ventas del mes',
        value: `S/ ${monthSales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        hint: 'Facturacion registrada en caja',
        trend: this.percentLabel(monthGrowth),
        tone: monthGrowth >= 0 ? 'success' : 'warn',
      },
      {
        icon: 'pi pi-shopping-cart',
        label: 'Ventas hoy',
        value: String(todaySales),
        hint: 'Operaciones del dia',
        trend: `${openCajas} caja(s) abierta(s)`,
        tone: 'neutral',
      },
      {
        icon: 'pi pi-receipt',
        label: 'Ticket promedio',
        value: `S/ ${avgTicket.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        hint: 'Promedio por venta',
        trend: `${ventas.length} venta(s)`,
        tone: 'neutral',
      },
      {
        icon: 'pi pi-box',
        label: 'Productos activos',
        value: String(activeProducts),
        hint: `Clientes: ${clientes.length}`,
        trend: `${productos.length - activeProducts} inactivos`,
        tone: activeProducts > 0 ? 'success' : 'warn',
      },
    ];
  }

  private buildGeneralChartModel(): ChartModel {
    const months = this.lastMonths(8);
    const totals: Record<string, number> = {};
    const active: Record<string, number> = {};

    for (const month of months) {
      totals[month.key] = 0;
      active[month.key] = 0;
    }

    for (const sub of this.suscripciones()) {
      if (!sub.fechaInicio) {
        continue;
      }
      const date = new Date(sub.fechaInicio);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const key = this.monthKey(date);
      if (!(key in totals)) {
        continue;
      }
      totals[key] += 1;
      if (sub.estado.toUpperCase() === 'ACTIVA') {
        active[key] += 1;
      }
    }

    return {
      labels: months.map((month) => month.label),
      primary: months.map((month) => active[month.key] || 0),
      secondary: months.map((month) => totals[month.key] || 0),
      primaryName: 'Suscripciones activas',
      secondaryName: 'Suscripciones creadas',
    };
  }

  private buildTenantChartModel(): ChartModel {
    const months = this.lastMonths(8);
    const revenue: Record<string, number> = {};
    const count: Record<string, number> = {};

    for (const month of months) {
      revenue[month.key] = 0;
      count[month.key] = 0;
    }

    for (const venta of this.ventas()) {
      const date = new Date(venta.fechaVenta);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const key = this.monthKey(date);
      if (!(key in revenue)) {
        continue;
      }
      revenue[key] += Number(venta.total);
      count[key] += 1;
    }

    return {
      labels: months.map((month) => month.label),
      primary: months.map((month) => Number(revenue[month.key].toFixed(2))),
      secondary: months.map((month) => count[month.key] || 0),
      primaryName: 'Ingresos',
      secondaryName: 'Ventas',
    };
  }

  private buildChartSvg(model: ChartModel): {
    primaryPoints: string;
    secondaryPoints: string;
    maxValue: number;
  } {
    const maxValue = Math.max(...model.primary, ...model.secondary, 0);
    const safeMax = maxValue <= 0 ? 1 : maxValue;

    return {
      primaryPoints: this.buildPolyline(model.primary, safeMax),
      secondaryPoints: this.buildPolyline(model.secondary, safeMax),
      maxValue: safeMax,
    };
  }

  private buildGeneralBars(): BarPoint[] {
    const byStatus = new Map<string, number>();
    for (const sub of this.suscripciones()) {
      const key = (sub.estado || 'SIN_ESTADO').toUpperCase();
      byStatus.set(key, (byStatus.get(key) || 0) + 1);
    }

    const sorted = [...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!sorted.length) {
      return [
        { label: 'ACTIVA', value: 0, detail: '0' },
        { label: 'SUSPENDIDA', value: 0, detail: '0' },
      ];
    }

    return sorted.map(([label, value]) => ({ label, value, detail: `${value} empresas` }));
  }

  private buildTenantBars(): BarPoint[] {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const now = new Date();
    const monday = this.startOfWeek(now);
    const totals = Array.from({ length: 7 }, () => 0);

    for (const venta of this.ventas()) {
      const date = new Date(venta.fechaVenta);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const diff = Math.floor((date.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0 || diff > 6) {
        continue;
      }
      totals[diff] += Number(venta.total);
    }

    return totals.map((value, index) => ({
      label: days[index],
      value: Number(value.toFixed(2)),
      detail: `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }));
  }

  private buildPolyline(values: number[], max: number): string {
    const width = 620;
    const height = 220;
    const padX = 24;
    const padY = 16;
    const usableWidth = width - padX * 2;
    const usableHeight = height - padY * 2;
    const denominator = Math.max(values.length - 1, 1);

    return values
      .map((value, index) => {
        const x = padX + (usableWidth * index) / denominator;
        const y = padY + usableHeight - (value / max) * usableHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private calculateMrr(suscripciones: Suscripcion[], planes: Plan[]): number {
    const planById = new Map(planes.map((plan) => [plan.id, Number(plan.precioMensual)]));
    return suscripciones
      .filter((sub) => sub.estado.toUpperCase() === 'ACTIVA')
      .reduce((sum, sub) => sum + (planById.get(sub.planId) || 0), 0);
  }

  private subscriptionMonthGrowth(suscripciones: Suscripcion[]): number {
    const now = new Date();
    const currentKey = this.monthKey(now);
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousKey = this.monthKey(previous);
    let currentCount = 0;
    let previousCount = 0;

    for (const sub of suscripciones) {
      if (!sub.fechaInicio) {
        continue;
      }
      const date = new Date(sub.fechaInicio);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const key = this.monthKey(date);
      if (key === currentKey) {
        currentCount += 1;
      } else if (key === previousKey) {
        previousCount += 1;
      }
    }

    return this.changePercent(currentCount, previousCount);
  }

  private sumMonthRevenue(ventas: VentaRecord[], monthOffset: number): number {
    const target = new Date();
    target.setMonth(target.getMonth() - monthOffset);
    const month = target.getMonth();
    const year = target.getFullYear();

    return ventas.reduce((sum, venta) => {
      const date = new Date(venta.fechaVenta);
      if (Number.isNaN(date.getTime())) {
        return sum;
      }
      if (date.getMonth() !== month || date.getFullYear() !== year) {
        return sum;
      }
      return sum + Number(venta.total);
    }, 0);
  }

  private countTodaySales(ventas: VentaRecord[]): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    let count = 0;

    for (const venta of ventas) {
      const date = new Date(venta.fechaVenta);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        count += 1;
      }
    }

    return count;
  }

  private lastMonths(length: number): Array<{ key: string; label: string }> {
    const items: Array<{ key: string; label: string }> = [];
    const now = new Date();

    for (let i = length - 1; i >= 0; i -= 1) {
      const current = new Date(now.getFullYear(), now.getMonth() - i, 1);
      items.push({
        key: this.monthKey(current),
        label: new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(current),
      });
    }

    return items;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private metricTrendLabel(a: number, b: number): string {
    if (b <= 0) {
      return '+100%';
    }
    return this.percentLabel(this.changePercent(a, b));
  }

  private percentLabel(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  private changePercent(current: number, previous: number): number {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo cargar el dashboard.';
    }
    return 'No se pudo cargar el dashboard.';
  }
}
