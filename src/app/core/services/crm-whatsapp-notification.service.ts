import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { UiToastService } from '@core/services/ui-toast.service';
import {
  AdminSaasApiService,
  WhatsappUnreadSummary,
} from '@features/admin/data/admin-saas-api.service';

const EMPTY_SUMMARY: WhatsappUnreadSummary = {
  mensajesNoLeidos: 0,
  conversacionesNoLeidas: 0,
  ultimoProspectoId: null,
  ultimoContacto: null,
  ultimoMensaje: null,
  ultimoMensajeEn: null,
};

@Injectable({ providedIn: 'root' })
export class CrmWhatsappNotificationService {
  private readonly api = inject(AdminSaasApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toast = inject(UiToastService);
  private readonly summaryState = signal<WhatsappUnreadSummary>(EMPTY_SUMMARY);
  private readonly loadingState = signal(false);

  readonly summary = this.summaryState.asReadonly();
  readonly unreadCount = computed(() => Number(this.summaryState().mensajesNoLeidos || 0));
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  refresh(notify = false): void {
    if (!this.canReadWhatsapp() || this.loadingState()) {
      return;
    }
    this.loadingState.set(true);
    const previous = this.summaryState();
    this.api.getCrmWhatsappUnreadSummary()
      .pipe(finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: (summary) => {
          this.summaryState.set(summary);
          const hasNewMessage = Number(summary.mensajesNoLeidos || 0) > Number(previous.mensajesNoLeidos || 0)
            || (!!summary.ultimoMensajeEn && summary.ultimoMensajeEn !== previous.ultimoMensajeEn);
          if (notify && hasNewMessage && summary.mensajesNoLeidos > 0) {
            const contact = summary.ultimoContacto || 'Nuevo contacto';
            const detail = summary.ultimoMensaje?.trim() || 'Tienes un mensaje nuevo en la bandeja de WhatsApp.';
            this.toast.info(detail, `WhatsApp: ${contact}`, 5200);
          }
        },
        error: () => undefined,
      });
  }

  private canReadWhatsapp(): boolean {
    return this.session.hasModule('CRM') && (
      this.session.hasPermission('CRM_LEADS_READ') || this.session.hasPermission('CRM_ACTIVITIES_READ')
    );
  }
}
