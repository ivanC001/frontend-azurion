import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

import { UsuarioTenant } from '../../../../data/admin-saas-api.service';

export interface ProspectDistributionPreviewItem {
  readonly id: string;
  readonly name: string;
  readonly current: number;
  readonly assigned: number;
}

export type ProspectDistributionMode = 'MANUAL' | 'AUTOMATICO';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-prospect-distribution-modal',
  standalone: true,
  imports: [DialogModule],
  templateUrl: './prospect-distribution-modal.html',
  styleUrl: './prospect-distribution-modal.scss',
})
export class ProspectDistributionModal {
  readonly visible = input(false);
  readonly leadCount = input(0);
  readonly selectedProspectCount = input(0);
  readonly sellers = input<readonly UsuarioTenant[]>([]);
  readonly selectedSellerIds = input<readonly string[]>([]);
  readonly preview = input<readonly ProspectDistributionPreviewItem[]>([]);
  readonly saving = input(false);
  readonly mode = input<ProspectDistributionMode>('MANUAL');
  readonly automaticEnabled = input(false);

  readonly closed = output<void>();
  readonly modeChange = output<ProspectDistributionMode>();
  readonly sellerToggled = output<{ id: number | string; checked: boolean }>();
  readonly distributeRequested = output<void>();
  readonly automaticConfigurationRequested = output<boolean>();

  protected isSellerSelected(id: number | string): boolean {
    return this.selectedSellerIds().includes(String(id));
  }

  protected sellerInitials(item: UsuarioTenant): string {
    const source = item.nombres || item.username || 'US';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'US';
  }

  protected sellerName(item: UsuarioTenant): string {
    return item.nombres || item.username;
  }

  protected sellerRoles(item: UsuarioTenant): string {
    return item.roles?.join(', ') || 'Usuario activo';
  }

  protected closeFromVisibility(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }

  protected toggleSeller(id: number | string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.sellerToggled.emit({ id, checked });
  }
}
