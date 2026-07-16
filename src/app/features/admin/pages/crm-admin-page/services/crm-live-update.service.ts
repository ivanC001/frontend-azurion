import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, exhaustMap, filter, forkJoin, map, timer } from 'rxjs';

import type { CrmActividad, CrmOportunidad, CrmProspecto } from '../../../data/admin-saas-api.service';
import { CrmFollowupService } from './crm-followup.service';
import { CrmOpportunityService } from './crm-opportunity.service';
import { CrmProspectService } from './crm-prospect.service';

const CRM_LIVE_PAGE_SIZE = 100;

export interface CrmLiveSnapshot {
  prospectos: CrmProspecto[];
  oportunidades: CrmOportunidad[];
  actividades: CrmActividad[];
}

@Injectable({ providedIn: 'root' })
export class CrmLiveUpdateService {
  private readonly document = inject(DOCUMENT);
  private readonly prospects = inject(CrmProspectService);
  private readonly opportunities = inject(CrmOpportunityService);
  private readonly followups = inject(CrmFollowupService);

  watch(refreshIntervalMs = 12_000, shouldRefresh: () => boolean = () => true): Observable<CrmLiveSnapshot> {
    return timer(refreshIntervalMs, refreshIntervalMs).pipe(
      filter(() => !this.document.hidden && shouldRefresh()),
      exhaustMap(() => forkJoin({
        prospectos: this.prospects.page({ page: 0, size: CRM_LIVE_PAGE_SIZE }).pipe(map((page) => page.content)),
        oportunidades: this.opportunities.page({ page: 0, size: CRM_LIVE_PAGE_SIZE }).pipe(map((page) => page.content)),
        actividades: this.followups.pageActivities({ page: 0, size: CRM_LIVE_PAGE_SIZE }).pipe(map((page) => page.content)),
      }).pipe(catchError(() => EMPTY))),
    );
  }
}
