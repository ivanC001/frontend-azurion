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

}
