import { InjectionToken } from '@angular/core';
import { environment } from '@env/environment';

export type ApiConnectionName = 'saasCore' | 'facturador';

export type ApiConnections = Record<ApiConnectionName, string>;

export interface AppSettings {
  readonly appName: string;
  readonly apiConnections: ApiConnections;
  readonly production: boolean;
  readonly tenancy: {
    readonly headerName: string;
    readonly defaultTenantId: string;
  };
}

export const appSettings: AppSettings = {
  appName: 'Azurion',
  apiConnections: environment.apiConnections,
  production: environment.production,
  tenancy: {
    headerName: 'X-Tenant-Id',
    defaultTenantId: 'public',
  },
};

export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS');
