import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PaymentTrackingSummaryCard {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: string;
  readonly color: string;
  readonly soft: string;
}

export interface PaymentCollectionSummaryItem {
  readonly label: string;
  readonly count: number;
  readonly amount: number;
  readonly color: string;
}

export interface PaymentTrackingRow {
  readonly id: number;
  readonly initials: string;
  readonly contactName: string;
  readonly offerName: string;
  readonly opportunityCode: string;
  readonly pendingAmount: number;
  readonly installmentProgress: string;
  readonly pendingInstallmentsCount: number;
  readonly nextPaymentDate: string | null;
  readonly nextPaymentLabel: string;
  readonly dueLabel: string;
  readonly dueColor: string;
  readonly dueBg: string;
  readonly responsibleName: string;
  readonly isCredit: boolean;
  readonly remainingProgrammed: boolean;
}

export interface PaymentTrackingUpcomingItem {
  readonly id: string;
  readonly opportunityId: number;
  readonly initials: string;
  readonly contactName: string;
  readonly amount: number;
  readonly date: string;
  readonly dayLabel: string;
  readonly overdue: boolean;
}

export interface PaymentTrackingFilterState {
  readonly status: string;
  readonly installmentStatus: string;
  readonly dueFrom: string;
  readonly dueTo: string;
  readonly responsible: string;
}

export interface PaymentTrackingFilterOption {
  readonly label: string;
  readonly value: string;
}

export interface PaymentTrackingPageMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly rangeLabel: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-tracking-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './payment-tracking-page.html',
  styleUrl: './payment-tracking-page.scss',
})
export class PaymentTrackingPage {
  protected readonly filtersOpen = signal(false);
  readonly query = input('');
  readonly summaryCards = input<readonly PaymentTrackingSummaryCard[]>([]);
  readonly collectionSummary = input<readonly PaymentCollectionSummaryItem[]>([]);
  readonly collectionRingBackground = input('conic-gradient(#e5e7eb 0 100%)');
  readonly rows = input<readonly PaymentTrackingRow[]>([]);
  readonly upcoming = input<readonly PaymentTrackingUpcomingItem[]>([]);
  readonly filters = input<PaymentTrackingFilterState>({
    status: 'TODOS',
    installmentStatus: 'TODOS',
    dueFrom: '',
    dueTo: '',
    responsible: 'TODOS',
  });
  readonly responsibleOptions = input<readonly PaymentTrackingFilterOption[]>([]);
  readonly pageMeta = input<PaymentTrackingPageMeta>({
    page: 0,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
    rangeLabel: '0 de 0',
  });

  readonly queryChange = output<string>();
  readonly filtersChange = output<PaymentTrackingFilterState>();
  readonly previousPageRequested = output<void>();
  readonly nextPageRequested = output<void>();
  readonly exportRequested = output<void>();
  readonly remindersRequested = output<void>();
  readonly registerFirstPaymentRequested = output<void>();
  readonly viewPayments = output<number>();
  readonly registerPayment = output<number>();
  readonly scheduleInstallments = output<number>();
  readonly showOverdueRequested = output<void>();

  protected updateFilter(key: keyof PaymentTrackingFilterState, value: string): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
  }

  protected clearFilters(): void {
    this.filtersChange.emit({
      status: 'TODOS',
      installmentStatus: 'TODOS',
      dueFrom: '',
      dueTo: '',
      responsible: 'TODOS',
    });
  }
}
