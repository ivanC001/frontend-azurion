import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { CrmProspecto } from '../../../../data/admin-saas-api.service';

export interface ProspectSummaryCard {
  label: string;
  value: string;
  icon: string;
  tone: string;
}

export interface ProspectFilterOption {
  label: string;
  value: string;
}

export interface ProspectPageRow {
  prospect: CrmProspecto;
  avatarTone: string;
  initials: string;
  company: string;
  productName: string;
  productType: string;
  originIcon: string;
  originLabel: string;
  originTag: string;
  campaign: string;
  campaignDetail: string;
  statusLabel: string;
  statusClass: string;
  advisor: string;
  registrationDate: string | null;
  registrationTime: string | null;
  selected: boolean;
  canMoveToFollowUp: boolean;
}

export interface ProspectFilterState {
  origin: string;
  campaign: string;
  advisor: string;
  dateFrom: string;
  dateTo: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-prospects-page',
  standalone: true,
  imports: [DatePipe, FormsModule, InputTextModule, SelectModule],
  templateUrl: './prospects-page.html',
  styleUrl: './prospects-page.scss',
})
export class ProspectsPage {
  readonly canAssign = input(false);
  readonly canDelete = input(false);
  readonly loading = input(false);
  readonly actionId = input<number | null>(null);
  readonly summaryCards = input.required<ProspectSummaryCard[]>();
  readonly rows = input.required<ProspectPageRow[]>();
  readonly filtersVisible = input(false);
  readonly query = input.required<string>();
  readonly filters = input.required<ProspectFilterState>();
  readonly originOptions = input.required<ProspectFilterOption[]>();
  readonly campaignOptions = input.required<ProspectFilterOption[]>();
  readonly advisorOptions = input.required<ProspectFilterOption[]>();
  readonly allPageSelected = input(false);
  readonly pageRangeLabel = input.required<string>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly distributeRequested = output<void>();
  readonly refreshRequested = output<void>();
  readonly filtersVisibleChange = output<boolean>();
  readonly queryChange = output<string>();
  readonly filtersChange = output<ProspectFilterState>();
  readonly filtersReset = output<void>();
  readonly filtersApplied = output<void>();
  readonly pageSelectionChange = output<boolean>();
  readonly prospectSelectionChange = output<{ id: number; selected: boolean }>();
  readonly editRequested = output<CrmProspecto>();
  readonly moveToFollowUpRequested = output<CrmProspecto>();
  readonly deleteRequested = output<CrmProspecto>();
  readonly pageChange = output<number>();

  protected updateFilter(key: keyof ProspectFilterState, value: string): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
  }

  protected checkboxValue(event: Event): boolean {
    return (event.target as HTMLInputElement | null)?.checked ?? false;
  }
}
