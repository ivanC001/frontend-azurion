import { Injectable } from '@angular/core';

export interface CrmLocalConfig {
  readonly cierreEstimadoDias: number;
}

export interface CrmStorageCompanyIdentity {
  readonly tenantId?: string;
  readonly ruc?: string;
}

@Injectable({ providedIn: 'root' })
export class CrmLocalStorageService {
  private readonly defaultCloseDays = 15;

  loadCrmLocalConfig(key: string): CrmLocalConfig {
    const parsed = this.readJson<Partial<CrmLocalConfig>>(key, {});
    const days = Number(parsed.cierreEstimadoDias || this.defaultCloseDays);

    return { cierreEstimadoDias: Math.min(365, Math.max(1, days)) };
  }

  persistCrmLocalConfig(key: string, config: CrmLocalConfig): void {
    this.writeJson(key, config);
  }

  loadRecords<T>(key: string): T[] {
    const parsed = this.readJson<T[]>(key, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  clearRecords(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  replaceMigrationRecords<T>(key: string, items: readonly T[]): void {
    if (!items.length) {
      this.clearRecords(key);
      return;
    }
    this.writeJson(key, items);
  }

  loadMessageTemplates<T>(key: string, fallback: readonly T[]): T[] {
    const parsed = this.readJson<T[] | null>(key, null);
    return Array.isArray(parsed) && parsed.length ? parsed : [...fallback];
  }

  persistMessageTemplates<T>(key: string, items: readonly T[]): void {
    this.writeJson(key, items);
  }

  opportunityStoragePrefix(company: CrmStorageCompanyIdentity | undefined): string {
    return `azurion.crm.opportunity.${this.tenantKey(company)}`;
  }

  opportunityTemplatesKey(company: CrmStorageCompanyIdentity | undefined): string {
    return `azurion.crm.opportunity.templates.${this.tenantKey(company)}`;
  }

  private tenantKey(company: CrmStorageCompanyIdentity | undefined): string {
    return company?.tenantId || company?.ruc || 'default';
  }

  private readJson<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }
}
