import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  AdminSaasApiService,
  CrmSentEmail,
} from '../../../../data/admin-saas-api.service';
import { CrmInboxChannelStateService } from '../../services/crm-inbox-channel-state.service';

type InboxChannelCode = 'FACEBOOK' | 'INSTAGRAM' | 'CORREO';

interface InboxChannelView {
  title: string;
  icon: string;
  color: string;
  description: string;
  detail: string;
  configurationRoute: string;
}

const CHANNEL_VIEWS: Record<InboxChannelCode, InboxChannelView> = {
  FACEBOOK: {
    title: 'Facebook',
    icon: 'pi-facebook',
    color: '#1877f2',
    description: 'La integracion de Facebook esta activa para este tenant.',
    detail: 'El canal queda disponible cuando las credenciales y el webhook firmado han sido configurados.',
    configurationRoute: '/admin/crm/administracion/canales',
  },
  INSTAGRAM: {
    title: 'Instagram',
    icon: 'pi-instagram',
    color: '#c13584',
    description: 'La integracion de Instagram esta activa para este tenant.',
    detail: 'El canal queda disponible cuando las credenciales y el webhook firmado han sido configurados.',
    configurationRoute: '/admin/crm/administracion/canales',
  },
  CORREO: {
    title: 'Correos enviados',
    icon: 'pi-envelope',
    color: '#7c3aed',
    description: 'Historial de cotizaciones enviadas por el correo configurado del tenant.',
    detail: 'Por ahora esta bandeja muestra exclusivamente mensajes enviados. La recepcion se habilitara cuando exista un webhook de correo.',
    configurationRoute: '/admin/crm/administracion/correo',
  },
};

@Component({
  selector: 'app-channel-inbox-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './channel-inbox-page.html',
  styleUrl: './channel-inbox-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelInboxPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminSaasApiService);
  private readonly inboxChannels = inject(CrmInboxChannelStateService);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private emailQueryTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = this.inboxChannels.loading;
  protected readonly emailLoading = signal(false);
  protected readonly emailQuery = signal('');
  protected readonly sentEmails = signal<CrmSentEmail[]>([]);
  protected readonly emailPage = signal(0);
  protected readonly emailTotal = signal(0);
  protected readonly emailTotalPages = signal(1);
  protected readonly emailError = signal('');
  protected readonly channelCode = computed(() =>
    String(this.routeData()['inboxChannel'] || 'FACEBOOK') as InboxChannelCode,
  );
  protected readonly active = computed(() =>
    this.inboxChannels.activeChannelCodes().has(this.channelCode()),
  );
  protected readonly view = computed(() => CHANNEL_VIEWS[this.channelCode()] ?? CHANNEL_VIEWS.FACEBOOK);
  protected readonly emailRangeLabel = computed(() => {
    const total = this.emailTotal();
    if (!total) {
      return '0 de 0';
    }
    const from = this.emailPage() * 20 + 1;
    return `${from}-${Math.min(from + this.sentEmails().length - 1, total)} de ${total}`;
  });

  ngOnInit(): void {
    this.inboxChannels.refresh();
    if (this.channelCode() === 'CORREO') {
      this.loadSentEmails();
    }
  }

  protected updateEmailQuery(value: string): void {
    this.emailQuery.set(value);
    if (this.emailQueryTimer) {
      clearTimeout(this.emailQueryTimer);
    }
    this.emailQueryTimer = setTimeout(() => {
      this.emailPage.set(0);
      this.loadSentEmails();
    }, 300);
  }

  protected previousEmailPage(): void {
    if (this.emailPage() <= 0 || this.emailLoading()) {
      return;
    }
    this.emailPage.update((page) => page - 1);
    this.loadSentEmails();
  }

  protected nextEmailPage(): void {
    if (this.emailPage() >= this.emailTotalPages() - 1 || this.emailLoading()) {
      return;
    }
    this.emailPage.update((page) => page + 1);
    this.loadSentEmails();
  }

  protected reloadSentEmails(): void {
    this.loadSentEmails();
  }

  private loadSentEmails(): void {
    this.emailLoading.set(true);
    this.emailError.set('');
    this.api.pageCrmSentEmails(this.emailQuery(), this.emailPage(), 20)
      .pipe(finalize(() => this.emailLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.sentEmails.set(result.content);
          this.emailTotal.set(result.totalElements);
          this.emailTotalPages.set(Math.max(1, result.totalPages));
        },
        error: () => {
          this.sentEmails.set([]);
          this.emailTotal.set(0);
          this.emailTotalPages.set(1);
          this.emailError.set('No se pudo cargar el historial de correos enviados.');
        },
      });
  }
}
