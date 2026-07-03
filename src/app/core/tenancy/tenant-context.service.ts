import { Injectable, computed, signal } from '@angular/core';

export interface TenantContext {
  readonly id: string;
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly tenant = signal<TenantContext | null>(null);

  readonly currentTenant = this.tenant.asReadonly();
  readonly hasTenant = computed(() => this.tenant() !== null);

  setTenant(tenant: TenantContext): void {
    this.tenant.set(tenant);
  }

  clearTenant(): void {
    this.tenant.set(null);
  }
}
