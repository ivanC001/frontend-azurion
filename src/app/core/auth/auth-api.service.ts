import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { LoginResponse } from './auth-session.service';

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
  readonly tenantId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  registerAdminGeneral(request: Omit<LoginRequest, 'tenantId'>) {
    return this.http
      .post<
        ApiResponse<{ id: number; username: string; tenantId: string; roles: string[] }>
      >(this.apiUrl.url('saasCore', '/v1/auth/register'), request)
      .pipe(map((response) => response.data));
  }

  loginPublic(request: Omit<LoginRequest, 'tenantId'>) {
    return this.http
      .post<
        ApiResponse<LoginResponse>
      >(this.apiUrl.url('saasCore', '/v1/auth/public/login'), request)
      .pipe(map((response) => response.data));
  }

  loginTenant(request: Required<Pick<LoginRequest, 'username' | 'password' | 'tenantId'>>) {
    return this.http
      .post<
        ApiResponse<LoginResponse>
      >(this.apiUrl.url('saasCore', '/v1/auth/tenant/login'), request)
      .pipe(map((response) => response.data));
  }

  loginLegacy(request: LoginRequest) {
    return this.http
      .post<ApiResponse<LoginResponse>>(this.apiUrl.url('saasCore', '/v1/auth/login'), request)
      .pipe(map((response) => response.data));
  }

  login(request: LoginRequest) {
    const tenantId = request.tenantId?.trim();
    if (tenantId) {
      return this.loginTenant({
        username: request.username,
        password: request.password,
        tenantId,
      });
    }

    return this.loginPublic({
      username: request.username,
      password: request.password,
    });
  }
}
