import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { InternalMessageNotificationService } from '@core/services/internal-message-notification.service';
import {
  AdminSaasApiService,
  Empresa,
  UsuarioTenant,
} from '@features/admin/data/admin-saas-api.service';
import {
  InboxMessage,
  MessageAudience,
  MessagePriority,
  PlatformMessagingService,
  SendPlatformMessageRequest,
  SentPlatformMessage,
} from '../../data/platform-messaging.service';

type MessageTab = 'INBOX' | 'COMPOSE' | 'SENT';

interface MessageForm {
  asunto: string;
  contenido: string;
  prioridad: MessagePriority;
  audiencia: MessageAudience;
  tenantId: string;
  usuarioIds: number[];
  expirationDays: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-messages-page',
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './platform-messages-page.html',
  styleUrl: './platform-messages-page.scss',
})
export class PlatformMessagesPage {
  private readonly messaging = inject(PlatformMessagingService);
  private readonly adminApi = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly notifications = inject(InternalMessageNotificationService);

  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  protected readonly loadingUsers = signal(false);
  protected readonly inbox = signal<InboxMessage[]>([]);
  protected readonly sentMessages = signal<SentPlatformMessage[]>([]);
  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly tenantUsers = signal<UsuarioTenant[]>([]);
  protected readonly selectedRecipientId = signal<number | null>(null);
  protected readonly activeTab = signal<MessageTab>('INBOX');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly isGeneralAdmin = computed(() => {
    const current = this.session.currentSession();
    return Boolean(
      current?.adminGeneral ||
        current?.roles?.some(
          (role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN',
        ),
    );
  });
  protected readonly unreadCount = computed(
    () => this.inbox().filter((message) => !message.leido).length,
  );
  protected readonly criticalCount = computed(
    () => this.inbox().filter((message) => message.prioridad === 'CRITICAL').length,
  );
  protected readonly selectedMessage = computed(() => {
    const recipientId = this.selectedRecipientId();
    return this.inbox().find((message) => message.recipientId === recipientId) ?? null;
  });
  protected readonly priorityOptions = [
    { label: 'Informativo', value: 'INFO' },
    { label: 'Importante', value: 'WARNING' },
    { label: 'Critico', value: 'CRITICAL' },
  ];
  protected readonly audienceOptions = [
    { label: 'Administradores de Azurion', value: 'PLATFORM_ADMINS' },
    { label: 'Administradores de un tenant', value: 'TENANT_ADMINS' },
    { label: 'Todos los usuarios de un tenant', value: 'TENANT_USERS' },
    { label: 'Usuarios seleccionados', value: 'SELECTED_USERS' },
    { label: 'Todos los usuarios de la plataforma', value: 'ALL_USERS' },
  ];
  protected readonly expirationOptions = [
    { label: 'No expira', value: 0 },
    { label: '7 dias', value: 7 },
    { label: '30 dias', value: 30 },
    { label: '90 dias', value: 90 },
  ];

  protected form: MessageForm = this.emptyForm();

  constructor() {
    this.load();
  }

  protected load(): void {
    this.clearMessages();
    this.loading.set(true);
    forkJoin({
      inbox: this.messaging.inbox(100),
      sent: this.isGeneralAdmin() ? this.messaging.sent(100) : of([] as SentPlatformMessage[]),
      empresas: this.isGeneralAdmin() ? this.adminApi.listEmpresas() : of([] as Empresa[]),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ inbox, sent, empresas }) => {
          this.inbox.set(inbox);
          this.sentMessages.set(sent);
          this.empresas.set(empresas.filter((empresa) => empresa.activo));
          if (!this.selectedRecipientId() && inbox.length) {
            this.selectedRecipientId.set(inbox[0].recipientId);
          }
          if (!this.form.tenantId && empresas.length) {
            this.form.tenantId = empresas[0].tenantId;
          }
          this.notifications.refresh();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected setTab(tab: MessageTab): void {
    if (tab !== 'INBOX' && !this.isGeneralAdmin()) {
      return;
    }
    this.activeTab.set(tab);
    this.clearMessages();
  }

  protected openMessage(message: InboxMessage): void {
    this.selectedRecipientId.set(message.recipientId);
    if (message.leido) {
      return;
    }
    this.messaging.markRead(message.recipientId).subscribe({
      next: (updated) => {
        this.inbox.update((items) =>
          items.map((item) => (item.recipientId === updated.recipientId ? updated : item)),
        );
        this.notifications.updateMessage(updated);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected markAllRead(): void {
    if (!this.unreadCount()) {
      return;
    }
    this.messaging.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.inbox.update((items) =>
          items.map((message) => ({ ...message, leido: true, leidoEn: message.leidoEn || now })),
        );
        this.notifications.clearUnread();
        this.successMessage.set('Todos los mensajes fueron marcados como leidos.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected onAudienceChange(audience: MessageAudience): void {
    this.form.audiencia = audience;
    this.form.usuarioIds = [];
    this.tenantUsers.set([]);
    if (audience === 'SELECTED_USERS' && this.form.tenantId) {
      this.loadTenantUsers();
    }
  }

  protected onTenantChange(tenantId: string): void {
    this.form.tenantId = tenantId;
    this.form.usuarioIds = [];
    this.tenantUsers.set([]);
    if (this.audienceNeedsUsers()) {
      this.loadTenantUsers();
    }
  }

  protected toggleUser(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.form.usuarioIds = checked
      ? [...this.form.usuarioIds, userId]
      : this.form.usuarioIds.filter((id) => id !== userId);
  }

  protected isUserSelected(userId: number): boolean {
    return this.form.usuarioIds.includes(userId);
  }

  protected audienceNeedsTenant(): boolean {
    return ['TENANT_ADMINS', 'TENANT_USERS', 'SELECTED_USERS'].includes(this.form.audiencia);
  }

  protected audienceNeedsUsers(): boolean {
    return this.form.audiencia === 'SELECTED_USERS';
  }

  protected send(): void {
    this.clearMessages();
    if (!this.validateForm()) {
      return;
    }
    const request: SendPlatformMessageRequest = {
      asunto: this.form.asunto.trim(),
      contenido: this.form.contenido.trim(),
      prioridad: this.form.prioridad,
      audiencia: this.form.audiencia,
      tenantId: this.audienceNeedsTenant() ? this.form.tenantId : null,
      usuarioIds: this.audienceNeedsUsers() ? this.form.usuarioIds : null,
      expiraEn: this.form.expirationDays
        ? this.localIsoAfterDays(this.form.expirationDays)
        : null,
    };
    this.sending.set(true);
    this.messaging
      .send(request)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: (message) => {
          this.sentMessages.update((items) => [message, ...items]);
          this.successMessage.set(
            `Mensaje enviado correctamente a ${message.recipientCount} usuario(s).`,
          );
          this.form = this.emptyForm();
          this.tenantUsers.set([]);
          this.activeTab.set('SENT');
          this.notifications.refresh();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected audienceLabel(audience: MessageAudience): string {
    return (
      this.audienceOptions.find((option) => option.value === audience)?.label || audience
    );
  }

  protected priorityLabel(priority: MessagePriority): string {
    return this.priorityOptions.find((option) => option.value === priority)?.label || priority;
  }

  protected tenantLabel(tenantId?: string | null): string {
    if (!tenantId) {
      return 'Toda la plataforma';
    }
    const empresa = this.empresas().find((item) => item.tenantId === tenantId);
    return empresa ? `${empresa.razonSocial} (${tenantId})` : tenantId;
  }

  private loadTenantUsers(): void {
    const tenantId = this.form.tenantId.trim();
    if (!tenantId) {
      return;
    }
    this.loadingUsers.set(true);
    this.adminApi
      .listUsuarios({ tenantId })
      .pipe(finalize(() => this.loadingUsers.set(false)))
      .subscribe({
        next: (users) => this.tenantUsers.set(users.filter((user) => user.activo)),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private validateForm(): boolean {
    if (!this.form.asunto.trim() || !this.form.contenido.trim()) {
      this.errorMessage.set('Completa el asunto y el contenido del mensaje.');
      return false;
    }
    if (this.audienceNeedsTenant() && !this.form.tenantId.trim()) {
      this.errorMessage.set('Selecciona el tenant destinatario.');
      return false;
    }
    if (this.audienceNeedsUsers() && !this.form.usuarioIds.length) {
      this.errorMessage.set('Selecciona al menos un usuario destinatario.');
      return false;
    }
    return true;
  }

  private emptyForm(): MessageForm {
    return {
      asunto: '',
      contenido: '',
      prioridad: 'INFO',
      audiencia: 'PLATFORM_ADMINS',
      tenantId: this.empresas()[0]?.tenantId || '',
      usuarioIds: [],
      expirationDays: 30,
    };
  }

  private localIsoAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private resolveError(error: unknown): string {
    const candidate = error as { error?: { message?: string; error?: string }; message?: string };
    return (
      candidate?.error?.message ||
      candidate?.error?.error ||
      candidate?.message ||
      'No se pudo completar la operacion.'
    );
  }
}
