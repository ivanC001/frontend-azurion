import { Injectable, inject } from '@angular/core';

import { APP_SETTINGS, ApiConnectionName } from '@core/config/app-settings';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private readonly settings = inject(APP_SETTINGS);

  baseUrl(connection: ApiConnectionName): string {
    return this.settings.apiConnections[connection].replace(/\/+$/, '');
  }

  url(connection: ApiConnectionName, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${this.baseUrl(connection)}/${cleanPath}`;
  }

  publicFileUrl(path: string | null | undefined, connection: ApiConnectionName = 'saasCore'): string | null {
    const rawPath = path?.trim();
    if (!rawPath) {
      return null;
    }

    if (/^(blob:|data:|assets\/|\/assets\/)/i.test(rawPath)) {
      return rawPath;
    }

    const normalizedPath = rawPath.replace(/\\/g, '/');
    const filesMarker = '/files/';
    const filesIndex = normalizedPath.indexOf(filesMarker);
    if (filesIndex >= 0) {
      return this.url(connection, normalizedPath.slice(filesIndex));
    }

    if (normalizedPath.startsWith('files/')) {
      return this.url(connection, `/${normalizedPath}`);
    }

    if (normalizedPath.startsWith('company-branding/')) {
      return this.url(connection, `/files/${normalizedPath}`);
    }

    if (/^https?:\/\//i.test(normalizedPath)) {
      return normalizedPath;
    }

    return normalizedPath;
  }
}
