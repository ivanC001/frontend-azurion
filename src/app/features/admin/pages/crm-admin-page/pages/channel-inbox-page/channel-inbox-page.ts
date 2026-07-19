import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
    description: 'La integración de Facebook está activa para este tenant.',
    detail: 'Esta entrada queda disponible en el menú según la configuración guardada. La sincronización de conversaciones de Messenger se conectará a su webhook específico.',
    configurationRoute: '/admin/crm/administracion/canales',
  },
  INSTAGRAM: {
    title: 'Instagram',
    icon: 'pi-instagram',
    color: '#c13584',
    description: 'La integración de Instagram está activa para este tenant.',
    detail: 'Esta entrada queda disponible en el menú según la configuración guardada. La sincronización de mensajes directos se conectará a su webhook específico.',
    configurationRoute: '/admin/crm/administracion/canales',
  },
  CORREO: {
    title: 'Correo',
    icon: 'pi-envelope',
    color: '#7c3aed',
    description: 'El canal de correo está activo para este tenant.',
    detail: 'El envío SMTP está habilitado. La lectura de una bandeja entrante requerirá configurar posteriormente el proveedor de recepción de correo.',
    configurationRoute: '/admin/crm/administracion/correo',
  },
};

@Component({
  selector: 'app-channel-inbox-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './channel-inbox-page.html',
  styleUrl: './channel-inbox-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelInboxPage {
  private readonly route = inject(ActivatedRoute);
  private readonly inboxChannels = inject(CrmInboxChannelStateService);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly loading = this.inboxChannels.loading;
  protected readonly channelCode = computed(() =>
    String(this.routeData()['inboxChannel'] || 'FACEBOOK') as InboxChannelCode,
  );
  protected readonly active = computed(() =>
    this.inboxChannels.activeChannelCodes().has(this.channelCode()),
  );

  protected readonly view = computed(() => {
    return CHANNEL_VIEWS[this.channelCode()] ?? CHANNEL_VIEWS.FACEBOOK;
  });

  constructor() {
    this.inboxChannels.refresh();
  }
}
