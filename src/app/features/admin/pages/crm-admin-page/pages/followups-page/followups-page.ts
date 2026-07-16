import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CrmActividad, CrmOportunidad, CrmProspecto } from '../../../../data/admin-saas-api.service';

export interface FollowupFilterOption {
  label: string;
  value: string | null;
}

export interface FollowupFilterState {
  contact: string;
  responsible: string;
  origin: string;
  interest: string;
  date: string;
}

export interface FollowupTab {
  value: FollowupFilterValue;
  label: string;
  count: number;
}

export type FollowupFilterValue = 'TODAS' | 'MIS' | 'PENDIENTES' | 'HOY' | 'VENCIDAS' | 'SIN_ACTIVIDAD' | 'LLAMADAS' | 'VISITAS' | 'CORREOS';

export interface FollowupSource {
  prospecto: CrmProspecto;
  oportunidad?: CrmOportunidad;
  hasActiveOpportunity: boolean;
  lastActivity?: CrmActividad;
  nextActivity?: CrmActividad;
  priority: 'overdue' | 'today' | 'upcoming' | 'done' | 'idle';
  priorityLabel: string;
  interestLabel: string;
  interestTone: 'hot' | 'warm' | 'cold';
  amount: number;
  stageProgress: number;
  qualification: {
    score: number;
    temperatura: 'FRIO' | 'TIBIO' | 'CALIENTE';
    label: string;
    canConvert: boolean;
    missing: string[];
    status: 'CALIFICADO' | 'SEGUIR' | 'ESPERA' | 'PERDIDO' | 'CONVERTIDO';
  };
}

export interface FollowupPageRow {
  source: FollowupSource;
  selected: boolean;
  avatarTone: string;
  initials: string;
  contact: string;
  originLabel: string;
  originTone: string;
  offer: string;
  contactState: string;
  contactTone: string;
  ownerInitials: string;
  ownerName: string;
  proofLabel: string;
  proofTone: string;
  temperatureLabel: string;
  interestScore: number;
  lastActivityTitle: string;
  lastActivityMeta: string;
  lastActivityTone: string;
  lastActivityIcon: string;
  nextAction: string;
  nextActionDate: string;
  nextActionStatus: string;
  nextActionTone: string;
  phoneUrl: string | null;
  whatsappUrl: string | null;
  emailUrl: string | null;
}

export interface FollowupPageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-followups-page',
  standalone: true,
  imports: [DecimalPipe, FormsModule, SelectModule, TableModule],
  templateUrl: './followups-page.html',
  styleUrl: './followups-page.scss',
})
export class FollowupsPage {
  readonly rows = input.required<FollowupPageRow[]>();
  readonly loading = input(false);
  readonly filtersVisible = input(false);
  readonly filters = input.required<FollowupFilterState>();
  readonly contactOptions = input.required<FollowupFilterOption[]>();
  readonly responsibleOptions = input.required<FollowupFilterOption[]>();
  readonly originOptions = input.required<FollowupFilterOption[]>();
  readonly interestOptions = input.required<FollowupFilterOption[]>();
  readonly dateOptions = input.required<FollowupFilterOption[]>();
  readonly tabs = input.required<FollowupTab[]>();
  readonly activeTab = input.required<FollowupFilterValue>();
  readonly stars = input.required<number[]>();
  readonly pageMeta = input.required<FollowupPageMeta>();

  readonly filtersChange = output<FollowupFilterState>();
  readonly filtersReset = output<void>();
  readonly filtersApplied = output<void>();
  readonly tabChange = output<FollowupFilterValue>();
  readonly previousPageRequested = output<void>();
  readonly nextPageRequested = output<void>();
  readonly quickActivityRequested = output<CrmProspecto>();
  readonly completeActivityRequested = output<{ activity: CrmActividad; prospect: CrmProspecto }>();
  readonly opportunityRequested = output<FollowupSource>();
  readonly detailRequested = output<FollowupSource>();

  protected updateFilter(key: keyof FollowupFilterState, value: string | null): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
  }
}
