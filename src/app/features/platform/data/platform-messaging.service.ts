import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

export type MessageAudience =
  | 'PLATFORM_ADMINS'
  | 'TENANT_ADMINS'
  | 'TENANT_USERS'
  | 'SELECTED_USERS'
  | 'ALL_USERS';
export type MessagePriority = 'INFO' | 'WARNING' | 'CRITICAL';

export interface InboxMessage {
  readonly recipientId: number;
  readonly messageId: number;
  readonly asunto: string;
  readonly contenido: string;
  readonly prioridad: MessagePriority;
  readonly audiencia: MessageAudience;
  readonly tenantId?: string | null;
  readonly enviadoPor: string;
  readonly publicadoEn: string;
  readonly expiraEn?: string | null;
  readonly leido: boolean;
  readonly leidoEn?: string | null;
}

export interface SentPlatformMessage {
  readonly id: number;
  readonly asunto: string;
  readonly contenido: string;
  readonly prioridad: MessagePriority;
  readonly audiencia: MessageAudience;
  readonly tenantId?: string | null;
  readonly enviadoPor: string;
  readonly publicadoEn: string;
  readonly expiraEn?: string | null;
  readonly activo: boolean;
  readonly recipientCount: number;
  readonly readCount: number;
}

export interface SendPlatformMessageRequest {
  readonly asunto: string;
  readonly contenido: string;
  readonly prioridad: MessagePriority;
  readonly audiencia: MessageAudience;
  readonly tenantId?: string | null;
  readonly usuarioIds?: readonly number[] | null;
  readonly expiraEn?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlatformMessagingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);

  inbox(limit = 50) {
    return this.http
      .get<ApiResponse<InboxMessage[]>>(
        this.apiUrl.url('saasCore', '/v1/messages/inbox'),
        {
          headers: this.session.apiHeaders(),
          params: { limit },
        },
      )
      .pipe(map((response) => response.data));
  }

  unreadCount() {
    return this.http
      .get<ApiResponse<{ unreadCount: number }>>(
        this.apiUrl.url('saasCore', '/v1/messages/inbox/unread-count'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => Number(response.data.unreadCount || 0)));
  }

  markRead(recipientId: number) {
    return this.http
      .patch<ApiResponse<InboxMessage>>(
        this.apiUrl.url('saasCore', `/v1/messages/inbox/${recipientId}/read`),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  markAllRead() {
    return this.http
      .post<ApiResponse<number>>(
        this.apiUrl.url('saasCore', '/v1/messages/inbox/read-all'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  send(request: SendPlatformMessageRequest) {
    return this.http
      .post<ApiResponse<SentPlatformMessage>>(
        this.apiUrl.url('saasCore', '/v1/saas/platform/messages'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sent(limit = 50) {
    return this.http
      .get<ApiResponse<SentPlatformMessage[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/platform/messages'),
        {
          headers: this.session.apiHeaders(),
          params: { limit },
        },
      )
      .pipe(map((response) => response.data));
  }
}
