import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { UiToastService } from '@core/services/ui-toast.service';
import {
  AdminSaasApiService,
  StockItem,
  StockLoteItem,
} from '@features/admin/data/admin-saas-api.service';

export interface LowStockAlert {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
  readonly productId: number;
  readonly warehouseId: number;
  readonly quantity: number;
  readonly minimum: number;
  readonly critical: boolean;
  readonly type: 'STOCK' | 'EXPIRY';
}

@Injectable({ providedIn: 'root' })
export class LowStockAlertService {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(UiToastService);
  private readonly alertsState = signal<LowStockAlert[]>([]);
  private readonly loadingState = signal(false);

  readonly alerts = this.alertsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly count = computed(() => this.alertsState().length);

  refresh(notify = false): void {
    if (
      !this.session.hasPermission('INVENTORY_READ') ||
      !this.session.hasModule('INVENTARIO') ||
      this.loadingState()
    ) {
      return;
    }

    this.loadingState.set(true);
    forkJoin({
      stock: this.api.listStock(),
      lotes: this.api.listStockLotes(),
    })
      .pipe(finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: ({ stock, lotes }) => this.register(stock, notify, lotes),
        error: () => undefined,
      });
  }

  register(
    stock: readonly StockItem[],
    notify = false,
    lotes: readonly StockLoteItem[] = [],
  ): void {
    const stockAlerts = stock
      .filter((item) => item.stockBajo)
      .map((item) => this.toStockAlert(item));
    const expiryAlerts = lotes
      .filter(
        (item) => Number(item.stockActual || 0) > 0 && this.daysUntil(item.fechaVencimiento) <= 30,
      )
      .map((item) => this.toExpiryAlert(item));
    const alerts = [...expiryAlerts, ...stockAlerts].sort(
      (a, b) => Number(b.critical) - Number(a.critical) || a.quantity - b.quantity,
    );

    const previousKeys = new Set(this.alertsState().map((alert) => alert.key));
    this.alertsState.set(alerts);

    if (!notify || alerts.length === 0) {
      return;
    }

    const newAlerts = alerts.filter((alert) => !previousKeys.has(alert.key));
    const criticalCount = alerts.filter((alert) => alert.critical).length;
    const headline =
      newAlerts.length > 0
        ? `${newAlerts.length} nueva(s), ${alerts.length} alerta(s) activa(s).`
        : `${alerts.length} producto(s) requieren reposicion.`;
    const criticalDetail = criticalCount > 0 ? ` ${criticalCount} critica(s).` : '';
    this.toast.warn(`${headline}${criticalDetail}`, 'Alertas de inventario', 5200);
  }

  clear(): void {
    this.alertsState.set([]);
  }

  private toStockAlert(item: StockItem): LowStockAlert {
    const quantity = Number(item.cantidad || 0);
    const minimum = Number(item.stockMinimo || 0);
    return {
      key: `${item.productoId}:${item.almacenId}`,
      title: item.sinStock
        ? `Sin stock: ${item.productoNombre}`
        : `Stock bajo: ${item.productoNombre}`,
      detail: `${item.almacenCodigo} - ${item.almacenNombre}: ${quantity} disponible(s), minimo ${minimum}.`,
      productId: item.productoId,
      warehouseId: item.almacenId,
      quantity,
      minimum,
      critical: item.sinStock,
      type: 'STOCK',
    };
  }

  private toExpiryAlert(item: StockLoteItem): LowStockAlert {
    const days = this.daysUntil(item.fechaVencimiento);
    const expired = days < 0;
    return {
      key: `expiry:${item.loteId}:${item.almacenId}`,
      title: expired ? `Vencido: ${item.productoNombre}` : `Vence pronto: ${item.productoNombre}`,
      detail: `${item.almacenCodigo} - lote ${item.codigoLote}: ${expired ? `vencio hace ${Math.abs(days)} dia(s)` : `vence en ${days} dia(s)`}.`,
      productId: item.productoId,
      warehouseId: item.almacenId,
      quantity: Number(item.stockActual || 0),
      minimum: 0,
      critical: expired,
      type: 'EXPIRY',
    };
  }

  private daysUntil(date?: string | null): number {
    if (!date) {
      return Number.POSITIVE_INFINITY;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${date}T00:00:00`);
    return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  }
}
