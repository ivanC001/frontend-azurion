import { Injectable } from '@angular/core';

import { CrmPaymentRecord, CrmPaymentRecordStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class CrmPaymentService {
  paidAmount(records: readonly CrmPaymentRecord[]): number {
    return records
      .filter((item) => item.estado === 'PAGADO' || item.estado === 'PARCIAL')
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  }

  pendingInstallments(records: readonly CrmPaymentRecord[]): CrmPaymentRecord[] {
    return records.filter((item) =>
      item.tipo === 'CUOTA' &&
      (['PENDIENTE', 'PARCIAL', 'VENCIDO'] as CrmPaymentRecordStatus[]).includes(item.estado),
    );
  }

  overdueInstallments(records: readonly CrmPaymentRecord[], now = new Date()): CrmPaymentRecord[] {
    return this.pendingInstallments(records).filter((item) => item.estado === 'VENCIDO' || this.isOverdue(item.fecha, now));
  }

  isOverdue(dateValue: string | null | undefined, now = new Date()): boolean {
    const timestamp = Date.parse(dateValue || '');
    return Number.isFinite(timestamp) && timestamp < now.getTime();
  }
}
