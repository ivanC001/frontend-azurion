import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import {
  AdminSaasApiService,
  CrmInboxChannelAvailability,
} from '../../../data/admin-saas-api.service';

@Injectable({ providedIn: 'root' })
export class CrmInboxChannelStateService {
  private readonly api = inject(AdminSaasApiService);
  private readonly channelState = signal<CrmInboxChannelAvailability[]>([]);
  private readonly loadingState = signal(false);

  readonly channels = this.channelState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly activeChannelCodes = computed(() =>
    new Set(this.channelState().filter((channel) => channel.activo).map((channel) => channel.canal)),
  );

  refresh(): void {
    if (this.loadingState()) {
      return;
    }
    this.loadingState.set(true);
    this.api.listCrmInboxChannels()
      .pipe(finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: (channels) => this.channelState.set(channels),
        error: () => this.channelState.set([]),
      });
  }

  updateChannel(canal: string, activo: boolean, nombre?: string | null): void {
    const normalized = canal.trim().toUpperCase();
    const current = this.channelState();
    const existing = current.find((channel) => channel.canal === normalized);
    const updated: CrmInboxChannelAvailability = {
      canal: normalized,
      nombre: nombre?.trim() || existing?.nombre || normalized,
      activo,
    };
    this.channelState.set(existing
      ? current.map((channel) => channel.canal === normalized ? updated : channel)
      : [...current, updated]);
  }
}
