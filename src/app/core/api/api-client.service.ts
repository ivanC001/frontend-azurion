import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { ApiConnectionName } from '@core/config/app-settings';
import { ApiUrlService } from './api-url.service';

interface ApiClientOptions {
  readonly params?: HttpParams | Record<string, string | number | boolean>;
  readonly tenantId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);

  get<T>(connection: ApiConnectionName, path: string, options: ApiClientOptions = {}) {
    return this.http.get<T>(this.apiUrl.url(connection, path), {
      headers: this.session.apiHeaders(options.tenantId),
      params: options.params,
    });
  }

  post<T>(
    connection: ApiConnectionName,
    path: string,
    body: unknown,
    options: ApiClientOptions = {},
  ) {
    return this.http.post<T>(this.apiUrl.url(connection, path), body, {
      headers: this.session.apiHeaders(options.tenantId),
      params: options.params,
    });
  }

  put<T>(
    connection: ApiConnectionName,
    path: string,
    body: unknown,
    options: ApiClientOptions = {},
  ) {
    return this.http.put<T>(this.apiUrl.url(connection, path), body, {
      headers: this.session.apiHeaders(options.tenantId),
      params: options.params,
    });
  }

  patch<T>(
    connection: ApiConnectionName,
    path: string,
    body: unknown,
    options: ApiClientOptions = {},
  ) {
    return this.http.patch<T>(this.apiUrl.url(connection, path), body, {
      headers: this.session.apiHeaders(options.tenantId),
      params: options.params,
    });
  }

  delete<T>(connection: ApiConnectionName, path: string, options: ApiClientOptions = {}) {
    return this.http.delete<T>(this.apiUrl.url(connection, path), {
      headers: this.session.apiHeaders(options.tenantId),
      params: options.params,
    });
  }
}
